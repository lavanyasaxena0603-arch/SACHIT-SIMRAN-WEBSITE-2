import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * THE HANGING GOLDEN THREAD
 *
 * A hairline champagne-gold thread down the left edge of the invitation, with a
 * small lotus-and-tassel pendant that travels along it. It is a picture of the
 * visitor's own scroll position: it draws further down as they descend, holds
 * dead still the instant they stop (ScrollTrigger only ticks while the scroll
 * actually moves), and retracts when they scroll back up.
 *
 * Deliberately NOT a progress bar: 1.4px of line, a faint ghost track behind it
 * so the thread reads as always having been there, and an ornament rather than
 * a dot as its marker.
 *
 * Both strokes are revealed together by writing `strokeDashoffset` from one
 * ScrollTrigger. No React state, no animation-frame loop, no re-render — one
 * style write per scrolled frame, which is what keeps it cheap on a phone.
 *
 * `vector-effect="non-scaling-stroke"` keeps the line exactly 1.4px on every
 * screen even though the SVG is stretched to the full viewport height with
 * preserveAspectRatio="none".
 */

const LINE_LEN = 1000;

export default function GoldenThread({ trackId = 'invitation-scroll' }) {
  const lineRef = useRef(null);
  const haloRef = useRef(null);
  const beadRef = useRef(null);

  useGSAP(
    () => {
      const track = document.getElementById(trackId);
      const line = lineRef.current;
      const halo = haloRef.current;
      const bead = beadRef.current;
      if (!track || !line || !halo || !bead) return undefined;

      for (const el of [line, halo]) {
        el.style.strokeDasharray = String(LINE_LEN);
        el.style.strokeDashoffset = String(LINE_LEN);
      }

      const trigger = ScrollTrigger.create({
        trigger: track,
        start: 'top top',
        end: 'bottom bottom',
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          const offset = String(LINE_LEN * (1 - p));
          line.style.strokeDashoffset = offset;
          halo.style.strokeDashoffset = offset;

          // The bead rides the same progress. It fades in only once the
          // invitation has actually begun, so it is not sitting on the welcome
          // frame before there is a journey to mark.
          bead.style.transform = `translate(-50%, ${p * 100}%)`;
          bead.style.opacity = p > 0.004 ? '1' : '0';
        },
      });

      // A URL-bar collapse or a rotation changes the rail height; re-measure
      // rather than leave the pendant stranded short of the bottom.
      const onResize = () => ScrollTrigger.refresh();
      window.addEventListener('orientationchange', onResize);

      return () => {
        window.removeEventListener('orientationchange', onResize);
        trigger.kill();
      };
    },
    { dependencies: [trackId] },
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none safe-left-edge fixed inset-y-0 z-[56] w-[16px] sm:w-[24px] lg:w-[32px]"
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 20 1000" preserveAspectRatio="none" fill="none">
        {/* Ghost track — the thread's full length, barely present. */}
        <line x1="10" y1="0" x2="10" y2="1000" stroke="#d4af37" strokeOpacity="0.14" strokeWidth="1" vectorEffect="non-scaling-stroke" />

        {/* Soft halo under the lit thread. */}
        <line
          ref={haloRef}
          x1="10"
          y1="0"
          x2="10"
          y2="1000"
          stroke="#dfba5c"
          strokeOpacity="0.18"
          strokeWidth="5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* The lit thread itself: pale at the top, warming as it descends. */}
        <defs>
          <linearGradient id="thread-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3e5ab" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#dfba5c" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#f7d58a" stopOpacity="1" />
          </linearGradient>
        </defs>
        <line
          ref={lineRef}
          x1="10"
          y1="0"
          x2="10"
          y2="1000"
          stroke="url(#thread-gold)"
          strokeWidth="1.4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* The pendant: its own square-ish viewBox and no stretching, so the
          ornament never distorts however tall the rail gets. */}
      <div
        ref={beadRef}
        className="absolute top-0 left-1/2 w-[13px] opacity-0 transition-opacity duration-700 sm:w-[16px] lg:w-[18px]"
        style={{ transform: 'translate(-50%, 0)' }}
      >
        <svg viewBox="0 0 24 34" fill="none" className="h-auto w-full drop-shadow-[0_2px_6px_rgba(212,175,55,0.45)]">
          <path d="M12 1 L12 6" stroke="#dfba5c" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M12 6.5 L15.2 10 L12 13.5 L8.8 10 Z" fill="#dfba5c" fillOpacity="0.9" stroke="#f3e5ab" strokeWidth="0.7" />
          <path d="M12 14.5 C15.5 17, 16.5 21, 12 24.5 C7.5 21, 8.5 17, 12 14.5 Z" stroke="#dfba5c" strokeWidth="0.9" fill="#d4af37" fillOpacity="0.22" />
          <path d="M12 24.5 L12 27" stroke="#dfba5c" strokeWidth="0.9" strokeLinecap="round" />
          <path d="M10.4 27.5 L10.4 32 M12 27.5 L12 32.5 M13.6 27.5 L13.6 32" stroke="#dfba5c" strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.85" />
          <circle cx="12" cy="10" r="0.9" fill="#fff5df" />
        </svg>
      </div>
    </div>
  );
}
