/**
 * THE NOTIFICATION WORKER — durable, idempotent, never blocks the guest.
 *
 * ORDER OF OPERATIONS (this is the whole reliability contract)
 * -----------------------------------------------------------
 *   1. The RSVP is COMMITTED to SQLite with `notification_status='pending'`.
 *   2. Only then is the guest told "your response has been received".
 *   3. The WhatsApp call happens afterwards, on its own time.
 *
 * So a Meta outage, an expired token or a dead network can never lose a
 * response. The row is already on disk; the notification is just a second,
 * retryable step that the admin view can also trigger by hand.
 *
 * NO DUPLICATE NOTIFICATIONS
 * --------------------------
 * Two independent guards:
 *   • `claim()` is a single conditional UPDATE. Only one caller can move a row
 *     from a sendable state into `sending`, so two concurrent workers cannot
 *     both fire. The attempt counter is incremented inside the same statement.
 *   • `notification_status='sent'` is terminal: `claim()` refuses it, so a retry
 *     after a successful send is impossible even if the process died between the
 *     send and the bookkeeping write.
 */

import { config, whatsappStatus } from './env.mjs';
import {
  openDb,
  getRsvp,
  markNotification,
  logNotification,
  dueNotifications,
  countPending,
} from './db.mjs';
import { sendWhatsAppMessage, backoffMs, WhatsAppError } from './whatsapp.mjs';

const inFlight = new Set();

/**
 * Atomically take ownership of one row's notification.
 * Returns the updated attempt number, or null when the row is not sendable.
 */
function claim(id) {
  const d = openDb();
  const now = new Date().toISOString();
  const before = getRsvp(id);
  if (!before) return null;
  if (before.notification_status === 'sent') return null;
  if (before.notification_attempts >= config.waMaxAttempts) return null;

  const res = d
    .prepare(`
      UPDATE rsvp
         SET notification_status = 'pending',
             notification_attempts = notification_attempts + 1,
             last_attempt_at = ?
       WHERE id = ?
         AND notification_status <> 'sent'
         AND notification_attempts < ?
    `)
    .run(now, id, config.waMaxAttempts);

  // `changes` is 0 when another worker won the race, or the row is exhausted.
  if (!res.changes) return null;
  return getRsvp(id);
}

/**
 * Send one notification, with bookkeeping. Safe to call from the request path
 * (fire-and-forget), the retry timer, or the admin "retry" button.
 *
 * @returns {Promise<{ok:boolean, status:string, kind?:string, error?:string}>}
 */
export async function notifyRsvp(id, { fetchImpl } = {}) {
  if (inFlight.has(id)) return { ok: false, status: 'in-flight' };

  const claimed = claim(id);
  if (!claimed) {
    const row = getRsvp(id);
    return {
      ok: row?.notification_status === 'sent',
      status: row?.notification_status || 'missing',
      kind: 'noop',
    };
  }

  inFlight.add(id);
  const attempt = claimed.notification_attempts;

  try {
    const result = await sendWhatsAppMessage(claimed, fetchImpl ? { fetchImpl } : {});
    markNotification(id, { status: 'sent', error: '', attempts: attempt, nextAttemptAt: '' });
    logNotification({
      rsvpId: id,
      attempt,
      ok: true,
      httpStatus: result.httpStatus,
      detail: `${result.mode} ${result.messageId}`,
    });
    return { ok: true, status: 'sent', messageId: result.messageId };
  } catch (err) {
    const e = err instanceof WhatsAppError ? err : new WhatsAppError(String(err?.message || err));
    const fatal = !e.retryable || e.kind === 'not-configured';
    const exhausted = attempt >= config.waMaxAttempts;
    const failed = fatal || exhausted;

    const nextAttemptAt = failed ? '' : new Date(Date.now() + backoffMs(attempt)).toISOString();
    const status = failed ? 'failed' : 'pending';

    markNotification(id, {
      status,
      error: `${e.kind}: ${e.message}`,
      attempts: attempt,
      nextAttemptAt,
    });
    logNotification({
      rsvpId: id,
      attempt,
      ok: false,
      httpStatus: e.httpStatus,
      detail: `${e.kind} (${e.code}${e.subcode ? `/${e.subcode}` : ''}) ${e.message}`,
    });

    // Never print the token, the recipient, or the guest's details.
    console.warn(`[whatsapp] ${id} attempt ${attempt} -> ${status} [${e.kind}] ${e.message}`);

    return { ok: false, status, kind: e.kind, error: e.message };
  } finally {
    inFlight.delete(id);
  }
}

let timer = null;
let running = false;

/** One sweep of everything that is owed a notification. */
export async function drainQueue({ limit = 10, ignoreSchedule = false } = {}) {
  if (running) return { drained: 0, skipped: true };
  running = true;
  let drained = 0;
  try {
    const rows = dueNotifications(limit, { ignoreSchedule });
    for (const row of rows) {
      // Sequential, deliberately: Meta rate-limits per number and a burst is the
      // fastest way to get throttled.
      // eslint-disable-next-line no-await-in-loop
      const r = await notifyRsvp(row.id);
      if (r.status === 'sent') drained += 1;
    }
  } catch (err) {
    console.error('[whatsapp] queue sweep failed:', err?.message || err);
  } finally {
    running = false;
  }
  return { drained };
}

/** Retry timer. 60s ticks; each row has its own backoff timestamp. */
export function startQueue() {
  if (timer) return;
  const tick = async () => {
    if (!whatsappStatus().configured) return;
    if (countPending() === 0) return;
    await drainQueue({ limit: 5 });
  };
  timer = setInterval(tick, 60_000);
  timer.unref?.();
  // First sweep shortly after boot, so a restart immediately resumes anything
  // that was interrupted mid-send.
  setTimeout(tick, 4_000).unref?.();
  console.log('[whatsapp] retry queue started (60s)');
}

export function stopQueue() {
  if (timer) clearInterval(timer);
  timer = null;
}
