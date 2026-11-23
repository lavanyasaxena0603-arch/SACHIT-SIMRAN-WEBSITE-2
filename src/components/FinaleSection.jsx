import { useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DoorOpen } from 'lucide-react';
import { playSafely, ensurePlaying } from '../lib/videoSwap';

/**
 * THE GRAND ROYAL WEDDING FINALE — Fireworks & Ending Credits
 *
 * It is a chapter like every other: a real <section> in normal document flow,
 * so the browser scrolls it in from below and no gap or black frame can open
 * against the closing section above it. It is mounted by <App /> as a flush
 * sibling of <InvitationScroll />.
 *
 * THE CELEBRATION
 * ---------------
 * The fireworks film played ONCE, all the way through, over the clean midnight
 * stage. The still is a permanent base layer under the film. The film fades in
 * over it and stays mounted.
 *
 * Immediately following the celebration, the ending section with creator
 * signature ("Created with love by Lavanya Saxena") and the EXIT navigation
 * appears in natural document flow.
 */

const FILM = '/assets/finale/varmala-fireworks-night.mp4';
const FILM_POSTER = '/assets/finale/varmala-poster.jpg';

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

/* Grading keeps the gold reading warm and the type legible without touching
   the artwork's own colour. */
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

export default function FinaleSection({ onExit }) {
  const sectionRef = useRef(null);
  const act1Ref = useRef(null);
  const footerRef = useRef(null);
  const videoRef = useRef(null);

  const prefersReduce = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [reduce] = useState(prefersReduce);
  const [phase, setPhase] = useState(() => (prefersReduce() ? 'hold' : 'reveal'));
  const [needsTap, setNeedsTap] = useState(false);
  const [sealed, setSealed] = useState(true);

  const stateRef = useRef({
    started: false,
    away1: false,
  });

  /* ------------------------------------------------------------ act engine */
  useEffect(() => {
    const section = sectionRef.current;
    const act1 = act1Ref.current;
    const video = videoRef.current;
    if (!section) return undefined;

    const s = stateRef.current;

    /* ------------------------------------------------------------------ *
     * THE CELEBRATION — palace fireworks
     * ------------------------------------------------------------------ */
    const playCelebration = () => {
      if (!video) return;
      try {
        video.currentTime = 0;
      } catch {
        /* poster-only; play() still works */
      }
      ensurePlaying(video).then((ok) => {
        if (!ok) setNeedsTap(true);
      });
    };

    const begin = () => {
      if (s.started) return;
      s.started = true;
      setPhase('motion');
      playCelebration();
    };

    const replayCelebration = () => {
      s.started = true;
      setNeedsTap(false);
      playCelebration();
    };

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
          s.away1 = true;
          if (video && !video.ended) video.pause();
        }
      },
      { threshold: [0, 0.05, 0.5, 0.75, 1] },
    );

    const ro1 = new ResizeObserver(() => ScrollTrigger.refresh());

    io1.observe(act1 || section);
    if (act1) ro1.observe(act1);

    return () => {
      io1.disconnect();
      ro1.disconnect();
      if (video) video.pause();
    };
  }, [reduce]);

  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, []);

  /* THE EXIT — takes the visitor to the total start of the website (Enter The Palace) */
  const handleExit = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (onExit) {
      onExit();
    }
  };

  const filmVisible = phase !== 'reveal';

  return (
    <section
      ref={sectionRef}
      id="finale"
      aria-label="The royal wedding finale"
      className="relative w-full"
    >
      {/* ------------------------------------------------------------------ *
       * THE CELEBRATION — Fireworks over the palace
       * ------------------------------------------------------------------ */}
      <div ref={act1Ref} className="relative h-[100dvh] w-full overflow-hidden bg-[#04070f]">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(72% 46% at 50% 44%, rgba(212,175,55,0.10) 0%, rgba(212,175,55,0.035) 42%, rgba(212,175,55,0) 72%), radial-gradient(130% 92% at 50% 34%, #0c1322 0%, #070b16 46%, #04070f 100%)',
          }}
          aria-hidden="true"
        />

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
       * ENDING CREDITS & EXIT NAVIGATION
       * ------------------------------------------------------------------ */}
      <footer
        ref={footerRef}
        className="relative w-full overflow-hidden bg-[#04070f] py-[clamp(3.5rem,8dvh,5.5rem)] px-4 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] flex flex-col items-center justify-center text-center"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(64% 50% at 50% 50%, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 45%, transparent 75%)',
          }}
          aria-hidden="true"
        />

        {sealed && (
          <div className="pointer-events-auto relative z-10 flex w-full max-w-[26rem] flex-col items-center text-center">
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

            <button
              type="button"
              onClick={handleExit}
              className="signature-exit font-cinzel pointer-events-auto mt-[clamp(0.8rem,2.1dvh,1.2rem)] inline-flex min-h-[44px] items-center justify-center gap-2.5 rounded-full border border-[#d4af37]/65 bg-[linear-gradient(180deg,#0b1324_0%,#060b16_100%)] px-[clamp(1.1rem,3.4vw,1.6rem)] text-[clamp(0.55rem,1.4vw,0.65rem)] tracking-[0.28em] text-[#f3e5ab] shadow-[0_12px_30px_rgba(0,0,0,0.7),0_0_0_1px_rgba(212,175,55,0.12)_inset,0_1px_0_rgba(255,240,200,0.18)_inset] transition-[transform,box-shadow,border-color,color] duration-300 ease-out hover:border-[#f3e5ab] hover:text-[#fff8e2] hover:shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_26px_rgba(212,175,55,0.42),0_1px_0_rgba(255,240,200,0.3)_inset] active:scale-[0.97] active:duration-150 focus-visible:ring-2 focus-visible:ring-[#d4af37]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#04070f] focus-visible:outline-none"
            >
              <DoorOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
              EXIT INVITATION
            </button>
          </div>
        )}
      </footer>
    </section>
  );
}
