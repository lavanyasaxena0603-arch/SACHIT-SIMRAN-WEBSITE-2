import { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Heart, Sparkles, ChevronDown, Calendar, Clock, MapPin, Navigation, Play } from 'lucide-react';
import { useCountdown } from '../lib/countdown';
import { swapThemeVideo, playSafely } from '../lib/videoSwap';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * THE INVITATION — one continuous document, after the opening cinematic.
 *
 * WHY THIS FILE REPLACES ScrollStory + CelebrationJourney
 * ------------------------------------------------------
 * Those two components were each a tall track holding ONE `sticky 100dvh`
 * stage, with every scene stacked inside it as an absolutely-positioned layer
 * and blended with opacity tweens. Two consequences followed, both of which the
 * brief rejects:
 *
 *   1. Nothing in there could ever physically move. A layer inside a sticky
 *      stage is already fixed to the viewport; crossfading it is the only thing
 *      it can do. That is why the site felt like a slideshow of washes rather
 *      than a page being scrolled.
 *
 *   2. All six scenes shared 840vh of track (480 + 360), so "scrolling" was
 *      really scrubbing a timeline. Scene N's arrival was a tween position, not
 *      a position in the document.
 *
 * Here every chapter is a real <section> in normal document flow. The browser
 * does the movement, which is exactly what the brief asks for: the outgoing
 * section physically rises and exits the top while the next rises from below,
 * they are flush against each other so no gap can open, and scrolling back up
 * reverses it because that is simply how a document scrolls.
 *
 * WHAT STILL USES SCROLLTRIGGER
 * -----------------------------
 *   - the story chapter's film is scrubbed inside its OWN section (its stage is
 *     sticky within that section only), because the supplied footage draws the
 *     quote as the playhead advances. That is one cinematic chapter, not a
 *     site-wide video timeline.
 *   - per-element reveals: headings, cards and ornaments animate independently
 *     as they enter, and reverse on the way back up.
 *   - the golden thread reads total document progress.
 *
 * RESPONSIVE COMPOSITION
 * ----------------------
 * Each section is composed independently below. They deliberately do NOT share
 * one layout rule:
 *
 *   Welcome   — centred at every size (it is a title card).
 *   Couple    — two portraits side by side from md up; stacked full-width cards
 *               on phones, where a 2-up grid would crush the portraits.
 *   Story     — full-bleed film, text overlay; the film is the composition.
 *   Countdown — centred medallion, absolutely nothing else competing with it.
 *   Sterling  — venue plate beside the details from lg up (two columns), image
 *               above details below on phones.
 *   Rudrakshaa— the portrait film beside the details from md up, stacked under
 *               it on phones, because the film is 520x1274 and cannot be
 *               cropped to a landscape band without losing the venue sign.
 */

const WELCOME_DAY = '/assets/scene3/welcome-day.jpg';
const WELCOME_NIGHT = '/assets/scene3/welcome-night.jpg';

const STORY_DAY = '/assets/scene5/story-day-scrub.mp4';
const STORY_NIGHT = '/assets/scene5/story-night-scrub.mp4';
const STORY_POSTER = '/assets/scene5/story-poster.jpg';
const STORY_NIGHT_POSTER = '/assets/scene5/story-night-poster.jpg';

const COUNTDOWN_FILM = '/assets/scene6/countdown-film.mp4';
const COUNTDOWN_POSTER = '/assets/scene6/countdown-poster.jpg';

const STERLING_DAY = '/assets/venues/sterling-day.jpg';
const STERLING_NIGHT = '/assets/venues/sterling-night.jpg';

const WEDDING_FILM = '/assets/venues/rudrakshaa.mp4';
const WEDDING_POSTER = '/assets/venues/rudrakshaa-poster.jpg';

const ENGAGEMENT_MAP = 'https://maps.app.goo.gl/z6CP5aXyaLV4JvZ38';
const WEDDING_MAP = 'https://maps.app.goo.gl/6gzA6t5nxyrjVTcp9';

const COUPLE = [
  {
    key: 'bride',
    label: 'THE BRIDE',
    name: 'Simran',
    parents: '(Daughter of Smt. Savita Saxena & Sh. Naveen Saxena)',
    bio: '“A vision of unconditional love, and timeless grace, and impossibly open charm — with a heart that fills every room she walks into.”',
    day: '/assets/couple/bride-day.png',
    night: '/assets/couple/bride-night.png',
    alt: 'Simran — The Bride',
  },
  {
    key: 'groom',
    label: 'THE GROOM',
    name: 'Sachit',
    parents: '(Son of Smt. Roli Srivastava & Sh. Satyendra Srivastava)',
    bio: '“Epitome of kindness, quiet strength, and a boundless heart — someone who makes life feel like home.”',
    day: '/assets/couple/groom-day.png',
    night: '/assets/couple/groom-night.png',
    alt: 'Sachit — The Groom',
  },
];

/* --------------------------------------------------------------- PLATES ---- */

function Backdrop({ day, night, isNight }) {
  return (
    <div className="absolute inset-0">
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[900ms] ease-out ${
          isNight ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ backgroundImage: `url('${day}')` }}
      />
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[900ms] ease-out ${
          isNight ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundImage: `url('${night}')` }}
      />
    </div>
  );
}

/**
 * Gold divider with an ornament — the shared editorial mark between sections.
 * Used instead of a repeated heading rule so the chapters feel related without
 * every one of them opening the same way.
 */
