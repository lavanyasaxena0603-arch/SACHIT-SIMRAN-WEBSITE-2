/**
 * PERSISTENT STORAGE — SQLite via Node's built-in `node:sqlite`.
 *
 * WHY THIS AND NOT localStorage / a JSON file
 * -------------------------------------------
 * The requirement is that an RSVP survives a page refresh, a process restart
 * and a host reboot. That rules out localStorage (per-device, per-browser,
 * wiped by the guest, never visible to the couple) and it rules out an
 * in-memory map. This is a real database file on disk with WAL enabled, so a
 * committed row is durable even if the process is killed a millisecond later.
 *
 * `node:sqlite` is used rather than better-sqlite3 so the project keeps its
 * zero-native-dependency stance — nothing to compile on the hosting box, and no
 * prebuilt binary to mismatch.
 *
 * EVERY statement is parameterised. No value is ever concatenated into SQL.
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { config } from './env.mjs';

let db = null;

/** IST is UTC+5:30 with no daylight saving — a fixed offset, never a tz db. */
const IST_OFFSET_MIN = 330;

export function toIstParts(date = new Date()) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MIN * 60 * 1000);
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC', // already shifted
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(shifted);
  const get = (t) => p.find((x) => x.type === t)?.value || '';
  return {
    iso: `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`,
    date: `${get('day')}/${get('month')}/${get('year')}`,
    time: `${get('hour')}:${get('minute')}:${get('second')}`,
  };
}

/** "13/11/2026, 04:35:12 PM IST" — the exact form used in the notification. */
export function formatIst(date = new Date()) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MIN * 60 * 1000);
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(shifted);
  const get = (t) => p.find((x) => x.type === t)?.value || '';
  const dayPart = p.find((x) => x.type === 'dayPeriod')?.value || '';
  return `${get('day')}/${get('month')}/${get('year')}, ${get('hour')}:${get('minute')} ${dayPart} IST`;
}

/** RSVP-4F2A9C — short, unambiguous, readable over the phone. */
export function newRsvpId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
  const bytes = randomBytes(6);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `RSVP-${out}`;
}

/** One-way IP fingerprint: can spot abuse, cannot recover the address. */
export function hashIp(ip) {
  return createHash('sha256').update(`${config.ipHashSalt}:${ip || 'unknown'}`).digest('hex').slice(0, 32);
}

