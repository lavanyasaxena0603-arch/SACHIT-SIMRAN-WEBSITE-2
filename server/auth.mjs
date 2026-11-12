/**
 * SESSION TOKENS FOR THE ADMIN VIEW
 * ---------------------------------
 * A signed, expiring, opaque-looking cookie. No server-side session store, no
 * extra table: the signature IS the state.
 *
 * Format:  base64url(payload) + "." + base64url(HMAC-SHA256(payload, secret))
 * Payload: { sub:'owner', iat, exp }
 *
 *  • `timingSafeEqual` for the compare — a `===` on a signature leaks its
 *    correct prefix through timing.
 *  • `exp` is checked on every request, not just at issue time.
 *  • Changing ADMIN_SESSION_SECRET invalidates every outstanding session.
 *  • `HttpOnly` + `SameSite=Strict` + `Secure` in production, so script cannot
 *    read it and another origin cannot ride it.
 */

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { config } from './env.mjs';

const b64u = (buf) => Buffer.from(buf).toString('base64url');

export function issueToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    sub: 'owner',
    iat: now,
    exp: now + config.sessionHours * 3600,
    n: randomBytes(8).toString('hex'),
  });
  const body = b64u(payload);
  const sig = createHmac('sha256', config.sessionSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;

  const body = token.slice(0, dot);
  const given = token.slice(dot + 1);
  const expected = createHmac('sha256', config.sessionSecret).update(body).digest('base64url');

  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.sub !== 'owner') return false;
    return Math.floor(Date.now() / 1000) < Number(payload.exp);
  } catch {
    return false;
  }
}

/** Constant-time password check that does not leak length either. */
export function checkPassword(input) {
  if (!config.adminPassword) return false;
  const a = Buffer.from(String(input || ''));
  const b = Buffer.from(config.adminPassword);
  if (a.length !== b.length) {
    // Still spend the same work, then fail.
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function sessionCookie(token) {
  const maxAge = config.sessionHours * 3600;
  const secure = config.isProd ? ' Secure;' : '';
  // Path=/ ON PURPOSE. The cookie has to be presented to BOTH /admin (the page)
  // and /api/admin/* (the data endpoints). Scoping it to /admin meant every API
  // call arrived unauthenticated and the dashboard silently 401'd.
  return `rsvp_admin=${token}; Path=/; HttpOnly; SameSite=Strict;${secure} Max-Age=${maxAge}`;
}

export function clearCookie() {
  const secure = config.isProd ? ' Secure;' : '';
  return `rsvp_admin=; Path=/; HttpOnly; SameSite=Strict;${secure} Max-Age=0`;
}