function Ornament({ icon: Icon = Sparkles, className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-[#d4af37] ${className}`}>
      <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#d4af37]/80 sm:w-16" />
      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#d4af37]/80 sm:w-16" />
    </div>
  );
}

/* -------------------------------------------------------------- SECTION ---- */

/**
 * A chapter. `min-h` rather than a fixed height, so a section grows when its
 * content needs more room (a long address on a 360px phone) instead of
 * overflowing or being crushed. `overflow-hidden` only clips the decorative
 * plate, never the text.
 */
function Section({ id, children, className = '', tall = false }) {
  return (
    <section
      id={id}
      className={`relative w-full overflow-hidden ${tall ? 'min-h-[100dvh]' : 'min-h-[92dvh]'} ${className}`}
    >
      {children}
    </section>
  );
}

/* ------------------------------------------------------------- CHAPTER 1 ---- */
/**
 * THE WELCOME — the hand-off from the opening cinematic.
 *
 * This is deliberately unchanged in spirit from the approved version: the
 * section's base plate is the courtyard film's REAL last frame, so when the
 * entrance freezes and this document takes over, the first pixels are identical
 * and there is no black moment. The welcome artwork then dissolves in on top.
 *
 * Composition: centred at every width. It is a title card — columns would
 * dilute it, so this one section does NOT get a responsive re-column.
 */
function WelcomeSection({ isNight, settled }) {
  return (
    <section id="welcome" className="relative min-h-[100dvh] w-full overflow-hidden">
      <Backdrop day="/assets/scene2/court-end-day.jpg" night="/assets/scene2/court-end-night.jpg" isNight={isNight} />

      <div
        className={`absolute inset-0 transition-opacity duration-[1600ms] ease-out ${settled ? 'opacity-100' : 'opacity-0'}`}
      >
        <Backdrop day={WELCOME_DAY} night={WELCOME_NIGHT} isNight={isNight} />
        <div
          className="absolute inset-0"
          style={{
            background: isNight
              ? 'linear-gradient(to top, rgba(5,9,20,0.9), rgba(10,17,36,0.5) 50%, rgba(4,7,17,0.7))'
              : 'linear-gradient(to top, rgba(10,7,4,0.78), rgba(0,0,0,0.18) 50%, rgba(26,18,8,0.4))',
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-5 text-center">
        <div className="reveal mb-[clamp(0.25rem,1dvh,0.5rem)] h-[clamp(1.6rem,4.2dvh,3rem)] w-[clamp(2rem,5dvh,3.5rem)] text-[#d4af37] drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)]">
          <svg viewBox="0 0 60 50" fill="none" stroke="currentColor" className="h-full w-full">
            <path d="M 30 4 L 30 10 M 28 6 L 32 6" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 30 10 C 23 11, 16 16, 16 26 L 44 26 C 44 16, 37 11, 30 10 Z" strokeWidth="1.4" fill="currentColor" fillOpacity="0.12" />
            <path d="M 14 26 L 46 26" strokeWidth="1.8" />
            <path d="M 18 26 L 18 38 M 26 26 L 26 38 M 34 26 L 34 38 M 42 26 L 42 38" strokeWidth="1.4" />
            <path d="M 12 38 L 48 38" strokeWidth="1.8" />
            <path d="M 22 38 C 22 33, 26 31, 30 31 C 34 31, 38 33, 38 38" strokeWidth="1.4" />
            <circle cx="30" cy="20" r="2" fill="currentColor" />
          </svg>
        </div>

        <p className="reveal font-cinzel mb-[clamp(0.1rem,0.6dvh,0.5rem)] text-[clamp(0.5rem,1.5dvh,0.875rem)] font-medium tracking-[0.32em] uppercase text-[#e6d0a7] drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] sm:tracking-[0.4em]">
          The Wedding Of
        </p>

        {/* Width AND height, not height alone.
            The name is set on two deliberate lines. Sized only by `dvh` it went
            to 67px on a 360px phone, where "Sachit Srivastava" cannot fit on one
            line and broke into four, pushing the sub-line and the scroll cue
            together.

            `min(8.4dvh, 13vw)`: the approved 8.4dvh still governs on tablet and
            desktop, where the width term never binds — so the approved desktop
            appearance is untouched. The width term only takes over on narrow
            phones, where 8.4dvh is far too wide for the line.

            13vw is chosen to sit comfortably UNDER the two-line limit for this
            face (measured at ~16.2% of the inner width), not at it: 360px gives
            ~47px with ~15px of breathing room on each side, clearing the golden
            thread rail. A slightly smaller elegant name beats a cramped maximum
            one, and the two-line lockup can never break. */}
        <h1 className="reveal font-script bg-gradient-to-r from-[#ebd6a7] via-[#fff5df] to-[#ebd6a7] bg-clip-text text-[clamp(1.65rem,min(8.4dvh,13vw),5.5rem)] leading-[1.12] font-normal text-transparent drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
          Simran Saxena &amp;
          <br />
          Sachit Srivastava
        </h1>

        <div className="reveal my-[clamp(0.4rem,1.6dvh,1rem)] w-full max-w-sm sm:max-w-md">
          <div className="flex items-center justify-center gap-3 text-[#d4af37]">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#d4af37]/70 to-[#d4af37]" />
            <svg width="28" height="18" viewBox="0 0 40 24" fill="none" stroke="currentColor">
              <circle cx="20" cy="12" r="3.5" fill="currentColor" />
              <path d="M 12 12 C 16 6, 24 6, 28 12 C 24 18, 16 18, 12 12 Z" strokeWidth="1.2" />
              <path d="M 5 12 C 8 8, 11 8, 14 12" strokeWidth="1" />
              <path d="M 35 12 C 32 8, 29 8, 26 12" strokeWidth="1" />
            </svg>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#d4af37]/70 to-[#d4af37]" />
          </div>
        </div>

        <p className="reveal font-cinzel text-[clamp(0.45rem,1.35dvh,0.75rem)] leading-relaxed tracking-[0.24em] uppercase text-[#ebd8b7] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] sm:tracking-[0.28em]">
          You Are Cordially Invited To
        </p>
        <p className="reveal font-cinzel mt-1 text-[clamp(0.55rem,1.5dvh,0.875rem)] font-medium tracking-[0.2em] uppercase text-[#fdfaf3] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] sm:tracking-[0.24em]">
          Celebrate Our Wedding
        </p>

        <div className="mt-[clamp(1rem,4dvh,2.5rem)] flex animate-bounce items-center gap-1.5 font-sans-clean text-[10px] tracking-[0.25em] uppercase text-[#dfba5c] drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
          <span>Scroll</span>
          <ChevronDown className="h-3 w-3" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- CHAPTER 2 ---- */
/**
 * THE COUPLE — the one section that genuinely re-columns.
 *
 * From md up: two portraits side by side, each a tall arched panel, because the
 * comparison between bride and groom is the whole point of the composition.
 *
 * On phones: a single column of two full-width cards. The old 2-up grid was
 * crushing each portrait to ~150px, which cropped faces. Stacking gives each
 * portrait the full content width, so the arch and the subject stay visible.
 *
 * The portrait is `aspect-[7/9]` with object-cover + object-top on phones so a
 * 360px screen keeps heads in frame rather than centring on a torso.
 */
function CoupleSection({ isNight }) {
  return (
    <Section id="couple" className="py-[clamp(3rem,10dvh,7rem)]">
      <Backdrop day="/assets/couple/palace-day.jpg" night="/assets/couple/palace-night.jpg" isNight={isNight} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/55 to-black/45" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-4 sm:px-8">
        <div className="text-center">
          <span className="reveal font-cinzel block text-[clamp(0.5rem,1.6dvh,0.875rem)] font-medium tracking-[0.35em] uppercase text-[#dfba5c]">
            Meet The
          </span>
          <h2 className="reveal font-cinzel mt-1 mb-2 bg-gradient-to-r from-[#ebd6a7] via-[#fff5df] to-[#ebd6a7] bg-clip-text text-[clamp(1.1rem,min(6.7dvh,7.2vw),3.75rem)] leading-tight font-semibold tracking-[0.1em] text-transparent drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] sm:tracking-[0.12em]">
            BRIDE &amp; GROOM
          </h2>
          <Ornament />
        </div>

        {/* grid-cols-1 -> md:grid-cols-2. Not 2-up on phones: the portraits are
            the content, and halving the width crops them. */}
        <div className="mt-[clamp(1.5rem,5dvh,3rem)] grid w-full grid-cols-1 gap-[clamp(1rem,3dvh,2.5rem)] md:grid-cols-2">
          {COUPLE.map((person) => (
            <article
              key={person.key}
              className="reveal flex flex-col items-center rounded-2xl border border-[#d4af37]/60 bg-gradient-to-b from-[#101830] via-[#0b1022] to-[#050814] p-[clamp(1rem,3dvh,1.75rem)] text-center shadow-[0_24px_60px_rgba(0,0,0,0.85),inset_0_0_30px_rgba(212,175,55,0.08)]"
            >
              <div className="relative mb-[clamp(0.75rem,2.9dvh,1.25rem)] aspect-[7/9] w-full max-w-[16rem] overflow-hidden rounded-t-full border-2 border-[#d4af37]/80 shadow-[0_15px_35px_rgba(0,0,0,0.7),0_0_20px_rgba(212,175,55,0.25)] sm:border-4">
                <img
                  src={isNight ? person.night : person.day}
                  alt={person.alt}
                  loading="lazy"
                  decoding="async"
                  className="block h-full w-full object-cover object-top"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>

              <span className="font-cinzel mb-1 text-[clamp(0.5rem,1.4dvh,0.75rem)] font-semibold tracking-[0.26em] uppercase text-[#dfba5c]">
                {person.label}
              </span>
              <h3 className="font-royal my-1 text-[clamp(1.15rem,3.5dvh,1.875rem)] leading-tight font-normal tracking-wide text-[#fdfaf3]">
                {person.name}
              </h3>
              <p className="font-serif-body mb-[clamp(0.5rem,1.75dvh,0.75rem)] text-[clamp(0.65rem,1.85dvh,1rem)] font-medium leading-snug tracking-wide text-[#dfba5c] italic">
                {person.parents}
              </p>
              <div className="my-[clamp(0.35rem,1.15dvh,0.5rem)] h-px w-16 bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent sm:w-20" />
              <p className="font-serif-body max-w-sm text-[clamp(0.65rem,1.6dvh,0.875rem)] leading-relaxed text-[#dad2c3] italic">
                {person.bio}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-[clamp(1.5rem,4dvh,2.5rem)] flex items-center gap-3 text-[#d4af37]">
          <span className="h-px w-12 bg-[#d4af37]/40 sm:w-16" />
          <Heart className="h-3.5 w-3.5 fill-[#d4af37]/30 text-[#d4af37] sm:h-4 sm:w-4" />
          <span className="h-px w-12 bg-[#d4af37]/40 sm:w-16" />
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- CHAPTER 3 ---- */
/**
 * OUR STORY — the Elephant Welcome.
 *
 * This chapter used to be SCRUBBED: a 240vh track drove the film's playhead from
 * scroll progress, so the elephants only walked while the visitor kept scrolling
 * and the quotation only finished appearing if they scrolled far enough. That is
 * the behaviour the brief rejects. It asks the guest to perform the animation,
 * and an older visitor can easily scroll straight past without ever seeing the
 * complete composition — and they would never know they had missed it.
 *
 * It is now a SELF-PLAYING CINEMATIC INTERLUDE:
 *
 *     scroll in once  ->  the film starts on its own and plays to the end in
 *                         real time  ->  the final composition is held  ->  the
 *                         next gesture continues the journey.
 *
 * The film is PLAYED, never scrubbed. Nothing about it is tied to scroll
 * progress any more, which is what makes "an accidental scroll cannot skip or
 * partially reveal the scene" true by construction rather than something we
 * police gesture by gesture.
 *
 * THE SHORT HOLD
 * --------------
 * A hold covers the play window so an absent-minded swipe cannot carry the
 * visitor past a scene that is still unfolding. It is deliberately one-way and
 * always escapable, because this chapter must never become a trap:
 *
 *   - scrolling UP always releases it immediately (anyone may leave at any time)
 *   - a "Continue" control is on screen for the whole hold
 *   - a failsafe timer releases it after duration + 3s, so a film that errors
 *     or never fires `ended` cannot strand anybody
 *   - if the browser refuses to autoplay, the hold is never engaged at all
 *
 * DAY / NIGHT
 * -----------
 * Both films are mounted from first paint. A theme change mid-scene goes through
 * `swapThemeVideo`, which freezes the outgoing playhead, seeks the incoming film
 * to that exact timestamp, WAITS for the seek to land, starts it, and only then
 * mutes the old layer. So toggling continues from the same frame instead of
 * restarting the scene or jumping to an unrelated one.
 *
 * REDUCED MOTION
 * --------------
 * No autoplay and no hold at all. The film is parked on its last frame, which
 * carries the complete quotation and the full decoration, so exactly the same
 * information is delivered with no animation and the visitor scrolls past at
 * whatever pace they like. That is a usable alternative, not a disabled state.
 */
const STORY_ACTIVE_RATIO = 0.6;

function StorySection({ isNight }) {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const dayRef = useRef(null);
  const nightRef = useRef(null);

  // The playback machine lives in a ref: none of this should re-render the tree
  // while a film is playing, and the observers are registered exactly once.
  const state = useRef({
    started: false,
    finished: false,
    holding: false,
    pinY: 0,
    settleUntil: 0,
    timer: 0,
    // Last scroll position we observed, so the hold can tell which way the
    // visitor is travelling before it decides anything.
    lastY: 0,
    // Set for the single scroll event our own clamp produces, so the guard
    // does not mistake its own correction for the visitor moving.
    clamping: false,
  });
  const prevNight = useRef(isNight);

  // Handles for the markup's controls. Set inside the effect below.
  const startRef = useRef(null);
  const skipRef = useRef(null);

  // Only these affect markup, and only a couple of times per visit.
  const [ui, setUi] = useState({ needsTap: false, failed: false });
  const [holding, setHolding] = useState(false);

  const themeVideo = () => (prevNight.current ? nightRef.current : dayRef.current);

  /* ------------------------------------------------------------------ *
   * DAY / NIGHT — same playhead, no restart
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (prevNight.current === isNight) return;
    prevNight.current = isNight;

    const from = isNight ? dayRef.current : nightRef.current;
    const to = isNight ? nightRef.current : dayRef.current;
    if (!to) return;

    const s = state.current;

    // Finished: park the incoming layer on ITS final frame so the crossfade
    // holds the same completed composition instead of jumping to the middle of
    // a scene the visitor has already watched to the end.
    if (s.finished) {
      const end = Number.isFinite(to.duration) && to.duration > 0 ? to.duration - 0.05 : 0;
      try {
        to.pause();
        to.currentTime = end;
      } catch {
        /* a film that has not loaded yet simply stays on its poster */
      }
      return;
    }

    // Mid-scene: hand the exact timestamp across. swapThemeVideo pauses the
    // outgoing layer, seeks, waits for the seek, plays the incoming one, then
    // mutes the old one — so the two layers never both play at once and there
    // is no gap in the crossfade.
    if (s.started) swapThemeVideo({ fromVideo: from, toVideo: to });
  }, [isNight]);

  /* ------------------------------------------------------------------ *
   * PLAYBACK MACHINE — observers, hold, autoplay
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return undefined;

    const s = state.current;
    const vids = [dayRef.current, nightRef.current].filter(Boolean);
    for (const v of vids) {
      // Muted + playsInline is the only combination browsers autoplay without
      // asking. Both are set here as well as in the markup so a theme swap
      // cannot drop them.
      v.muted = true;
      v.playsInline = true;
    }

    /* ---- Reduced motion: still play the FILM, suppress only decoration ----

       THIS BLOCK WAS MAKING THE SITE LOOK BROKEN.

       It used to `pause()` every film and seek it to `duration - 0.05` under
       `prefers-reduced-motion: reduce`. A visitor whose OS has "Reduce motion"
       switched on therefore saw: the elephant chapter already parked on its
       last frame, the finale parked, and — because the reveal tween is also
       disabled under reduce — every section sitting there with no movement at
       all. The ONE thing that still worked was the countdown, because
       CountdownSection is the only section with no reduce branch, so its film
       played and its dial kept ticking. That is precisely the report: "almost
       every animation and video stopped working, only the countdown works".

       The distinction that was missing: the films here are CONTENT, not
       decoration. Parked-at-the-end is not a reduced-motion alternative, it is
       a disabled chapter. So the film now plays exactly as it does normally —
       muted, inline, once — while the genuinely decorative motion (the page
       reveals, the gold motes, the long transitions) still honours the
       preference. Nobody gets a dead page, and nobody gets gratuitous motion. */

    /* ---------------- the hold is now purely presentational ----------------

       IT USED TO BLOCK THE PAGE, AND THAT WAS THE BUG.

       This block used to preventDefault() every forward wheel/touch/key gesture
       while the elephant film played, and a scroll listener snapped the document
       back to the section's top with window.scrollTo() if it moved. To the
       visitor that is a page which stops dead part-way through: forward scroll
       does nothing at all, so the venue chapter and the three sections after it
       can never be reached. Measured with a scroll walk, the document sat at
       y=1870 for nine consecutive samples — it never advanced past the story
       chapter.

       The brief for this chapter is explicit: the film plays through, the final
       frame HOLDS, and the visitor continues when they scroll. Holding a frame
       is a property of the <video> element (it does that by itself when it ends
       and is never rewound), not something the page has to enforce by refusing
       input. Nothing here may trap a gesture, snap the scroll position, or
       introduce forced scrolling.

       So: no preventDefault, no scrollTo, no clamping. `holding` is kept ONLY so
       the visible "Continue" affordance can be shown while the film runs; it
       grants no control over scrolling whatsoever. */

    /* Presentational only. These toggle the little "Continue" affordance in the
       markup; neither one registers a listener, calls preventDefault, or moves
       the document. Scrolling is always the visitor's. */
    const releaseHold = () => {
      if (!s.holding) return;
      s.holding = false;
      setHolding(false);
    };

    const engageHold = () => {
      if (s.holding) return;
      s.holding = true;
      setHolding(true);
    };

    /* ---------------- start / finish ---------------- */
    const finish = () => {
      clearTimeout(s.timer);
      if (s.finished) return;
      s.finished = true;
      releaseHold();
      // No navigation, no auto-advance: the last frame simply stays on screen
      // until the visitor scrolls on.
    };

    const begin = async () => {
      if (s.started || s.finished) return;
      s.started = true;

      const v = themeVideo();
      if (!v) return;

      try {
        v.currentTime = 0; // always from the correct beginning
      } catch {
        /* a poster-only state cannot seek; play() still works */
      }

      const ok = await playSafely(v);
      if (!ok) {
        // Autoplay refused (or the file failed): hand over to a real control
        // rather than leaving a frozen frame with no explanation.
        s.started = false;
        setUi({ needsTap: true, failed: false });
        return;
      }

      setUi((u) => (u.needsTap || u.failed ? { needsTap: false, failed: false } : u));
      engageHold();

      const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 14;
      clearTimeout(s.timer);
      s.timer = setTimeout(finish, (dur + 3) * 1000);
    };

    const skip = () => {
      const v = themeVideo();
      if (v) {
        const end = Number.isFinite(v.duration) && v.duration > 0 ? v.duration - 0.05 : 0;
        try {
          v.currentTime = end;
          v.pause();
        } catch {
          /* ignore */
        }
      }
      finish();
    };

    startRef.current = begin;
    skipRef.current = skip;

    /* ---------------- events ---------------- */
    const onEnded = (e) => {
      // Ignore the hidden theme layer: only the visible film may finish the scene.
      if (e.target !== themeVideo()) return;
      finish();
    };
    for (const v of vids) v.addEventListener('ended', onEnded);

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const v = themeVideo();

        if (entry.isIntersecting && entry.intersectionRatio >= STORY_ACTIVE_RATIO) {
          if (!s.started) {
            begin();
          } else if (!s.finished && v && v.paused) {
            // Returning to the chapter resumes where it was paused. It does not
            // restart, and it does not replay from zero.
            playSafely(v);
            engageHold();
          }
          return;
        }

        if (!entry.isIntersecting && !s.finished) {
          // Left the stage (scrolled up past it). Pause and let go.
          if (v) v.pause();
          releaseHold();
        }
      },
      { threshold: [0, 0.5, STORY_ACTIVE_RATIO, 1] },
    );
    io.observe(stage);

    return () => {
      io.disconnect();
      clearTimeout(s.timer);
      releaseHold();
      for (const v of vids) {
        v.removeEventListener('ended', onEnded);
        v.pause();
      }
      startRef.current = null;
      skipRef.current = null;
    };
  }, []);

  return (
    <section ref={sectionRef} id="story" className="relative w-full" style={{ height: '100dvh' }}>
      <div ref={stageRef} className="sticky top-0 h-[100dvh] w-full overflow-hidden">
        {[
          { key: 'day', src: STORY_DAY, poster: STORY_POSTER, on: !isNight, ref: dayRef },
          { key: 'night', src: STORY_NIGHT, poster: STORY_NIGHT_POSTER, on: isNight, ref: nightRef },
        ].map((film) => (
          <video
            key={film.key}
            ref={film.ref}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] ease-out ${
              film.on ? 'opacity-100' : 'opacity-0'
            }`}
            src={film.src}
            poster={film.poster}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
          />
        ))}

        {/* Only reachable if the browser refused to autoplay, or the file died.
            Subtle, centred, and it is the only way the scene can stall. */}
        {ui.needsTap && (
          <button
            onClick={() => startRef.current?.()}
            className="font-cinzel absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#04070f]/55 text-[#f7d58a] backdrop-blur-[2px]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d4af37]/60 bg-[#050914]/70 shadow-[0_0_30px_rgba(212,175,55,0.35)]">
              <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
            </span>
            <span className="text-[10px] tracking-[0.26em] uppercase">Play The Scene</span>
          </button>
        )}

        {/* The escape hatch. Present for the whole hold, tiny, and never in the
            way of the composition. */}
        {holding && !ui.needsTap && (
          <button
            onClick={() => skipRef.current?.()}
            className="font-sans-clean safe-right absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] z-20 rounded-full border border-[#d4af37]/35 bg-[#050914]/70 px-4 py-2 text-[9px] tracking-[0.22em] uppercase text-[#dfba5c] backdrop-blur-md transition-colors active:bg-[#d4af37]/15"
          >
            Continue
          </button>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- CHAPTER 4 ---- */
/**
 * The live timer. Its own component so the one-second tick re-renders only this
 * subtree — the section above it never re-renders.
 *
 * Every size here is expressed in `cqw` (container query width units) against
 * the dial itself, so the four numbers scale with the medallion rather than the
 * viewport and can neither overflow the circle nor become unreadable.
 */
function CountdownDial() {
  const { label, target, days, hours, mins, secs } = useCountdown();
  const units = [
    { key: 'd', label: 'Days', value: days },
    { key: 'h', label: 'Hours', value: hours },
    { key: 'm', label: 'Mins', value: mins },
    { key: 's', label: 'Secs', value: secs },
  ];

  return (
    <div className="relative aspect-square w-full [container-type:inline-size]">
      <div className="absolute inset-0 rounded-full border border-[#d4af37]/60 shadow-[0_0_50px_rgba(212,175,55,0.3),inset_0_0_36px_rgba(212,175,55,0.12)]" />
      <div className="absolute inset-[4.5%] rounded-full border border-[#d4af37]/25" />
      <div className="absolute inset-[9%] rounded-full bg-[radial-gradient(circle_at_50%_36%,rgba(12,21,38,0.86)_0%,rgba(4,7,17,0.95)_100%)] backdrop-blur-[2px]" />

      <span className="absolute top-0 left-1/2 h-[2cqw] w-[2cqw] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#dfba5c]/85" aria-hidden="true" />
      <span className="absolute bottom-0 left-1/2 h-[2cqw] w-[2cqw] -translate-x-1/2 translate-y-1/2 rotate-45 bg-[#dfba5c]/85" aria-hidden="true" />
      <span className="absolute top-1/2 left-0 h-[2cqw] w-[2cqw] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#dfba5c]/85" aria-hidden="true" />
      <span className="absolute top-1/2 right-0 h-[2cqw] w-[2cqw] -translate-y-1/2 translate-x-1/2 rotate-45 bg-[#dfba5c]/85" aria-hidden="true" />

      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-[8%] text-center"
        role="timer"
        aria-label={`${label}. ${days} days, ${hours} hours, ${mins} minutes until ${target}.`}
      >
        <p className="font-cinzel text-[3.4cqw] leading-tight uppercase tracking-[0.18em] text-[#dfba5c] drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
          {label}
        </p>

        <div className="mt-[2.4cqw] flex items-start justify-center gap-[2.2cqw]">
          {units.map((u) => (
            <div key={u.key} className="flex flex-col items-center">
              <span className="font-royal text-[14cqw] leading-none font-bold text-[#fff9e6] tabular-nums drop-shadow-[0_2px_10px_rgba(255,215,120,0.45)]">
                {String(u.value).padStart(2, '0')}
              </span>
              <span className="font-sans-clean mt-[0.8cqw] text-[3.6cqw] uppercase tracking-[0.12em] text-[#d8b878]">
                {u.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-[2.8cqw] h-px w-3/5 bg-gradient-to-r from-transparent via-[#d4af37]/65 to-transparent" />
        <p className="font-sans-clean mt-[2.4cqw] text-[3.6cqw] uppercase tracking-[0.16em] text-[#f7d58a]/85">
          {target}
        </p>
      </div>
    </div>
  );
}

/**
 * THE COUNTDOWN — the film plays once, then holds on its last frame, and the
 * timer zooms into the medallion that final frame leaves empty.
 *
 * One-shot by construction: `startedRef` is set the first time the section
 * comes into view and is never cleared, and the element carries no `loop`, so
 * scrolling back up finds the film held on its final frame instead of replaying.
 *
 * The dial's position is measured from the film's own last frame — centre at
 * 49.80% across and 35.21% down, with a diameter of 17.03% of the frame width —
 * and the wrapper reproduces object-cover geometry so those fractions stay
 * fractions OF THE FILM at every viewport.
 */
function CountdownSection({ isNight }) {
  const ref = useRef(null);
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);
  const readyRef = useRef(false);

  const revealDial = () => {
    if (readyRef.current) return;
    readyRef.current = true;
    setReady(true);
  };

  useGSAP(
    () => {
      const section = ref.current;
      const video = videoRef.current;
      if (!section || !video) return undefined;

      const st = ScrollTrigger.create({
        trigger: section,
        start: 'top 78%',
        end: 'bottom top',
        onEnter: () => {
          if (startedRef.current) return;
          startedRef.current = true;
          video.currentTime = 0;
          const p = video.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        },
        // Scrolled past before the clip finished: the visitor never saw the
        // ending, so put the dial in rather than leave an empty ring.
        onLeave: revealDial,
      });

      return () => st.kill();
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="countdown" className="relative min-h-[100dvh] w-full overflow-hidden">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        ref={videoRef}
        src={COUNTDOWN_FILM}
        poster={COUNTDOWN_POSTER}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onEnded={revealDial}
        aria-hidden="true"
      />

      <div
        className="absolute inset-0"
        style={{
          background: isNight
            ? 'radial-gradient(circle at 50% 40%, rgba(4,7,17,0.30) 10%, rgba(4,7,17,0.68) 62%, rgba(2,4,10,0.92) 100%)'
            : 'radial-gradient(circle at 50% 40%, rgba(4,7,17,0.22) 10%, rgba(4,7,17,0.58) 62%, rgba(2,4,10,0.90) 100%)',
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 'max(100%, calc(100dvh * 16 / 9))',
            height: 'max(100%, calc(100vw * 9 / 16))',
          }}
        >
          <div
            className="absolute"
            style={{ left: '49.8%', top: '35.21%', width: '17.03%', transform: 'translate(-50%, -50%)' }}
          >
            <div
              className={`origin-center transition-all duration-[900ms] ease-out ${
                ready ? 'scale-100 opacity-100' : 'scale-[0.5] opacity-0'
              }`}
            >
              <CountdownDial />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- CHAPTER 5 ---- */
/**
 * Small shared row: icon, label, value. Used identically by both venue
 * chapters so the two read as a matched pair without duplicating markup.
 */
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 sm:gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/45 bg-[#d4af37]/10 text-[#dfba5c] sm:h-8 sm:w-8">
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </span>
      <div className="min-w-0 text-left">
        <p className="font-sans-clean text-[clamp(0.42rem,1.1vmin,0.55rem)] uppercase tracking-[0.2em] text-[#dfba5c]">
          {label}
        </p>
        <p className="font-serif-body text-[clamp(0.78rem,2vmin,1.05rem)] leading-snug text-[#f7f2e7]">
          {value}
        </p>
      </div>
    </div>
  );
}

function MapButton({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group font-sans-clean inline-flex items-center gap-2 rounded-full border border-[#d4af37]/60 bg-[#0b1022]/85 px-4 py-2 text-[clamp(0.46rem,1.15vmin,0.6rem)] uppercase tracking-[0.18em] text-[#f3e5ab] shadow-[0_6px_22px_rgba(0,0,0,0.55)] backdrop-blur-sm transition-all duration-300 hover:border-[#dfba5c] hover:bg-[#121a30]/90 hover:shadow-[0_8px_28px_rgba(212,175,55,0.3)] active:scale-95 sm:px-5 sm:py-2.5"
    >
      <Navigation className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      {children}
    </a>
  );
}

/**
 * THE ENGAGEMENT — Sterling Banquet.
 *
 * THIS is the section that benefits most from real re-column, so it is the one
 * that changes arrangement most between breakpoints:
 *
 *   lg and up  — two columns. The venue plate fills the left half edge-to-edge
 *                (it is scenery; it should breathe), the details sit on the
 *                right. Left-right hierarchy, generous negative space.
 *   sm to lg   — one column, plate on top as a wide banner, details beneath.
 *   phones     — one column with a SHORT plate (h-[46dvh]) rather than a
 *                full-height one, so the date, time and map button are visible
 *                without a scroll that hides the artwork entirely.
 *
 * The plate is `object-cover` throughout, but on phones it is anchored to the
 * top so the arch of flowers stays in frame instead of being cropped to a wall.
 */
function EngagementSection({ isNight }) {
  return (
    <Section id="engagement">
      {/* Desktop: the plate owns the LEFT 54% and the text owns the right. On
          phones it is the full-bleed background behind the stacked content.
          `right-[46%]` (not `left-[46%]`) is what puts it on the left. */}
      <div className="absolute inset-0 lg:right-[46%]">
        <Backdrop day={STERLING_DAY} night={STERLING_NIGHT} isNight={isNight} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#04070f]/94 via-[#04070f]/45 to-[#04070f]/25 lg:bg-gradient-to-r lg:from-[#04070f]/40 lg:via-[#04070f]/30 lg:to-[#04070f]/95" />
      </div>

      {/* Desktop: a clean seam between the plate and the text column, so the
          artwork does not butt into the heading. */}
      <div className="absolute inset-0 hidden lg:block lg:bg-gradient-to-r lg:from-transparent lg:via-[#04070f]/70 lg:to-[#04070f]" />

      <div className="relative z-10 mx-auto flex min-h-[92dvh] w-full max-w-6xl flex-col justify-end px-4 pt-[clamp(3.5rem,10dvh,6rem)] pb-[clamp(2rem,7dvh,4rem)] sm:px-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
        {/* On desktop this empty column lets the venue artwork own the left
            half; on phones it collapses and the content sits on the plate. */}
        <div className="hidden lg:block" />

        <div className="w-full max-w-xl lg:max-w-none">
          <p className="reveal font-cinzel text-[clamp(0.44rem,1.45vmin,0.7rem)] uppercase tracking-[0.36em] text-[#dfba5c] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            The Engagement
          </p>

          <h2 className="reveal font-cinzel mt-2 bg-gradient-to-r from-[#ebd6a7] via-[#fff5df] to-[#ebd6a7] bg-clip-text text-[clamp(1.5rem,min(5.4dvh,7vw),3.2rem)] leading-tight font-semibold tracking-[0.06em] text-transparent drop-shadow-[0_4px_22px_rgba(0,0,0,0.95)]">
            Sterling Banquet
          </h2>

          <div className="reveal mt-3 flex max-w-[10rem] items-center gap-3 text-[#d4af37]">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d4af37]" />
            <Heart className="h-3.5 w-3.5 fill-[#d4af37]/30" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4af37]" />
          </div>

          <div className="reveal mt-[clamp(1rem,3dvh,1.75rem)] grid grid-cols-1 gap-3 rounded-2xl border border-[#d4af37]/45 bg-[#080d1a]/72 p-[clamp(0.9rem,2.4dvh,1.5rem)] text-left shadow-[0_22px_60px_rgba(0,0,0,0.8),inset_0_0_26px_rgba(212,175,55,0.07)] backdrop-blur-md sm:grid-cols-2">
            <InfoRow icon={Calendar} label="Date" value="Thursday, 10 December 2026" />
            <InfoRow icon={Clock} label="Time" value="06:00 PM onwards" />
            <div className="sm:col-span-2">
              <InfoRow icon={MapPin} label="Venue" value="Sterling Banquet, Ghaziabad, Uttar Pradesh 201001" />
            </div>
          </div>

          <div className="reveal mt-[clamp(0.9rem,2.4dvh,1.4rem)] flex justify-start">
            <MapButton href={ENGAGEMENT_MAP}>View On The Map</MapButton>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- CHAPTER 6 ---- */
/**
 * THE WEDDING — Rudrakshaa Banquet.
 *
 * One film, no Day/Night toggle: the supplied clip turns from daylight to night
 * on its own, so the footage IS the transition. It is also portrait (520x1274
 * after the baked-in chip was cropped away), which drives the composition:
 *
 *   md and up  — film on the left, details on the right. The film keeps its own
 *                aspect ratio (`h-[70dvh] w-auto object-contain`) rather than
 *                being stretched, so the RUDRAKSHA sign is never cropped.
 *   phones     — film ABOVE, details BELOW, both full width. The film gets
 *                42dvh so the date/time/map are reachable in one screen, and a
 *                blurred copy of its own frame fills the canvas behind it so the
 *                panel never sits on a flat void.
 *
 * Playing on arrival is handled by ScrollTrigger rather than autoplay, so a
 * visitor scrolling past quickly does not leave a 4MB decode running.
 */
function WeddingSection() {
  const ref = useRef(null);
  const videoRef = useRef(null);
  const armedRef = useRef(false);

  useGSAP(
    () => {
      const video = videoRef.current;
      if (!video) return undefined;

      const st = ScrollTrigger.create({
        trigger: ref.current,
        start: 'top 65%',
        end: 'bottom top',
        onEnter: () => {
          if (armedRef.current) return;
          armedRef.current = true;
          video.currentTime = 0;
          const p = video.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        },
        onLeaveBack: () => {
          armedRef.current = false;
          video.pause();
        },
      });

      return () => st.kill();
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="wedding" className="relative min-h-[100dvh] w-full overflow-hidden">
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-2xl"
        style={{ backgroundImage: `url('${WEDDING_POSTER}')` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[#04070f]/82" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#04070f]/96 via-transparent to-[#04070f]/85" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col items-center justify-center gap-[clamp(0.75rem,2.5dvh,1.5rem)] px-4 pt-[clamp(3.5rem,10dvh,5rem)] pb-[clamp(2rem,7dvh,4rem)] sm:px-8 md:flex-row md:gap-[clamp(1.5rem,4vw,3.5rem)]">
        <video
          ref={videoRef}
          className="reveal h-[42dvh] w-auto max-w-full rounded-sm border border-[#d4af37]/55 object-contain shadow-[0_22px_60px_rgba(0,0,0,0.85),0_0_26px_rgba(212,175,55,0.2)] sm:h-[48dvh] md:h-[70dvh]"
          src={WEDDING_FILM}
          poster={WEDDING_POSTER}
          muted
          playsInline
          preload="metadata"
          disablePictureInPicture
        />

        <div className="w-full max-w-md text-center md:text-left">
          <p className="reveal font-cinzel text-[clamp(0.44rem,1.45vmin,0.7rem)] uppercase tracking-[0.36em] text-[#dfba5c] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            The Wedding
          </p>

          <h2 className="reveal font-cinzel mt-2 bg-gradient-to-r from-[#ebd6a7] via-[#fff5df] to-[#ebd6a7] bg-clip-text text-[clamp(1.35rem,min(4.8dvh,6.4vw),2.8rem)] leading-tight font-semibold tracking-[0.05em] text-transparent drop-shadow-[0_4px_22px_rgba(0,0,0,0.95)]">
            Rudrakshaa Banquet
          </h2>

          <div className="reveal mx-auto mt-2.5 flex max-w-[12rem] items-center gap-3 text-[#d4af37] md:mx-0">
            <span className="h-px w-9 bg-gradient-to-r from-transparent to-[#d4af37]" />
            <Heart className="h-3.5 w-3.5 fill-[#d4af37]/30" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4af37]" />
          </div>

          <div className="reveal mt-[clamp(0.75rem,2.4dvh,1.25rem)] grid grid-cols-1 gap-2.5 rounded-2xl border border-[#d4af37]/45 bg-[#080d1a]/72 p-[clamp(0.85rem,2dvh,1.25rem)] text-left shadow-[0_22px_60px_rgba(0,0,0,0.8),inset_0_0_26px_rgba(212,175,55,0.07)] backdrop-blur-md">
            <InfoRow icon={Calendar} label="Date" value="Saturday, 12 December 2026" />
            <InfoRow icon={Clock} label="Time" value="08:00 PM onwards" />
            <InfoRow icon={MapPin} label="Venue" value="Rudrakshaa Banquet, Vaishali, Ghaziabad 201001" />
          </div>

          <div className="reveal mt-[clamp(0.75rem,2dvh,1.1rem)] flex justify-center md:justify-start">
            <MapButton href={WEDDING_MAP}>View On The Map</MapButton>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ FOOTER -- */
/**
 * A closing line, not another scene. It seals the document so the last section
 * does not simply stop at the viewport edge, and gives the golden thread a place
 * to finish.
 */
function ClosingSection() {
  return (
    <footer className="relative w-full overflow-hidden bg-[#04070f] py-[clamp(3rem,10dvh,6rem)]">
      <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] to-transparent" />
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-6 text-center">
        <Ornament icon={Heart} className="reveal" />
        <p className="reveal font-script mt-4 text-[clamp(1.5rem,5dvh,2.75rem)] leading-tight text-[#f7d58a] drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
          With love, we await you
        </p>
        <p className="reveal font-cinzel mt-3 text-[clamp(0.5rem,1.4vmin,0.7rem)] uppercase tracking-[0.32em] text-[#dfba5c]">
          Simran &amp; Sachit
        </p>
        <p className="reveal font-sans-clean mt-6 text-[clamp(0.44rem,1.1vmin,0.58rem)] uppercase tracking-[0.24em] text-[#8b8377]">
          10 &amp; 12 December 2026 · Ghaziabad
        </p>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------- MAIN -- */
export default function InvitationScroll({ isNight }) {
  const rootRef = useRef(null);
  const [settled, setSettled] = useState(false);

  // The welcome artwork dissolves in over the courtyard's true last frame, so
  // the film -> document hand-off reads as one shot instead of a cut.
  useEffect(() => {
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  /*
    PER-ELEMENT REVEALS — independent of section structure.

    Every `.reveal` element gets its own ScrollTrigger as it enters, with a small
    stagger inside each section. `once: false` is deliberate: scrolling back up
    returns the elements to their hidden state, so the journey is reversible
    rather than one-way. Everything is a transform + opacity only, so it stays
    on the compositor and costs nothing per frame.

    Reduced motion: the elements are simply shown, never animated.
  */
  useGSAP(
    () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const items = gsap.utils.toArray('.reveal');

      if (reduce) {
        gsap.set(items, { opacity: 1, y: 0, clearProps: 'transform' });
        return undefined;
      }

      const triggers = items.map((el, i) =>
        gsap.fromTo(
          el,
          { opacity: 0, y: 26 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              toggleActions: 'play none none reverse',
              invalidateOnRefresh: true,
            },
            delay: (i % 5) * 0.045,
          },
        ),
      );

      return () => {
        for (const t of triggers) {
          if (t.scrollTrigger) t.scrollTrigger.kill();
          t.kill();
        }
      };
    },
    { scope: rootRef, dependencies: [] },
  );

  return (
    <div ref={rootRef} id="invitation-scroll" className="relative w-full">
      <WelcomeSection isNight={isNight} settled={settled} />
      <CoupleSection isNight={isNight} />
      <StorySection isNight={isNight} />
      <CountdownSection isNight={isNight} />
      <EngagementSection isNight={isNight} />
      <WeddingSection />
      <ClosingSection />
    </div>
  );
}
