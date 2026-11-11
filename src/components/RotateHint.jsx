import { useEffect, useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import { tryEnterLandscape } from '../lib/useOrientation';

/**
 * THE RE-SUGGESTION, WITHOUT A WALL
 *
 * OrientationGate can show once, at the very start, because nothing is lost by
 * blocking a screen the visitor has not begun reading yet. Once the invitation
 * itself is open that is no longer true: a guest three chapters into the story,
 * mid-scroll, must never be stopped by a full-screen panel that re-appears
 * because they turned their phone back upright. Part 1C asks for the suggestion
 * "again only when needed" — needed, not compulsory.
 *
 * So past the entrance the suggestion becomes this: a small, dismissible,
 * non-modal pill at the bottom of the screen. It is `pointer-events-none` on
 * the wrapper and `auto` only on the pill itself, so the page scrolls straight
 * through it, the golden thread is never covered, and nothing is trapped.
 *
 * It retires itself:
 *   - on dismiss (this rotation and every later one, for the session),
 *   - when the phone is rotated (the point has been made and taken),
 *   - after 14s untouched, because a hint that outstays its welcome is clutter.
 *
 * Deliberately absent: any timer that pops it back up mid-journey. "Only when
 * needed" means once, not repeatedly.
 */
const AUTO_HIDE_MS = 14000;

export default function RotateHint({ visible, onDismiss }) {
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;
    const id = setTimeout(onDismiss, AUTO_HIDE_MS);
    return () => clearTimeout(id);
  }, [visible, onDismiss]);

  if (!visible) return null;

  const handleRotate = async () => {
    setEntering(true);
    await tryEnterLandscape();
    setEntering(false);
    onDismiss();
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[58] flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <div
        className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-[#d4af37]/45 bg-[#080d1a]/92 py-2 pr-2 pl-3.5 shadow-[0_10px_34px_rgba(0,0,0,0.7)] backdrop-blur-md"
        role="status"
      >
        <style>{`
          @keyframes hint-tilt {
            0%, 22%   { transform: rotate(0deg); }
            46%, 64%  { transform: rotate(-90deg); }
            88%, 100% { transform: rotate(0deg); }
          }
          .hint-phone { animation: hint-tilt 3.6s cubic-bezier(.45,.05,.35,1) infinite; }
          @media (prefers-reduced-motion: reduce) {
            .hint-phone { animation: none; transform: rotate(-90deg); }
          }
        `}</style>

        <span className="hint-phone shrink-0 text-[#dfba5c]" aria-hidden="true">
          <Smartphone className="h-[15px] w-[15px]" strokeWidth={1.6} />
        </span>

        <button
          onClick={handleRotate}
          className="font-sans-clean text-left text-[10px] leading-tight tracking-[0.14em] uppercase text-[#ece5d8]"
        >
          {entering ? 'Preparing…' : 'Rotate for the full scene'}
        </button>

        <button
          onClick={onDismiss}
          aria-label="Dismiss rotation suggestion"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/30 text-[#a99a80] transition-colors active:bg-[#d4af37]/15"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
