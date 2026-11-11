import { useEffect, useState } from 'react';
import { Smartphone, ArrowRight, X } from 'lucide-react';
import Monogram from './Monogram';
import { tryEnterLandscape } from '../lib/useOrientation';

/**
 * THE ORIENTATION GATE
 *
 * Shown on touch devices that are currently in PORTRAIT, because a 16:9
 * cinematic frame shown in a 9:19.5 phone window loses ~74% of its width —
 * measured, not estimated. Rotated, the same frame loses ~18% of its height and
 * the whole composition reads.
 *
 * WHAT THIS DELIBERATELY IS NOT
 * -----------------------------
 * It is not a lock and it is not compulsory. No browser can force a rotation on
 * page load: `screen.orientation.lock()` requires fullscreen AND a user gesture,
 * and iOS Safari does not implement it at all. So the gate appears
 * automatically, offers a one-tap "Enter Landscape" that does the best the
 * platform allows, and can always be dismissed. A guest who prefers portrait
 * loses nothing and is never trapped.
 *
 * `dismissed` survives rotation within the session but is intentionally NOT
 * persisted to storage: a returning visitor should be invited again, because
 * the experience really is better rotated.
 */
export default function OrientationGate({ visible, onDismiss }) {
  const [entering, setEntering] = useState(false);

  // While the gate is up, keep the page behind it from scrolling underneath —
  // but only then, and always restore on unmount/rotation so the continuous
  // document is never left in a frozen state.
  useEffect(() => {
    if (!visible) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!visible) return null;

  const handleEnterLandscape = async () => {
    setEntering(true);
    // Real gesture, so this is the one moment the platform may honour a lock.
    // On iOS it resolves false and we simply leave the gate up.
    await tryEnterLandscape();
    setEntering(false);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto safe-both-x bg-[#040711] py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orient-title"
    >
      {/* Royal ground: deep navy with a warm gold bloom behind the card. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 34%, rgba(212,175,55,0.16) 0%, rgba(9,14,28,0.75) 42%, rgba(4,7,17,0.98) 78%)',
        }}
      />

      {/* Thin gold frame, inset so it never touches a rounded screen corner. */}
      <div className="pointer-events-none absolute inset-3 rounded-sm border border-[#d4af37]/35 sm:inset-5">
        <div className="absolute -top-px -left-px h-4 w-4 border-t-2 border-l-2 border-[#d4af37]" />
        <div className="absolute -top-px -right-px h-4 w-4 border-t-2 border-r-2 border-[#d4af37]" />
        <div className="absolute -bottom-px -left-px h-4 w-4 border-b-2 border-l-2 border-[#d4af37]" />
        <div className="absolute -bottom-px -right-px h-4 w-4 border-b-2 border-r-2 border-[#d4af37]" />
      </div>

      <button
        onClick={onDismiss}
        aria-label="Dismiss and continue in portrait"
        className="absolute top-5 right-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#d4af37]/45 bg-[#090e1c]/80 text-[#dfba5c] backdrop-blur-md transition-all active:scale-95 sm:top-8 sm:right-8"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative z-10 w-full max-w-sm text-center">
        <div className="mb-5 flex justify-center">
          <Monogram className="h-auto w-11 drop-shadow-[0_2px_14px_rgba(212,175,55,0.5)]" />
        </div>

        {/* The rotating phone. Rotates on its own so the instruction needs no
            reading for a non-English speaker, and stops dead under
            prefers-reduced-motion while keeping the tilted final pose. */}
        <div className="mb-7 flex justify-center" aria-hidden="true">
          <style>{`
            @keyframes orient-tilt {
              0%, 18%   { transform: rotate(0deg); }
              45%, 62%  { transform: rotate(-90deg); }
              88%, 100% { transform: rotate(0deg); }
            }
            .orient-phone { animation: orient-tilt 3.4s cubic-bezier(.45,.05,.35,1) infinite; }
            @media (prefers-reduced-motion: reduce) {
              .orient-phone { animation: none; transform: rotate(-90deg); }
            }
          `}</style>
          <div className="relative flex h-28 w-28 items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-[#d4af37]/25" />
            <span className="absolute inset-3 rounded-full border border-[#d4af37]/15" />
            <div className="orient-phone text-[#dfba5c] drop-shadow-[0_0_18px_rgba(212,175,55,0.45)]">
              <Smartphone className="h-11 w-11" strokeWidth={1.25} />
            </div>
          </div>
        </div>

        <p className="font-cinzel mb-2 text-[9px] font-medium tracking-[0.34em] uppercase text-[#dfba5c]">
          Simran &amp; Sachit
        </p>

        <h2
          id="orient-title"
          className="font-script mb-3 text-[clamp(1.9rem,8vw,2.6rem)] leading-tight text-[#f7d58a] drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]"
        >
          A Royal Experience Awaits
        </h2>

        <div className="mx-auto mb-4 flex max-w-[11rem] items-center gap-2.5 text-[#d4af37]" aria-hidden="true">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d4af37]/80" />
          <svg width="18" height="12" viewBox="0 0 24 16" fill="currentColor">
            <path d="M12 15S1 9.4 1 4.6C1 2 3.1 0 5.6 0 8 0 10.1 1.6 12 3.5 13.9 1.6 16 0 18.4 0 20.9 0 23 2 23 4.6 23 9.4 12 15 12 15Z" fillOpacity="0.55" />
          </svg>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4af37]/80" />
        </div>

        <p className="font-serif-body mx-auto mb-2 max-w-[19rem] text-[clamp(0.92rem,3.9vw,1.05rem)] leading-relaxed text-[#ece5d8] italic">
          Rotate your phone to landscape to enjoy the complete cinematic experience.
        </p>

        <p className="font-sans-clean mb-8 text-[clamp(0.6rem,2.6vw,0.68rem)] tracking-[0.16em] uppercase text-[#a99a80]">
          Please tilt your phone horizontally
        </p>

        <button
          onClick={handleEnterLandscape}
          disabled={entering}
          className="group font-cinzel mb-3 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#ba8c22] via-[#e5c56c] to-[#ba8c22] px-7 py-3.5 text-[11px] font-bold tracking-[0.2em] uppercase text-[#060a15] shadow-[0_0_30px_rgba(212,175,55,0.45)] transition-all duration-300 active:scale-95 disabled:opacity-70"
        >
          {entering ? 'Preparing…' : 'Enter Landscape'}
          {!entering && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />}
        </button>

        <button
          onClick={onDismiss}
          className="font-sans-clean w-full rounded-full border border-[#d4af37]/40 px-6 py-3 text-[10px] tracking-[0.2em] uppercase text-[#dfba5c] transition-colors duration-300 active:bg-[#d4af37]/10"
        >
          Continue in Portrait
        </button>

        <p className="font-sans-clean mt-5 text-[9px] leading-relaxed tracking-[0.06em] text-[#6f6a60]">
          Rotating is a suggestion, never a requirement.
        </p>
      </div>
    </div>
  );
}
