import { useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { playSafely, ensurePlaying } from '../lib/videoSwap';

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
/* THE ROLLING INVITATION — supplied by the couple, played as supplied.

   720x1280 portrait, 10.0s, 24fps, with its own fireworks on black. The film
   ALREADY CONTAINS the entire unroll, so there is no CSS unroll here, no
   clip-path, no scaleY and no synthetic "leading edge" anywhere in this file.
   The previous hand-built unroll was fighting artwork that already had rollers
   painted on it, which is what cut the sheet in half.

   Its final frame is the fully open, readable invitation. The element never
   loops and is never rewound, so that frame simply stays on screen. */
const ROLL = '/assets/finale/invitation-roll.mp4';
const ROLL_POSTER = '/assets/finale/invitation-roll-poster.jpg';

/* Timings. The palace establishes itself first, then the invitation descends
   over it while the fireworks keep running behind. */
const ROLL_DELAY_MS = 700;
const RISE_MS = 900;
const ROLL_MS = 10.0 * 1000;
/* Nothing may ever strand the visitor: if no `ended` arrives at all, the
   chapter still resolves. */
const FAILSAFE_MS = ROLL_DELAY_MS + ROLL_MS + 2400;

/* The printed invitation, in the order it is typeset on the parchment. The
   artwork is a fully typeset sheet, so this copy is what assistive technology
   reads while the same words appear in gold on the parchment itself. It is
   `sr-only`, never drawn — so it duplicates the artwork for non-visual users,
   not on screen.

   Date and timings are NOT repeated here: they are carried once, by the two
   closing paragraphs below, so a screen reader never hears them twice. */
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
  { k: 'rsvp', en: 'R.S.V.P. — Pradeep Saxena · Mudit Saxena · Manoj Saxena · Anupam Saxena · Praveen Saxena · Vinod Saxena · Ashish Saxena' },
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

  // 'reveal' -> 'motion' -> 'enter' -> 'hold'
  //
  // Both of these are read during render from the media query rather than set
  // from an effect: the preference cannot change the decision the chapter makes
  // (whether to play at all), so deriving it up front avoids a second render and
  // keeps the first paint correct on a reduced-motion device.
  const prefersReduce = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [reduce] = useState(prefersReduce);
  const [phase, setPhase] = useState(() => (prefersReduce() ? 'hold' : 'reveal'));
  const [needsTap, setNeedsTap] = useState(false);
  const rollRef = useRef(null);

  const stateRef = useRef({ started: false, timers: [], done: false });

  /* ------------------------------------------------------------ phase engine */
  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    // Snapshot the roll element ONCE. Reading `rollRef.current` inside the
    // cleanup is a real bug, not just a lint nit: by teardown the ref can point
    // at null (or a different node), so the listener we are trying to remove is
    // never the listener that was added, and the `ended` handler leaks — a
    // remount then fires it against a dead component.
    const roll = rollRef.current;
    if (!section) return undefined;

    const s = stateRef.current;

    const clearTimers = () => {
      s.timers.forEach(clearTimeout);
      s.timers = [];
    };
    const later = (fn, ms) => {
      s.timers.push(setTimeout(fn, ms));
    };

    // The card's entrance, once, and never auto-advancing past `hold`.
    const openScroll = () => {
      if (s.done) return;
      s.done = true;
      clearTimers();
      setNeedsTap(false);
      setPhase('enter');
      later(() => setPhase('hold'), RISE_MS);
    };

    // `reduce` is the RESOLVED BOOLEAN, snapshotted in state.
    //
    // This previously read `if (prefersReduce)`, testing the FUNCTION instead of
    // calling it. A function object is always truthy, so the reduced-motion
    // branch ran for every visitor: the film was parked at HOLD_AT and paused,
    // `s.done` was set before the IntersectionObserver was ever created, and
    // `phase` stayed at its initial 'reveal' forever. The result was exactly
    // what the user reported — the celebration video never played and the
    // invitation card never appeared — while the still and every static element
    // looked fine, which is why isolated "does it exist" tests kept passing.
    //
    // WHY THERE IS NO EARLY RETURN HERE ANY MORE
    // ------------------------------------------
    // Under reduce the branch used to park the film and bail out, so the
    // celebration never played at all. But this film is the CHAPTER, not
    // decoration: a finale that does not play is a missing finale. The
    // preference is honoured by the motion instead — the card does not rise or
    // scale (every transition below is `none` when `reduce`), and `phase` starts
    // at 'hold' so the invitation is already open and readable on the first
    // paint. The film still runs behind it, muted, exactly once. Nothing moves
    // for a reduced-motion visitor except the footage they came to see.

    const begin = () => {
      if (s.started) return;
      s.started = true;
      setPhase('motion');
      // ACT 2 — the palace celebration. Once, muted, inline.
      if (video) {
        video.currentTime = 0;
        ensurePlaying(video).then((ok) => {
          // Only after every retry has failed is the tap the honest answer.
          if (!ok) setNeedsTap(true);
        });
      }

      // ACT 3 — the invitation unrolls over it a beat later, so the palace is
      // already established when the scroll begins its descent.
      later(startRoll, ROLL_DELAY_MS);

      // Failsafe: if neither `ended` ever arrives, the chapter still resolves.
      later(openScroll, FAILSAFE_MS);
    };

    const startRoll = () => {
      const r = roll;
      if (!r) return;
      try {
        r.currentTime = 0;
      } catch {
        /* poster-only; play() still works */
      }
      ensurePlaying(r);
    };

    // The supplied film is what advances the chapter. The fireworks layer has no
    // `ended` handler: it simply holds its last frame once it finishes.
    const onEndedRoll = () => openScroll();
    if (roll) roll.addEventListener('ended', onEndedRoll);

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
      if (roll) {
        roll.removeEventListener('ended', onEndedRoll);
        roll.pause();
      }
      if (video) video.pause();
    };
    // `reduce` is a useState snapshot taken once at mount, so it can never
    // change and this effect can never re-run. Listing it is still correct: the
    // branch below reads it, and omitting it would be a stale-closure bug the
    // moment anyone made the preference live.
  }, [reduce]);

  // A rotation re-measures the section; the phase machine itself does not restart.
  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, []);

  // The invitation layer is present as soon as the act begins; its own film
  // supplies the unroll, this only adds the cinematic rise into frame.
  const showRoll = phase !== 'reveal';
  const showingFilm = phase === 'motion' || phase === 'enter' || phase === 'hold';

  const ease = 'cubic-bezier(.18,.78,.18,1)';

  return (
    <section
      ref={sectionRef}
      id="finale"
      aria-label="The royal wedding finale"
      className="relative min-h-[100dvh] w-full"
    >
      {/* NO `sticky`, NO `fixed` — DELIBERATELY.

          This used to be `h-[100dvh]` wrapping a `sticky top-0 h-[100dvh]`
          child. A sticky element inside a parent of exactly the same height has
          zero travel, so it did not pin gradually: the instant the section's top
          edge reached the viewport top, the whole block was welded in place and
          the visitor was looking at a full-bleed, already-cropped background
          while the RSVP above was still leaving. That is the "background gets
          stuck too early, before I have entered the finale" report.

          The finale now participates in normal document flow like every other
          chapter: it scrolls up from below, its background is just a background,
          and it cannot pin anything. Nothing traps the scroll. */}
      <div className="relative h-[100dvh] w-full overflow-hidden bg-[#04070f]">
        {/* ACT 1 — the approved palace still. This layer never unmounts, so the
            background can never go black or be replaced.

            It stays `object-cover` on purpose: it is the FILL. Whatever letterbox
            the filmed frame needs above and below is painted with this same
            palace, so the extra space reads as depth rather than as blank bars. */}
        <picture>
          <source srcSet={STILL} type="image/webp" />
          <img
            src={STILL_FALLBACK}
            alt="The palace at night, lit for the varmala"
            className="absolute inset-0 h-full w-full object-cover"
            decoding="async"
          />
        </picture>

        {/* ACT 2 — the varmala exchange and the fireworks. Muted, inline, ONCE.

            `object-contain`, NOT cover.

            The approved clip is 1112x834 — 4:3. The stage is 16:9 on a desktop
            and 9:19.5 on a phone, so `object-cover` was scaling the frame until
            it filled, then throwing away everything outside the box: on a
            desktop it cut the top and bottom, and on a phone it cut both sides
            away entirely. The bright blue fireworks and the lit lower palace —
            the whole point of the shot — were outside the crop. The frame is now
            shown complete at every aspect ratio, letterboxed against the palace
            covering. It is never stretched, never zoomed, never cropped. */}
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-[900ms] ease-out ${
            showingFilm && phase !== 'reveal' ? 'opacity-100' : 'opacity-0'
          }`}
          src={FILM}
          poster={FILM_POSTER}
          muted
          playsInline
          preload="auto"
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

        {/* ACT 3 — THE INVITATION, as the couple supplied it.

            This is their 720x1280 film, played exactly as delivered. It carries
            its own unroll, so there is not one line of clip-path, scaleY or
            synthetic glint on top of it — the picture IS the animation.

            `object-contain` and a capped box, so the portrait sheet keeps its
            true proportions: the whole invitation, rollers included, always in
            frame, never stretched, never cropped, never redrawn.

            The wrapper performs only the cinematic entrance the brief asks for
            (rise + slight settle + fade). It is `pointer-events-none` so the
            foreground never intercepts a scroll gesture. */}
        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
          style={{
            opacity: showRoll ? 1 : 0,
            transform: `translate3d(0, ${showRoll ? 0 : 4}%, 0) scale(${showRoll ? 1 : 0.97})`,
            transition: reduce
              ? 'none'
              : `opacity ${RISE_MS}ms ease-out, transform ${RISE_MS + 200}ms ${ease}`,
            willChange: 'transform, opacity',
          }}
        >
          <video
            ref={rollRef}
            className="h-auto w-auto max-w-[94vw] object-contain"
            style={{
              height: 'min(88dvh, 900px)',
              filter: 'drop-shadow(0 26px 54px rgba(0,0,0,0.70))',
            }}
            src={ROLL}
            poster={ROLL_POSTER}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            aria-label="The wedding invitation, unrolling"
          />
        </div>

        {/* The printed invitation, for assistive technology. The same stages
            are typeset on the parchment itself, in this order, so the two agree
            by construction rather than by hand.

            No venue is named here: the invitation deliberately excludes it. */}
        <div className="sr-only">
          <h2>The Wedding Ceremony of Simran and Sachit</h2>
          {STAGES.map((s) => (
            <p key={s.k}>
              {s.sa ? `${s.sa} — ` : ''}
              {s.name || s.en}
            </p>
          ))}
          <p>Saturday, 12 December 2026 — Welcome of Baraat 8:00 P.M., Dinner 9:00 P.M.</p>
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

        {/* THE FINAL HOLD — deliberately empty of text.

            The open parchment IS the invitation: every name, date, timing,
            family line and RSVP name is already typeset on it and readable at
            rest. The previous version printed a timings bar along the bottom of
            the viewport, which repeated the sheet's own "Welcome of Baraat /
            Dinner" rows and its date in a second, smaller voice — the visitor
            read the same information twice, at two different sizes, in one
            frame. It has been removed so there is exactly one final
            composition: the artwork, and nothing competing with it.

            The invitation still stays open indefinitely. Nothing here closes,
            replays or advances it. */}
      </div>
    </section>
  );
}
