/**
 * THE RSVP SERVER
 * ---------------
 * One Node process that does three jobs:
 *
 *   1. Serves the built invitation (dist/) with real HTTP Range support, so the
 *      films still play on iOS exactly as they do on a static host.
 *   2. Exposes the RSVP API (/api/rsvp, /api/health) for the guest form.
 *   3. Serves a password-protected register at /admin for the couple.
 *
 * WHY A SERVER AT ALL
 * -------------------
 * The brief needs three things a static bundle cannot do: a durable database, a
 * server-held WhatsApp access token, and a retry queue that survives the guest
 * closing the tab. Any one of those forces a backend, so all three live here.
 *
 * SECURITY POSTURE (summary)
 * --------------------------
 *  • No secret is ever serialised into a response. /api/health reports presence.
 *  • Every RSVP body is size-capped, validated and sanitised server-side.
 *  • Per-IP token-bucket rate limit on submissions and on login.
 *  • Admin endpoints require a signed HttpOnly cookie.
 *  • JSON-only writes + SameSite=Strict cookie = no cross-site form post.
 */

import { createServer } from 'node:http';
import { resolve } from 'node:path';

import { config, describe, whatsappStatus, normalizePhone, prettifyPhone, ROOT } from './env.mjs';
import { validateRsvp, labels, MEALS } from './validate.mjs';
import {
  openDb,
  insertRsvp,
  listRsvps,
  stats,
  findByClientToken,
  findRecentDuplicate,
  getRsvp,
  hashIp,
  countPending,
  markNotification,
  notificationLog,
  closeDb,
} from './db.mjs';
import { notifyRsvp, startQueue, stopQueue, drainQueue } from './notify.mjs';
import { serveFile, safePath, fileExists } from './static.mjs';
import {
  checkPassword,
  issueToken,
  verifyToken,
  parseCookies,
  sessionCookie,
  clearCookie,
} from './auth.mjs';
import { adminHtml } from './admin-page.mjs';

const DIST = resolve(ROOT, 'dist');
const MAX_BODY = 32 * 1024;

/* ------------------------------------------------------------------ helpers */

function send(res, status, body, headers = {}) {
  const isJson = typeof body === 'object' && body !== null;
  const payload = isJson ? JSON.stringify(body) : String(body);
  res.writeHead(status, {
    'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...headers,
  });
  res.end(payload);
}

function json(res, status, body, headers) {
  return send(res, status, body, { 'Cache-Control': 'no-store', ...headers });
}

/** Read a JSON body with a hard byte cap. Rejects anything else outright. */
function readJson(req) {
  return new Promise((resolvePromise, reject) => {
    let size = 0;
    const chunks = [];
    let done = false;

    const fail = (err) => {
      if (done) return;
      done = true;
      req.destroy();
      reject(err);
    };

    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) return fail(Object.assign(new Error('Body too large'), { status: 413 }));
      chunks.push(c);
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolvePromise({});
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return reject(Object.assign(new Error('Body must be a JSON object'), { status: 400 }));
        }
        resolvePromise(parsed);
      } catch {
        reject(Object.assign(new Error('Malformed JSON'), { status: 400 }));
      }
    });
    req.on('error', fail);
  });
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real) return real.trim();
  return req.socket?.remoteAddress || 'unknown';
}

/* ------------------------------------------------------------- rate limiting */

/**
 * Token bucket per IP, in memory.
 *
 * IN-MEMORY IS CORRECT HERE: it is a spam damper, not a security control, and a
 * lost bucket on restart is harmless. The durable limit is the UNIQUE index on
 * client_token plus the dedupe window, both of which live in SQLite.
 */
const buckets = new Map();

function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (buckets.size > 5000) {
    // Bound the map: drop anything already expired.
    for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
  }
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count), resetAt: b.resetAt };
}

/* -------------------------------------------------------------------- routes */

