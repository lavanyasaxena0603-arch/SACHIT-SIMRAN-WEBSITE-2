import Monogram from './Monogram';

/**
 * THE PERSISTENT HEADER
 *
 * One header for the whole scrolling invitation, fixed so it reads identically
 * while sections physically pass beneath it. This replaces the two per-track
 * headers that used to live inside the pinned stages — with a single continuous
 * document there is only ever one of these on screen, so it must be rendered
 * once, above the sections.
 *
 * Offsets clear both the gold frame (inset-3 / sm:inset-6) and the golden
 * thread rail on the left (16 / 24 / 32px by breakpoint), so the monogram can
 * never ride the border line or sit under the thread.
 *
 * METRICS ARE COPIED FROM THE ENTRANCE HEADER ON PURPOSE.
 * This header is mounted at the hand-off, while <EntranceJourney> is still on
 * screen fading underneath it. If the two disagreed by even a few pixels in
 * offset, size or wording, the visitor would see the header appear to jump and
 * re-set itself the instant the phase changed. Same position, same monogram
 * width, same two lines of type means the header simply persists across the
 * boundary and nobody notices a mount at all.
 */
export default function SectionHeader() {
  return (
    <header className="pointer-events-none fixed top-6 left-6 z-[57] flex items-center gap-2.5 sm:top-10 sm:left-12 sm:gap-3.5">
      <Monogram className="h-auto w-[20px] shrink-0 drop-shadow-[0_2px_10px_rgba(212,175,55,0.5)] sm:w-6" />
      <div className="text-left">
        <p className="font-cinzel text-[8px] leading-tight tracking-[0.3em] uppercase text-[#dfba5c] sm:text-[9px]">
          Royal Wedding Celebration
        </p>
        <h2 className="font-royal text-[11px] leading-tight font-normal tracking-[0.14em] uppercase text-[#fbf7ee] drop-shadow sm:text-sm">
          Simran &amp; Sachit
        </h2>
      </div>
    </header>
  );
}
