#!/usr/bin/env node
/**
 * FIRST-RUN SETUP — generates your private admin credential.
 *
 *   npm run setup
 *
 * Creates `.env` from `.env.example` if it does not exist, then fills in
 *
 *   ADMIN_PASSWORD        a fresh random password (printed ONCE, to you only)
 *   ADMIN_SESSION_SECRET  a separate random signing key for the admin cookie
 *   RSVP_IP_HASH_SALT     a random salt for hashing visitor IPs
 *
 * WHY THIS EXISTS
 * ---------------
 * A password that ships in a ZIP, a README, or a chat transcript is not a
 * secret — it is a published credential. So none is baked into the source: you
 * generate one locally, it is written only to the git-ignored `.env`, and it is
 * never printed again by this script. Re-run with --rotate to invalidate the old
 * one (this also signs out every existing admin session).
 *
 * Non-interactive, so it works in CI and on any OS.
 */

import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV = resolve(ROOT, '.env');
const EXAMPLE = resolve(ROOT, '.env.example');

const rotate = process.argv.includes('--rotate');

/** A password a human can retype from a password manager without ambiguity. */
function makePassword(len = 24) {
  // No 0/O/1/l/I — avoids transcription errors when typed on a phone.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(len * 2);
  let out = '';
  for (let i = 0; out.length < len && i < bytes.length; i += 1) {
    // 256 % 54 leaves a tiny modulo bias; irrelevant for a 24-char secret.
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

const b64 = (n) => randomBytes(n).toString('base64url');

if (!existsSync(ENV)) {
  if (!existsSync(EXAMPLE)) {
    console.error('✗ .env.example is missing — cannot create .env.');
    process.exit(1);
  }
  copyFileSync(EXAMPLE, ENV);
  console.log('✓ created .env from .env.example');
}

let text = readFileSync(ENV, 'utf8');
const password = makePassword(24);

/**
 * Set KEY=value, replacing an existing (possibly filled) line, or appending it.
 * Deliberately does not touch any other key, so your WhatsApp settings survive.
 */
function setKey(src, key, value) {
  const re = new RegExp(`^[\\t ]*${key}[\\t ]*=.*$`, 'm');
  if (re.test(src)) return src.replace(re, `${key}=${value}`);
  return `${src.replace(/\s*$/, '')}\n${key}=${value}\n`;
}

/**
 * Is this key set to a real (non-blank) value?
 *
 * `\\s` is deliberately NOT used after the `=` — it matches newlines, which made
 * `ADMIN_PASSWORD=` (blank, followed by another line) read as "already set" and
 * silently skip generating a password. Only horizontal whitespace is allowed.
 */
function hasValue(src, key) {
  return new RegExp(`^[\\t ]*${key}[\\t ]*=[\\t ]*\\S`, 'm').test(src);
}

const hadPassword = hasValue(text, 'ADMIN_PASSWORD');

if (hadPassword && !rotate) {
  console.log('• ADMIN_PASSWORD already set — left untouched.');
  console.log('  To replace it (and invalidate old sessions):  npm run setup -- --rotate');
} else {
  text = setKey(text, 'ADMIN_PASSWORD', password);
  text = setKey(text, 'ADMIN_SESSION_SECRET', b64(32));
  text = setKey(text, 'RSVP_IP_HASH_SALT', b64(16));
  writeFileSync(ENV, text, { mode: 0o600 });
  console.log(rotate ? '✓ rotated ADMIN_PASSWORD' : '✓ generated ADMIN_PASSWORD');
  console.log('✓ set ADMIN_SESSION_SECRET and RSVP_IP_HASH_SALT');
  console.log('');
  console.log('  ┌─────────────────────────────────────────────────────');
  console.log('  │ ADMIN PASSWORD — shown once. Store it now.');
  console.log('  │');
  console.log(`  │   ${password}`);
  console.log('  │');
  console.log('  │ admin view: http://localhost:3000/admin');
  console.log('  └─────────────────────────────────────────────────────');
  console.log('');
  console.log('  Written to .env only (git-ignored, excluded from the ZIP).');
}

// Keep file permissions tight on POSIX; Windows ACLs are not managed here.
if (process.platform !== 'win32') {
  try {
    writeFileSync(ENV, readFileSync(ENV), { mode: 0o600 });
  } catch {
    /* best effort */
  }
}

const waToken = hasValue(text, 'WHATSAPP_ACCESS_TOKEN');
const waPhoneId = hasValue(text, 'WHATSAPP_PHONE_NUMBER_ID');
console.log(
  waToken && waPhoneId
    ? '✓ WhatsApp credentials present'
    : '• WhatsApp not configured yet — RSVPs still save to the database and are queued as "pending".',
);
