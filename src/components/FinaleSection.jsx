import { useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { playSafely } from '../lib/videoSwap';

/**
 * THE GRAND ROYAL WEDDING FINALE — night only.
 *
 * WHY THIS IS A COMPONENT OF ITS OWN, SITTING AFTER THE RSVP
 * ---------------------------------------------------------
 * It is a chapter like every other: a real <section> in normal document flow,
 * so the browser scrolls it in from below and no gap or black frame can open
 * against the RSVP above it. It is mounted by <App /> as a sibling of
 * <InvitationScroll /> and <RsvpSection />, so none of those files are touched.
 *
 * THE THREE ACTS
 * --------------
 *   1. palace reveal   the approved still, full-bleed, settling out of the fade
 *   2. varmala         the generated image-to-video clip, played ONCE
 *   3. fireworks       the same clip's climax, which the scroll then enters
 *
 * THE BACKGROUND IS NEVER REPLACED
 * --------------------------------
 * The still is a permanent base layer. The film fades in over it and stays
 * mounted, and the parchment rises on top of both. At no point does the palace
 * disappear, go black, or hand over to a different page — the whole act happens
 * in one frame, which is the brief's Part 3.
 *
 * AUTOPLAY
 * --------
 * The clip is muted + playsinline, so it starts on its own. If a browser still
 * refuses, the stage does not stall: a tap target appears and, failing that, the
 * failsafe timer opens the scroll anyway. Nobody is ever stuck looking at a
 * frozen frame with no way forward.
 *
 * NO LOOP, EVER
 * -------------
 * The <video> carries no `loop`. It plays once, ends on its last frame, and the
 * scroll entrance follows. Scrolling back up and down again does not restart it.
 *
 * REDUCED MOTION
 * --------------
 * The film is not played at all. The still is shown, the parchment is already
 * fully open, and every line of text is present. Nothing moves.
 */

const STILL = '/assets/finale/palace-still.webp';
const STILL_FALLBACK = '/assets/finale/palace-still.png';
const FILM = '/assets/finale/varmala-fireworks-night.mp4';
const FILM_POSTER = '/assets/finale/varmala-poster.jpg';
const SCROLL_ART = '/assets/finale/invitation-scroll.png';

/* The unroll is the one long beat, and its length is the brief's, not mine. */
const ENTER_MS = 820; // parchment rises into the foreground
const UNROLL_MS = 3400; // physical top-to-bottom unroll
const HOLD_AT = 3.58 / 8.041667; // climax of the film, if it never reports `ended`

/* The printed invitation, in the order the parchment reveals it. The artwork is
   a fully typeset sheet, so this copy is what assistive technology reads while
   the same words appear in gold on the parchment itself. */
const STAGES = [
  { k: 'ganesh', sa: '॥ शुभ लाभ ॥', en: 'With the blessings of God, we cordially invite you and your family to the' },
  { k: 'heading', en: 'Wedding Ceremony' },
  { k: 'of', en: 'of our beloved' },
  { k: 'bride', name: 'Simran' },
  { k: 'bride-family', en: 'Daughter of Smt. Savita Saxena & Sh. Naveen Saxena' },
  { k: 'and', en: 'and' },
  { k: 'groom', name: 'Sachit' },
  { k: 'groom-family', en: 'Son of Smt. Roli Srivastava & Sh. Satyendra Srivastava' },
  { k: 'procession', en: 'The baraat procession — the palki, the elephant and the dhol arrive with the groom' },
  { k: 'bigday', en: 'The Big Day' },
  { k: 'timings', en: 'Welcome of Baraat 8:00 P.M. · Dinner 9:00 P.M. · Saturday, 12 December 2026' },
  { k: 'rsvp', en: 'R.S.V.P. — Pradeep Saxena · Mudit Saxena · Manoj Saxena · Anupam Saxena · Praveen Saxena · Vinod Saxena · Ashish Saxena' },
];

const VENUE = [
  { label: 'Welcome of Baraat', value: '08:00 P.M.' },
  { label: 'Dinner', value: '09:00 P.M.' },
];

function GoldMotes() {
  // Pure CSS, twelve motes, no canvas and no rAF loop — it costs one composited
  // layer and stops dead under prefers-reduced-motion.
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="finale-mote absolute block rounded-full"
          style={{
            left: `${(i * 8.3 + 4) % 96}%`,
            bottom: `-6%`,
            width: i % 3 === 0 ? '5px' : '3px',
            height: i % 3 === 0 ? '5px' : '3px',
            background: i % 4 === 0 ? '#ffe9ab' : '#d4af37',
            boxShadow: '0 0 8px rgba(212,175,55,0.85)',
            animationDelay: `${(i % 6) * 1.15}s`,
            animationDuration: `${11 + (i % 5) * 2.4}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function FinaleSection() {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);

  // 'reveal' -> 'motion' -> 'enter' -> 'unroll' -> 'hold'
  //
  // Both of these are read during render from the media query rather than set
  // from an effect: the preference cannot change the decision the chapter makes
  // (whether to play at all), so deriving it up front avoids a second render and
  // keeps the first paint correct on a reduced-motion device.
  const prefersReduce = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [reduce] = useState(prefersReduce);
  // Under reduced motion the invitation is simply already open.
  const [phase, setPhase] = useState(() => (prefersReduce() ? 'hold' : 'reveal'));
  const [needsTap, setNeedsTap] = useState(false);

  const stateRef = useRef({ started: false, timers: [], done: false });

  /* ------------------------------------------------------------ phase engine */
  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section) return undefined;

    const s = stateRef.current;

    const clearTimers = () => {
      s.timers.forEach(clearTimeout);
      s.timers = [];
    };
    const later = (fn, ms) => {
      s.timers.push(setTimeout(fn, ms));
    };

    // The scroll entrance + unroll, once, and never auto-advancing past `hold`.
    const openScroll = () => {
      if (s.done) return;
      s.done = true;
      clearTimers();
      setNeedsTap(false);
      setPhase('enter');
      later(() => setPhase('unroll'), ENTER_MS);
      later(() => setPhase('hold'), ENTER_MS + UNROLL_MS);
    };

    if (prefersReduce) {
      // Nothing plays. The palace is already there and the invitation is already
      // open — the same information, without motion.
      if (video) {
        try {
          video.currentTime = HOLD_AT * (video.duration || 8);
        } catch {
          /* metadata may not be ready; the poster covers it */
        }
        video.pause();
      }
      s.done = true;
      setPhase('hold');
      return () => clearTimers();
    }

    const begin = () => {
      if (s.started) return;
      s.started = true;
      setPhase('motion');
      if (video) {
        video.currentTime = 0;
        playSafely(video).then((ok) => {
          // Refused autoplay: offer the tap, but keep the failsafe armed so the
          // chapter still resolves for a visitor who does nothing.
          if (!ok) setNeedsTap(true);
        });
      }
      // Failsafe. If `ended` never fires (stalled network, decode error, a
      // browser that silently refused), the invitation still opens.
      later(openScroll, (8.041667 + 2.4) * 1000);
    };

    const onEnded = () => openScroll();
    if (video) video.addEventListener('ended', onEnded);

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting && e.intersectionRatio >= 0.5) {
          if (!s.started) begin();
          else if (!s.done && video && video.paused) {
            playSafely(video);
          }
        } else if (!e.isIntersecting && !s.done && video) {
          // Scrolled away mid-act: pause, do not restart, let the observer resume.
          video.pause();
        }
      },
      { threshold: [0, 0.5, 0.75, 1] },
    );
    io.observe(section);

    return () => {
      io.disconnect();
      clearTimers();
      if (video) {
        video.removeEventListener('ended', onEnded);
        video.pause();
      }
    };
  }, []);

  // A rotation re-measures the section; the phase machine itself does not restart.
  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, []);

  const scrollIn = phase === 'enter' || phase === 'unroll' || phase === 'hold';
  const unrolled = phase === 'unroll' || phase === 'hold';
  const showingFilm = phase === 'motion' || phase === 'enter' || phase === 'unroll' || phase === 'hold';

  const ease = 'cubic-bezier(.18,.78,.18,1)';

  return (
    <section
      ref={sectionRef}
      id="finale"
      aria-label="The royal wedding finale"
      className="relative h-[100dvh] w-full"
    >
      <div className="sticky top-0 h-[100dvh] w-full overflow-hidden bg-[#04070f]">
        {/* ACT 1 — the approved palace still. This layer never unmounts, so the
            background can never go black or be replaced. */}
        <picture>
          <source srcSet={STILL} type="image/webp" />
          <img
            src={STILL_FALLBACK}
            alt="The palace at night, lit for the varmala"
            className="absolute inset-0 h-full w-full object-cover"
            decoding="async"
          />
        </picture>

        {/* ACT 2 — the varmala exchange and the fireworks. Muted, inline, ONCE. */}
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] ease-out ${
            showingFilm && phase !== 'reveal' ? 'opacity-100' : 'opacity-0'
          }`}
          src={FILM}
          poster={FILM_POSTER}
          muted
          playsInline
          preload="metadata"
          disablePictureInPicture
        />

        {/* Grading. Keeps the gold reading warm and the type legible without
            touching the artwork's own colour. */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              'radial-gradient(120% 78% at 50% 34%, rgba(4,7,17,0) 38%, rgba(4,7,17,0.52) 100%), linear-gradient(to top, rgba(4,7,17,0.78) 0%, rgba(4,7,17,0.12) 34%, rgba(4,7,17,0.42) 100%)',
          }}
        />

        <GoldMotes />

        {/* ACT 3 — the invitation scroll. It rises INTO the foreground while the
            celebration keeps running behind it. */}
        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
          style={{
            opacity: scrollIn ? 1 : 0,
            transform: `translate3d(0, ${scrollIn ? 0 : 9}%, 0) scale(${scrollIn ? 1 : 0.9})`,
            transition: reduce ? 'none' : `opacity ${ENTER_MS}ms ease-out, transform ${ENTER_MS + 240}ms ${ease}`,
            willChange: 'transform, opacity',
          }}
        >
          <div
            className="relative max-h-[94dvh]"
            style={{
              height: 'min(94dvh, calc(96vw * 1.4481))',
              aspectRatio: '993 / 1438',
            }}
          >
            {/* Physical unroll: the sheet is clipped from the bottom up, so the
                top roller is already in view and the parchment extends downward
                exactly as the printed sheet is ordered. */}
            <div
              className="relative h-full w-full"
              style={{
                clipPath: unrolled ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)',
                transform: unrolled ? 'scaleY(1)' : 'scaleY(0.982)',
                transformOrigin: 'top center',
                transition: reduce
                  ? 'none'
                  : `clip-path ${UNROLL_MS}ms ${ease}, transform ${UNROLL_MS}ms ${ease}`,
                filter: 'drop-shadow(0 18px 40px rgba(0,0,0,0.62))',
                willChange: 'clip-path, transform',
              }}
            >
              <img
                src={SCROLL_ART}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-contain"
                decoding="async"
              />
            </div>

            {/* The leading edge: a gold glint that travels down with the unroll,
                standing in for the bottom roller. It is the only added ornament,
                and it disappears the instant the sheet is open. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 w-full"
              style={{
                top: unrolled ? '100%' : '0%',
                opacity: phase === 'unroll' ? 1 : 0,
                transition: reduce ? 'none' : `top ${UNROLL_MS}ms ${ease}, opacity 500ms linear`,
              }}
            >
              <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-[#f6dfa0] to-transparent shadow-[0_0_18px_rgba(212,175,55,0.9)]" />
              <div className="mx-auto h-16 w-full bg-gradient-to-b from-[#04070f]/55 to-transparent" />
            </div>
          </div>
        </div>

        {/* The printed invitation, for assistive technology. The same 12 stages
            are typeset on the parchment itself, in this order, so the two agree
            by construction rather than by hand. */}
        <div className="sr-only">
          <h2>The Wedding Ceremony of Simran and Sachit</h2>
          {STAGES.map((s) => (
            <p key={s.k}>
              {s.sa ? `${s.sa} — ` : ''}
              {s.name || s.en}
            </p>
          ))}
          <p>Saturday, 12 December 2026 — Welcome of Baraat 8:00 P.M., Dinner 9:00 P.M., at Rudrakshaa Banquet.</p>
          <p>Sunday, 13 December 2026 — Vidaai, Taroon Ki Chaon Mein.</p>
        </div>

        {/* Honest fallback if a browser refused the muted autoplay. Subtle, and
            only ever present during the act it belongs to. */}
        {needsTap && (
          <button
            type="button"
            onClick={() => {
              const v = videoRef.current;
              setNeedsTap(false);
              if (v) playSafely(v);
            }}
            className="font-cinzel absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-[#04070f]/45 text-[#f7d58a] backdrop-blur-[2px]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d4af37]/60 bg-[#050914]/70 shadow-[0_0_30px_rgba(212,175,55,0.35)]">
              <span className="ml-1 block h-0 w-0 border-y-[9px] border-l-[14px] border-y-transparent border-l-current" />
            </span>
            <span className="text-[10px] tracking-[0.26em] uppercase">Begin The Celebration</span>
          </button>
        )}

        {/* Part 7 — the final hold. The invitation stays open, readable and
            still. Nothing here closes it, replays it or advances the page; the
            visitor leaves when they choose to scroll. */}
        {phase === 'hold' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex flex-col items-center pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            <div className="w-full max-w-[34rem] px-5">
              <div className="mb-3 h-px w-full bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />
              <dl className="font-cinzel flex items-center justify-center gap-6 text-center">
                {VENUE.map((row) => (
                  <div key={row.label}>
                    <dt className="text-[7.5px] tracking-[0.24em] uppercase text-[#c9a961]/85">{row.label}</dt>
                    <dd className="mt-0.5 text-[11px] tracking-[0.14em] text-[#fdf3d8]">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="font-cinzel mt-2 text-center text-[8px] tracking-[0.3em] uppercase text-[#d4af37]/90">
                Saturday, 12 December 2026
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
