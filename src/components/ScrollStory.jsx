import { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Heart, Sparkles, ChevronDown } from 'lucide-react';
import Monogram from './Monogram';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * ONE CONTINUOUS SCROLL STORY — welcome, then the couple, then our story.
 *
 * Why this replaced separate screens
 * ----------------------------------
 * The welcome page, "meet the couple" and "our story" used to be separate
 * documents (at one point a full-page section plus its own pinned track).
 * Every hand-off unmounted one full-screen element and mounted the next, so
 * the viewport went dark for a beat and the site appeared to swap slides —
 * the "powerpoint" feel.
 *
 * Now there is ONE tall track holding ONE sticky 100dvh stage. Every backdrop
 * is mounted from the first paint and dissolves in place, so the canvas is
 * never empty: scrolling blends welcome into the couple and the couple into
 * the story, the way a portfolio site reads.
 *
 * The bottom layer is the courtyard's REAL last frame (extracted from the
 * entrance film itself at 1280x720, matching the video exactly), so when the
 * film ends and this track takes over, the first pixels are identical to the
 * film's last pixels. That is what removes the black moment between them.
 */

const BASE_DAY = '/assets/scene2/court-end-day.jpg';
const BASE_NIGHT = '/assets/scene2/court-end-night.jpg';
const WELCOME_DAY = '/assets/scene3/welcome-day.jpg';
const WELCOME_NIGHT = '/assets/scene3/welcome-night.jpg';
const PALACE_DAY = '/assets/couple/palace-day.jpg';
const PALACE_NIGHT = '/assets/couple/palace-night.jpg';
const STORY_DAY = '/assets/scene5/story-day-scrub.mp4';
const STORY_NIGHT = '/assets/scene5/story-night-scrub.mp4';
const STORY_POSTER = '/assets/scene5/story-poster.jpg';
const STORY_NIGHT_POSTER = '/assets/scene5/story-night-poster.jpg';

/**
 * One backdrop = a day plate and a night plate stacked, crossfading on the
 * global theme. Pure CSS, so toggling Day/Night can never touch the scroll
 * timeline or the video playhead.
 */
function Backdrop({ daySrc, nightSrc, isNight, className = '' }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[900ms] ease-out ${
          isNight ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ backgroundImage: `url('${daySrc}')` }}
      />
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[900ms] ease-out ${
          isNight ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundImage: `url('${nightSrc}')` }}
      />
    </div>
  );
}

// Both people render from ONE template, which is what guarantees the groom's
// card can never drift in brightness, size or transparency from the bride's.
// The panels use a solid gradient (no backdrop-blur) so neither can read as
// washed-out or see-through over a bright courtyard.
const COUPLE = [
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
];

