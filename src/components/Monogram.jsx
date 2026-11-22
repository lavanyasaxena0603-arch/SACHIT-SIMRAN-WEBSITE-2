import { useId } from 'react';

/**
 * THE MONOGRAM — the house mark for Sachit & Simran.
 *
 * Inspired by the carved-arch reference (a cream-paper plaque): a tall mehrab
 * drawn as fine single-weight line-work, two interlocking serif S letterforms
 * filling the arch, and lotus flowers growing up from the base on swaying
 * stems. Symbol only — the names beneath the reference are deliberately NOT
 * reproduced; the wordmark lives in the site header beside this mark.
 *
 * Drawn as PATHS (never SVG <text>) so the mark cannot reflow or fall back to a
 * different font mid-load, and it stays identical at every size. The gradient id
 * is per-instance so several monograms can coexist on one page.
 *
 * Composition, bottom to top:
 *   - a closed rounded arch (outer line + fine inner trace) = the mehrab
 *   - a keystone diamond at the apex, echoing the old badge's gold dot
 *   - a lighter back S offset up-left, and the hero front S over it, so the
 *     pair reads as woven rather than as two separate letters
 *   - two lotus blooms on stems that START on the arch's foot line, so they
 *     read as growing from the ground instead of floating beside the letters
 *
 * Sizing note: stroke weights are tuned for the 100x130 viewBox so the mark
 * still reads at 20-24px in the header — the arch and the front S are the only
 * elements that must survive there; everything else is fine detail that is
 * allowed to soften at that size.
 */

// One serif S, drawn as a single confident stroke.
// Local bbox: x 36.5..63, y 19.5..64.5 (kept as constants below for placement).
const S_PATH =
  'M 63 26 C 56.5 19.5, 40 19.5, 38.5 29.5 C 37 40, 61 42, 60.5 52.5 C 60 63, 43 64.5, 36.5 58';

/**
 * A lotus bloom: three petals fanning up from the origin. Placed with x/y and
 * scaled, so the stroke is divided by the scale to keep one visual weight.
 */
function Lotus({ x, y, s = 1, opacity = 1, gold, width = 0.7 }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s})`}
      opacity={opacity}
      stroke={`url(#${gold})`}
      strokeWidth={width / s}
      strokeLinejoin="round"
      strokeLinecap="round"
      fill="none"
    >
      {/* centre petal */}
      <path d="M 0 0 C -3 -3.4, -3 -7.9, 0 -10.6 C 3 -7.9, 3 -3.4, 0 0 Z" />
      {/* outer petals, curving away and back to the calyx */}
      <path d="M 0 0 C -4.9 -1.3, -7.2 -4.6, -6.6 -8.3 C -3.3 -7.3, -0.9 -3.9, 0 0 Z" />
      <path d="M 0 0 C 4.9 -1.3, 7.2 -4.6, 6.6 -8.3 C 3.3 -7.3, 0.9 -3.9, 0 0 Z" />
    </g>
  );
}

export default function Monogram({ className = '', title = 'Sachit & Simran monogram' }) {
  const uid = useId().replace(/:/g, '');
  const gold = `mono-gold-${uid}`;

  return (
    <svg viewBox="0 0 100 130" fill="none" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id={gold} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#fbf3d8" />
          <stop offset="38%" stopColor="#e2c264" />
          <stop offset="72%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#a87a1c" />
        </linearGradient>
      </defs>

      {/* ---- the mehrab: a rounded arch, closed at the foot ---- */}
      <path
        d="M 12 124 L 12 58 A 38 38 0 0 1 88 58 L 88 124 Z"
        stroke={`url(#${gold})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* fine inner trace, the second carved line of the reference */}
      <path
        d="M 16 119 L 16 58 A 34 34 0 0 1 84 58 L 84 119"
        stroke={`url(#${gold})`}
        strokeWidth="0.55"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* ---- keystone diamond at the apex ---- */}
      <path d="M 50 20.4 L 52.2 22.6 L 50 24.8 L 47.8 22.6 Z" fill={`url(#${gold})`} />

      {/* ---- the interlocking S pair ---- */}
      {/* back S — lighter, offset up-left, so the two read as woven */}
      <path
        d={S_PATH}
        stroke={`url(#${gold})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
        transform="translate(-9.5 13.5)"
      />
      {/* front S — the hero stroke */}
      <path
        d={S_PATH}
        stroke={`url(#${gold})`}
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(-15.1 4.7) scale(1.4)"
      />

      {/* ---- lotus stems, rooted on the arch's foot line ---- */}
      <g stroke={`url(#${gold})`} fill="none" strokeLinecap="round">
        <path d="M 30 123 C 25 111, 24 92, 26 78" strokeWidth="0.75" opacity="0.85" />
        <path d="M 70 123 C 75 111, 76 92, 74 78" strokeWidth="0.75" opacity="0.85" />
      </g>

      {/* ---- the two blooms ---- */}
      <Lotus x={26} y={78} gold={gold} />
      <Lotus x={74} y={78} gold={gold} opacity={0.95} />
    </svg>
  );
}
