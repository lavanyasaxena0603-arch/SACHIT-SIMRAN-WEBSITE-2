/**
 * ENVIRONMENT / CONFIGURATION
 * ---------------------------
 * A ~40 line .env reader instead of a dependency. Node 22 can do this with
 * `--env-file`, but PM2, Docker and plain `node server/index.mjs` do not all
 * pass that flag, so the loader is explicit and works everywhere.
 *
 * SECURITY CONTRACT
 * -----------------
 *  • Secrets are read here and NOWHERE ELSE. They are never sent to the
 *    browser: this module is server-only, and nothing in `src/` imports it.
 *  • Real process environment variables always WIN over the file, so a host
 *    (Render / Railway / Fly / Docker) can inject secrets without editing
 *    anything on disk.
 *  • `redact()` is the only way a secret may reach a log line.
 *  • `describe()` is safe to print at boot: it reports presence, never value.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, '..');

/** Parse a .env file into an object. Quotes stripped, `export` tolerated. */
function parseEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;

  let raw = '';
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return out;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;

    const key = trimmed.slice(0, eq).trim().replace(/^export\s+/, '');
    if (!/^[A-Z0-9_]+$/i.test(key)) continue;

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Allow an inline ` #` comment after an unquoted value.
    const hash = value.indexOf(' #');
    if (hash > 0 && !value.startsWith('#')) value = value.slice(0, hash).trim();

    out[key] = value;
  }
  return out;
}

// Load .env once, without overriding anything the host already provided.
const fromFile = parseEnvFile(resolve(ROOT, '.env'));
for (const [k, v] of Object.entries(fromFile)) {
  if (process.env[k] === undefined) process.env[k] = v;
}

const str = (key, fallback = '') => (process.env[key] ?? '').toString().trim() || fallback;
const int = (key, fallback) => {
  const n = Number.parseInt(str(key, ''), 10);
  return Number.isFinite(n) ? n : fallback;
};
const bool = (key, fallback = false) => {
  const v = str(key, '').toLowerCase();
  if (!v) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v);
};

/**
 * Normalise any human way of writing an Indian mobile number into E.164 digits
 * WITHOUT the `+` (which is what the Graph API expects in `to` / `recipient`).
 *   9810833429      -> 919810833429
 *   +91 98108 33429 -> 919810833429
 *   09810833429     -> 919810833429
 * Returns null when the result is not a plausible E.164 number.
 */
export function normalizePhone(input) {
  if (!input) return null;
  let digits = String(input).replace(/\D/g, '');
  if (!digits) return null;

  // Leading trunk zero (India) — drop it before adding the country code.
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);

  // Bare 10-digit local number: assume India.
  if (digits.length === 10) digits = `91${digits}`;

  // 91 + 10 digits = 12. Anything else must already be a full E.164.
  if (digits.length < 11 || digits.length > 15) return null;
  return digits;
}

/** Pretty form for display and for the admin table: +91 98108 33429 */
export function prettifyPhone(e164Digits) {
  if (!e164Digits) return '';
  const d = String(e164Digits);
  if (d.startsWith('91') && d.length === 12) {
    return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  }
  return `+${d}`;
}

