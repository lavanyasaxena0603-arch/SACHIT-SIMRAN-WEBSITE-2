/**
 * SCROLL CONTINUITY ACROSS A ROTATION
 *
 * Rotating a phone changes the viewport height, and almost every section on
 * this invitation is sized in `dvh` — so the document gets TALLER or SHORTER
 * while the visitor is standing still. The scroll offset cannot mean the same
 * thing on both sides of that change:
 *
 *     landscape 844x390 — #countdown begins at y 2049
 *     portrait  390x844 — the same chapter begins somewhere else entirely
 *
 * Keeping the raw number 2049 therefore does NOT keep the scene; it lands the
 * visitor in a different chapter, and it simultaneously fights the browser's
 * own scroll anchoring (which is why an assist-free rotation drifts, 2049 ->
 * 4425, instead of staying put).
 *
 * What has to survive is the visitor's PLACE IN THE STORY: which chapter is at
 * the top of the viewport, and how far into that chapter they had read. That
 * pair is viewport-independent, so it is what we record and restore.
 *
 * Recorded as `{ id, ratio }` — ratio is 0..1 of that chapter's own height, so
 * it also survives a section growing or shrinking with its content, and it
 * survives a chapter that is 240vh tall just as well as one that is 100dvh.
 *
 * `scrollTo` uses `behavior: 'auto'` on purpose. The document uses no smooth
 * scrolling, and an animated scroll *here* would be the "sudden jump" the brief
 * forbids — the correction has to be instantaneous, before the frame paints.
 */

// Document order. `captureAnchor` walks these in sequence and stops at the
// first chapter that has not started yet, so the array must stay ordered.
const ANCHORS = ['welcome', 'couple', 'story', 'countdown', 'engagement', 'wedding', 'rsvp'];

/**
 * Which chapter is at the top of the viewport right now, and how far into it.
 * Called on a rAF-coalesced scroll listener, so at the instant a rotation
 * arrives `latest` already holds a reading taken at the OLD viewport height.
 */
export function captureAnchor() {
  if (typeof window === 'undefined') return null;

  const y = window.scrollY || window.pageYOffset || 0;
  let chosen = null;

  for (const id of ANCHORS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const top = el.getBoundingClientRect().top + y;
    if (top <= y + 2) chosen = { id, top, height: el.offsetHeight };
    else break;
  }

  // Above the first chapter — possible for a pixel or two before the welcome
  // section has fully settled, and not worth anchoring to.
  if (!chosen) return null;

  const ratio = (y - chosen.top) / Math.max(1, chosen.height);

  return {
    id: chosen.id,
    ratio: Math.min(1, Math.max(0, ratio)),
    // Kept only so a reading can be recognised as stale; never used in maths.
    vh: window.innerHeight,
  };
}

/**
 * Put the recorded chapter back under the top of the viewport.
 *
 * Returns 'ok' | 'drifted' | 'missing' so the caller can decide whether a
 * second attempt is worthwhile — one corrective pass covers a rotation, a
 * second only matters when the layout had not settled yet.
 */
export function restoreAnchor(anchor) {
  if (!anchor || typeof window === 'undefined') return 'missing';

  const el = document.getElementById(anchor.id);
  if (!el) return 'missing';

  const y = window.scrollY || window.pageYOffset || 0;
  const top = el.getBoundingClientRect().top + y;
  const target = Math.max(0, Math.round(top + anchor.ratio * el.offsetHeight));

  window.scrollTo({ top: target, left: 0, behavior: 'auto' });

  // Verify rather than assume: if the chapter moved again after we scrolled
  // (late image load, a `dvh` unit settling on iOS), report it so the caller
  // can try once more.
  const after = captureAnchor();
  if (!after || after.id !== anchor.id) return 'drifted';
  if (Math.abs(after.ratio - anchor.ratio) > 0.06) return 'drifted';
  return 'ok';
}
