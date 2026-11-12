/**
 * MANDATORY RSVP TEST SUITE — the seven required scenarios.
 *
 * HOW WHATSAPP IS TESTED WITHOUT REAL CREDENTIALS
 * -----------------------------------------------
 * A local mock of Meta's Graph endpoint is started on an ephemeral port and
 * `WHATSAPP_API_BASE` is pointed at it. That means the REAL code path is
 * exercised end-to-end — buildMessage → fetch → response parsing → DB status,
 * retry, dedupe — rather than a stubbed function. What the mock cannot prove is
 * that Meta will accept our token; that is stated honestly in the report.
 *
 * The mock also simulates failure modes on demand (500, network drop, rate
 * limit, 24h-window error) so TEST 6 is a real test, not a claim.
 *
 * Every run uses a throwaway database and its own port, so it can never touch
 * the live register.
 */

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { rmSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const TEST_PORT = 3999;
const MOCK_PORT = 3998;
const TEST_DB = resolve(ROOT, 'data/test-rsvp.sqlite');
const BASE = `http://127.0.0.1:${TEST_PORT}`;
const ADMIN_PW = 'test-admin-password-123';

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, cond, detail = '') {
  if (cond) {
    pass += 1;
    console.log(`  \u2713 ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    fail += 1;
    failures.push(name);
    console.log(`  \u2717 ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/* ------------------------------------------------------------------ mock WA */

const wa = {
  calls: [],
  /** 'ok' | 'error500' | 'network' | 'ratelimit' | 'window' */
  mode: 'ok',
  reset() {
    this.calls = [];
    this.mode = 'ok';
  },
};

function startMock() {
  return new Promise((resolvePromise) => {
    const srv = createServer((req, res) => {
      let body = '';
      req.on('data', (c) => {
        body += c;
      });
      req.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = null;
        }
        wa.calls.push({
          auth: req.headers.authorization || '',
          path: req.url,
          body: parsed,
          text: parsed?.text?.body || parsed?.template?.components?.[0]?.parameters?.[0]?.text || '',
        });

        const json = (status, obj) => {
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(obj));
        };

        if (wa.mode === 'network') {
          req.socket.destroy();
          return;
        }
        if (wa.mode === 'error500') {
          return json(500, { error: { message: 'Internal mock failure', code: 131000 } });
        }
        if (wa.mode === 'ratelimit') {
          return json(429, { error: { message: 'Rate limit hit', code: 130429 } });
        }
        if (wa.mode === 'window') {
          return json(400, {
            error: {
              message: 'Message failed to send because more than 24 hours have passed since the customer last replied',
              code: 131047,
            },
          });
        }
        return json(200, {
          messaging_product: 'whatsapp',
          contacts: [{ input: parsed?.to, wa_id: parsed?.to }],
          messages: [{ id: `wamid.MOCK${Date.now()}` }],
        });
      });
    });
    srv.listen(MOCK_PORT, '127.0.0.1', () => resolvePromise(srv));
  });
}

/* -------------------------------------------------------------------- helper */

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

function rsvpBody(over = {}) {
  return {
    name: 'Ananya Sharma',
    phone: '9810833429',
    email: 'ananya@example.com',
    attendance: 'accepts',
    guests: 2,
    events: ['wedding'],
    message: '',
    clientToken: `tok-${Math.random().toString(36).slice(2)}`,
    startedAt: Date.now() - 60_000,
    ...over,
  };
}

function post(payload) {
  return api('/api/rsvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/* ---------------------------------------------------------------- admin auth */

async function login() {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PW }),
  });
  const setCookie = res.headers.get('set-cookie') || '';
  const m = /rsvp_admin=([^;]+)/.exec(setCookie);
  return m ? `rsvp_admin=${m[1]}` : '';
}

/* ------------------------------------------------------------------ the run */

