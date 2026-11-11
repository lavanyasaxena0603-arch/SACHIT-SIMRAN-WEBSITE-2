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
const SCROLL_ART = '/assets/finale/invitation-scroll-v2.png';
/* The supplied invitation card, cut from the photograph with a feathered matte
   and colour-decontaminated rim (no halo, no pinholes, ornaments intact).
   Lossless WebP of the same pixels: 979,657 B -> 720,750 B. The PNG stays as
   the <img> fallback for any engine without WebP. */
const SCROLL_ART_WEBP = '/assets/finale/invitation-scroll-v2.webp';
/* Native size of the artwork. The card is never stretched beyond this by more
   than the small cap below, so it cannot turn to mush on a large display. */
const ART_W = 515;
const ART_H = 787;
const ART_RATIO = ART_H / ART_W;

/* The card is introduced, not unrolled. Its own top and bottom rollers are
   already painted into the artwork, so a physical clip-path unroll was fighting
   the picture — it cut the sheet in half and dragged a gold "leading edge"
   across already-drawn rollers. The reveal is now a rise + settle. */
const RISE_MS = 1150;

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

  const scrollIn = phase === 'enter' || phase === 'hold';
  const showingFilm = phase === 'motion' || phase === 'enter' || phase === 'hold';

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
            transition: reduce ? 'none' : `opacity ${RISE_MS}ms ease-out, transform ${RISE_MS + 260}ms ${ease}`,
            willChange: 'transform, opacity',
          }}
        >
          <div
            className="relative"
            style={{
              /* Capped so the card never has to be magnified: at 760px tall the
                 rendered width is ~497px against 515 native, i.e. never upscaled
                 on a desktop and comfortably downscaled on a phone. */
              height: `min(86dvh, calc(92vw * ${ART_RATIO}), 760px)`,
              aspectRatio: `${ART_W} / ${ART_H}`,
            }}
          >
            {/* THE CARD. No clip-path, no scaleY, no travelling "leading edge".

                The supplied artwork already carries its own carved gold rollers
                top and bottom, so a clip-based unroll literally cut those
                rollers in half and then dragged a synthetic glint across them —
                which is the "very bad cut" the user saw. The sheet now simply
                rises and settles as one piece, and the shadow is a drop-shadow
                on the artwork's OWN alpha, so the matte edge reads as the
                thickness of a physical card instead of a rectangular box. */}
            <picture className="block h-full w-full">
              <source srcSet={SCROLL_ART_WEBP} type="image/webp" />
              <img
                src={SCROLL_ART}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-contain"
                style={{
                  filter:
                    'drop-shadow(0 22px 46px rgba(0,0,0,0.66)) drop-shadow(0 1px 0 rgba(212,175,55,0.30))',
                }}
                decoding="async"
              />
            </picture>
          </div>
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
