import { Sun, Moon, Volume2, VolumeX } from 'lucide-react';

/**
 * Global Day / Night + sound controls.
 *
 * There used to be a copy of these pills inside every scene header, which is
 * what made the site feel like separate slides. There is now exactly one pair,
 * rendered once by <App /> above every scene, so the mode is genuinely global.
 */
export default function GlobalControls({ isNight, onToggleNight, isMuted, onToggleMute }) {
  return (
    <div className="fixed top-4 right-4 sm:top-7 sm:right-8 z-[60] flex items-center gap-2 sm:gap-2.5">
      <button
        onClick={onToggleMute}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        title={isMuted ? 'Unmute' : 'Mute'}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#090e1c]/80 hover:bg-[#121a30]/90 border border-[#d4af37]/45 flex items-center justify-center text-[#dfba5c] backdrop-blur-md transition-all active:scale-95 shadow-[0_4px_18px_rgba(0,0,0,0.55)]"
      >
        {isMuted ? <VolumeX className="w-4 h-4 text-[#e8a0a0]" /> : <Volume2 className="w-4 h-4" />}
      </button>

      <button
        onClick={onToggleNight}
        aria-label={isNight ? 'Switch to Day View' : 'Switch to Night View'}
        className="group flex items-center gap-2 sm:gap-2.5 pl-2.5 sm:pl-3 pr-3 sm:pr-4 py-1.5 sm:py-2 rounded-full bg-[#080d1a]/85 hover:bg-[#101930]/95 border border-[#d4af37]/50 hover:border-[#dfba5c] shadow-[0_6px_25px_rgba(0,0,0,0.6),0_0_15px_rgba(212,175,55,0.2)] transition-all duration-300 backdrop-blur-md active:scale-95"
      >
        <span className="text-[#dfba5c] transition-transform duration-500 group-hover:rotate-45 shrink-0">
          {isNight ? (
            <Sun className="w-4 h-4 text-[#f9d775] stroke-[2]" />
          ) : (
            <Moon className="w-4 h-4 text-[#dfba5c] stroke-[2]" />
          )}
        </span>

        <span className="font-cinzel text-[10px] sm:text-[11px] uppercase tracking-[0.14em] font-semibold text-[#f7f2e7] leading-none whitespace-nowrap">
          {isNight ? 'Daylight' : 'Moonlit'}
        </span>

        <span
          className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-500 ${
            isNight ? 'bg-[#73a3ff] shadow-[0_0_6px_#73a3ff]' : 'bg-[#e5ad35] shadow-[0_0_6px_#e5ad35]'
          }`}
        />
      </button>
    </div>
  );
}