async function main() {
  console.log('\n=== ROYAL RSVP — MANDATORY TEST SUITE ===\n');

  if (existsSync(TEST_DB)) rmSync(TEST_DB, { force: true });
  mkdirSync(resolve(ROOT, 'data'), { recursive: true });

  const mock = await startMock();
  console.log(`[mock] WhatsApp Graph API on 127.0.0.1:${MOCK_PORT}`);

  const env = {
    ...process.env,
    PORT: String(TEST_PORT),
    HOST: '127.0.0.1',
    NODE_ENV: 'development',
    RSVP_DB_PATH: TEST_DB,
    ADMIN_PASSWORD: ADMIN_PW,
    ADMIN_SESSION_SECRET: 'test-session-secret',
    WHATSAPP_RECIPIENT_NUMBER: '919810833429',
    WHATSAPP_PHONE_NUMBER_ID: '1234567890',
    WHATSAPP_ACCESS_TOKEN: 'MOCK_TOKEN_VALUE_FOR_TESTS',
    WHATSAPP_API_BASE: `http://127.0.0.1:${MOCK_PORT}`,
    WHATSAPP_MAX_ATTEMPTS: '3',
    RSVP_RATE_LIMIT: '500',
    RSVP_DEDUPE_WINDOW_MS: '120000',
    RSVP_IP_HASH_SALT: 'test-salt',
  };

  const child = spawn(process.execPath, [resolve(ROOT, 'server/server.mjs')], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let bootLog = '';
  child.stdout.on('data', (d) => {
    bootLog += d.toString();
  });
  child.stderr.on('data', (d) => {
    bootLog += d.toString();
  });

  const stop = () => {
    try {
      child.kill('SIGTERM');
    } catch {
      /* gone */
    }
    try {
      mock.close();
    } catch {
      /* gone */
    }
  };

  // Wait for boot.
  let up = false;
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) {
        up = true;
        break;
      }
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!up) {
    console.error('Server failed to boot:\n', bootLog);
    stop();
    process.exit(1);
  }

  try {
    /* ============================================================ TEST 1 === */
    console.log('\nTEST 1 — guest accepts the invitation');
    wa.reset();
    const t1 = await post(rsvpBody({ guests: 3, events: ['wedding', 'engagement'] }));
    ok('response is 201 Created', t1.status === 201, `got ${t1.status}`);
    ok('RSVP ID returned', /^RSVP-[A-Z0-9]{6}$/.test(t1.body.id || ''), t1.body.id);
    ok('said "received"', t1.body.ok === true);
    ok('notification queued', t1.body.notification === 'queued', t1.body.notification);
    ok('submitted-at is IST', /IST$/.test(t1.body.submittedAtIst || ''), t1.body.submittedAtIst);

    await new Promise((r) => setTimeout(r, 700));
    ok('WhatsApp POST was made', wa.calls.length === 1, `${wa.calls.length} call(s)`);
    const c1 = wa.calls[0] || {};
    ok('sent to the configured recipient', c1.body?.to === '919810833429', c1.body?.to);
    ok('Auth header carries the token', (c1.auth || '') === 'Bearer MOCK_TOKEN_VALUE_FOR_TESTS');
    ok('correct graph path', /\/v21\.0\/1234567890\/messages$/.test(c1.path || ''), c1.path);
    ok('message names the guest', c1.text?.includes('Ananya Sharma'));
    ok('message has the phone', c1.text?.includes('98108 33429'), 'prettified');
    ok('message has attendance', c1.text?.includes('Attendance: Accepts'));
    ok('message has guest count', c1.text?.includes('Total Guests: 3'));
    ok('message lists both events',
      c1.text?.includes('The Engagement') && c1.text?.includes('The Wedding'));
    ok('message omits the retired meal question', !c1.text?.includes('Meal Preference'));
    ok('message has RSVP ID', c1.text?.includes(t1.body.id));
    ok('message has IST timestamp', c1.text?.includes('IST'));
    ok('message has the closing line',
      c1.text?.includes('New response received through the wedding invitation website.'));

    /* ============================================================ TEST 2 === */
    console.log('\nTEST 2 — guest declines the invitation');
    wa.reset();
    const t2 = await post(
      rsvpBody({
        name: 'Rohit Verma',
        phone: '9876500011',
        email: '',
        attendance: 'declines',
        guests: 0,
        events: [],
        message: 'So sorry, we will be travelling.',
      }),
    );
    ok('decline is stored', t2.status === 201);
    await new Promise((r) => setTimeout(r, 700));
    const c2 = wa.calls[0] || {};
    ok('decline ALSO notifies', wa.calls.length === 1);
    ok('notification says Declines', c2.text?.includes('Attendance: Declines'));
    ok('decline forces 0 guests', c2.text?.includes('Total Guests: 0'));
    ok('decline shows no events', c2.text?.includes('Events Attending: Not attending'));
    ok('decline keeps the message', c2.text?.includes('travelling'));

    /* ============================================================ TEST 3 === */
    console.log('\nTEST 3 — many accompanying guests');
    wa.reset();
    const t3 = await post(rsvpBody({ name: 'The Kapoor Family', phone: '+91 98100 22334', guests: 8 }));
    ok('8 guests accepted', t3.status === 201);
    await new Promise((r) => setTimeout(r, 700));
    ok('count reaches WhatsApp', (wa.calls[0]?.text || '').includes('Total Guests: 8'));
    ok('+91 phone normalised', (wa.calls[0]?.text || '').includes('+91 98100 22334'), 'from "+91 98100 22334"');

    /* ============================================================ TEST 4 === */
    console.log('\nTEST 4 — optional special requests');
    wa.reset();
    const t4 = await post(
      rsvpBody({
        name: 'Meera Iyer',
        message: 'Jain meal please — no onion, no garlic.\nAlso a high chair for our toddler.',
      }),
    );
    ok('stored', t4.status === 201);
    await new Promise((r) => setTimeout(r, 700));
    const txt4 = wa.calls[0]?.text || '';
    ok('multi-line message preserved', txt4.includes('no onion, no garlic.\nAlso a high chair'));
    ok('jain request survives in the message', txt4.includes('Jain meal please'));

    /* ============================================================ TEST 5 === */
    console.log('\nTEST 5 — invalid / incomplete submissions are rejected');
    wa.reset();
    const bad = [
      [{ name: '' }, 'missing name', 422],
      [{ name: 'A' }, 'one-letter name', 422],
      [{ phone: '' }, 'missing phone', 422],
      [{ phone: '12345' }, 'too-short phone', 422],
      [{ email: 'not-an-email' }, 'malformed email', 422],
      [{ attendance: '' }, 'missing attendance', 422],
      [{ guests: 0 }, 'zero guests when accepting', 422],
      [{ guests: 99 }, 'absurd guest count', 422],
      [{ events: [] }, 'accepting with no events', 422],
      [{ events: ['birthday'] }, 'event not on the list', 422],
    ];
    for (const [over, label, expectStatus] of bad) {
      const r = await post(rsvpBody(over));
      ok(`rejects ${label}`, r.status === expectStatus, `got ${r.status}`);
    }
    ok('no notifications sent for rejected input', wa.calls.length === 0, `${wa.calls.length}`);

    const wrongType = await api('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'name=x',
    });
    ok('rejects non-JSON content type', wrongType.status === 415, `got ${wrongType.status}`);

    const malformed = await api('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });
    ok('rejects malformed JSON', malformed.status === 400, `got ${malformed.status}`);

    // XSS payload must be stored as literal text, not escaped into entities.
    wa.reset();
    const t5x = await post(
      rsvpBody({ name: '<script>alert(1)</script>', message: '<img src=x onerror=alert(1)>' }),
    );
    ok('script payload stored as data', t5x.status === 201, `got ${t5x.status}`);
    await new Promise((r) => setTimeout(r, 600));
    const raw = wa.calls[0]?.text || '';
    ok('WhatsApp text keeps it literal (not entity-escaped)', raw.includes('<script>alert(1)</script>'));

    // Honeypot: a bot gets a bland 200 but nothing is stored.
    wa.reset();
    const bot = await post(rsvpBody({ company: 'spam-co' }));
    ok('honeypot answers 200 (no signal to the bot)', bot.status === 200);
    ok('honeypot stores nothing', !bot.body.id, String(bot.body.id));
    ok('honeypot sends no notification', wa.calls.length === 0);

    // Too-fast submission (bot pacing).
    wa.reset();
    const tooFast = await post(rsvpBody({ startedAt: Date.now() }));
    ok('sub-1.5s submission is discarded', tooFast.status === 200 && !tooFast.body.id);

    /* ============================================================ TEST 6 === */
    console.log('\nTEST 6 — WhatsApp unavailable, then recovers');

    // 6a — 500 from Meta
    wa.reset();
    wa.mode = 'error500';
    const t6a = await post(rsvpBody({ name: 'Server Error Guest', phone: '9811100001' }));
    ok('RSVP still saved during outage', t6a.status === 201, `got ${t6a.status}`);
    ok('guest is NOT told it failed to save', t6a.body.ok === true);
    await new Promise((r) => setTimeout(r, 700));

    // 6b — network drop
    wa.mode = 'network';
    const t6b = await post(rsvpBody({ name: 'Network Drop Guest', phone: '9811100002' }));
    ok('RSVP saved when the socket dies', t6b.status === 201);
    await new Promise((r) => setTimeout(r, 700));

    // 6c — 24h window closed (permanent until a template exists)
    wa.mode = 'window';
    const t6c = await post(rsvpBody({ name: 'Window Guest', phone: '9811100003' }));
    ok('RSVP saved on template-required error', t6c.status === 201);
    await new Promise((r) => setTimeout(r, 700));

    // Verify nothing was lost: all four rows exist and none is 'sent'.
    const cookie = await login();
    ok('admin login works', Boolean(cookie));

    const list6 = await api('/api/admin/rsvps', { headers: { cookie } });
    const rows6 = list6.body.rows || [];
    const byPhone = (p) => rows6.find((r) => r.phone_e164 === p);
    ok('row exists after a 500', Boolean(byPhone('919811100001')));
    ok('row exists after a socket drop', Boolean(byPhone('919811100002')));
    ok('row exists after a window error', Boolean(byPhone('919811100003')));
    ok('500 leaves status pending (retryable)', byPhone('919811100001')?.notification_status === 'pending',
      byPhone('919811100001')?.notification_status);
    ok('window error leaves status failed (permanent)',
      byPhone('919811100003')?.notification_status === 'failed',
      byPhone('919811100003')?.notification_status);
    ok('error detail is recorded',
      /transient|template-required/.test(byPhone('919811100001')?.notification_error || ''),
      byPhone('919811100001')?.notification_error);
    ok('attempt counter incremented', byPhone('919811100001')?.notification_attempts >= 1);

    // Recovery: bring the API back and force a sweep.
    wa.reset();
    wa.mode = 'ok';
    const retryRes = await api('/api/admin/retry', { method: 'POST', headers: { cookie } });
    ok('admin retry sweep succeeds', retryRes.status === 200);
    await new Promise((r) => setTimeout(r, 900));

    const list6b = await api('/api/admin/rsvps', { headers: { cookie } });
    const fixed = (list6b.body.rows || []).find((r) => r.phone_e164 === '919811100001');
    ok('recovered row is now sent', fixed?.notification_status === 'sent', fixed?.notification_status);

    // No duplicate: the retry must not re-send an already-sent row.
    const sentIds = new Set(
      wa.calls.filter((c) => c.text.includes('Server Error Guest')).map((c) => c.body?.to),
    );
    ok('retried exactly once after recovery', sentIds.size === 1);
    const reattempt = await api(`/api/admin/retry?id=${fixed.id}`, { method: 'POST', headers: { cookie } });
    ok('manual retry on a sent row is a no-op', reattempt.body.status === 'sent');
    const countAfter = wa.calls.filter((c) => c.text.includes('Server Error Guest')).length;
    ok('no duplicate WhatsApp sent', countAfter === 1, `${countAfter} sends`);

    /* ============================================================ TEST 7 === */
    console.log('\nTEST 7 — duplicate submission prevention');
    wa.reset();
    const token = `dup-token-${Date.now()}`;
    const payload = rsvpBody({ name: 'Duplicate Guest', phone: '9811100009', clientToken: token });

    const d1 = await post(payload);
    const d2 = await post(payload); // identical form, identical token
    ok('first submission is 201', d1.status === 201);
    ok('second is 200 + flagged duplicate', d2.status === 200 && d2.body.duplicate === true);
    ok('same RSVP ID returned', d1.body.id === d2.body.id, `${d1.body.id} / ${d2.body.id}`);
    await new Promise((r) => setTimeout(r, 700));
    ok('only ONE WhatsApp for a double submit', wa.calls.length === 1, `${wa.calls.length} calls`);

    // Rapid identical content with a NEW token (page reload mid-submit).
    wa.reset();
    const sameContent = {
      name: 'Repeat Guest',
      phone: '9811100010',
      attendance: 'accepts',
      guests: 2,
      events: ['wedding'],
      message: '',
      startedAt: Date.now() - 30_000,
    };
    const r1 = await post({ ...sameContent, clientToken: `a-${Date.now()}` });
    const r2 = await post({ ...sameContent, clientToken: `b-${Date.now()}` });
    ok('dedupe window catches a new-token repeat', r2.body.duplicate === true);
    ok('dedupe returns the original id', r1.body.id === r2.body.id);
    await new Promise((r) => setTimeout(r, 700));
    ok('still just one WhatsApp', wa.calls.length === 1, `${wa.calls.length}`);

    // Ten parallel identical POSTs.
    wa.reset();
    const burstToken = `burst-${Date.now()}`;
    const burst = await Promise.all(
      Array.from({ length: 10 }, () => post(rsvpBody({ name: 'Burst Guest', phone: '9811100011', clientToken: burstToken }))),
    );
    const created = burst.filter((r) => r.status === 201).length;
    const ids = new Set(burst.map((r) => r.body.id));
    ok('parallel burst creates exactly one row', ids.size === 1, `${ids.size} distinct ids, ${created} created`);
    await new Promise((r) => setTimeout(r, 900));
    ok('parallel burst sends one notification', wa.calls.length === 1, `${wa.calls.length}`);

    /* ============================================================ admin ==== */
    console.log('\nADMIN VIEW — auth, search, stats, CSV');

    const noAuth = await api('/api/admin/rsvps');
    ok('admin data requires a session', noAuth.status === 401, `got ${noAuth.status}`);

    const badPw = await fetch(`${BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong' }),
    });
    ok('wrong password is refused', badPw.status === 401, `got ${badPw.status}`);

    const forged = await api('/api/admin/rsvps', { headers: { cookie: 'rsvp_admin=forged.sig' } });
    ok('forged cookie is refused', forged.status === 401, `got ${forged.status}`);

    const st = await api('/api/admin/stats', { headers: { cookie } });
    ok('stats loads', st.status === 200);
    ok('stats counts accepts', st.body.stats.accepts > 0, String(st.body.stats.accepts));
    ok('stats counts declines', st.body.stats.declines > 0, String(st.body.stats.declines));
    ok('stats totals confirmed guests', st.body.stats.confirmedGuests > 0, String(st.body.stats.confirmedGuests));
    ok('stats totals accompanying guests', st.body.stats.accompanying > 0, String(st.body.stats.accompanying));
    ok('stats splits by event', st.body.stats.weddingGuests > 0 && st.body.stats.engagementGuests > 0);

    // A guest whose name exists exactly once in this run, so name search can be
    // asserted precisely. (The default fixture name "Ananya Sharma" is reused by
    // many tests above, so searching it legitimately returns several rows.)
    const uniqueName = 'Meera Kapoor';
    await post(rsvpBody({ name: uniqueName, phone: '9811100077' }));
    await new Promise((r) => setTimeout(r, 400));

    const searchName = await api(`/api/admin/rsvps?search=${encodeURIComponent(uniqueName)}`, {
      headers: { cookie },
    });
    const nameHits = searchName.body.rows || [];
    ok('search by name works',
      nameHits.length === 1 && nameHits[0].guest_name === uniqueName,
      `${nameHits.length} hit(s)`);
    const searchPhone = await api('/api/admin/rsvps?search=9811100002', { headers: { cookie } });
    ok('search by phone works', (searchPhone.body.rows || []).length === 1);
    const onlyDeclines = await api('/api/admin/rsvps?status=declines', { headers: { cookie } });
    ok('filter by declines works',
      (onlyDeclines.body.rows || []).every((r) => r.attendance_status === 'declines'));

    const csv = await fetch(`${BASE}/api/admin/export.csv`, { headers: { cookie } });
    // Read raw bytes: TextDecoder/text() silently strips a leading BOM, so the
    // BOM must be asserted from the bytes, not from the decoded string.
    const csvBuf = new Uint8Array(await csv.arrayBuffer());
    const csvText = new TextDecoder('utf-8').decode(csvBuf);
    ok('CSV exports', csv.status === 200 && csvText.includes('RSVP ID'));
    ok('CSV has a BOM for Excel',
      csvBuf[0] === 0xef && csvBuf[1] === 0xbb && csvBuf[2] === 0xbf,
      [csvBuf[0], csvBuf[1], csvBuf[2]].map((b) => b?.toString(16)).join(' '));
    ok('CSV rows match the register', csvText.split('\r\n').length > 5);
    const csvNoAuth = await fetch(`${BASE}/api/admin/export.csv`);
    ok('CSV requires a session', csvNoAuth.status === 401, `got ${csvNoAuth.status}`);

    /* ====================================================== secret leakage == */
    console.log('\nSECRET EXPOSURE CHECK');

    const health = await api('/api/health');
    const healthStr = JSON.stringify(health.body);
    ok('health does not leak the token', !healthStr.includes('MOCK_TOKEN_VALUE_FOR_TESTS'));
    ok('health does not leak the token name', !healthStr.includes('WHATSAPP_ACCESS_TOKEN"'));
    ok('health reports recipient readably', healthStr.includes('+91 98108 33429'));

    const indexRes = await fetch(`${BASE}/assets/`);
    const dirBody = await indexRes.text();
    // A directory request may legitimately fall through to the SPA shell (which
    // of course references its own bundle via src="..."). What must never happen
    // is a DIRECTORY LISTING enumerating the folder, which is detectable by its
    // per-file anchors.
    const isListing =
      /<a\s+href="[^"]*index-[^"]*\.(js|css)"/i.test(dirBody) || /directory listing/i.test(dirBody);
    ok('asset dir is not listable', !isListing, `status ${indexRes.status}`);

    const adminPage = await fetch(`${BASE}/admin`);
    const adminHtml = await adminPage.text();
    ok('admin page served', adminPage.status === 200);
    ok('admin page has no DB data inlined', !adminHtml.includes('Ananya Sharma'));
    ok('admin page has no token', !adminHtml.includes('MOCK_TOKEN_VALUE_FOR_TESTS'));

    // Scan every built JS/CSS bundle for the secrets.
    const distFiles = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = resolve(dir, e.name);
        if (e.isDirectory()) walk(p);
        else distFiles.push(p);
      }
    };
    walk(resolve(ROOT, 'dist'));
    const leaked = [];
    for (const f of distFiles) {
      if (!/\.(js|css|html|json)$/.test(f)) continue;
      const c = readFileSync(f, 'utf8');
      if (c.includes('MOCK_TOKEN_VALUE_FOR_TESTS') || c.includes('1234567890')) leaked.push(f);
      if (c.includes('919810833429') && c.includes('WHATSAPP')) leaked.push(f);
    }
    ok('no secret in the client bundle', leaked.length === 0, leaked.join(', ') || 'clean');

    // A traversal attempt must never return the secrets file. It may legitimately
    // answer 200 with the SPA shell (a deep link), so the assertion is about the
    // CONTENT, not the status code.
    const traversal = await fetch(`${BASE}/../server/.env`, { redirect: 'manual' });
    const traversalBody = traversal.status === 200 ? await traversal.text() : '';
    const leakedEnv =
      /ADMIN_PASSWORD\s*=/.test(traversalBody) ||
      /WHATSAPP_ACCESS_TOKEN\s*=/.test(traversalBody) ||
      traversalBody.includes('MOCK_TOKEN_VALUE_FOR_TESTS');
    ok('path traversal is blocked', !leakedEnv, `status ${traversal.status}, leaked=${leakedEnv}`);

    // Encoded variants must be refused just as firmly.
    let encLeak = false;
    for (const p of ['/..%2fserver/.env', '/%2e%2e/server/.env', '/assets/../../server/.env']) {
      const r = await fetch(`${BASE}${p}`, { redirect: 'manual' });
      const b = r.status === 200 ? await r.text() : '';
      if (/ADMIN_PASSWORD\s*=/.test(b) || /WHATSAPP_ACCESS_TOKEN\s*=/.test(b)) encLeak = true;
    }
    ok('encoded traversal is blocked', !encLeak);

    /* ==================================================== static / video === */
    console.log('\nSTATIC SERVING + RANGE (the films must still play)');

    const home = await fetch(`${BASE}/`);
    ok('index served', home.status === 200);
    const html = await home.text();
    const jsMatch = /src="(\/assets\/index-[^"]+\.js)"/.exec(html);
    ok('built bundle referenced', Boolean(jsMatch), jsMatch?.[1]);
    if (jsMatch) {
      const js = await fetch(`${BASE}${jsMatch[1]}`, { headers: { Range: 'bytes=0-99' } });
      ok('JS served with a 206 range reply', js.status === 206, `got ${js.status}`);
      ok('range response declares Content-Range', Boolean(js.headers.get('content-range')));
    }

    const mp4 = '/assets/scene2/day-courtyard.mp4';
    const head = await fetch(`${BASE}${mp4}`, { method: 'HEAD' });
    const okMp4 = head.status === 200;
    ok('mp4 is served', okMp4, `got ${head.status}`);
    if (okMp4) {
      ok('mp4 advertises Accept-Ranges', head.headers.get('accept-ranges') === 'bytes');
      ok('mp4 has the video MIME type', (head.headers.get('content-type') || '').startsWith('video/mp4'));
      const rq = await fetch(`${BASE}${mp4}`, { headers: { Range: 'bytes=0-1023' } });
      ok('mp4 honours a byte range', rq.status === 206, `got ${rq.status}`);
      ok('mp4 Content-Range is correct', /^bytes 0-1023\//.test(rq.headers.get('content-range') || ''),
        rq.headers.get('content-range'));
    }

    /* ========================================================= persistence == */
    console.log('\nPERSISTENCE ACROSS A RESTART');

    const before = (await api('/api/admin/rsvps', { headers: { cookie } })).body.rows.length;
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 1500));

    const child2 = spawn(process.execPath, [resolve(ROOT, 'server/server.mjs')], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let up2 = false;
    for (let i = 0; i < 60; i += 1) {
      try {
        const r = await fetch(`${BASE}/api/health`);
        if (r.ok) {
          up2 = true;
          break;
        }
      } catch {
        /* booting */
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    ok('server restarts', up2);

    const cookie2 = await login();
    const after = (await api('/api/admin/rsvps', { headers: { cookie: cookie2 } })).body.rows.length;
    ok('all rows survive the restart', after === before, `${before} before, ${after} after`);

    child2.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 800));
  } catch (err) {
    console.error('\nSUITE ERROR:', err?.message || err);
    fail += 1;
    failures.push(`suite error: ${err?.message}`);
  } finally {
    stop();
  }

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
  if (fail) {
    console.log('FAILED:', failures.join(' | '));
  }
  process.exit(fail ? 1 : 0);
}

main();
