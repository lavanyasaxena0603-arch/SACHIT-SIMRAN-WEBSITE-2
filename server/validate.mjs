/**
 * VALIDATION + SANITISATION
 * -------------------------
 * Every rule here is enforced on the SERVER, regardless of what the browser
 * already checked. The client-side validation in RsvpSection is a courtesy that
 * saves a round-trip; it is not a security boundary and is never trusted.
 *
 * The order is deliberate: COERCE → VALIDATE → SANITISE → BUILD. Sanitising
 * before validating would let a crafted value change shape between the check and
 * the use, which is the classic bug this ordering avoids.
 */

import { normalizePhone } from './env.mjs';

export const EVENTS = {
  engagement: 'The Engagement — Sterling Banquet, 10 December 2026',
  wedding: 'The Wedding — Rudrakshaa Banquet, 12 December 2026',
};

export const MEALS = {
  vegetarian: 'Vegetarian',
  'non-vegetarian': 'Non-Vegetarian',
  jain: 'Jain',
  vegan: 'Vegan',
  'no-preference': 'No preference',
};

export const ATTENDANCE = {
  accepts: 'Accepts',
  declines: 'Declines',
};

const LIMITS = {
  name: 120,
  phone: 32,
  email: 160,
  message: 1000,
  events: 10,
  guests: 20,
};

/**
 * Strip control characters and collapse whitespace. This is the only place raw
 * input becomes a string the rest of the app may touch.
 *
 * NOTE ON HTML: nothing is HTML-escaped here, because the value is never
 * interpolated into markup. It is bound to the database (parameterised) and
 * rendered by React, which escapes it. Escaping at the storage layer would
 * corrupt the data ("Tom &amp; Jerry" stored forever) and is the wrong fix for
 * XSS in a React app. The admin page is the one place we emit HTML, and it uses
 * `textContent` / an explicit escaper there.
 */
export function clean(value, max) {
  if (value === null || value === undefined) return '';

  /* Drop C0/C1 control characters — keeping TAB and LF, folding CR into LF.
     Done by code point rather than by a regex: a regex class containing literal
     control characters is both hard to read in a diff and flagged by
     `no-control-regex`, and a codepoint filter states the intent exactly. */
  let s = '';
  for (const ch of String(value)) {
    const c = ch.codePointAt(0);
    if (c === 10 || c === 9) s += ch;
    else if (c === 13) s += '\n';
    else if (c < 32) continue;
    else if (c >= 127 && c <= 159) continue;
    else s += ch;
  }
  // Collapse runs of horizontal space, trim each line.
  s = s
    .split('\n')
    .map((line) => line.replace(/[ \t\u00A0]+/g, ' ').trim())
    .join('\n')
    .trim();
  return max ? s.slice(0, max) : s;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

/**
 * @returns {{ok:true, value:object} | {ok:false, errors:Record<string,string>, bot?:boolean}}
 */
export function validateRsvp(raw) {
  const errors = {};
  const body = raw && typeof raw === 'object' ? raw : {};

  /* ---- spam traps -------------------------------------------------------
     A human never fills a field they cannot see, and never completes a real
     form in 1.5 seconds. Both are reported as a SUCCESS to the caller (so a bot
     learns nothing) but the submission is discarded — see server.mjs. */

  const honeypot = clean(body.company || body.website || '', 200);
  const startedAt = Number(body.startedAt) || 0;
  const fillMs = startedAt > 0 ? Date.now() - startedAt : 0;
  const looksBot = Boolean(honeypot) || (startedAt > 0 && fillMs < 1500);

  /* ---- name ---- */
  const name = clean(body.name, LIMITS.name);
  if (!name) errors.name = 'Please write your full name.';
  else if (name.length < 2) errors.name = 'Please write your full name.';
  else if (name.length > LIMITS.name) errors.name = 'That name is too long.';
  else if (!/[\p{L}]/u.test(name)) errors.name = 'Please write your full name.';

  /* ---- phone (REQUIRED — it is the notification's subject and the couple's
          only way to call the guest back) ---- */
  const phoneRaw = clean(body.phone, LIMITS.phone);
  const phoneE164 = normalizePhone(phoneRaw);
  if (!phoneRaw) errors.phone = 'Please add your WhatsApp or mobile number.';
  else if (!phoneE164) errors.phone = 'That does not look like a valid mobile number.';
  else if (phoneE164.length === 12 && !phoneE164.startsWith('91')) {
    errors.phone = 'Please choose a valid country code.';
  }

  /* ---- email (optional) ---- */
  const email = clean(body.email, LIMITS.email).toLowerCase();
  if (email && !EMAIL_RE.test(email)) errors.email = 'That email address looks incomplete.';

  /* ---- attendance ---- */
  const attendance = clean(body.attendance, 20).toLowerCase();
  if (!attendance) errors.attendance = 'Please let us know whether you can join us.';
  else if (!ATTENDANCE[attendance]) errors.attendance = 'Please choose accepts or declines.';

  const declines = attendance === 'declines';

  /* ---- guest count ---- */
  let guests = Number.parseInt(body.guests, 10);
  if (declines) {
    // A decline cannot carry a headcount. Force it rather than error, so a
    // stale value in a cached form can never be stored as "declines, 4 guests".
    guests = 0;
  } else if (!Number.isFinite(guests) || guests < 1) {
    errors.guests = 'Please tell us how many guests will attend.';
  } else if (guests > LIMITS.guests) {
    errors.guests = `For more than ${LIMITS.guests} guests, please write to us directly.`;
  }

  /* ---- events ---- */
  let events = Array.isArray(body.events) ? body.events : [];
  events = [...new Set(events.map((e) => clean(e, 40).toLowerCase()))].slice(0, LIMITS.events);
  const unknown = events.filter((e) => !EVENTS[e]);
  if (unknown.length) errors.events = 'Please choose from the listed celebrations.';
  else if (declines) events = [];
  else if (!events.length) errors.events = 'Please choose at least one celebration.';

  /* ---- meal preference (optional; meaningless when declining) ---- */
  let meal = clean(body.meal, 40).toLowerCase();
  if (declines) meal = '';
  else if (meal && !MEALS[meal]) meal = 'no-preference';
  if (!meal && !declines) meal = 'no-preference';

  /* ---- free text ---- */
  const message = clean(body.message ?? body.specialRequests, LIMITS.message);

  if (Object.keys(errors).length) return { ok: false, errors, bot: looksBot };

  return {
    ok: true,
    bot: looksBot,
    value: {
      name,
      phoneRaw,
      phoneE164,
      email,
      attendance,
      guests: declines ? 0 : guests,
      events,
      meal: declines ? '' : meal,
      message,
    },
  };
}

/** Human labels for a stored record — used by WhatsApp and the CSV. */
export function labels(record) {
  const eventList = Array.isArray(record.event_keys)
    ? record.event_keys
    : JSON.parse(record.event_keys || '[]');
  return {
    attendance: ATTENDANCE[record.attendance_status] || record.attendance_status,
    events: eventList.map((k) => EVENTS[k] || k).join('; ') || '—',
    meal: record.meal_preference && MEALS[record.meal_preference]
      ? MEALS[record.meal_preference]
      : '—',
  };
}