async function handleRsvp(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' }, { Allow: 'POST' });

  // JSON-only. A cross-site HTML form cannot send application/json without a
  // CORS preflight, so this alone blocks classic CSRF form posts.
  const ctype = String(req.headers['content-type'] || '');
  if (!ctype.includes('application/json')) {
    return json(res, 415, { error: 'Content-Type must be application/json.' });
  }

  const ip = clientIp(req);
  const ipHash = hashIp(ip);
  const rl = rateLimit(`rsvp:${ipHash}`, config.rateLimitPerWindow, config.rateLimitWindowMs);
  if (!rl.ok) {
    return json(
      res,
      429,
      { error: 'Too many responses from this connection. Please try again in a few minutes.' },
      { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    );
  }

  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    return json(res, err.status || 400, { error: err.message });
  }

  // Idempotency #1 — the same rendered form re-sent (double tap, flaky network).
  const clientToken = String(body.clientToken || '').slice(0, 64);
  if (clientToken) {
    const existing = findByClientToken(clientToken);
    if (existing) {
      return json(res, 200, {
        ok: true,
        duplicate: true,
        id: existing.id,
        submittedAtIst: existing.submitted_at_ist,
        notification: existing.notification_status,
        message: 'This response had already been received — thank you.',
      });
    }
  }

  const checked = validateRsvp(body);

  // Bot signal is checked FIRST and independently of field validity. A bot that
  // fills the hidden honeypot usually leaves every visible field perfectly
  // valid, so `checked.ok` is true — keying the discard off `!checked.ok` would
  // let exactly the submissions we most want to drop straight into the table.
  // The reply is a bland success so the bot cannot tell it was filtered, and
  // nothing is written, logged to the admin queue, or notified.
  if (checked.bot) {
    return json(res, 200, { ok: true, id: null, message: 'Thank you.' });
  }

  if (!checked.ok) {
    return json(res, 422, { error: 'Please check the highlighted fields.', fields: checked.errors });
  }

  const v = checked.value;

  // Idempotency #2 — same guest + same answer inside a short window. Catches a
  // retry that generated a new client token (e.g. page reloaded mid-submit).
  const dedupeKey = `${v.phoneE164}|${v.attendance}|${v.guests}|${v.events.sort().join(',')}|${v.message}`;
  const recent = findRecentDuplicate(dedupeKey, config.dedupeWindowMs);
  if (recent) {
    return json(res, 200, {
      ok: true,
      duplicate: true,
      id: recent.id,
      submittedAtIst: recent.submitted_at_ist,
      notification: recent.notification_status,
      message: 'This response had already been received — thank you.',
    });
  }

  const eventLabels = v.events.map((k) => labels({ event_keys: JSON.stringify([k]) }).events).join('; ');

  let row;
  try {
    row = insertRsvp({
      ...v,
      eventLabels,
      dedupeKey,
      clientToken,
      ipHash,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
    });
  } catch (err) {
    // A UNIQUE violation here means the same token raced itself. Treat as success.
    if (String(err?.message || '').includes('UNIQUE')) {
      const again = clientToken ? findByClientToken(clientToken) : null;
      if (again) return json(res, 200, { ok: true, duplicate: true, id: again.id });
    }
    console.error('[rsvp] insert failed:', err?.message || err);
    return json(res, 500, { error: 'We could not save your response. Please try again.' });
  }

  // THE ROW IS COMMITTED. The guest is told it succeeded from this point,
  // whether or not WhatsApp works — the notification is a separate, retryable
  // step and cannot undo a saved response.
  const wa = whatsappStatus();
  if (!wa.configured) {
    markNotification(row.id, { status: 'pending', error: 'WhatsApp credentials not configured yet' });
  }

  // Fire and forget: never make the guest wait on Meta.
  notifyRsvp(row.id).catch((err) => console.error('[rsvp] notify error:', err?.message || err));

  return json(res, 201, {
    ok: true,
    id: row.id,
    submittedAtIst: row.submitted_at_ist,
    notification: wa.configured ? 'queued' : 'pending',
    message: 'Your response has been received.',
  });
}

/* --------------------------------------------------------------------- admin */

function adminAuthed(req) {
  const cookies = parseCookies(req.headers.cookie);
  return verifyToken(cookies.rsvp_admin);
}

