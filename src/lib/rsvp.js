/**
 * RSVP SUBMISSION — the browser side of the real backend.
 *
 * WHAT CHANGED AND WHY
 * --------------------
 * This file used to write to `localStorage` and tell the guest "saved on this
 * device". That was honest, but it meant a response never reached the couple.
 * There is now a real server (`server/server.mjs`) with a durable SQLite
 * database, so every response is POSTed to `/api/rsvp` and only reported as
 * received on a 2xx.
 *
 * NO localStorage ANYWHERE. Not as a fallback, not as a cache, not as a "just in
 * case". A half-working local copy is how a response gets silently lost: the
 * guest sees a thank-you, the couple sees nothing, and nobody finds out until
 * the wedding.
 *
 * THE THREE OUTCOMES THE UI MUST DISTINGUISH
 * ------------------------------------------
 *   1. `ok`        — the row is committed. Show the thank-you.
 *   2. `duplicate` — this exact response was already stored. Also a success,
 *                    worded so the guest isn't alarmed by pressing twice.
 *   3. anything else — show the real reason and let them retry. Never claim it
 *                    was received when it wasn't.
 *
 * The client token is what makes (2) reliable: it is generated once per
 * rendered form and reused for every retry of that form, so a double-tap or a
 * flaky connection produces one row, not two.
 */

const API = '/api/rsvp';

/** A token that is stable for one rendered form. crypto.randomUUID where available. */
export function makeClientToken() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Ask the server whether WhatsApp is wired up. Presence only — never secrets. */
export async function fetchHealth(signal) {
  try {
    const res = await fetch('/api/health', { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * @param {object} payload validated-by-the-server form values
 * @param {object} opts
 * @param {string} opts.clientToken stable per form render
 * @param {number} opts.startedAt  epoch ms when the form was first shown
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{ok:boolean, duplicate?:boolean, id?:string, submittedAtIst?:string,
 *                    notification?:string, message:string, fields?:object}>}
 */
export async function submitRsvp(payload, { clientToken, startedAt, signal } = {}) {
  let res;
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      signal,
      body: JSON.stringify({ ...payload, clientToken, startedAt }),
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { ok: false, message: 'The request was cancelled. Please try again.' };
    }
    return {
      ok: false,
      message:
        'We could not reach the response server. Please check your connection and press Send Our Response again.',
    };
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (res.ok && data?.ok) {
    return {
      ok: true,
      duplicate: Boolean(data.duplicate),
      id: data.id || '',
      submittedAtIst: data.submittedAtIst || '',
      notification: data.notification || '',
      message: data.message || 'Your response has been received.',
    };
  }

  if (res.status === 422 && data?.fields) {
    return {
      ok: false,
      fields: data.fields,
      message: data.error || 'Please check the highlighted fields.',
    };
  }

  if (res.status === 429) {
    return {
      ok: false,
      message:
        data?.error || 'That is a lot of responses in a short time. Please try again in a few minutes.',
    };
  }

  return {
    ok: false,
    message:
      data?.error ||
      `The response server replied with ${res.status}. Please try again in a moment.`,
  };
}
