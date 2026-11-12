#!/usr/bin/env node
/**
 * DEMO SEED  —  npm run db:seed-demo
 *
 * Inserts a handful of clearly-fake RSVPs so you can exercise the admin view
 * without touching real guest data. Safe by design:
 *
 *   • Refuses to run against a database that already holds real submissions,
 *     unless you pass --force.
 *   • Every row is prefixed "DEMO" and uses the reserved 99999… phone range,
 *     so demo rows are trivial to find and delete.
 *   • Uses a throwaway database instead, if you prefer: point RSVP_DB_PATH at
 *     something like data/demo.sqlite before running.
 *
 *   npm run db:seed-demo
 *   npm run db:seed-demo -- --force     # add demo rows alongside real ones
 *   node scripts/seed-demo.mjs --purge  # delete all demo rows
 */

import { openDb } from '../server/db.mjs';

const force = process.argv.includes('--force');
const purge = process.argv.includes('--purge');

const db = openDb();

if (purge) {
  const info = db.prepare("DELETE FROM rsvp WHERE guest_name LIKE 'DEMO%'").run();
  console.log(`✓ removed ${info.changes} demo row(s); real rows untouched.`);
  process.exit(0);
}

const existing = db.prepare("SELECT COUNT(*) AS n FROM rsvp WHERE guest_name NOT LIKE 'DEMO%'").get();
if (existing.n > 0 && !force) {
  console.error(`✗ This database already holds ${existing.n} real RSVP(s).`);
  console.error('  Refusing to mix demo data into the real register.');
  console.error('  Use a separate database:  RSVP_DB_PATH=data/demo.sqlite npm run db:seed-demo');
  console.error('  Or override deliberately: npm run db:seed-demo -- --force');
  process.exit(1);
}

const now = new Date();
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const istDay = (d) => new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

const demo = [
  { name: 'DEMO Aarav Mehta', phone: '9999900001', attendance: 'accepts', guests: 3, events: ['engagement', 'wedding'], message: 'So happy for you both!' },
  { name: 'DEMO Priya Nair', phone: '9999900002', attendance: 'accepts', guests: 2, events: ['wedding'], message: '' },
  { name: 'DEMO Rohan Gupta', phone: '9999900003', attendance: 'declines', guests: 0, events: [], message: 'Away that week — sending love.' },
  { name: 'DEMO Ishaan Rao', phone: '9999900004', attendance: 'accepts', guests: 1, events: ['engagement'], message: 'Will be there for the engagement.' },
  { name: 'DEMO Ananya Bose', phone: '9999900005', attendance: 'accepts', guests: 4, events: ['engagement', 'wedding'], message: 'Two of us are vegetarian.' },
];

const insert = db.prepare(`
  INSERT INTO rsvp (
    id, guest_name, phone_number, phone_e164, email,
    attendance_status, guest_count, event_keys, event_labels,
    meal_preference, special_requests,
    submitted_at, submitted_at_ist, submitted_utc, submitted_day,
    notification_status, notification_error, notification_attempts,
    client_token, dedupe_key, ip_hash, user_agent
  ) VALUES (
    ?,?,?,?,?, ?,?,?,?, ?,?, ?,?,?,?, ?,?,?, ?,?,?,?
  )
`);

let added = 0;
demo.forEach((d, i) => {
  const submitted = new Date(now.getTime() - (i + 1) * 37 * 60 * 1000);
  const id = `RSVP-DEMO${String(i + 1).padStart(2, '0')}`;
  const e164 = `91${d.phone}`;
  const eventLabels = d.events.join('; ');
  try {
    insert.run(
      id,
      d.name,
      d.phone,
      e164,
      `${d.phone}@example.invalid`,
      d.attendance,
      d.guests,
      JSON.stringify(d.events),
      eventLabels,
      '', // meal column retained, intentionally empty (question retired)
      d.message,
      submitted.toISOString(),
      istDay(submitted),
      submitted.toISOString(),
      istDay(submitted),
      'pending',
      'Demo row — never sent',
      0,
      `demo-token-${i + 1}`,
      `${e164}|${d.attendance}|${d.guests}|${d.events.join(',')}`,
      'demo',
      'seed-demo',
    );
    added += 1;
  } catch (err) {
    console.warn(`  skipped ${id}: ${err.message}`);
  }
});

console.log(`✓ inserted ${added} demo RSVP(s)`);
console.log('  View them at /admin  (search "DEMO")');
console.log('  Remove them later:   node scripts/seed-demo.mjs --purge');
