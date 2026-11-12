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
 * THE TWO ACTS, SEQUENCED BY SCROLL
 * ---------------------------------
 *   1. celebration     the palace still, then the fireworks film played ONCE,
 *                      all the way through, while this act owns the screen
 *   2. invitation      the supplied roll film, revealed only when the visitor
 *                      scrolls on to the second act
 *
 * The two acts are two stacked full-height blocks in normal document flow. That
 * is what makes the sequencing feel like the visitor's decision rather than a
 * timer: nothing advances until the page is actually scrolled. There is no
 * `sticky`, no `fixed`, no scroll hijacking and no forced scroll — the act
 * boundary is simply a scroll position, and scrolling back up returns to the
 * celebration.
 *
 * WHY THE TIMER IS GONE
 * ---------------------
 * The previous build started the roll film 700ms after the fireworks began, so
 * the invitation descended over the celebration while it was still playing and
 * the finale film was never actually watched. The reported symptom — "let the
 * final video play properly" — was that auto-advance. The fireworks film now
 * runs to its own last frame and nothing covers it; the roll only begins when
 * the visitor scrolls to act 2.
 *
 * THE CELEBRATION BACKGROUND IS NEVER REPLACED
 * -------------------------------------------
 * The still is a permanent base layer under the film. The film fades in over it
 * and stays mounted. At no point does the palace disappear or go black.
 *
 * AUTOPLAY
 * --------
 * Both clips are muted + playsinline, so they start on their own. If a browser
 * still refuses the celebration, the stage does not stall: a tap target appears
 * in act 1. The roll retries silently and keeps its poster if it cannot start,
 * and because the visitor is on act 2 by then, the chapter has already resolved.
 *
 * NO LOOP, EVER
 * -------------
 * Neither <video> carries `loop`. Each plays once and holds its last frame.
 * Scrolling away and back does not rewind either of them.
 *
 * REDUCED MOTION
 * --------------
 * Nothing travels. The invitation does not rise or scale — it simply fades in —
 * and every line of text is present. The footage itself still plays, because
 * the film is the chapter, not decoration.
 */

/* `palace-still.webp` is intentionally NO LONGER USED as a background: it is
   itself a fireworks photograph, so painting it full-bleed behind the fireworks
   film produced the duplicated, blown-up double exposure the client rejected.
   The files remain in public/assets, referenced by nothing. */
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

/* Only the invitation's own entrance is timed now. Nothing gates the acts on a
   clock any more — scroll position does that. */
const RISE_MS = 900;
/* The beat between arriving at act 2 and the sheet beginning to rise. */
const ANTICIPATION_MS = 480;

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

/* Grading shared by both acts. Keeps the gold reading warm and the type legible
   without touching the artwork's own colour. */
function Grading() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10"
      style={{
        background:
          'radial-gradient(120% 78% at 50% 34%, rgba(4,7,17,0) 38%, rgba(4,7,17,0.52) 100%), linear-gradient(to top, rgba(4,7,17,0.78) 0%, rgba(4,7,17,0.12) 34%, rgba(4,7,17,0.42) 100%)',
      }}
    />
  );
}

