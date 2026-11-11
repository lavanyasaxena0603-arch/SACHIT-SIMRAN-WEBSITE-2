import { useEffect, useState } from 'react';

/**
 * The celebration happens in India, so both deadlines are pinned to IST
 * (+05:30) rather than the viewer's own clock zone. A guest opening the invite
 * from London and one sitting in Ghaziabad must read the same numbers.
 *
 *   Engagement — Thursday, 10 December 2026, 6:00 pm
 *   Wedding    — Saturday, 12 December 2026, 8:00 pm
 */
export const ENGAGEMENT_AT = new Date('2026-12-10T18:00:00+05:30');
export const WEDDING_AT = new Date('2026-12-12T20:00:00+05:30');

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
 * Two-phase countdown: it counts to the engagement first, then rolls itself
 * over to the wedding, then settles on a "the celebration" state. Nothing is
 * hard-coded into the markup — the scenes read `phase`/`label` from here.
 */
export function useCountdown() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const toEngagement = ENGAGEMENT_AT.getTime() - now;
  const toWedding = WEDDING_AT.getTime() - now;

  if (toEngagement > 0) {
    return {
      phase: 'engagement',
      label: 'Counting Down To The Engagement',
      target: '10 December 2026',
      ...split(toEngagement),
    };
  }
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