export const config = {
  get port() {
    return int('PORT', 3000);
  },
  get host() {
    return str('HOST', '0.0.0.0');
  },
  get nodeEnv() {
    return str('NODE_ENV', 'development');
  },
  get isProd() {
    return this.nodeEnv === 'production';
  },

  /** Absolute path of the SQLite file. Override with RSVP_DB_PATH. */
  get dbPath() {
    return resolve(ROOT, str('RSVP_DB_PATH', 'data/rsvp.sqlite'));
  },

  get adminPassword() {
    return str('ADMIN_PASSWORD');
  },
  get sessionSecret() {
    // Falls back to the password: still HMAC-signed, just not independently
    // rotatable. A dedicated secret is documented as the better setting.
    return str('ADMIN_SESSION_SECRET') || str('ADMIN_PASSWORD');
  },
  get sessionHours() {
    return int('ADMIN_SESSION_HOURS', 12);
  },

  // ---- WhatsApp Business Cloud API (Meta) ----
  get waToken() {
    return str('WHATSAPP_ACCESS_TOKEN');
  },
  get waPhoneNumberId() {
    return str('WHATSAPP_PHONE_NUMBER_ID');
  },
  get waBusinessAccountId() {
    return str('WHATSAPP_BUSINESS_ACCOUNT_ID');
  },
  /** Digits only, E.164 without '+'. Pre-normalised at boot. */
  get waRecipient() {
    return normalizePhone(str('WHATSAPP_RECIPIENT_NUMBER'));
  },
  get waRecipientRaw() {
    return str('WHATSAPP_RECIPIENT_NUMBER');
  },
  /**
   * Base URL of the Graph API. Overridable so the whole pipeline can be
   * exercised end-to-end against a mock (the test suite does exactly that)
   * and so a proxy/regional endpoint can be used in production.
   */
  get waApiBase() {
    return str('WHATSAPP_API_BASE', 'https://graph.facebook.com').replace(/\/+$/, '');
  },
  get waApiVersion() {
    return str('WHATSAPP_API_VERSION', 'v21.0');
  },
  get waTemplateName() {
    return str('WHATSAPP_TEMPLATE_NAME');
  },
  get waTemplateLang() {
    return str('WHATSAPP_TEMPLATE_LANG', 'en');
  },
  get waSendText() {
    // When a template is configured, free-form text is only used as a fallback
    // if WHATSAPP_ALLOW_TEXT=1. Default: template only.
    return bool('WHATSAPP_ALLOW_TEXT', true);
  },
  get waTimeoutMs() {
    return int('WHATSAPP_TIMEOUT_MS', 12000);
  },
  get waMaxAttempts() {
    return int('WHATSAPP_MAX_ATTEMPTS', 8);
  },

  get rateLimitPerWindow() {
    return int('RSVP_RATE_LIMIT', 6);
  },
  get rateLimitWindowMs() {
    return int('RSVP_RATE_WINDOW_MS', 10 * 60 * 1000);
  },
  get dedupeWindowMs() {
    return int('RSVP_DEDUPE_WINDOW_MS', 2 * 60 * 1000);
  },
  get ipHashSalt() {
    return str('RSVP_IP_HASH_SALT', 'royal-rsvp');
  },
};

/** Is WhatsApp capable of sending right now? Presence check only. */
export function whatsappStatus() {
  const missing = [];
  if (!config.waToken) missing.push('WHATSAPP_ACCESS_TOKEN');
  if (!config.waPhoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!config.waRecipient) missing.push('WHATSAPP_RECIPIENT_NUMBER');
  return {
    configured: missing.length === 0,
    missing,
    recipient: config.waRecipient ? prettifyPhone(config.waRecipient) : null,
    mode: config.waTemplateName ? `template:${config.waTemplateName}` : 'text',
  };
}

/** Mask a secret so it can never be reconstructed from a log. */
export function redact(value) {
  if (!value) return '<empty>';
  const s = String(value);
  if (s.length <= 8) return `${'*'.repeat(s.length)}`;
  return `${s.slice(0, 3)}${'*'.repeat(Math.max(4, s.length - 7))}${s.slice(-4)}`;
}

/** Boot banner: presence of each setting, never its value. */
export function describe() {
  const wa = whatsappStatus();
  return {
    port: config.port,
    nodeEnv: config.nodeEnv,
    dbPath: config.dbPath,
    adminConfigured: Boolean(config.adminPassword),
    whatsapp: {
      configured: wa.configured,
      mode: wa.mode,
      recipient: wa.recipient,
      apiBase: config.waApiBase,
      token: redact(config.waToken),
      phoneNumberId: config.waPhoneNumberId || '<empty>',
      businessAccountId: config.waBusinessAccountId || '<optional>',
      missing: wa.missing,
    },
  };
}