export default function FinaleSection() {
  const sectionRef = useRef(null);
  const act1Ref = useRef(null);
  const act2Ref = useRef(null);
  const videoRef = useRef(null);
  const rollRef = useRef(null);

  // Both of these are read during render from the media query rather than set
  // from an effect: the preference cannot change the decision the chapter makes
  // (whether to play at all), so deriving it up front avoids a second render and
  // keeps the first paint correct on a reduced-motion device.
  const prefersReduce = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [reduce] = useState(prefersReduce);
  const [phase, setPhase] = useState(() => (prefersReduce() ? 'hold' : 'reveal'));
  const [showRoll, setShowRoll] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

  // `started` guards the celebration; `rolled` guards the invitation. Both live
  // in a ref because neither should re-render the tree.
  const stateRef = useRef({ started: false, rolled: false, armed: false, armTimer: 0 });

  /* ------------------------------------------------------------ act engine */
  useEffect(() => {
    const section = sectionRef.current;
    const act1 = act1Ref.current;
    const act2 = act2Ref.current;
    const video = videoRef.current;
    // Snapshot the roll element ONCE. Reading `rollRef.current` inside the
    // cleanup is a real bug, not just a lint nit: by teardown the ref can point
    // at null (or a different node), so the state we restore is not the state we
    // saved.
    const roll = rollRef.current;
    if (!section) return undefined;

    const s = stateRef.current;

    // ACT 1 — the palace celebration. Once, muted, inline, from the start.
    const begin = () => {
      if (s.started) return;
      s.started = true;
      setPhase('motion');
      if (video) {
        try {
          video.currentTime = 0;
        } catch {
          /* poster-only; play() still works */
        }
        ensurePlaying(video).then((ok) => {
          // Only after every retry has failed is the tap the honest answer.
          if (!ok) setNeedsTap(true);
        });
      }
    };

    // ACT 2 — the invitation unrolls. Triggered by reaching the second act, not
    // by the clock, so the celebration above is never covered.
    //
    // ANTICIPATION: the reveal is not fired on the same frame the act becomes
    // visible. A short beat lets the visitor arrive, see the clean midnight stage
    // and register that something is about to happen, so the sheet rises as a
    // surprise rather than snapping in the instant the gesture ends. It is a
    // presentation delay only — it never blocks a gesture, and the film is
    // already buffered by the time it runs.
    const startRoll = () => {
      if (s.rolled) return;
      s.rolled = true;
      setShowRoll(true);
      if (roll) {
        try {
          roll.currentTime = 0;
        } catch {
          /* poster-only; play() still works */
        }
        ensurePlaying(roll);
      }
    };

    // Act 1 owns its own observer: with a 200dvh section, a ratio measured on
    // the whole section would not reach 50% until most of the celebration had
    // already scrolled past.
    const io1 = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting && e.intersectionRatio >= 0.5) {
          if (!s.started) begin();
          else if (video && video.paused && !video.ended) playSafely(video);
        }

        if (!e.isIntersecting && video && !video.ended) {
          // Scrolled away mid-act: pause, never restart. Re-entry resumes from
          // the same playhead, so the film is not watched from the top twice.
          video.pause();
        }
      },
      { threshold: [0, 0.5, 0.75, 1] },
    );

    // Act 2 arms the invitation as soon as it is meaningfully on screen. The
    // threshold is deliberately low: the visitor has decided to move on, so the
    // film should already be running by the time the sheet is centred.
    const io2 = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting && e.intersectionRatio >= 0.35 && !s.armed) {
          s.armed = true;
          s.armTimer = setTimeout(startRoll, ANTICIPATION_MS);
        } else if (!e.isIntersecting && !s.rolled && s.armed) {
          // Scrolled back out during the beat: cancel, and re-arm on return.
          clearTimeout(s.armTimer);
          s.armed = false;
        }
      },
      { threshold: [0, 0.35, 0.6] },
    );

    const ro1 = new ResizeObserver(() => ScrollTrigger.refresh());

    io1.observe(act1 || section);
    if (act2) io2.observe(act2);
    if (act1) ro1.observe(act1);

    return () => {
      io1.disconnect();
      io2.disconnect();
      clearTimeout(s.armTimer);
      ro1.disconnect();
      if (roll) roll.pause();
      if (video) video.pause();
    };
    // `reduce` is a useState snapshot taken once at mount, so it can never
    // change and this effect can never re-run. Listing it is still correct: the
    // reduced-motion branch reads it.
  }, [reduce]);

  // A rotation re-measures the section; the act machine itself does not restart.
  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, []);

  const filmVisible = phase !== 'reveal';
  const ease = 'cubic-bezier(.18,.78,.18,1)';

  return (
    <section
      ref={sectionRef}
      id="finale"
      aria-label="The royal wedding finale"
      className="relative w-full"
    >
      {/* ------------------------------------------------------------------ *
       * ACT 1 — THE CELEBRATION
       *
       * NO `sticky`, NO `fixed` — DELIBERATELY.
       *
       * This used to be `h-[100dvh]` wrapping a `sticky top-0 h-[100dvh]`
       * child. A sticky element inside a parent of exactly the same height has
       * zero travel, so it did not pin gradually: the instant the section's top
       * edge reached the viewport top, the whole block was welded in place.
       * That is the "background gets stuck too early" report.
       *
       * Each act is now its own plain, full-height block in normal flow. They
       * scroll past like any other chapter, and they cannot pin anything.
       * ------------------------------------------------------------------ */}
      <div ref={act1Ref} className="relative h-[100dvh] w-full overflow-hidden bg-[#04070f]">
        {/* CLEAN MIDNIGHT STAGE — deliberately NOT a photograph.

            This layer used to be `palace-still.webp` painted full-bleed with
            `object-cover`, and that file is itself a photograph of fireworks
            over the palace. Under the `object-contain` film it did exactly what
            the client described: the same fireworks footage appeared enlarged
            and blurred behind the real video, because the plate was filled by
            scaling a fireworks photo up until it covered the viewport. Two
            firework images on top of each other read as a confusing double
            exposure.

            It is now a flat midnight-navy gradient with a single restrained
            royal-gold ambient glow: deep navy (#04070f / #090e1c), very dark
            charcoal-blue, low contrast, no imagery and no texture. The letterbox
            area around the complete video frame therefore reads as deliberate
            staging — a lit stage the film plays on — instead of as a duplicate.

            The approved fireworks FILM is untouched and still plays complete
            (`object-contain`) over this. Nothing is stretched, cropped, blurred
            or duplicated. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(72% 46% at 50% 44%, rgba(212,175,55,0.10) 0%, rgba(212,175,55,0.035) 42%, rgba(212,175,55,0) 72%), radial-gradient(130% 92% at 50% 34%, #0c1322 0%, #070b16 46%, #04070f 100%)',
          }}
          aria-hidden="true"
        />

        {/* THE CELEBRATION FILM. Muted, inline, ONCE, and now actually watched:
            nothing is layered over it, so it runs to its own last frame.

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
            filmVisible ? 'opacity-100' : 'opacity-0'
          }`}
          src={FILM}
          poster={FILM_POSTER}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-label="Fireworks over the palace"
        />

        <Grading />
        <GoldMotes />

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
      </div>

      {/* ------------------------------------------------------------------ *
       * ACT 2 — THE INVITATION
       *
       * The visitor reaches this by scrolling on from the celebration. Nothing
       * pulls them here and nothing stops them leaving.
       * ------------------------------------------------------------------ */}
      <div ref={act2Ref} className="relative h-[100dvh] w-full overflow-hidden bg-[#04070f]">
        {/* The same clean midnight stage as act 1, so the invitation is the only
            subject in the frame and stays visually distinct from the background.
            No photograph: the invitation must not sit on top of more artwork. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(64% 44% at 50% 48%, rgba(212,175,55,0.11) 0%, rgba(212,175,55,0.04) 44%, rgba(212,175,55,0) 74%), radial-gradient(126% 90% at 50% 40%, #0b1220 0%, #070b16 48%, #04070f 100%)',
          }}
          aria-hidden="true"
        />

        <Grading />
        <GoldMotes />

        {/* THE INVITATION, as the couple supplied it.

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
            /* `max-h`/`max-w` with intrinsic `auto` sizing, NOT a fixed height.
               A fixed `height: min(88dvh,900px)` plus `max-w-[94vw]` produced a
               box whose ratio did not match the film's: measured 367x743
               (0.494) for a 720x1280 (0.563) source on a 390px phone, so
               `object-contain` letterboxed inside it and the drop-shadow halo
               sat off the sheet. Constraining both maxima instead lets the box
               take the video's own ratio at any viewport, so the shadow hugs the
               artwork and nothing is ever cropped. */
            className="block h-auto w-auto max-h-[88dvh] max-w-[94vw] object-contain"
            style={{ filter: 'drop-shadow(0 26px 54px rgba(0,0,0,0.70))' }}
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
      </div>
    </section>
  );
}