async function handleAdmin(req, res, url) {
  const path = url.pathname;

  /* ---- login (the only unauthenticated admin route) ---- */
  if (path === '/api/admin/login' && req.method === 'POST') {
    if (!config.adminPassword) {
      return json(res, 503, {
        error: 'No admin password is configured. Set ADMIN_PASSWORD in .env and restart.',
      });
    }
    const ip = clientIp(req);
    const rl = rateLimit(`login:${hashIp(ip)}`, 8, 10 * 60 * 1000);
    if (!rl.ok) return json(res, 429, { error: 'Too many attempts. Try again later.' });

    let body;
    try {
      body = await readJson(req);
    } catch (err) {
      return json(res, err.status || 400, { error: err.message });
    }

    if (!checkPassword(body.password)) {
      return json(res, 401, { error: 'Incorrect password.' });
    }
    res.setHeader('Set-Cookie', sessionCookie(issueToken()));
    return json(res, 200, { ok: true });
  }

  if (path === '/api/admin/logout') {
    res.setHeader('Set-Cookie', clearCookie());
    return json(res, 200, { ok: true });
  }

  /* ---- everything below needs a session ---- */
  if (!adminAuthed(req)) {
    return json(res, 401, { error: 'Sign in required.', login_url: '/admin' });
  }

  if (path === '/api/admin/stats') {
    return json(res, 200, {
      ok: true,
      stats: { ...stats(), pendingTotal: countPending() },
      whatsapp: whatsappStatus(),
      queue: { pending: countPending(), maxAttempts: config.waMaxAttempts },
    });
  }

  if (path === '/api/admin/rsvps') {
    const rows = listRsvps({
      search: String(url.searchParams.get('search') || '').slice(0, 120),
      status: String(url.searchParams.get('status') || 'all'),
      limit: 2000,
    });
    return json(res, 200, { ok: true, rows, count: rows.length });
  }

  if (path === '/api/admin/log') {
    const id = String(url.searchParams.get('id') || '');
    if (!id) return json(res, 400, { error: 'id is required' });
    return json(res, 200, { ok: true, log: notificationLog(id) });
  }

  if (path === '/api/admin/retry' && req.method === 'POST') {
    const id = String(url.searchParams.get('id') || '');
    if (id) {
      const r = await notifyRsvp(id);
      const row = getRsvp(id);
      return json(res, 200, {
        ok: r.status === 'sent',
        status: r.status,
        kind: r.kind || '',
        error: r.error || '',
        row,
      });
    }
    // No id: sweep everything that is owed a notification. This is an explicit
    // owner action, so it ignores the per-row backoff schedule — otherwise a row
    // that failed 10 seconds ago (next_attempt_at = now + 30s) would look "not
    // due" and the button would appear to do nothing.
    const before = stats();
    await drainQueue({ limit: 25, ignoreSchedule: true });
    const after = stats();
    return json(res, 200, { ok: true, sent: Math.max(0, after.notified - before.notified) });
  }

  if (path === '/api/admin/export.csv') {
    // Intercepted in createRsvpServer() before this router runs — it streams
    // text/csv, not JSON. Kept as an explicit guard so the route can never fall
    // through to the 404 below if that interception is ever changed.
    return handleCsv(req, res, url);
  }

  return json(res, 404, { error: 'Unknown admin route.' });
}

