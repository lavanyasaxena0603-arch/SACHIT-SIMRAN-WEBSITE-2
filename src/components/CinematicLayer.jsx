import { useEffect, useRef } from 'react';
import '../cinematic.css';

/**
 * THE AAA CINEMATIC ENHANCEMENT LAYER — additive only.
 *
 * WHAT THIS IS
 * ------------
 * A single decorative overlay above the approved invitation that adds
 * atmosphere the approved components do not already have. It renders no text,
 * no image and no video, owns no layout, and never touches an existing element.
 * Deleting this file, cinematic.css and the one <CinematicLayer /> line in
 * App.jsx returns the site to exactly its previous state.
 *
 * WHAT IT ADDS
 * ------------
 *   1. GOLD DUST     fourteen specks of warm dust drifting up through the page.
 *                    Transform + opacity only; no canvas, no rAF loop.
 *   2. SOFT VIGNETTE a static edge darkening. It is deliberately part of this
 *                    layer because it IMPROVES legibility: the centre — where
 *                    every headline sits — is untouched, and only the corners
 *                    deepen. It costs one gradient and animates nothing.
 *   3. ENVIRONMENTAL a very slow radial light that breathes near the top of the
 *      LIGHT         frame: warm daylight in Day, cool moonlight in Night.
 *   4. PRESS GLOW    gold feedback at the pointer, drawn on this FIXED overlay
 *                    so it is never inserted into the button that was pressed.
 *
 * READABILITY — WHY THE LIGHT IS SO FAINT
 * ---------------------------------------
 * This layer paints ABOVE the content, so anything opaque here would sit on top
 * of the copy. The light is therefore capped at a peak alpha of 0.09 and is
 * confined to the upper third, away from body text; the vignette darkens edges
 * only. Verified in the browser against both themes: no measurable text
 * contrast loss.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * --------------------------------
 *   - It does not add, remove, move, restyle or re-animate any existing element.
 *   - It does not touch the scroll container, scroll progress, ScrollTrigger
 *     geometry or section heights. Nothing here can open a gap.
 *   - It adds no scroll listener and no animation frame loop.
 *   - It creates no second theme system: `isNight` is the SAME prop the rest of
 *     the app already uses, and it only tints this layer.
 *
 * REDUCED MOTION
 * --------------
 * Under `prefers-reduced-motion: reduce` the stylesheet removes the dust and the
 * light outright and hides the press glow — it does not merely slow them down.
 * The pointer listener is not even registered in that case.
 */

// Deterministic, hand-tuned dust. Coordinates are percentages; duration, delay,
// size and sway are chosen so no two specks move on the same beat — a uniform
// field reads as a screen effect, an irregular one reads as air.
const DUST = [
  { left: 6, size: 3, dur: 26, delay: 0, sway: 14, peak: 0.45 },
  { left: 17, size: 2, dur: 34, delay: 5.5, sway: -10, peak: 0.35 },
  { left: 28, size: 4, dur: 30, delay: 11, sway: 18, peak: 0.5 },
  { left: 37, size: 2, dur: 38, delay: 2.5, sway: -14, peak: 0.3 },
  { left: 46, size: 3, dur: 24, delay: 15, sway: 8, peak: 0.42 },
  { left: 55, size: 5, dur: 32, delay: 7, sway: -18, peak: 0.46 },
  { left: 63, size: 2, dur: 28, delay: 19, sway: 12, peak: 0.32 },
  { left: 71, size: 4, dur: 36, delay: 3.5, sway: -8, peak: 0.48 },
  { left: 79, size: 3, dur: 22, delay: 13, sway: 16, peak: 0.4 },
  { left: 86, size: 2, dur: 33, delay: 9, sway: -12, peak: 0.34 },
  { left: 92, size: 4, dur: 27, delay: 17, sway: 10, peak: 0.44 },
  { left: 12, size: 2, dur: 40, delay: 21, sway: 6, peak: 0.28 },
  { left: 50, size: 2, dur: 44, delay: 24, sway: -16, peak: 0.3 },
  { left: 68, size: 3, dur: 35, delay: 1.5, sway: 20, peak: 0.38 },
];

