import { useState, useRef } from 'react';
import { Heart, Check, X, Send, Loader2, ChevronDown } from 'lucide-react';
import { submitRsvp, hasRemoteEndpoint } from '../lib/rsvp';

/**
 * THE ROYAL RSVP LETTER
 *
 * A Mughal invitation letter, drawn from the supplied artwork rather than
 * invented: the parchment is the warm ivory (#F7EBDD) of the arch opening, the
 * borders are the antique gold (#A87932) of its latticework, and the florals
 * echo the garlands that frame it. No white card, no glass, no neon.
 *
 * The artwork sits behind the panel at low contrast so the letter reads as a
 * sheet laid ON the invitation, not as a form placed in front of a picture.
 *
 * RESPONSIVE INTENT (each breakpoint reasoned, not one layout scaled):
 *   phones   — one column, generous side padding, 16px+ inputs so iOS never
 *              zooms on focus. The artwork stays behind but the panel is nearly
 *              opaque, because legibility beats decoration on a small screen.
 *   tablet   — same single column, narrower measure (~34rem) so lines stay
 *              readable, more air above and below.
 *   desktop  — the letter is capped at ~44rem and centred; the artwork's arch
 *              is visible either side of it, which is the whole point of the
 *              frame.
 *
 * PORTRAIT IS THE PRIMARY TARGET. The brief is explicit that nobody should have
 * to rotate a phone to answer an invitation.
 */

const EVENTS = [
  { key: 'engagement', name: 'The Engagement', venue: 'Sterling Banquet', when: 'Thursday, 10 December 2026' },
  { key: 'wedding', name: 'The Wedding', venue: 'Rudrakshaa Banquet', when: 'Saturday, 12 December 2026' },
];

const ATTENDANCE = [
  { key: 'accepts', label: 'Joyfully Accepts' },
  { key: 'declines', label: 'Regretfully Declines' },
];

function validate({ name, attendance, guests, events }) {
  const errors = {};

  if (!name.trim()) errors.name = 'Please write your full name.';
  else if (name.trim().length < 2) errors.name = 'That looks a little short — please write your full name.';

  if (!attendance) errors.attendance = 'Please let us know whether you can join us.';

  if (attendance === 'accepts') {
    const n = Number(guests);
    if (!Number.isInteger(n) || n < 1) errors.guests = 'Please tell us how many guests will attend.';
    else if (n > 10) errors.guests = 'For more than 10 guests, please write to us directly.';

    if (!events.length) errors.events = 'Please choose at least one celebration.';
  }

  return errors;
}

function OrnateRule() {
  return (
    <div className="mx-auto my-5 flex max-w-[13rem] items-center gap-2.5 text-[#a87932]" aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#a87932]/70" />
      <Heart className="h-3 w-3" fill="currentColor" fillOpacity="0.4" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#a87932]/70" />
    </div>
  );
}

function FieldLabel({ htmlFor, children, hint }) {
  return (
    <label htmlFor={htmlFor} className="font-cinzel mb-2 block text-[9px] font-semibold tracking-[0.22em] uppercase text-[#5c4937]">
      {children}
      {hint && <span className="ml-2 font-sans-clean text-[9px] tracking-[0.04em] normal-case text-[#8a7460]">{hint}</span>}
    </label>
  );
}

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="font-sans-clean mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-[#8f3b33]">
      <X className="mt-px h-3 w-3 shrink-0" />
      {children}
    </p>
  );
}

