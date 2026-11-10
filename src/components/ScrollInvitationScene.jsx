import { useRef, useState, useMemo } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Sun, Moon, ChevronDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * SCENE 05 — SCROLL-DRIVEN STORY
 * One GSAP timeline (0 → 1) is tied to scroll. It drives the video frame,
 * the diya drawing, the quote lines and the petals together, so:
 *  - scroll down = forward, stop = freeze, scroll up = reverse
 *  - Day/Night only changes the look; it never touches the timeline.
 */
const VIDEO_SRC = '/assets/scene5/scroll-story-scrub.mp4';
const LINES = ['“From a chance cup of chai to', 'forever — we can’t wait to', 'celebrate with the people who', 'made our story whole.”'];
const DIYA_PATHS = [
  ['M 80 20 C 68 30, 68 46, 80 58 C 92 46, 92 30, 80 20 Z', 200, 2],
  ['M 80 32 C 60 30, 48 48, 62 58 C 72 54, 76 44, 80 32 Z', 180, 1.8],
  ['M 80 32 C 100 30, 112 48, 98 58 C 88 54, 84 44, 80 32 Z', 180, 1.8],
  ['M 62 58 C 40 60, 20 48, 32 35 C 42 25, 52 42, 38 48', 150, 1.6],
  ['M 98 58 C 120 60, 140 48, 128 35 C 118 25, 108 42, 122 48', 150, 1.6],
];

