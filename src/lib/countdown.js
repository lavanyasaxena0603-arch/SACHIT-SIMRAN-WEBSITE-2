import { useEffect, useState } from 'react';

/**
 * The celebration happens in India, so the deadline is pinned to IST (+05:30)
 * rather than the viewer's own clock zone. A guest opening the invite from
 * London and one sitting in Ghaziabad must read the same numbers.
 *
 *   Wedding — 12 December 2026, 00:00 IST  (the dial's final target)
 *
 * The engagement date (Thursday, 10 December 2026) is still shown, but as the
 * static line in `EngagementSection` rather than as a countdown stage, because
 * the dial is now captioned "Counting Down To The Wedding".
 */
export const WEDDING_AT = new Date('2026-12-12T00:00:00+05:30');

/** Kept for the engagement section's own display of the date. */
export const ENGAGEMENT_AT = new Date('2026-12-10T18:00:00+05:30');

function split(ms) {
  const t = Math.max(0, ms);
  return {
    days: Math.floor(t / 86_400_000),
    hours: Math.floor((t % 86_400_000) / 3_600_000),
    mins: Math.floor((t % 3_600_000) / 60_000),
    // `now` is sampled on a 1s interval, so this can briefly read 0 just before
    // the real tick; clamping keeps the display honest rather than showing -1.
    secs: Math.max(0, Math.floor((t % 60_000) / 1000)),
  };
}

/**
 * Two stages, as before: count, then settle.
 *
 *   before 12 Dec 2026 00:00 IST -> "Counting Down To The Wedding"
 *   after                        -> "The Celebration Has Begun"
 *
 * The engagement no longer drives the dial. The couple asked for the timer to
 * read "Counting Down To The Wedding" and target 12 December, and the engagement
 * date (Thursday, 10 December 2026) is already displayed separately as a static
 * line in `EngagementSection`, so nothing is lost from the page.
 */
export function useCountdown() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const toWedding = WEDDING_AT.getTime() - now;

  if (toWedding > 0) {
    return {
      phase: 'wedding',
      label: 'Counting Down To The Wedding',
      target: '12 December 2026',
      ...split(toWedding),
    };
  }
  return {
    phase: 'celebration',
    label: 'The Celebration Has Begun',
    target: 'Forever from today',
    ...split(0),
  };
}
