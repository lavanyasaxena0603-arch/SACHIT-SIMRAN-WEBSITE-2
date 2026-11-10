import { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Heart, Sparkles, ChevronDown } from 'lucide-react';

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
const STORY_VIDEO = '/assets/scene5/scroll-story-scrub.mp4';
const STORY_POSTER = '/assets/scene5/story-poster.jpg';

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

/* ---------------------------------------------------------------- ACT A ---- */
function WelcomeAct() {
  return (
    <div className="welcome-content absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-5">
      <div className="w-11 h-9 sm:w-14 sm:h-12 mb-2 text-[#d4af37] drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)]">
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

      <p className="font-cinzel tracking-[0.32em] sm:tracking-[0.4em] uppercase text-[10px] sm:text-sm text-[#e6d0a7] font-medium mb-1 sm:mb-2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
        The Wedding Of
      </p>

      <h1
        className="text-[2.6rem] leading-[1.15] sm:text-7xl md:text-8xl font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#ebd6a7] via-[#fff5df] to-[#ebd6a7] drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]"
        style={{ fontFamily: "'Great Vibes', cursive" }}
      >
        Simran Saxena &amp;<br />Sachit Srivastava
      </h1>

      <div className="w-full max-w-sm sm:max-w-md my-3 sm:my-4">
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

      <p className="font-cinzel tracking-[0.24em] sm:tracking-[0.28em] uppercase text-[9px] sm:text-xs text-[#ebd8b7] leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
        You Are Cordially Invited To
      </p>
      <p className="font-cinzel tracking-[0.2em] sm:tracking-[0.24em] uppercase text-[11px] sm:text-sm text-[#fdfaf3] font-medium mt-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
        Celebrate Our Wedding
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- ACT B ---- */
function CoupleAct({ isNight }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-3 sm:px-6">
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
        <div className="text-center mb-3 sm:mb-8">
          <span className="font-cinzel text-[10px] sm:text-sm tracking-[0.35em] uppercase text-[#dfba5c] font-medium">
            Meet The
          </span>
          <h2 className="font-cinzel text-xl sm:text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-[#ebd6a7] via-[#fff5df] to-[#ebd6a7] font-semibold tracking-[0.1em] sm:tracking-[0.12em] mt-1 mb-2 drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
            BRIDE &amp; GROOM
          </h2>
          <div className="flex items-center justify-center gap-3 text-[#d4af37] max-w-xs mx-auto">
            <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#d4af37]/70 to-[#d4af37]" />
            <Sparkles className="w-4 h-4" />
            <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#d4af37]/70 to-[#d4af37]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-10 w-full max-w-3xl">
          {COUPLE.map((person) => (
            <div
              key={person.key}
              className="relative flex flex-col items-center text-center p-2.5 sm:p-7 rounded-2xl bg-gradient-to-b from-[#101830] via-[#0b1022] to-[#050814] border border-[#d4af37]/60 shadow-[0_24px_60px_rgba(0,0,0,0.85),inset_0_0_30px_rgba(212,175,55,0.08)]"
            >
              <div className="relative w-[4.5rem] sm:w-52 h-[6.5rem] sm:h-64 mb-2 sm:mb-5 rounded-t-full border-[2px] sm:border-4 border-[#d4af37]/80 overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.7),0_0_20px_rgba(212,175,55,0.25)]">
                <img
                  src={isNight ? person.night : person.day}
                  alt={person.alt}
                  className="block w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              </div>

              <span className="font-cinzel text-[8px] sm:text-xs tracking-[0.24em] sm:tracking-[0.3em] uppercase text-[#dfba5c] font-semibold mb-1">
                {person.label}
              </span>
              <h3 className="font-royal text-base sm:text-3xl text-[#fdfaf3] font-normal tracking-wide my-0.5 sm:my-1">
                {person.name}
              </h3>
              <p className="font-serif-body text-[9px] sm:text-base text-[#dfba5c] italic tracking-wide mb-1.5 sm:mb-3 font-medium leading-snug">
                {person.parents}
              </p>
              <div className="w-12 sm:w-20 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent my-1 sm:my-2" />
              <p className="font-serif-body text-[9px] sm:text-sm text-[#dad2c3] italic leading-snug sm:leading-relaxed max-w-sm">
                {person.bio}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-2.5 sm:mt-6 text-[#d4af37]">
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
 * rose petals are ALL drawn inside scroll-story-scrub.mp4 — the footage
 * typewrites the words as the playhead advances. So this act deliberately
 * renders no text of its own: the film is the single source of that animation.
 * (Adding HTML lines here is what previously printed the quote twice.)
 */
function StoryAct({ isNight }) {
  return (
    <div className="absolute inset-0 z-30">
      <video
        className={`story-video absolute inset-0 w-full h-full object-cover transition-[filter] duration-[900ms] ${
          isNight ? 'brightness-[0.66] contrast-[1.18] hue-rotate-[205deg] saturate-[0.85]' : ''
        }`}
        src={STORY_VIDEO}
        poster={STORY_POSTER}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
      />
      {isNight && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 75% 20%, rgba(20,35,75,0.34) 0%, rgba(5,10,25,0.62) 60%, rgba(2,5,15,0.85) 100%)',
              mixBlendMode: 'multiply',
            }}
          />
          <div className="absolute top-16 right-16 sm:right-32 w-10 h-10 sm:w-14 sm:h-14 rounded-full pointer-events-none bg-[#fffce8] opacity-90 shadow-[0_0_35px_#ffeaa7,0_0_80px_rgba(255,234,167,0.4)]" />
          <div
            className="absolute bottom-0 inset-x-0 h-36 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(229,173,53,0.14), transparent)', mixBlendMode: 'screen' }}
          />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ REDUCED ------ */
/** Respect prefers-reduced-motion: a calm, static vertical read. */
function ReducedStory({ isNight }) {
  return (
    <div id="scroll-journey" className="w-full bg-[#050812] text-[#f7f2e7] font-serif-body">
      <section className="relative min-h-[100dvh] flex items-center overflow-hidden">
        <Backdrop daySrc={WELCOME_DAY} nightSrc={WELCOME_NIGHT} isNight={isNight} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/35" />
        <div className="relative z-10 w-full py-24">
          <WelcomeAct />
        </div>
      </section>
      <section className="relative min-h-[100dvh] flex items-center overflow-hidden">
        <Backdrop daySrc={PALACE_DAY} nightSrc={PALACE_NIGHT} isNight={isNight} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/35" />
        <div className="relative z-10 w-full py-16">
          <CoupleAct isNight={isNight} />
        </div>
      </section>
      <section className="relative min-h-[100dvh] flex items-center overflow-hidden">
        <StoryAct isNight={isNight} />
      </section>
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
      if (reduceMotion || !trackRef.current) return;

      const video = trackRef.current.querySelector('.story-video');
      const frame = { t: 0 };

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: trackRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      // ACT A leaves — the welcome title lifts and dissolves.
      tl.to('.welcome-content', { opacity: 0, y: -70, duration: 0.14, ease: 'power1.in' }, 0.06);

      // Backdrop A -> B blends in place (never slides, never empties). The
      // palace is faded IN over the welcome plate and then left fully opaque,
      // so there is no moment where a lower layer can show through the seam.
      tl.fromTo('.palace-layer', { opacity: 0 }, { opacity: 1, duration: 0.18 }, 0.06);

      // ACT B arrives, holds, then leaves.
      tl.fromTo(
        '.couple-content',
        { opacity: 0, y: 46 },
        { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out' },
        0.17,
      );
      tl.to('.couple-content', { opacity: 0, y: -80, duration: 0.13, ease: 'power1.in' }, 0.43);

      // Backdrop B -> C blends in place. The palace is left fully opaque
      // underneath, so no lower layer can leak through mid-dissolve.
      tl.fromTo('.story-layer', { opacity: 0 }, { opacity: 1, duration: 0.16 }, 0.43);

      // ACT C — the film is scrubbed by this one timeline.
      tl.to(
        frame,
        {
          t: 1,
          duration: 0.5,
          onUpdate: () => {
            if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
            const next = frame.t * video.duration;
            if (Math.abs(video.currentTime - next) > 0.015) video.currentTime = next;
          },
        },
        0.5,
      );

      tl.to('.scroll-cue', { opacity: 0, duration: 0.05 }, 0.05);
    },
    { scope: trackRef, dependencies: [reduceMotion] },
  );

  if (reduceMotion) return <ReducedStory isNight={isNight} />;

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

        {/* ---- One header for the whole journey ---- */}
        <header className="absolute top-0 inset-x-0 z-40 px-4 sm:px-10 py-4 sm:py-6 flex items-center gap-3 pointer-events-none">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#d4af37]/60 bg-[#0c1222]/80 backdrop-blur-md flex items-center justify-center text-[#dfba5c] shadow-[0_4px_20px_rgba(0,0,0,0.5)] shrink-0">
            <span className="font-cinzel text-xs font-semibold tracking-widest text-[#f3e5ab]">S&amp;S</span>
          </div>
          <div className="text-left">
            <p className="font-cinzel text-[8px] sm:text-[9px] tracking-[0.3em] uppercase text-[#dfba5c] leading-none mb-1">
              Royal Wedding
            </p>
            <h2 className="font-royal text-[11px] sm:text-xs tracking-[0.16em] uppercase text-[#fdfaf3] font-medium leading-none">
              Simran &amp; Sachit
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