export default function ScrollInvitationScene({ isNight: controlledIsNight, onToggleNight }) {
  const [internalIsNight, setInternalIsNight] = useState(false);
  const isNight = controlledIsNight !== undefined ? controlledIsNight : internalIsNight;
  const trackRef = useRef(null);
  const videoRef = useRef(null);

  const petals = useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    x: (i * 13.7) % 94 + 3,
    initialY: -10 - (i * 4) % 40,
    targetY: 88 + (i * 7) % 15,
    size: 8 + (i % 4) * 5,
    rotation: (i * 43) % 360,
    color: i % 3 === 0 ? '#e02875' : i % 3 === 1 ? '#f472b6' : '#ff99b6',
  })), []);

  useGSAP(() => {
    const video = videoRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frame = { t: 0 };
    const tl = gsap.timeline({
      paused: reduce,
      scrollTrigger: reduce ? undefined : {
        trigger: trackRef.current, start: 'top top', end: 'bottom bottom',
        scrub: 0.5, invalidateOnRefresh: true,
      },
    });

    // video frame follows timeline progress (no autoplay, no loop)
    tl.to(frame, {
      t: 1, duration: 1, ease: 'none',
      onUpdate: () => { if (Number.isFinite(video.duration)) video.currentTime = frame.t * video.duration; },
    }, 0);
    tl.to('.scroll-hint', { opacity: 0, duration: 0.05 }, 0.05);
    tl.fromTo('.diya-wrap', { opacity: 0, scale: 0.8, y: -16 }, { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: 'power2.out' }, 0.1);
    tl.fromTo('.diya-path', { strokeDashoffset: (i, el) => el.getAttribute('stroke-dasharray') }, { strokeDashoffset: 0, duration: 0.25, ease: 'none' }, 0.1);
    [[0.32, 0.16], [0.46, 0.14], [0.58, 0.14], [0.7, 0.14]].forEach(([start, dur], i) =>
      tl.fromTo(`.q${i}`, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: dur, ease: 'power2.out' }, start));
    tl.fromTo('.q-divider', { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: 0.1 }, 0.82);
    tl.fromTo('.petal',
      { opacity: 0, top: (i) => `${petals[i].initialY}%`, rotation: (i) => petals[i].rotation },
      { opacity: 1, top: (i) => `${petals[i].targetY}%`, rotation: '+=360', duration: 0.3, ease: 'none' }, 0.7);
    if (reduce) tl.progress(1);
  }, { scope: trackRef });

  const toggleTheme = () => {
    const next = !isNight;
    if (onToggleNight) onToggleNight(next); else setInternalIsNight(next);
  };

  const quoteColor = isNight ? 'text-[#fdfaf3]' : 'text-[#321c10]';
  const quoteShadow = isNight
    ? '0 2px 16px rgba(0,0,0,0.95), 0 0 20px rgba(212,175,55,0.4)'
    : '0 1px 4px rgba(255,255,255,0.85), 0 2px 10px rgba(0,0,0,0.1)';

  return (
    <div ref={trackRef} id="scroll-story-section" className="relative w-full bg-[#050812] text-[#f7f2e7]" style={{ height: '400vh' }}>
      <div className="sticky top-0 w-full h-[100dvh] overflow-hidden select-none font-serif-body">

        {/* Video: paused, frame chosen by scroll. Night = same frame with a night grade. */}
        <video
          ref={videoRef} src={VIDEO_SRC} muted playsInline preload="auto" disablePictureInPicture
          className={`absolute inset-0 w-full h-full object-cover transition-[filter] duration-1000 ${
            isNight ? 'brightness-[0.62] contrast-[1.2] hue-rotate-[205deg] saturate-[0.85]' : ''}`}
        />

        {isNight && (
          <>
            <div className="absolute inset-0 pointer-events-none z-10" style={{ background: 'radial-gradient(circle at 75% 20%, rgba(20,35,75,0.4) 0%, rgba(5,10,25,0.75) 60%, rgba(2,5,15,0.92) 100%)', mixBlendMode: 'multiply' }} />
            <div className="absolute top-16 right-20 sm:right-32 w-14 h-14 rounded-full pointer-events-none z-10 bg-[#fffce8] opacity-90 shadow-[0_0_35px_#ffeaa7,0_0_80px_rgba(255,234,167,0.4)]" />
            <div className="absolute bottom-0 inset-x-0 h-40 pointer-events-none z-10" style={{ background: 'linear-gradient(to top, rgba(229,173,53,0.18), transparent)', mixBlendMode: 'screen' }} />
          </>
        )}

        <div className="absolute inset-0 pointer-events-none z-20" style={{ background: isNight
          ? 'radial-gradient(circle at center, rgba(5,9,20,0.7) 15%, rgba(4,7,16,0.4) 55%, transparent 85%)'
          : 'radial-gradient(circle at center, rgba(255,248,235,0.4) 15%, rgba(245,230,205,0.15) 55%, transparent 85%)' }} />

        <div className="absolute inset-3 sm:inset-6 border border-[#d4af37]/35 pointer-events-none z-20 rounded-sm" />

        {/* Emblem + quote */}
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
          <div className="diya-wrap w-28 sm:w-40 h-14 sm:h-20 mb-2 sm:mb-4 text-[#d4af37] opacity-0">
            <svg viewBox="0 0 160 80" className="w-full h-full drop-shadow-[0_2px_12px_rgba(212,175,55,0.45)]">
              <path d="M 80 10 C 75 18, 73 24, 80 30 C 87 24, 85 18, 80 10 Z" fill="#ffb703" className="animate-pulse" />
              {DIYA_PATHS.map(([d, len, w]) => (
                <path key={d} d={d} className="diya-path" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeDasharray={len} />
              ))}
              <circle cx="80" cy="58" r="3" fill="currentColor" />
            </svg>
          </div>
          <div className="max-w-2xl space-y-1 sm:space-y-2">
            {LINES.map((line, i) => (
              <p key={line} className={`q${i} opacity-0 text-2xl sm:text-4xl md:text-5xl italic leading-tight ${quoteColor}`}
                 style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif", textShadow: quoteShadow }}>
                {line}
              </p>
            ))}
            <div className="q-divider opacity-0 pt-4 max-w-sm mx-auto flex items-center gap-3 text-[#d4af37]">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d4af37]" />
              <svg width="22" height="14" viewBox="0 0 28 16" fill="currentColor"><polygon points="14,0 28,8 14,16 0,8" /></svg>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4af37]" />
            </div>
          </div>
        </div>

        {/* Petals (positions animated by the timeline) */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          {petals.map((p, i) => (
            <div key={i} className="petal absolute rounded-full opacity-0"
                 style={{ left: `${p.x}%`, top: `${p.initialY}%`, width: p.size, height: p.size * 0.65, backgroundColor: p.color }} />
          ))}
        </div>

        <header className="absolute top-0 inset-x-0 z-40 px-6 sm:px-10 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#d4af37]/60 bg-[#090e1c]/85 backdrop-blur-md flex items-center justify-center">
              <span className="font-cinzel text-xs font-semibold tracking-widest text-[#f3e5ab]">S&amp;S</span>
            </div>
            <h2 className="font-royal text-xs tracking-[0.16em] uppercase text-[#fdfaf3] font-medium">Simran &amp; Sachit</h2>
          </div>
          <button onClick={toggleTheme} aria-label={isNight ? 'Switch to Day View' : 'Switch to Night View'}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#080d1a]/85 border border-[#d4af37]/50 backdrop-blur-md active:scale-95 transition">
            {isNight ? <Sun className="w-4 h-4 text-[#f9d775]" /> : <Moon className="w-4 h-4 text-[#dfba5c]" />}
            <span className="font-cinzel text-[11px] uppercase tracking-[0.14em] font-semibold text-[#f7f2e7]">{isNight ? 'Daylight' : 'Moonlit'}</span>
          </button>
        </header>

        <div className="scroll-hint absolute bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none">
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase text-[#dfba5c] font-sans-clean animate-bounce">
            <span>Scroll to continue</span><ChevronDown className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