export function openDb() {
  if (db) return db;

  const path = config.dbPath;
  mkdirSync(dirname(path), { recursive: true });
  const fresh = !existsSync(path);

  db = new DatabaseSync(path);

  // WAL + FULL sync: a commit is on disk before we answer the guest.
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = FULL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS rsvp (
      id                    TEXT PRIMARY KEY,
      guest_name            TEXT NOT NULL,
      phone_number          TEXT NOT NULL,
      phone_e164            TEXT NOT NULL,
      email                 TEXT NOT NULL DEFAULT '',
      attendance_status     TEXT NOT NULL CHECK (attendance_status IN ('accepts','declines')),
      guest_count           INTEGER NOT NULL DEFAULT 0,
      event_keys            TEXT NOT NULL DEFAULT '[]',
      event_labels          TEXT NOT NULL DEFAULT '',
      meal_preference       TEXT NOT NULL DEFAULT '',
      special_requests      TEXT NOT NULL DEFAULT '',
      submitted_at          TEXT NOT NULL,
      submitted_at_ist      TEXT NOT NULL,
      submitted_utc         TEXT NOT NULL,
      submitted_day         TEXT NOT NULL,
      notification_status   TEXT NOT NULL DEFAULT 'pending'
                              CHECK (notification_status IN ('pending','sent','failed','skipped')),
      notification_attempts INTEGER NOT NULL DEFAULT 0,
      notification_error    TEXT NOT NULL DEFAULT '',
      notified_at           TEXT NOT NULL DEFAULT '',
      last_attempt_at       TEXT NOT NULL DEFAULT '',
      next_attempt_at       TEXT NOT NULL DEFAULT '',
      dedupe_key            TEXT NOT NULL,
      client_token          TEXT NOT NULL DEFAULT '',
      ip_hash               TEXT NOT NULL DEFAULT '',
      user_agent            TEXT NOT NULL DEFAULT ''
    );
  `);

  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvp_client_token ON rsvp(client_token) WHERE client_token <> \'\';');
  db.exec('CREATE INDEX IF NOT EXISTS idx_rsvp_dedupe ON rsvp(dedupe_key, submitted_utc)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_rsvp_pending ON rsvp(notification_status, next_attempt_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_rsvp_day ON rsvp(submitted_day)');

  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      rsvp_id    TEXT NOT NULL,
      attempt    INTEGER NOT NULL,
      ok         INTEGER NOT NULL,
      http_status INTEGER NOT NULL DEFAULT 0,
      detail     TEXT NOT NULL DEFAULT '',
      at_utc     TEXT NOT NULL,
      FOREIGN KEY (rsvp_id) REFERENCES rsvp(id) ON DELETE CASCADE
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_log_rsvp ON notification_log(rsvp_id)');

  console.log(`[db] ${fresh ? 'created' : 'opened'} ${path}`);
  return db;
}

/** Insert a validated submission. Returns the stored row. */
export function insertRsvp(record) {
  const d = openDb();
  const now = new Date();
  const ist = toIstParts(now);

  const row = {
    id: newRsvpId(),
    guest_name: record.name,
    phone_number: record.phoneRaw,
    phone_e164: record.phoneE164,
    email: record.email,
    attendance_status: record.attendance,
    guest_count: record.guests,
    event_keys: JSON.stringify(record.events),
    event_labels: record.eventLabels,
    meal_preference: record.meal,
    special_requests: record.message,
    submitted_at: ist.iso,
    submitted_at_ist: formatIst(now),
    submitted_utc: now.toISOString(),
    submitted_day: ist.iso.slice(0, 10),
    notification_status: 'pending',
    dedupe_key: record.dedupeKey,
    client_token: record.clientToken,
    ip_hash: record.ipHash,
    user_agent: record.userAgent,
  };

  d.prepare(`
    INSERT INTO rsvp (
      id, guest_name, phone_number, phone_e164, email, attendance_status,
      guest_count, event_keys, event_labels, meal_preference, special_requests,
      submitted_at, submitted_at_ist, submitted_utc, submitted_day,
      notification_status, dedupe_key, client_token, ip_hash, user_agent
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `).run(
    row.id, row.guest_name, row.phone_number, row.phone_e164, row.email, row.attendance_status,
    row.guest_count, row.event_keys, row.event_labels, row.meal_preference, row.special_requests,
    row.submitted_at, row.submitted_at_ist, row.submitted_utc, row.submitted_day,
    row.notification_status, row.dedupe_key, row.client_token, row.ip_hash, row.user_agent,
  );

  return getRsvp(row.id);
}

export function getRsvp(id) {
  return openDb().prepare('SELECT * FROM rsvp WHERE id = ?').get(id) || null;
}

/** Idempotency: the same browser retrying the same rendered form. */
export function findByClientToken(token) {
  if (!token) return null;
  return openDb().prepare('SELECT * FROM rsvp WHERE client_token = ?').get(token) || null;
}

/**
 * Same guest, same answer, moments apart — the double-tap / flaky-network case.
 * Deliberately scoped to a short window so a genuine change of mind later in the
 * day is recorded as a NEW response instead of being silently swallowed.
 */
export function findRecentDuplicate(dedupeKey, windowMs) {
  const since = new Date(Date.now() - windowMs).toISOString();
  return (
    openDb()
      .prepare(
        `SELECT * FROM rsvp
          WHERE dedupe_key = ? AND submitted_utc >= ?
          ORDER BY submitted_utc DESC LIMIT 1`,
      )
      .get(dedupeKey, since) || null
  );
}

export function listRsvps({ search = '', status = 'all', limit = 500 } = {}) {
  const where = [];
  const params = [];

  if (status === 'accepts' || status === 'declines') {
    where.push('attendance_status = ?');
    params.push(status);
  }
  if (search) {
    where.push('(guest_name LIKE ? OR phone_number LIKE ? OR phone_e164 LIKE ? OR email LIKE ? OR id LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like, like);
  }

  const sql = `SELECT * FROM rsvp ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
               ORDER BY submitted_utc DESC LIMIT ?`;
  params.push(limit);
  return openDb().prepare(sql).all(...params);
}

export function stats() {
  const d = openDb();
  const one = (sql, ...p) => d.prepare(sql).get(...p) || {};
  const totals = one(`
    SELECT
      COUNT(*)                                                            AS responses,
      SUM(CASE WHEN attendance_status = 'accepts'  THEN 1 ELSE 0 END)      AS accepts,
      SUM(CASE WHEN attendance_status = 'declines' THEN 1 ELSE 0 END)      AS declines,
      SUM(CASE WHEN attendance_status = 'accepts'  THEN guest_count ELSE 0 END) AS confirmed_guests,
      SUM(CASE WHEN attendance_status = 'accepts'  THEN guest_count - 1 ELSE 0 END) AS accompanying,
      SUM(CASE WHEN notification_status = 'sent'    THEN 1 ELSE 0 END)     AS notified,
      SUM(CASE WHEN notification_status = 'pending' THEN 1 ELSE 0 END)     AS pending,
      SUM(CASE WHEN notification_status = 'failed'  THEN 1 ELSE 0 END)     AS failed
    FROM rsvp
  `);
  const engagement = one(
    "SELECT COALESCE(SUM(guest_count),0) AS n FROM rsvp WHERE attendance_status='accepts' AND event_keys LIKE '%engagement%'",
  );
  const wedding = one(
    "SELECT COALESCE(SUM(guest_count),0) AS n FROM rsvp WHERE attendance_status='accepts' AND event_keys LIKE '%wedding%'",
  );
  return {
    responses: totals.responses || 0,
    accepts: totals.accepts || 0,
    declines: totals.declines || 0,
    confirmedGuests: totals.confirmed_guests || 0,
    accompanying: Math.max(0, totals.accompanying || 0),
    notified: totals.notified || 0,
    pending: totals.pending || 0,
    failed: totals.failed || 0,
    engagementGuests: engagement.n || 0,
    weddingGuests: wedding.n || 0,
  };
}

/* ------------------------------------------------------------------ notices */

export function markNotification(id, { status, error = '', attempts, nextAttemptAt = '' }) {
  const d = openDb();
  const now = new Date().toISOString();
  d.prepare(`
    UPDATE rsvp SET
      notification_status = ?,
      notification_error  = ?,
      notification_attempts = COALESCE(?, notification_attempts),
      last_attempt_at     = ?,
      next_attempt_at     = ?,
      notified_at         = CASE WHEN ? = 'sent' THEN ? ELSE notified_at END
    WHERE id = ?
  `).run(status, String(error).slice(0, 500), attempts ?? null, now, nextAttemptAt, status, now, id);
}

export function logNotification({ rsvpId, attempt, ok, httpStatus = 0, detail = '' }) {
  openDb()
    .prepare(
      'INSERT INTO notification_log (rsvp_id, attempt, ok, http_status, detail, at_utc) VALUES (?,?,?,?,?,?)',
    )
    .run(rsvpId, attempt, ok ? 1 : 0, httpStatus, String(detail).slice(0, 500), new Date().toISOString());
}

export function notificationLog(rsvpId) {
  return openDb()
    .prepare('SELECT * FROM notification_log WHERE rsvp_id = ? ORDER BY id DESC LIMIT 20')
    .all(rsvpId);
}

/**
 * Rows still owed a notification, oldest first.
 *
 * `ignoreSchedule` exists for the owner's manual "retry now" action: a transient
 * failure sets `next_attempt_at = now + backoff`, so an explicit retry issued
 * seconds later would otherwise find nothing due and appear to do nothing.
 */
export function dueNotifications(limit = 20, { ignoreSchedule = false } = {}) {
  const d = openDb();
  if (ignoreSchedule) {
    return d
      .prepare(`
        SELECT * FROM rsvp
         WHERE notification_status IN ('pending','failed')
           AND notification_attempts < ?
         ORDER BY submitted_utc ASC
         LIMIT ?
      `)
      .all(config.waMaxAttempts, limit);
  }
  return d
    .prepare(`
      SELECT * FROM rsvp
       WHERE notification_status IN ('pending','failed')
         AND notification_attempts < ?
         AND (next_attempt_at = '' OR next_attempt_at <= ?)
       ORDER BY submitted_utc ASC
       LIMIT ?
    `)
    .all(config.waMaxAttempts, new Date().toISOString(), limit);
}

/** Clear the backoff timestamp so the next sweep treats the row as due. */
export function clearBackoff(id = null) {
  const d = openDb();
  if (id) {
    d.prepare("UPDATE rsvp SET next_attempt_at = '' WHERE id = ? AND notification_status <> 'sent'").run(id);
    return;
  }
  d.prepare("UPDATE rsvp SET next_attempt_at = '' WHERE notification_status <> 'sent'").run();
}

export function countPending() {
  const r = openDb()
    .prepare("SELECT COUNT(*) AS n FROM rsvp WHERE notification_status IN ('pending','failed')")
    .get();
  return r?.n || 0;
}

export function closeDb() {
  if (db) {
    try {
      db.close();
    } catch {
      /* already closed */
    }
    db = null;
  }
}
