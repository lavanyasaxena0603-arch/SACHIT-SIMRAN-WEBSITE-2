import { useEffect } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { captureAnchor, restoreAnchor } from './scrollAnchor';

/**
 * ORIENTATION CONTINUITY — keep the visitor exactly where they were reading.
 *
 * The brief: "Preserve the current scene and playback progress. Do not restart
 * the entire invitation. Do not reset the scroll position. Do not interrupt the
 * golden thread's progress. Avoid sudden visual jumps."
 *
 * Why a naive "don't touch anything" fails
 * ----------------------------------------
 * Every chapter here is sized in `dvh`. Rotating a phone from 844x390 to 390x844
 * rescales all of them at once, so the document changes height underneath a
 * scroll offset that the browser tries to keep. The result is a drift of
 * thousands of pixels (measured: 2049 -> 4425, i.e. a different chapter), plus
 * the browser's own scroll anchoring pulling in the opposite direction.
 *
 * So we do three things, in this order, inside ONE frame:
 *
 *   1. Suppress CSS transitions (`.rotation-settling`) so nothing tweens from
 *      its old geometry to its new one — that tween is the "sudden jump".
 *   2. Re-measure every ScrollTrigger against the new viewport.
 *   3. Put the recorded chapter back under the top of the viewport, twice more
 *      as the layout settles (iOS resolves `dvh` and safe-area late).
 *
 * Only a genuine aspect flip triggers this. A height-only change — the mobile
 * URL bar sliding away, or the on-screen keyboard opening under the RSVP form —
 * is left completely alone, because yanking the scroll position while someone
 * is typing would be far worse than a pixel of drift.
 */
export default function useOrientationContinuity(active) {
  useEffect(() => {
    if (!active) return undefined;

    const root = document.documentElement;

    // The most recent position-in-the-story, refreshed on a rAF-coalesced
    // scroll listener so a reading is always ready the instant a rotation
    // arrives (no work happens *during* the rotation itself).
    let latest = captureAnchor();
    let busy = false;
    let scrollRaf = 0;
    let swapRaf = 0;
    let timers = [];

    let lastW = window.innerWidth;
    let lastH = window.innerHeight;

    const clearTimers = () => {
      for (const t of timers) clearTimeout(t);
      timers = [];
    };

    const track = () => {
      scrollRaf = 0;
      if (busy) return;
      const anchor = captureAnchor();
      if (anchor) latest = anchor;
    };

    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(track);
    };

    const runSwap = () => {
      swapRaf = 0;

      const w = window.innerWidth;
      const h = window.innerHeight;

      // Only an aspect FLIP is a rotation. Height-only changes (URL bar,
      // keyboard) must never move the scroll position.
      const flipped = w > h !== lastW > lastH;
      lastW = w;
      lastH = h;
      if (!flipped) return;

      const anchor = latest;
      if (!anchor) return;

      busy = true;
      clearTimers();
      root.classList.add('rotation-settling');

      try {
        ScrollTrigger.refresh();
      } catch {
        // A refresh during a viewport swap can throw on a half-mounted tree;
        // the anchor restore below is what actually matters.
      }
      restoreAnchor(anchor);

      // Two corrective passes. The first catches a layout that had not settled
      // when the resize event fired; the second releases the transition lock
      // and hands the position back to normal scrolling.
      for (const ms of [120, 380]) {
        timers.push(
          setTimeout(() => {
            restoreAnchor(anchor);
            if (ms === 380) {
              root.classList.remove('rotation-settling');
              busy = false;
              latest = captureAnchor();
            }
          }, ms),
        );
      }
    };

    const requestSwap = () => {
      if (swapRaf) return;
      swapRaf = requestAnimationFrame(runSwap);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('orientationchange', requestSwap);
    window.addEventListener('resize', requestSwap);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', requestSwap);

    const so = typeof screen !== 'undefined' ? screen.orientation : null;
    if (so && so.addEventListener) so.addEventListener('change', requestSwap);

    return () => {
      root.classList.remove('rotation-settling');
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      if (swapRaf) cancelAnimationFrame(swapRaf);
      clearTimers();

      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('orientationchange', requestSwap);
      window.removeEventListener('resize', requestSwap);
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', requestSwap);
      if (so && so.removeEventListener) so.removeEventListener('change', requestSwap);
    };
  }, [active]);
}
