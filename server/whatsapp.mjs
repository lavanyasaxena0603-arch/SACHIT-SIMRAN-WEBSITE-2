/**
 * WHATSAPP BUSINESS CLOUD API — official Meta Graph endpoint.
 *
 * WHAT THIS IS NOT
 * ----------------
 * No whatsapp-web.js, no puppeteer on web.whatsapp.com, no scraping, no
 * "unofficial API" service. Those break WhatsApp's Terms and get the number
 * banned. This file speaks to exactly one thing: Meta's documented
 * `POST /{version}/{phone-number-id}/messages`.
 *
 * TEMPLATES VS FREE-FORM TEXT (the bit that usually gets missed)
 * -------------------------------------------------------------
 * A business may only send FREE-FORM text inside a 24-hour customer service
 * window that the recipient opened by messaging first. An RSVP notification is
 * business-INITIATED, so in production it must go as an approved TEMPLATE.
 *
 * Both paths are implemented:
 *   • WHATSAPP_TEMPLATE_NAME set  → template message (correct for production)
 *   • otherwise                   → free-form text (works immediately for
 *                                   testing, within the 24h window)
 *
 * The failure Meta returns for a closed window (error 131047) is recognised
 * explicitly and reported as a TEMPLATE_REQUIRED failure rather than as a
 * generic error, so the admin view tells the owner exactly what to fix.
 */

import { config, prettifyPhone } from './env.mjs';
import { labels } from './validate.mjs';

/** Every notification is composed here, so there is one source of truth. */
export function buildMessage(record) {
  const l = labels(record);
  const events = l.events === '—' ? 'Not attending' : l.events;
  const meal = l.meal === '—' ? 'Not applicable' : l.meal;
  const email = record.email || '—';
  const special = record.special_requests || '—';

  return [
    '💌 NEW WEDDING RSVP RECEIVED',
    '',
    'Wedding Invitation RSVP',
    '',
    `Guest Name: ${record.guest_name}`,
    `Mobile Number: ${prettifyPhone(record.phone_e164)}`,
    `Email: ${email}`,
    '',
    `Attendance: ${l.attendance}`,
    `Total Guests: ${record.guest_count}`,
    '',
    `Events Attending: ${events}`,
    `Meal Preference: ${meal}`,
    '',
    'Special Requests:',
    special,
    '',
    `RSVP ID: ${record.id}`,
    `Submitted At: ${record.submitted_at_ist}`,
    '',
    '-------------------------',
    'New response received through the wedding invitation website.',
  ].join('\n');
}

class WhatsAppError extends Error {
  constructor(message, { httpStatus = 0, code = 0, subcode = 0, retryable = false, kind = 'api' } = {}) {
    super(message);
    this.name = 'WhatsAppError';
    this.httpStatus = httpStatus;
    this.code = code;
    this.subcode = subcode;
    this.retryable = retryable;
    this.kind = kind;
  }
}

/** Which Graph error codes are worth retrying, and which are permanent. */
function classify(httpStatus, err) {
  const code = Number(err?.code || 0);
  const subcode = Number(err?.error_subcode || 0);
  const msg = String(err?.message || '').toLowerCase();

  // 131047: outside the 24h window → needs a template. Permanent until fixed
  // by configuration, so retrying the same call would just spam the log.
  if (code === 131047 || code === 131026 || msg.includes('re-engagement')) {
    return { retryable: false, kind: 'template-required' };
  }
  // 190: token expired / invalid. Permanent until the owner rotates it.
  if (code === 190 || httpStatus === 401) return { retryable: false, kind: 'auth' };
  // 100: bad request / wrong parameter. Permanent.
  if (code === 100 || httpStatus === 400) return { retryable: false, kind: 'bad-request' };
  // 131056 / 130429: pair or throughput rate limit. Temporary.
  if (code === 131056 || code === 130429 || httpStatus === 429) {
    return { retryable: true, kind: 'rate-limited' };
  }
  // 5xx from Meta, or a network failure (httpStatus 0). Temporary.
  if (httpStatus === 0 || httpStatus >= 500 || code === 131000) {
    return { retryable: true, kind: 'transient' };
  }
  if (subcode === 2494161 || msg.includes('timeout')) {
    return { retryable: true, kind: 'transient' };
  }
  return { retryable: false, kind: 'permanent' };
}

/** POST one message. Resolves {ok, httpStatus, messageId} or throws WhatsAppError. */
export async function sendWhatsAppMessage(record, { fetchImpl = globalThis.fetch } = {}) {
  const missing = [];
  if (!config.waToken) missing.push('WHATSAPP_ACCESS_TOKEN');
  if (!config.waPhoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!config.waRecipient) missing.push('WHATSAPP_RECIPIENT_NUMBER');
  if (missing.length) {
    throw new WhatsAppError(`WhatsApp is not configured: missing ${missing.join(', ')}`, {
      retryable: false,
      kind: 'not-configured',
    });
  }

  const body = buildMessage(record);
  const to = config.waRecipient;

  let payload;
  if (config.waTemplateName) {
    /* SINGLE-PARAMETER TEMPLATE.
       The template body is expected to be, literally:

         💌 NEW WEDDING RSVP RECEIVED

         {{1}}

       …so the whole formatted notification travels as one parameter and the
       mapping can never drift. `preview_url` is off: the text contains no link
       we want expanded. */
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: config.waTemplateName,
        language: { code: config.waTemplateLang },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: body }],
          },
        ],
      },
    };
  } else {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body },
    };
  }

  const url = `${config.waApiBase}/${config.waApiVersion}/${config.waPhoneNumberId}/messages`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.waTimeoutMs);

  let res;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.waToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    // Network-level failure (DNS, TLS, offline mock, abort). Always retryable.
    const msg = err?.name === 'AbortError' ? 'Request timed out' : err?.message || 'Network failure';
    throw new WhatsAppError(msg, { httpStatus: 0, retryable: true, kind: 'transient' });
  } finally {
    clearTimeout(timer);
  }

  let json = null;
  const text = await res.text().catch(() => '');
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const err = json?.error;
    const c = classify(res.status, err);
    throw new WhatsAppError(
      err?.error_user_msg || err?.message || `HTTP ${res.status}`,
      {
        httpStatus: res.status,
        code: Number(err?.code || 0),
        subcode: Number(err?.error_subcode || 0),
        retryable: c.retryable,
        kind: c.kind,
      },
    );
  }

  return {
    ok: true,
    httpStatus: res.status,
    messageId: json?.messages?.[0]?.id || '',
    mode: config.waTemplateName ? 'template' : 'text',
  };
}

/** Backoff: 30s, 1m, 2m, 5m, 10m, 30m, 1h, 2h — capped. */
export function backoffMs(attempts) {
  const steps = [30e3, 60e3, 120e3, 300e3, 600e3, 1800e3, 3600e3, 7200e3];
  return steps[Math.min(attempts, steps.length - 1)];
}

export { WhatsAppError };