/* ---------------------------------------------------------------- ACT A ---- */
function WelcomeAct() {
  return (
    <div className="welcome-content absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-5">
      <div className="w-[clamp(2rem,5dvh,3.5rem)] h-[clamp(1.6rem,4.2dvh,3rem)] mb-[clamp(0.25rem,1dvh,0.5rem)] text-[#d4af37] drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)]">
        <svg viewBox="0 0 60 50" fill="none" stroke="currentColor" className="w-full h-full">
          <path d="M 30 4 L 30 10 M 28 6 L 32 6" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 30 10 C 23 11, 16 16, 16 26 L 44 26 C 44 16, 37 11, 30 10 Z" strokeWidth="1.4" fill="currentColor" fillOpacity="0.12" />
          <path d="M 14 26 L 46 26" strokeWidth="1.8" />
          <path d="M 18 26 L 18 38 M 26 26 L 26 38 M 34 26 L 34 38 M 42 26 L 42 38" strokeWidth="1.4" />
          <path d="M 12 38 L 48 38" strokeWidth="1.8" />
          <path d="M 22 38 C 22 33, 26 31, 30 31 C 34 31, 38 33, 38 38" strokeWidth="1.4" />
          <circle cx="30" cy="20" r="2" fill="currentColor" />
        </svg>
      </div>

      <p className="font-cinzel tracking-[0.32em] sm:tracking-[0.4em] uppercase text-[clamp(0.5rem,1.5dvh,0.875rem)] text-[#e6d0a7] font-medium mb-[clamp(0.1rem,0.6dvh,0.5rem)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
        The Wedding Of
      </p>

      <h1
        className="text-[clamp(1.85rem,8.4dvh,5.5rem)] leading-[1.12] font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#ebd6a7] via-[#fff5df] to-[#ebd6a7] drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]"
        style={{ fontFamily: "'Great Vibes', cursive" }}
      >
        Sachit Srivastava &amp;<br />Simran Saxena
      </h1>

      <div className="w-full max-w-sm sm:max-w-md my-[clamp(0.4rem,1.6dvh,1rem)]">
        <div className="flex items-center justify-center gap-3 text-[#d4af37]">
          <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#d4af37]/70 to-[#d4af37]" />
          <svg width="28" height="18" viewBox="0 0 40 24" fill="none" stroke="currentColor">
            <circle cx="20" cy="12" r="3.5" fill="currentColor" />
            <path d="M 12 12 C 16 6, 24 6, 28 12 C 24 18, 16 18, 12 12 Z" strokeWidth="1.2" />
            <path d="M 5 12 C 8 8, 11 8, 14 12" strokeWidth="1" />
            <path d="M 35 12 C 32 8, 29 8, 26 12" strokeWidth="1" />
          </svg>
          <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#d4af37]/70 to-[#d4af37]" />
        </div>
      </div>

      <p className="font-cinzel tracking-[0.24em] sm:tracking-[0.28em] uppercase text-[clamp(0.45rem,1.35dvh,0.75rem)] text-[#ebd8b7] leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
        You Are Cordially Invited To
      </p>
      <p className="font-cinzel tracking-[0.2em] sm:tracking-[0.24em] uppercase text-[clamp(0.55rem,1.5dvh,0.875rem)] text-[#fdfaf3] font-medium mt-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
        Celebrate Our Wedding
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- ACT B ---- */
/**
 * Sizes are driven by viewport HEIGHT (dvh), not fixed px. The old fixed
 * values (h-64 portrait + text-6xl heading) could not shrink, so on a short or
 * wide browser window the block grew taller than the 100dvh stage and
 * `items-center` overflowed it in BOTH directions — which is what cropped
 * "MEET THE" off the top of the page.
 */
function CoupleAct({ isNight }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-3 sm:px-6 pb-2 pt-[clamp(1.75rem,7dvh,3.5rem)]">
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center max-h-full">
        <div className="text-center mb-[clamp(0.5rem,3.7dvh,2rem)]">
          <span className="font-cinzel text-[clamp(0.5rem,1.6dvh,0.875rem)] tracking-[0.35em] uppercase text-[#dfba5c] font-medium">
            Meet The
          </span>
          {/* min(dvh, vw) so the heading shrinks on a NARROW phone too. A pure
              dvh clamp gets large on a tall-but-narrow screen and "BRIDE & GROOM"
              then wraps to two lines and collides with the header. */}
          <h2 className="font-cinzel text-[clamp(0.95rem,min(6.7dvh,7.2vw),3.75rem)] text-transparent bg-clip-text bg-gradient-to-r from-[#ebd6a7] via-[#fff5df] to-[#ebd6a7] font-semibold tracking-[0.1em] sm:tracking-[0.12em] mt-1 mb-2 drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] leading-tight">
            BRIDE &amp; GROOM
          </h2>
          <div className="flex items-center justify-center gap-3 text-[#d4af37] max-w-xs mx-auto">
            <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#d4af37]/70 to-[#d4af37]" />
            <Sparkles className="w-4 h-4" />
            <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#d4af37]/70 to-[#d4af37]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[clamp(0.6rem,4.6dvh,2.5rem)] w-full max-w-3xl">
          {COUPLE.map((person) => (
            <div
              key={person.key}
              className="relative flex flex-col items-center text-center p-[clamp(0.6rem,3.2dvh,1.75rem)] rounded-2xl bg-gradient-to-b from-[#101830] via-[#0b1022] to-[#050814] border border-[#d4af37]/60 shadow-[0_24px_60px_rgba(0,0,0,0.85),inset_0_0_30px_rgba(212,175,55,0.08)]"
            >
              {/* 224x288 at 900px tall == 24.9dvh wide. Height is driven by
                  aspect-ratio rather than a dvh clamp so that on a narrow phone,
                  where the card is the binding constraint, the portrait shrinks
                  with its card instead of bursting out of it. */}
              <div className="relative w-[clamp(2.25rem,24.9dvh,14rem)] max-w-full aspect-[7/9] mb-[clamp(0.5rem,2.9dvh,1.25rem)] rounded-t-full border-2 sm:border-4 border-[#d4af37]/80 overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.7),0_0_20px_rgba(212,175,55,0.25)]">
                <img
                  src={isNight ? person.night : person.day}
                  alt={person.alt}
                  className="block w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              </div>

              <span className="font-cinzel text-[clamp(0.5rem,1.4dvh,0.75rem)] tracking-[0.24em] sm:tracking-[0.3em] uppercase text-[#dfba5c] font-semibold mb-1">
                {person.label}
              </span>
              <h3 className="font-royal text-[clamp(1rem,3.5dvh,1.875rem)] text-[#fdfaf3] font-normal tracking-wide my-[clamp(0.1rem,0.9dvh,0.25rem)] leading-tight">
                {person.name}
              </h3>
              <p className="font-serif-body text-[clamp(0.55rem,1.85dvh,1rem)] text-[#dfba5c] italic tracking-wide mb-[clamp(0.35rem,1.75dvh,0.75rem)] font-medium leading-snug">
                {person.parents}
              </p>
              <div className="w-12 sm:w-20 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent my-[clamp(0.25rem,1.15dvh,0.5rem)]" />
              <p className="font-serif-body text-[clamp(0.55rem,1.6dvh,0.875rem)] text-[#dad2c3] italic leading-snug sm:leading-relaxed max-w-sm">
                {person.bio}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-[clamp(0.6rem,3.5dvh,1.5rem)] text-[#d4af37]">
          <span className="w-12 sm:w-16 h-[1px] bg-[#d4af37]/40" />
          <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#d4af37]/30 text-[#d4af37]" />
          <span className="w-12 sm:w-16 h-[1px] bg-[#d4af37]/40" />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- ACT C ---- */
/**
 * The quote, the gold flourish above it, the divider beneath it and the falling
 * rose petals are ALL drawn inside the story films (story-day-scrub.mp4 /
 * story-night-scrub.mp4) — the footage typewrites the words as the playhead
 * advances, and both elephants visibly sway. So this act deliberately renders
 * no text of its own: the film is the single source of that animation.
 *
 * IMPORTANT: never leave these elements parked at frame 0. Frame 0 of the film
 * has the courtyard but NO text and few petals, so a video that is mounted but
 * never advanced looks like "nothing is written here". The caller drives
 * currentTime on BOTH films as the page scrolls.
 */
function StoryAct({ isNight }) {
  return (
    <div className="absolute inset-0 z-30">
      {/* TWO FILMS, one playhead.
          Both day and night are real films, mounted from first paint and seeked
          by the SAME scroll timeline to the SAME normalised time, so switching
          theme is a pure opacity crossfade — the scroll position, the playhead
          and the drawn quote never move. Only one is visible at a time. */}
      {[
        { key: 'day', src: STORY_DAY, poster: STORY_POSTER, on: !isNight },
        { key: 'night', src: STORY_NIGHT, poster: STORY_NIGHT_POSTER, on: isNight },
      ].map((film) => (
        <video
          key={film.key}
          className={`story-video absolute inset-0 w-full h-full object-cover transition-opacity duration-[900ms] ease-out ${
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
    </div>
  );
}

/* ---------------------------------------------------------------- MAIN ----- */
export default function ScrollStory({ isNight }) {
  const trackRef = useRef(null);
  const [reduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  // The welcome artwork dissolves in over the courtyard's last frame, so the
  // film -> scroll hand-off reads as one continuous shot instead of a cut.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useGSAP(
    () => {
      if (!trackRef.current) return;

      // BOTH films (day + night) are seeked to the same normalised time. They
      // are identical in length, so one scroll position maps to the same moment
      // in each; that is why toggling the theme is a pure crossfade and never
      // jumps the quote backwards or forwards.
      const videos = Array.from(trackRef.current.querySelectorAll('.story-video'));
      const frame = { t: 0 };

      // Reduced motion does NOT get a different stage — that was the bug. A
      // separate static branch mounted the film and never advanced it, leaving
      // it parked on frame 0 (elephants + flourish, no text, no petals), which
      // reads as "nothing is written here". Scrolling is user-driven, so it is
      // not the kind of motion the setting is meant to suppress: we keep the
      // same single stage and simply drop the decorative drift, use no scrub
      // easing lag, and soften the transitions.
      const drift = reduceMotion ? 0 : 1;

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: trackRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: reduceMotion ? true : 0.6,
          invalidateOnRefresh: true,
        },
      });

      // ACT A leaves — the welcome title lifts and dissolves.
      tl.to('.welcome-content', { opacity: 0, y: -70 * drift, duration: 0.14, ease: 'power1.in' }, 0.06);

      // Backdrop A -> B blends in place (never slides, never empties). The
      // palace is faded IN over the welcome plate and then left fully opaque,
      // so there is no moment where a lower layer can show through the seam.
      tl.fromTo('.palace-layer', { opacity: 0 }, { opacity: 1, duration: 0.18 }, 0.06);

      // ACT B arrives, holds, then leaves.
      tl.fromTo(
        '.couple-content',
        { opacity: 0, y: 46 * drift },
        { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out' },
        0.17,
      );
      tl.to('.couple-content', { opacity: 0, y: -80 * drift, duration: 0.13, ease: 'power1.in' }, 0.43);

      // Backdrop B -> C blends in place. The palace is left fully opaque
      // underneath, so no lower layer can leak through mid-dissolve.
      tl.fromTo('.story-layer', { opacity: 0 }, { opacity: 1, duration: 0.16 }, 0.43);

      // ACT C — the film is scrubbed by this one timeline. This is what draws
      // the quote, the petals and the elephants' sway: without it the film sits
      // on frame 0 and looks empty.
      tl.to(
        frame,
        {
          t: 1,
          duration: 0.5,
          onUpdate: () => {
            for (const v of videos) {
              if (!Number.isFinite(v.duration) || v.duration <= 0) continue;
              const next = frame.t * v.duration;
              if (Math.abs(v.currentTime - next) > 0.015) v.currentTime = next;
            }
          },
        },
        0.5,
      );

      tl.to('.scroll-cue', { opacity: 0, duration: 0.05 }, 0.05);
    },
    { scope: trackRef, dependencies: [reduceMotion] },
  );

  return (
    <div ref={trackRef} id="scroll-journey" className="relative w-full bg-[#050812]" style={{ height: '480vh' }}>
      <div className="sticky top-0 h-[100dvh] w-full overflow-hidden text-[#f7f2e7] select-none font-serif-body">
        {/* ---- LAYER 0 — the courtyard's real last frame. Always opaque, so the
                stage can never go black; everything above dissolves onto it. ---- */}
        <div className="court-layer absolute inset-0 z-0">
          <Backdrop daySrc={BASE_DAY} nightSrc={BASE_NIGHT} isNight={isNight} />
          <div
            className="absolute inset-0"
            style={{
              background: isNight
                ? 'linear-gradient(to top, rgba(5,9,20,0.92), rgba(10,17,36,0.55) 50%, rgba(4,7,17,0.7))'
                : 'linear-gradient(to top, rgba(8,6,3,0.72), rgba(0,0,0,0.2) 50%, rgba(20,14,7,0.4))',
            }}
          />
        </div>

        {/* ---- LAYER 1 — the welcome courtyard, dissolving in on mount ---- */}
        <div className="welcome-layer absolute inset-0 z-[1]">
          <div
            className={`absolute inset-0 transition-opacity duration-[1400ms] ease-out ${
              settled ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Backdrop daySrc={WELCOME_DAY} nightSrc={WELCOME_NIGHT} isNight={isNight} />
            <div
              className="absolute inset-0"
              style={{
                background: isNight
                  ? 'linear-gradient(to top, rgba(5,9,20,0.9), rgba(10,17,36,0.5) 50%, rgba(4,7,17,0.7))'
                  : 'linear-gradient(to top, rgba(10,7,4,0.78), rgba(0,0,0,0.18) 50%, rgba(26,18,8,0.4))',
              }}
            />
          </div>
        </div>

        {/* ---- LAYER 2 — the palace where the couple is presented ---- */}
        <div className="palace-layer absolute inset-0 z-[2] opacity-0">
          <Backdrop daySrc={PALACE_DAY} nightSrc={PALACE_NIGHT} isNight={isNight} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30" />
        </div>

        {/* ---- LAYER 3 — the story film (scrubbed by the timeline) ---- */}
        <div className="story-layer absolute inset-0 z-[3] opacity-0">
          <StoryAct isNight={isNight} />
        </div>

        {/* ---- Shared grade + royal frame ---- */}
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            background: isNight
              ? 'radial-gradient(circle at center, rgba(5,9,20,0.5) 20%, rgba(4,7,16,0.3) 60%, rgba(2,4,10,0.78) 100%)'
              : 'radial-gradient(circle at center, rgba(4,7,17,0.03) 45%, rgba(4,7,17,0.35) 82%, rgba(2,4,10,0.8) 100%)',
          }}
        />
        <div className="absolute inset-3 sm:inset-6 border border-[#d4af37]/35 pointer-events-none z-20 rounded-sm">
          <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#d4af37]" />
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#d4af37]" />
          <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#d4af37]" />
          <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#d4af37]" />
          <div className="absolute inset-1.5 border border-[#d4af37]/15 rounded-sm" />
        </div>

        {/* ---- Acts ---- */}
        <WelcomeAct />
        <div className="couple-content absolute inset-0 z-30 opacity-0">
          <CoupleAct isNight={isNight} />
        </div>

        {/* ---- One header for the whole journey ----
             Offsets must clear the gold frame (inset-3 on mobile, sm:inset-6),
             or the monogram rides the border line. 6/12 leaves 12px of air. */}
        <header className="absolute top-6 left-6 sm:top-10 sm:left-12 z-40 flex items-center gap-3 pointer-events-none">
          <Monogram className="w-[22px] sm:w-7 h-auto shrink-0 drop-shadow-[0_2px_10px_rgba(212,175,55,0.45)]" />
          <div className="text-left">
            <p className="font-cinzel text-[8px] sm:text-[9px] tracking-[0.3em] uppercase text-[#dfba5c] leading-none mb-1">
              Royal Wedding
            </p>
            <h2 className="font-royal text-[11px] sm:text-xs tracking-[0.16em] uppercase text-[#fdfaf3] font-medium leading-none">
              Sachit &amp; Simran
            </h2>
          </div>
        </header>

        <div className="scroll-cue absolute bottom-5 inset-x-0 z-40 flex justify-center pointer-events-none">
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase text-[#dfba5c] font-sans-clean animate-bounce drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
            <span>Scroll</span>
            <ChevronDown className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
