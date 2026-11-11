import { useEffect, useState } from 'react';

/**
 * ORIENTATION DETECTION
 *
 * Three sources, in order of reliability:
 *
 *   1. `screen.orientation.type` — the real API, but it lies in a few embedded
 *      webviews and is absent on some older iOS builds.
 *   2. Viewport comparison (width > height) — always available, and it is the
 *      value that actually matters, because it describes the box we are laying
 *      content out in. A desktop window made taller than it is wide is NOT a
 *      phone in portrait, which is why `isMobile` is tracked separately.
 *   3. CSS `@media (orientation: landscape)` for the layout itself — the styling
 *      needs no JavaScript at all; JS is only here for state and for deciding
 *      whether to offer the gate.
 *
 * Deliberately NOT used: DeviceOrientationEvent / gyroscope. Reading those can
 * trigger a permission prompt on iOS, which the brief forbids, and the browser
 * already knows its own orientation without any sensor.
 */

const MOBILE_MAX_EDGE = 1024;

function readState() {
  if (typeof window === 'undefined') {
    return { isLandscape: true, isMobile: false, width: 0, height: 0, everLandscape: true };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  // Start from the viewport, then let screen.orientation override only when it
  // reports a definite portrait/landscape type.
  let isLandscape = width > height;

  const so = typeof window.screen !== 'undefined' ? window.screen.orientation : null;
  if (so && typeof so.type === 'string') {
    if (so.type.indexOf('landscape') === 0) isLandscape = true;
    else if (so.type.indexOf('portrait') === 0) isLandscape = false;
    // 'square' or an unknown type: keep the viewport verdict.
  }

  // "Mobile" = somewhere we would sensibly ask for a rotation: a touch-first
  // device whose shorter edge is phone/tablet sized. A narrow desktop window on
  // a non-touch machine must never see the gate.
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const touch = (navigator.maxTouchPoints || 0) > 0;
  const isMobile = (coarse || touch) && Math.min(width, height) <= MOBILE_MAX_EDGE;

  return { isLandscape, isMobile, width, height };
}

/**
 * `everLandscape` is the answer to "has this visitor held the phone sideways at
 * least once?". It exists so the UI can retire the rotate suggestion for good
 * once the point has been taken, instead of re-offering it every time the phone
 * is turned upright again.
 *
 * Computed inside the state update rather than in a `useEffect`, because an
 * effect that calls setState starts a second render for information we already
 * have in the event that produced it. Keeping it here also means the flag
 * becomes true even if the rotation happens before React has committed the
 * first paint.
 */
export default function useOrientation() {
  const [state, setState] = useState(() => ({ ...readState(), everLandscape: false }));

  useEffect(() => {
    let frame = 0;

    // Rotation fires several events in a burst (orientationchange, resize,
    // visualViewport). Coalesce them into one read per frame so we never lay
    // out against a half-updated viewport.
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setState((prev) => {
          const next = readState();
          return { ...next, everLandscape: prev.everLandscape || next.isLandscape };
        });
      });
    };

    // The very first orientation may already be landscape — that counts.
    schedule();

    window.addEventListener('orientationchange', schedule);
    window.addEventListener('resize', schedule);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', schedule);

    const so = typeof window.screen !== 'undefined' ? window.screen.orientation : null;
    if (so && so.addEventListener) so.addEventListener('change', schedule);

    // A rotation does not always fire `resize` after the browser settles, so
    // take one more reading shortly after the event burst ends.
    const settle = setTimeout(schedule, 250);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(settle);
      window.removeEventListener('orientationchange', schedule);
      window.removeEventListener('resize', schedule);
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', schedule);
      if (so && so.removeEventListener) so.removeEventListener('change', schedule);
    };
  }, []);

  return state;
}

/**
 * Best-effort landscape lock.
 *
 * MUST be called from inside a real user gesture (a click). It can never run on
 * page load — browsers reject it — and iOS Safari does not implement it at all.
 * Every failure is swallowed: the journey must continue exactly as it was, in
 * portrait, if the device refuses.
 */
export async function tryEnterLandscape() {
  try {
    const el = document.documentElement;
    const requestFullscreen =
      el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;

    if (requestFullscreen) {
      // Orientation locking is only permitted while the page is fullscreen.
      await requestFullscreen.call(el).catch(() => {});
    }

    const so = typeof screen !== 'undefined' ? screen.orientation : null;
    if (so && typeof so.lock === 'function') {
      await so.lock('landscape').catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}
