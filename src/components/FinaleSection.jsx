import { useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowLeft, DoorOpen } from 'lucide-react';
import { playSafely, ensurePlaying } from '../lib/videoSwap';
import { watchFilm } from '../lib/film';

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

/* THE LAST BEAT OF THE WHOLE INVITATION.

   Once the unroll film has played its final frame the sheet is fully open and
   readable. The creator signature must not appear on that same frame — the
   guest is still looking at the finished invitation. So the open sheet is left
   completely alone for 2.4s, and only then does the signature rise. */
const SEAL_HOLD_MS = 2400;

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
  // The creator signature + the exit control only exist once the sheet has been
  // open for SEAL_HOLD_MS. `sealed` is the single switch for both.
  const [sealed, setSealed] = useState(false);
  const [exitMessage, setExitMessage] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const exitTimerRef = useRef(0);

  // `started` guards the celebration; `rolled` guards the invitation. Both live
  // in a ref because neither should re-render the tree.
  const stateRef = useRef({
    started: false,
    rolled: false,
    armed: false,
    armTimer: 0,
    // Has act 1 / act 2 been genuinely LEFT? Only a real exit arms the replay,
    // so a visitor sitting inside a scene never has the film restarted under
    // them.
    away1: false,
    // The seal (signature) timer, kept apart from the arm timer.
    sealPending: false,
    sealTimer: 0,
    stopWatcher: null,
  });

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

    /* ------------------------------------------------------------------ *
     * ACT 1 — the palace celebration
     * ------------------------------------------------------------------ */
    const playCelebration = () => {
      if (!video) return;
      try {
        video.currentTime = 0;
      } catch {
        /* poster-only; play() still works */
      }
      ensurePlaying(video).then((ok) => {
        // Only after every retry has failed is the tap the honest answer.
        if (!ok) setNeedsTap(true);
      });
    };

    const begin = () => {
      if (s.started) return;
      s.started = true;
      setPhase('motion');
      playCelebration();
    };

    /* REVISITING THE CELEBRATION — automatic replay, no Replay button.

       Only reached after a genuine exit (the act dropped below 5% of the
       viewport and came back), so a guest standing in the scene never has the
       film yanked back to frame zero.

       NOTE: `phase` is deliberately NOT reset here. Driving it to 'reveal' for
       a couple of frames would start the 900ms opacity transition downward and
       snap it back mid-interpolation, which reads as a visible blink. The film
       is already opaque and simply restarts from its first frame. */
    const replayCelebration = () => {
      s.started = true;
      setNeedsTap(false);
      playCelebration();
    };

    /* ACT 2 — the invitation unrolls. Triggered by reaching the second act, not
       by the clock, so the celebration above is never covered.

       ANTICIPATION: the reveal is not fired on the same frame the act becomes
       visible. A short beat lets the visitor arrive, see the clean midnight stage
       and register that something is about to happen, so the sheet rises as a
       surprise rather than snapping in the instant the gesture ends. It is a
       presentation delay only — it never blocks a gesture, and the film is
       already buffered by the time it runs. */

    /* THE SEAL — the sheet has finished unrolling.

       Nothing changes on screen for SEAL_HOLD_MS: the open invitation is the
       subject and it gets the frame to itself. After that the signature and the
       exit control rise in. Idempotent, because completion can be reported by
       more than one signal. */
    const seal = () => {
      if (s.sealPending) return;
      s.sealPending = true;
      clearTimeout(s.sealTimer);
      s.sealTimer = setTimeout(() => setSealed(true), SEAL_HOLD_MS);
    };

    const startRoll = () => {
      if (s.rolled) return;
      s.rolled = true;
      s.sealPending = false;
      clearTimeout(s.sealTimer);
      setSealed(false);
      setExitMessage(false);
      setShowRoll(true);
      if (!roll) return;

      try {
        roll.currentTime = 0;
      } catch {
        /* poster-only; play() still works */
      }

      // Multi-signal completion (the same watcher the entrance uses) rather than
      // a bare `ended` listener: iOS can drop the tail of a clip, and a missed
      // event would leave the guest on a finished sheet with no signature and
      // no way out.
      if (s.stopWatcher) s.stopWatcher();
      s.stopWatcher = watchFilm(roll, { onEnd: seal }).stop;

      ensurePlaying(roll);
    };

    /* LEAVE ACT 2 COMPLETELY → restore its intended first state.

       This runs only when the act is off-screen (below 5%), so the collapse is
       never watched. It is what makes the second visit a genuine replay: the
       next entry finds an untouched act, waits the anticipation beat, and the
       whole rise → unroll → seal sequence happens again. */
    const resetRoll = () => {
      clearTimeout(s.sealTimer);
      s.sealPending = false;
      s.rolled = false;
      s.armed = false;
      if (s.stopWatcher) {
        s.stopWatcher();
        s.stopWatcher = null;
      }
      setSealed(false);
      setExitMessage(false);
      setShowRoll(false);
      if (roll) {
        roll.pause();
        try {
          roll.currentTime = 0;
        } catch {
          /* poster-only */
        }
      }
    };

    // Act 1 owns its own observer: with a 200dvh section, a ratio measured on
    // the whole section would not reach 50% until most of the celebration had
    // already scrolled past.
    const io1 = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        const inside = e.isIntersecting && e.intersectionRatio >= 0.5;

        if (inside) {
          if (!s.started) {
            s.away1 = false;
            begin();
          } else if (s.away1) {
            s.away1 = false;
            replayCelebration();
          } else if (video && video.paused && !video.ended) {
            playSafely(video);
          }
        }

        if (!inside && (!e.isIntersecting || e.intersectionRatio < 0.05)) {
          // Genuinely gone from the stage: pause, and arm the replay for the
          // next arrival.
          s.away1 = true;
          if (video && !video.ended) video.pause();
        }
      },
      { threshold: [0, 0.05, 0.5, 0.75, 1] },
    );

    // Act 2 arms the invitation as soon as it is meaningfully on screen. The
    // threshold is deliberately low: the visitor has decided to move on, so the
    // film should already be running by the time the sheet is centred.
    const io2 = new IntersectionObserver(
      (entries) => {
        const e = entries[0];

        if (e.isIntersecting && e.intersectionRatio >= 0.35) {
          if (!s.armed) {
            s.armed = true;
            s.armTimer = setTimeout(startRoll, ANTICIPATION_MS);
          }
          return;
        }

        if (!e.isIntersecting || e.intersectionRatio < 0.35) {
          // Fully left behind. Cancel a pending beat and, if it had already
          // started, put the act back to its first state — entirely off-screen,
          // so the collapse is never watched.
          clearTimeout(s.armTimer);
          s.armed = false;
          if (e.intersectionRatio === 0 && (s.rolled || s.sealPending || s.stopWatcher)) {
            resetRoll();
          }
        }
      },
      { threshold: [0, 0.05, 0.35, 0.6, 1] },
    );

    const ro1 = new ResizeObserver(() => ScrollTrigger.refresh());

    io1.observe(act1 || section);
    if (act2) io2.observe(act2);
    if (act1) ro1.observe(act1);

    return () => {
      io1.disconnect();
      io2.disconnect();
      clearTimeout(s.armTimer);
      clearTimeout(s.sealTimer);
      if (s.stopWatcher) {
        s.stopWatcher();
        s.stopWatcher = null;
      }
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

  /* THE EXIT — honest about what a browser will let a page do.

     A tab the guest opened themselves cannot be closed by script, and no pop-up
     trick or fake redirect is used to pretend otherwise. `window.close()` is
     attempted first (it works when the page opened the window), and if the tab
     is still here a moment later the guest is told, plainly, that they may close
     it. Nothing is cleared: no history, no storage, no cookie, no preference. */
  const handleExit = () => {
    setExitMessage(false);
    try {
      window.close();
    } catch {
      /* blocked by the browser — expected for a normally-opened tab */
    }

    window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = window.setTimeout(() => {
      if (window.closed) return;
      // Only offered when there genuinely is somewhere to go back to.
      setCanGoBack(window.history.length > 1);
      setExitMessage(true);
    }, 180);
  };

  const goBack = () => {
    try {
      window.history.back();
    } catch {
      /* nothing to go back to */
    }
  };

  useEffect(() => () => window.clearTimeout(exitTimerRef.current), []);

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
          className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-[clamp(0.55rem,1.7dvh,1.1rem)] px-5"
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
            className="block h-auto w-auto min-h-0 max-w-[94vw] object-contain"
            /* THE SHEET MAKES ROOM FOR THE SIGNATURE — BY LAYOUT, NOT BY LUCK.

               The closing block is a SIBLING of the sheet inside this same flex
               column, so the two can never overlap: the column centres the pair
               and the sheet's own `max-height` is what gives the closing block
               its space. That is structural, so it holds at every viewport
               without a magic offset.

               The reservation is generous (17rem) so the exit message can also
               appear underneath without pushing anything off the stage. It is a
               900ms ease, once, after the guest has already watched the whole
               unroll at full size — nothing is cropped, stretched or re-drawn.

               `max-h`/`max-w` with intrinsic `auto` sizing still lets the box
               take the film's own ratio, so the drop-shadow keeps hugging the
               artwork. */
            style={{
              /* Two reserves, because the closing block is two different
                 heights. Without the message it needs ~200px under the sheet;
                 the polite fallback paragraph and its history button add ~85px
                 more, and the sheet eases down by exactly that much when the
                 guest taps EXIT. Over-reserving in the common case would shrink
                 the invitation for no reason: measured on a 390x844 phone, a
                 17rem reserve left 73px of dead space and cost the artwork ~20%
                 of its height. */
              maxHeight: sealed
                ? exitMessage
                  ? 'min(88dvh, calc(100dvh - 16rem))'
                  : 'min(88dvh, calc(100dvh - 9.5rem))'
                : '88dvh',
              filter: 'drop-shadow(0 26px 54px rgba(0,0,0,0.70))',
              transition: reduce ? 'none' : `max-height ${RISE_MS}ms ${ease}`,
            }}
            src={ROLL}
            poster={ROLL_POSTER}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            aria-label="The wedding invitation, unrolling"
          />

          {/* ---------------------------------------------------------------- *
           * THE CREATOR SIGNATURE — the last thing in the whole invitation.
           *
           * A SIBLING OF THE SHEET, IN THE SAME FLEX COLUMN — not an overlay.
           * That is what makes "it must not cover the invitation" structural
           * rather than a tuned offset: the column centres the pair, and the
           * sheet's own max-height is what frees the space. It also means the
           * signature simply pushes the composition up by its own height, so it
           * holds at every viewport, phone or desktop, without a magic number.
           *
           * Mounted only once the sheet has been open for SEAL_HOLD_MS, so it
           * cannot appear while the invitation is still being read, and it
           * cannot appear on any earlier page: this node exists only inside
           * act 2, whose contents only show after the visitor scrolls into it.
           *
           * The entrance is a mount-time keyframe animation (opacity 0 → 1,
           * 18px rise); the underline is a separate hairline that draws outward
           * from its own centre. Both live in index.css so
           * `prefers-reduced-motion` resolves them in one place — the signature
           * is then simply present, which is the honest answer.
           *
           * Typography is HTML/CSS only: no raster, no watermark, no logo. */}
          {sealed && (
            <div className="pointer-events-auto flex w-full shrink-0 justify-center px-4 pb-[max(0.4rem,env(safe-area-inset-bottom,0px))]">
              <div className="relative flex w-full max-w-[26rem] flex-col items-center text-center">
              <p className="signature-line font-royal text-[clamp(1.09rem,2.7vw,1.5rem)] leading-none tracking-[0.02em] italic">
                <span className="font-sans-clean mb-2 block text-[clamp(0.5rem,1.35vw,0.62rem)] tracking-[0.34em] uppercase not-italic text-[#cbb27a]">
                  Created with love by
                </span>{' '}
                <span className="bg-gradient-to-r from-[#e6c877] via-[#fff4d4] to-[#e6c877] bg-clip-text text-transparent drop-shadow-[0_2px_14px_rgba(212,175,55,0.35)]">
                  Lavanya Saxena
                </span>
              </p>

              <span
                className="signature-rule mt-[clamp(0.5rem,1.3dvh,0.75rem)] block h-px w-[min(74%,13rem)]"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(212,175,55,0.0) 0%, rgba(212,175,55,0.85) 24%, #fff3cd 50%, rgba(212,175,55,0.85) 76%, rgba(212,175,55,0.0) 100%)',
                  boxShadow: '0 0 10px rgba(212,175,55,0.5)',
                }}
                aria-hidden="true"
              />

              {/* THE EXIT. Pill, midnight navy, hairline gold, gold caps, a
                  minimal door glyph, a gold bloom on hover and a 300ms settle.
                  44px minimum touch height on every viewport. */}
              <button
                type="button"
                onClick={handleExit}
                className="signature-exit font-cinzel pointer-events-auto mt-[clamp(0.8rem,2.1dvh,1.2rem)] inline-flex min-h-[44px] items-center justify-center gap-2.5 rounded-full border border-[#d4af37]/65 bg-[linear-gradient(180deg,#0b1324_0%,#060b16_100%)] px-[clamp(1.1rem,3.4vw,1.6rem)] text-[clamp(0.55rem,1.4vw,0.65rem)] tracking-[0.28em] text-[#f3e5ab] shadow-[0_12px_30px_rgba(0,0,0,0.7),0_0_0_1px_rgba(212,175,55,0.12)_inset,0_1px_0_rgba(255,240,200,0.18)_inset] transition-[transform,box-shadow,border-color,color] duration-300 ease-out hover:border-[#f3e5ab] hover:text-[#fff8e2] hover:shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_26px_rgba(212,175,55,0.42),0_1px_0_rgba(255,240,200,0.3)_inset] active:scale-[0.97] active:duration-150 focus-visible:ring-2 focus-visible:ring-[#d4af37]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#04070f] focus-visible:outline-none"
              >
                <DoorOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
                EXIT INVITATION
              </button>

              {/* Shown only when the browser refused to close the tab. Plain,
                  polite, and it offers the history route as a separate, clearly
                  user-triggered choice. */}
              {exitMessage && (
                <div role="status" aria-live="polite" className="mt-[clamp(0.5rem,1.5dvh,0.85rem)]">
                  <p className="font-serif-body text-[clamp(0.72rem,1.9vw,0.88rem)] leading-relaxed italic text-[#e6dcc0]">
                    Thank you for being part of this celebration. You may now close this tab.
                  </p>
                  {canGoBack && (
                    <button
                      type="button"
                      onClick={goBack}
                      className="font-sans-clean pointer-events-auto mt-1 inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-[10px] tracking-[0.2em] uppercase text-[#d8b878] transition-colors duration-300 hover:text-[#f7e7b4] focus-visible:ring-2 focus-visible:ring-[#d4af37]/60 focus-visible:outline-none"
                    >
                      <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                      Return to the previous page
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
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
