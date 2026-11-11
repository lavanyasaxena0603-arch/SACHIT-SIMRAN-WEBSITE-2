/**
 * RSVP SUBMISSION
 *
 * HONESTY CONTRACT — this is the whole point of this file.
 *
 * This project is a static Vite SPA. There is no `functions/`, no `api/`, no
 * server and no database. So there are exactly two possible outcomes when the
 * guest presses "Send Our Response", and the UI must never confuse them:
 *
 *   1. An endpoint is configured (`VITE_RSVP_ENDPOINT`). We POST the response
 *      for real and only report success on a 2xx. If the request fails, the
 *      guest is told it failed — we do not swallow it and we do not pretend.
 *
 *   2. No endpoint is configured. The response is written to this device's
 *      localStorage and the success copy says so in plain words: saved on THIS
 *      DEVICE, not sent to the couple. Nothing is claimed that did not happen.
 *
 * To make responses actually reach the couple, set VITE_RSVP_ENDPOINT at build
 * time to a form endpoint that accepts a JSON POST — e.g. a Cloudflare Worker,
 * Formspree, or a Google Apps Script web app. Nothing else needs to change; the
 * form will start reporting "sent" the moment that variable exists.
 */

const ENDPOINT = (import.meta.env.VITE_RSVP_ENDPOINT || '').trim();
const LOCAL_KEY = 'simran-sachit-rsvp';

export const hasRemoteEndpoint = Boolean(ENDPOINT);

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * @param {object} payload
 * @returns {Promise<{ok:boolean, stored:boolean, remote:boolean, message:string}>}
 */
export async function submitRsvp(payload) {
  const record = { ...payload, submittedAt: new Date().toISOString() };

  if (ENDPOINT) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });

      if (!res.ok) {
        return {
          ok: false,
          stored: false,
          remote: true,
          message: `The response server replied with ${res.status}. Please try again in a moment.`,
        };
      }

      return { ok: true, stored: true, remote: true, message: 'sent' };
    } catch {
      return {
        ok: false,
        stored: false,
        remote: true,
        message: 'We could not reach the response server. Please check your connection and try again.',
      };
    }
  }

  // ---- No endpoint: keep it on this device, and say so. ----
  try {
    const list = readLocal();
    list.push(record);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    return { ok: true, stored: true, remote: false, message: 'local' };
  } catch {
    return {
      ok: false,
      stored: false,
      remote: false,
      message:
        'Your browser blocked local storage, so this response could not be saved anywhere. Please try a different browser.',
    };
  }
}