/** CSV is handled separately so it can stream text/csv with proper escaping. */
function handleCsv(req, res, url) {
  if (!adminAuthed(req)) {
    return json(res, 401, { error: 'Sign in required.' });
  }
  const rows = listRsvps({
    search: String(url.searchParams.get('search') || '').slice(0, 120),
    status: String(url.searchParams.get('status') || 'all'),
    limit: 100000,
  });

  const cell = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    // Neutralise spreadsheet formula injection, then quote.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  const header = [
    'RSVP ID', 'Submitted At (IST)', 'Guest Name', 'Mobile Number', 'Email',
    'Attendance', 'Total Guests', 'Events Attending', 'Meal Preference',
    'Special Requests', 'WhatsApp Status', 'Attempts', 'Last Error',
  ];

  const lines = [header.map(cell).join(',')];
  for (const r of rows) {
    const l = labels(r);
    lines.push(
      [
        r.id, r.submitted_at_ist, r.guest_name, prettifyPhone(r.phone_e164), r.email,
        l.attendance, r.guest_count, l.events,
        r.meal_preference ? MEALS[r.meal_preference] || r.meal_preference : '',
        r.special_requests, r.notification_status, r.notification_attempts,
        r.notification_error,
      ].map(cell).join(','),
    );
  }

  const csv = `\uFEFF${lines.join('\r\n')}\r\n`;
  const stamp = new Date().toISOString().slice(0, 10);
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="rsvp-register-${stamp}.csv"`,
    'Content-Length': Buffer.byteLength(csv),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(csv);
  return true;
}

/* ---------------------------------------------------------------------- main */

export function createRsvpServer() {
  openDb();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    // Health/config probe for the guest UI and for ops. Presence only.
    if (path === '/api/health') {
      const wa = whatsappStatus();
      return json(res, 200, {
        ok: true,
        service: 'royal-rsvp',
        version: 1,
        time: new Date().toISOString(),
        database: 'sqlite',
        whatsapp: { configured: wa.configured, mode: wa.mode, recipient: wa.recipient, missing: wa.missing },
        admin: { configured: Boolean(config.adminPassword) },
      });
    }

    if (path === '/api/rsvp') {
      try {
        return await handleRsvp(req, res);
      } catch (err) {
        console.error('[rsvp] unhandled:', err?.message || err);
        return json(res, 500, { error: 'Something went wrong. Please try again.' });
      }
    }

    if (path.startsWith('/api/admin/')) {
      if (path === '/api/admin/export.csv') {
        try {
          return handleCsv(req, res, url);
        } catch (err) {
          console.error('[admin] csv failed:', err?.message || err);
          return json(res, 500, { error: 'Export failed.' });
        }
      }
      try {
        return await handleAdmin(req, res, url);
      } catch (err) {
        console.error('[admin] unhandled:', err?.message || err);
        return json(res, 500, { error: 'Admin request failed.' });
      }
    }

    if (path === '/admin' || path === '/admin/') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        // The admin page loads no third-party anything.
        'Content-Security-Policy':
          "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex, nofollow',
      });
      res.end(adminHtml);
      return undefined;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return json(res, 405, { error: 'Method not allowed.' });
    }

    /* ---- static ---- */
    const target = safePath(DIST, path);
    if (target && fileExists(target)) {
      const hashed = path.startsWith('/assets/');
      if (serveFile(req, res, target, { cacheBust: hashed })) return undefined;
    }

    // SPA fallback for any non-file path (there is only one route).
    const index = resolve(DIST, 'index.html');
    if (fileExists(index)) {
      if (serveFile(req, res, index)) return undefined;
    }
    return json(res, 404, { error: 'Not found. Build the site first: npm run build' });
  });

  // A stray async rejection must not take the whole RSSVP service down.
  server.on('clientError', (err, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });

  return server;
}

/* --------------------------------------------------------------------- boot */

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);

if (isMain) {
  if (!fileExists(resolve(DIST, 'index.html'))) {
    console.warn('[boot] dist/index.html is missing — run `npm run build` first.');
  }

  const info = describe();
  console.log('┌─ Royal RSVP server ─────────────────────────────');
  console.log(`│ port        : ${info.port}`);
  console.log(`│ env         : ${info.nodeEnv}`);
  console.log(`│ database    : ${info.dbPath}`);
  console.log(`│ admin       : ${info.adminConfigured ? 'password set' : 'NOT CONFIGURED (set ADMIN_PASSWORD)'}`);
  console.log(`│ whatsapp    : ${info.whatsapp.configured ? `ready (${info.whatsapp.mode}) → ${info.whatsapp.recipient}` : `NOT CONFIGURED (${info.whatsapp.missing.join(', ')})`}`);
  console.log(`│ wa token    : ${info.whatsapp.token}`);
  console.log('└────────────────────────────────────────────────');

  const server = createRsvpServer();
  server.listen(config.port, config.host, () => {
    console.log(`[http] listening on http://${config.host}:${config.port}`);
    startQueue();
  });

  const shutdown = (sig) => {
    console.log(`\n[http] ${sig} — closing`);
    stopQueue();
    server.close(() => {
      closeDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 4000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

export { normalizePhone, insertRsvp, validateRsvp };
