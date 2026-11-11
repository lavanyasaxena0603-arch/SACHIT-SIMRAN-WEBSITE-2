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
 */
export default function SectionHeader() {
  return (
    <header className="pointer-events-none fixed top-5 left-6 z-[57] flex items-center gap-2.5 sm:top-9 sm:left-12 sm:gap-3 lg:left-14">
      <Monogram className="h-auto w-[20px] shrink-0 drop-shadow-[0_2px_10px_rgba(212,175,55,0.45)] sm:w-7" />
      <div className="text-left">
        <p className="font-cinzel mb-0.5 text-[7px] leading-none tracking-[0.28em] uppercase text-[#dfba5c] sm:mb-1 sm:text-[9px] sm:tracking-[0.3em]">
          Royal Wedding
        </p>
        <h2 className="font-royal text-[10px] leading-none font-medium tracking-[0.14em] uppercase text-[#fdfaf3] sm:text-xs sm:tracking-[0.16em]">
          Simran &amp; Sachit
        </h2>
      </div>
    </header>
  );
}