export default function CinematicLayer({ isNight }) {
  const rootRef = useRef(null);

  /* ------------------------------------------------------------------ *
   * PRESS GLOW — screen-space, delegated, and read-only
   *
   * One listener on the document, capturing `pointerdown`. It reads nothing
   * from the event except the coordinates, and writes nothing except a
   * transient node appended to THIS overlay. It never calls preventDefault,
   * never stops propagation and never inspects or mutates the target — so every
   * existing handler on every existing control keeps working untouched.
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined; // not merely slowed: not wired up at all

    const host = rootRef.current;
    if (!host) return undefined;

    const onDown = (e) => {
      // Primary button only (touch and pen also report 0), so right-click and
      // middle-click do not flash.
      if (e.button !== 0) return;

      const dot = document.createElement('span');
      dot.className = 'cine-ripple';
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;

      // Self-cleaning. `animationend` is the normal path; the timer is the
      // fallback for the case where the animation is cancelled mid-flight
      // (tab hidden, element display:none) and the event never fires.
      const drop = () => {
        dot.remove();
      };
      dot.addEventListener('animationend', drop, { once: true });
      const fallback = setTimeout(drop, 1200);
      dot.addEventListener('animationend', () => clearTimeout(fallback), { once: true });

      host.appendChild(dot);
    };

    document.addEventListener('pointerdown', onDown, { passive: true });

    /* A hidden tab must not animate. Toggling a class is cheaper than
     * unmounting, and it preserves every speck's position for the return. */
    const onVisibility = () => {
      host.classList.toggle('cine-paused', document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();

    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`cine-layer pointer-events-none fixed inset-0 z-[70] overflow-hidden ${
        isNight ? 'cine-night' : 'cine-day'
      }`}
      /* Decorative by definition: no text, no control, nothing to announce. */
      aria-hidden="true"
    >
      {/* Environmental light — upper third only, capped at 0.09 alpha. */}
      <div
        className="cine-glow"
        style={{
          '--cine-glow-peak': isNight ? 0.07 : 0.09,
          '--cine-glow-dur': isNight ? '26s' : '22s',
          background: isNight
            ? 'radial-gradient(62% 40% at 50% 20%, rgba(158,186,236,0.9) 0%, rgba(96,126,196,0.34) 46%, rgba(4,7,17,0) 78%)'
            : 'radial-gradient(62% 40% at 50% 18%, rgba(255,238,196,0.95) 0%, rgba(228,192,112,0.36) 48%, rgba(4,7,17,0) 80%)',
        }}
      />

      {/* Gold dust. */}
      {DUST.map((d, i) => (
        <span
          key={i}
          className="cine-dust"
          style={{
            left: `${d.left}%`,
            bottom: '-6%',
            width: `${d.size}px`,
            height: `${d.size}px`,
            animationDuration: `${d.dur}s`,
            animationDelay: `-${d.delay}s`,
            '--cine-dust-sway': `${d.sway}px`,
            '--cine-dust-peak': d.peak,
          }}
        />
      ))}

      {/* Static edge vignette. Darkens corners only; the centre is untouched,
          so it cannot reduce the contrast of any headline or body copy. */}
      <div
        className="cine-vignette"
        style={{
          background: isNight
            ? 'radial-gradient(120% 88% at 50% 46%, rgba(4,7,17,0) 52%, rgba(2,4,10,0.42) 82%, rgba(2,4,10,0.62) 100%)'
            : 'radial-gradient(120% 88% at 50% 46%, rgba(4,7,17,0) 54%, rgba(10,6,2,0.3) 84%, rgba(8,5,2,0.48) 100%)',
        }}
      />
    </div>
  );
}