export default function RsvpSection({ isNight = false }) {
  const [name, setName] = useState('');
  const [attendance, setAttendance] = useState('');
  const [guests, setGuests] = useState('2');
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | done | failed
  const [resultMessage, setResultMessage] = useState('');
  const liveRef = useRef(null);

  const declines = attendance === 'declines';

  const toggleEvent = (key) => {
    setEvents((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    setErrors((e) => ({ ...e, events: undefined }));
  };

  const handleAttendance = (key) => {
    setAttendance(key);
    // Declining clears dependent answers so a stale guest count can never be
    // submitted alongside a "regretfully declines".
    if (key === 'declines') {
      setEvents([]);
      setGuests('0');
    } else {
      setGuests((g) => (g === '0' ? '2' : g));
    }
    setErrors((e) => ({ ...e, attendance: undefined, guests: undefined, events: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate({ name, attendance, guests, events });
    setErrors(found);
    if (Object.keys(found).length) {
      const first = document.getElementById(`rsvp-${Object.keys(found)[0]}`);
      if (first) first.focus();
      return;
    }

    setStatus('sending');
    const res = await submitRsvp({
      name: name.trim(),
      attendance,
      guests: declines ? 0 : Number(guests),
      events: declines ? [] : events,
      message: message.trim(),
    });

    if (res.ok) {
      setStatus('done');
      setResultMessage(
        res.remote
          ? 'Your response has reached Simran & Sachit.'
          : 'Saved on this device. This invitation is not yet connected to a response server, so your answer has not been sent to the couple.',
      );
    } else {
      setStatus('failed');
      setResultMessage(res.message);
    }

    requestAnimationFrame(() => {
      if (liveRef.current) liveRef.current.focus();
    });
  };

  const resetForm = () => {
    setName('');
    setAttendance('');
    setGuests('2');
    setEvents([]);
    setMessage('');
    setErrors({});
    setStatus('idle');
    setResultMessage('');
  };

  return (
    <section id="rsvp" className="relative w-full overflow-hidden bg-[#1a1410]">
      {/* The supplied artwork, behind the letter — DAY and NIGHT.
          Both layers are mounted and crossfade in place, exactly like the
          chapter backdrops above, so toggling the theme here cannot reflow the
          section or move the form the guest is filling in.

          Each is a real <img> inside a <picture>, not a CSS background, so the
          browser takes the WebP (502 KB day / 605 KB night) instead of the PNG
          (3.5 MB / 3.7 MB) and fetches it only when the guest reaches this
          section — `loading="lazy"` + `decoding="async"`. A background-image
          would have blocked first paint on a section nobody has scrolled to. */}
      {[
        { key: 'day', webp: '/assets/rsvp/invitation-background.webp', png: '/assets/rsvp/invitation-background.png', on: !isNight },
        { key: 'night', webp: '/assets/rsvp/night-background.webp', png: '/assets/rsvp/night-background.png', on: isNight },
      ].map((art) => (
        <div
          key={art.key}
          className={`absolute inset-0 overflow-hidden transition-opacity duration-[900ms] ease-linear ${
            art.on ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        >
          <picture>
            <source srcSet={art.webp} type="image/webp" />
            <img
              src={art.png}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-center"
            />
          </picture>
        </div>
      ))}

      {/* Scrims. The day parchment is light and needs a heavier warm wash to
          hold the gold type; the night artwork is already deep indigo, so it
          needs far less and the moon and lanterns stay legible behind the
          letter. Two sets, crossfading with the art, rather than one average
          overlay that would flatten both. */}
      <div
        className={`absolute inset-0 transition-opacity duration-[900ms] ease-linear ${
          isNight ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#120d09]/75 via-[#1a1410]/55 to-[#120d09]/85" />
        <div className="absolute inset-0 hidden lg:block lg:bg-[radial-gradient(ellipse_at_center,transparent_28%,rgba(18,13,9,0.55)_72%)]" />
      </div>
      <div
        className={`absolute inset-0 transition-opacity duration-[900ms] ease-linear ${
          isNight ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#03060e]/70 via-[#071022]/45 to-[#03060e]/82" />
        <div className="absolute inset-0 hidden lg:block lg:bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(3,6,14,0.6)_74%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl safe-pad-x py-[clamp(3rem,10dvh,6rem)]">
        {/* ---------------- THE LETTER ---------------- */}
        <div className="relative overflow-hidden rounded-[3px] border-2 border-[#a87932]/70 bg-[rgba(247,235,221,0.965)] shadow-[0_40px_90px_rgba(0,0,0,0.6),0_0_60px_rgba(168,121,50,0.18)]">
          {/* Double rule, the way an engraved plate is bordered. */}
          <div className="pointer-events-none absolute inset-[7px] rounded-[2px] border border-[#a87932]/45" />
          <div className="pointer-events-none absolute inset-[11px] rounded-[2px] border border-[#a87932]/20" />

          {/* Corner fleurons. */}
          {[
            'top-2 left-2',
            'top-2 right-2 rotate-90',
            'bottom-2 right-2 rotate-180',
            'bottom-2 left-2 -rotate-90',
          ].map((cls) => (
            <svg
              key={cls}
              className={`pointer-events-none absolute ${cls} h-5 w-5 text-[#a87932]/80`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              aria-hidden="true"
            >
              <path d="M2 22 L2 9 C2 5 5 2 9 2 L22 2" />
              <circle cx="7.5" cy="7.5" r="1.6" fill="currentColor" stroke="none" />
            </svg>
          ))}

          <div className="relative px-[clamp(1.1rem,5vw,3rem)] py-[clamp(1.8rem,6vw,3rem)]">
            {status === 'done' || status === 'failed' ? (
              /* ---------------- OUTCOME ---------------- */
              <div className="text-center" role="status" aria-live="polite">
                <div
                  ref={liveRef}
                  tabIndex={-1}
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border outline-none"
                  style={{
                    borderColor: status === 'done' ? 'rgba(168,121,50,0.6)' : 'rgba(143,59,51,0.6)',
                    background: status === 'done' ? 'rgba(168,121,50,0.12)' : 'rgba(143,59,51,0.08)',
                  }}
                >
                  {status === 'done' ? (
                    <Check className="h-7 w-7 text-[#a87932]" strokeWidth={2.2} />
                  ) : (
                    <X className="h-7 w-7 text-[#8f3b33]" strokeWidth={2.2} />
                  )}
                </div>

                <h3 className="font-script text-[clamp(1.7rem,7vw,2.4rem)] leading-tight text-[#5c4937]">
                  {status === 'done' ? 'Thank You' : 'Not Sent'}
                </h3>

                <OrnateRule />

                <p className="font-serif-body mx-auto max-w-md text-[clamp(0.95rem,3.9vw,1.1rem)] leading-relaxed text-[#5c4937] italic">
                  {resultMessage}
                </p>

                {status === 'done' && !hasRemoteEndpoint && (
                  <p className="font-sans-clean mx-auto mt-4 max-w-md text-[10px] leading-relaxed tracking-[0.04em] text-[#8a7460]">
                    A response server has not been configured for this invitation yet.
                  </p>
                )}

                <button
                  onClick={resetForm}
                  className="font-cinzel mt-7 inline-flex items-center gap-2 rounded-full border border-[#a87932]/60 px-6 py-2.5 text-[10px] font-semibold tracking-[0.2em] uppercase text-[#7a5b2a] transition-colors active:bg-[#a87932]/10"
                >
                  Write Another Response
                </button>
              </div>
            ) : (
              /* ---------------- THE FORM ---------------- */
              <form onSubmit={handleSubmit} noValidate>
                <header className="text-center">
                  <p className="font-cinzel text-[9px] font-semibold tracking-[0.32em] uppercase text-[#a87932]">
                    Kindly Respond
                  </p>
                  <h2 className="font-script mt-1.5 text-[clamp(1.9rem,8vw,2.9rem)] leading-tight text-[#5c4937]">
                    A Reply of the Heart
                  </h2>
                  <p className="font-serif-body mx-auto mt-2 max-w-sm text-[clamp(0.88rem,3.6vw,1rem)] leading-relaxed text-[#7d6650] italic">
                    Your presence would honour us. Pray, let us know your answer.
                  </p>
                  <OrnateRule />
                </header>

                {/* 1 — NAME */}
                <div className="mb-5">
                  <FieldLabel htmlFor="rsvp-name">Your Full Name</FieldLabel>
                  <input
                    id="rsvp-name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
                    }}
                    autoComplete="name"
                    placeholder="e.g. Ananya Sharma"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'rsvp-name-error' : undefined}
                    className={`font-serif-body w-full rounded-[2px] border bg-[rgba(255,252,246,0.75)] px-3.5 py-3 text-[16px] text-[#3f3327] placeholder:text-[#a89883] transition-colors outline-none focus:border-[#a87932] focus:bg-[rgba(255,252,246,0.95)] ${
                      errors.name ? 'border-[#8f3b33]/70' : 'border-[#a87932]/40'
                    }`}
                  />
                  <FieldError id="rsvp-name-error">{errors.name}</FieldError>
                </div>

                {/* 2 — ATTENDANCE */}
                <fieldset className="mb-5">
                  <legend className="font-cinzel mb-2 block text-[9px] font-semibold tracking-[0.22em] uppercase text-[#5c4937]">
                    Your Response
                  </legend>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="radiogroup" aria-invalid={Boolean(errors.attendance)}>
                    {ATTENDANCE.map((opt) => {
                      const active = attendance === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => handleAttendance(opt.key)}
                          className={`flex items-center gap-2.5 rounded-[2px] border px-3.5 py-3 text-left transition-all active:scale-[0.99] ${
                            active
                              ? 'border-[#a87932] bg-[rgba(168,121,50,0.14)] shadow-[inset_0_0_18px_rgba(168,121,50,0.12)]'
                              : 'border-[#a87932]/35 bg-[rgba(255,252,246,0.55)]'
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              active ? 'border-[#a87932] bg-[#a87932]' : 'border-[#a87932]/50'
                            }`}
                          >
                            {active && <span className="h-1.5 w-1.5 rounded-full bg-[#f7ebdd]" />}
                          </span>
                          <span className="font-cinzel text-[10.5px] font-semibold tracking-[0.1em] uppercase text-[#4a3d2f]">
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <FieldError id="rsvp-attendance-error">{errors.attendance}</FieldError>
                </fieldset>

                {/* 3 + 4 — hidden entirely when declining */}
                <div
                  className={`transition-all duration-500 ${
                    declines ? 'pointer-events-none mb-0 max-h-0 overflow-hidden opacity-0' : 'mb-5 max-h-[60rem] opacity-100'
                  }`}
                  aria-hidden={declines}
                >
                  {/* 3 — GUESTS */}
                  <div className="mb-5">
                    <FieldLabel htmlFor="rsvp-guests">Guests Attending</FieldLabel>
                    <div className="relative">
                      <select
                        id="rsvp-guests"
                        value={guests}
                        onChange={(e) => {
                          setGuests(e.target.value);
                          if (errors.guests) setErrors((x) => ({ ...x, guests: undefined }));
                        }}
                        disabled={declines}
                        aria-invalid={Boolean(errors.guests)}
                        className={`font-serif-body w-full appearance-none rounded-[2px] border bg-[rgba(255,252,246,0.75)] px-3.5 py-3 pr-10 text-[16px] text-[#3f3327] outline-none focus:border-[#a87932] ${
                          errors.guests ? 'border-[#8f3b33]/70' : 'border-[#a87932]/40'
                        }`}
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={String(n)}>
                            {n} {n === 1 ? 'guest' : 'guests'}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-[#a87932]" />
                    </div>
                    <FieldError id="rsvp-guests-error">{errors.guests}</FieldError>
                  </div>

                  {/* 4 — EVENTS */}
                  <fieldset>
                    <legend className="font-cinzel mb-2 block text-[9px] font-semibold tracking-[0.22em] uppercase text-[#5c4937]">
                      Celebrations You Will Attend
                    </legend>
                    <div className="space-y-2.5">
                      {EVENTS.map((ev) => {
                        const active = events.includes(ev.key);
                        return (
                          <button
                            key={ev.key}
                            type="button"
                            role="checkbox"
                            aria-checked={active}
                            onClick={() => toggleEvent(ev.key)}
                            disabled={declines}
                            className={`flex w-full items-start gap-3 rounded-[2px] border px-3.5 py-3 text-left transition-all active:scale-[0.995] ${
                              active
                                ? 'border-[#a87932] bg-[rgba(168,121,50,0.13)]'
                                : 'border-[#a87932]/35 bg-[rgba(255,252,246,0.55)]'
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border ${
                                active ? 'border-[#a87932] bg-[#a87932]' : 'border-[#a87932]/50'
                              }`}
                            >
                              {active && <Check className="h-3 w-3 text-[#f7ebdd]" strokeWidth={3} />}
                            </span>
                            <span className="min-w-0">
                              <span className="font-cinzel block text-[10.5px] font-semibold tracking-[0.1em] uppercase text-[#4a3d2f]">
                                {ev.name}
                              </span>
                              <span className="font-serif-body mt-0.5 block text-[13px] leading-snug text-[#7d6650]">
                                {ev.venue} · {ev.when}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <FieldError id="rsvp-events-error">{errors.events}</FieldError>
                  </fieldset>
                </div>

                {/* 5 — MESSAGE */}
                <div className="mb-5">
                  <FieldLabel htmlFor="rsvp-message" hint="optional">
                    A Blessing or Message
                  </FieldLabel>
                  <textarea
                    id="rsvp-message"
                    rows={3}
                    maxLength={500}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Your words of blessings…"
                    className="font-serif-body w-full resize-y rounded-[2px] border border-[#a87932]/40 bg-[rgba(255,252,246,0.75)] px-3.5 py-3 text-[16px] leading-relaxed text-[#3f3327] placeholder:text-[#a89883] outline-none transition-colors focus:border-[#a87932] focus:bg-[rgba(255,252,246,0.95)]"
                  />
                  <p className="font-sans-clean mt-1 text-right text-[9px] tracking-[0.06em] text-[#a89883]">
                    {message.length}/500
                  </p>
                </div>

                {/* 6 — SUBMIT */}
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="font-cinzel mt-6 flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#8f6726] via-[#b98f45] to-[#8f6726] px-6 py-3.5 text-[11px] font-bold tracking-[0.2em] uppercase text-[#fdf8ee] shadow-[0_10px_30px_rgba(120,86,34,0.35)] transition-all duration-300 active:scale-[0.99] disabled:opacity-70"
                >
                  {status === 'sending' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" /> Send Our Response
                    </>
                  )}
                </button>

                <p className="font-sans-clean mt-4 text-center text-[9px] leading-relaxed tracking-[0.04em] text-[#8a7460]">
                  Kindly respond by 25 November 2026.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
