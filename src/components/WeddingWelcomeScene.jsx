import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Volume2, VolumeX } from 'lucide-react';

/**
 * SIMRAN SAXENA & SACHIT SRIVASTAVA — ROYAL WEDDING WEBSITE
 * TASK 03: SCENE 03 — CINEMATIC WEDDING WELCOME SCREEN
 */

const DAY_WELCOME_BG = "/assets/scene3/welcome-day.jpg";
const NIGHT_WELCOME_BG = "/assets/scene3/welcome-night.jpg";

export default function WeddingWelcomeScene({
  isNight: controlledIsNight,
  onToggleNight,
  onContinue
}) {
  const [internalIsNight, setInternalIsNight] = useState(false);
  const activeIsNight = controlledIsNight !== undefined ? controlledIsNight : internalIsNight;
  const [isMuted, setIsMuted] = useState(false);
  const [animStage, setAnimStage] = useState(0);

  const nextSectionRef = useRef(null);

  useEffect(() => {
    const timers = [
      setTimeout(() => setAnimStage(1), 300),   // Palace emblem
      setTimeout(() => setAnimStage(2), 700),   // "THE WEDDING OF"
      setTimeout(() => setAnimStage(3), 1200),  // "Simran Saxena & Sachit Srivastava"
      setTimeout(() => setAnimStage(4), 1800),  // Gold filigree divider
      setTimeout(() => setAnimStage(5), 2300),  // "YOU ARE CORDIALLY INVITED TO"
      setTimeout(() => setAnimStage(6), 2700),  // "CELEBRATE OUR WEDDING"
      setTimeout(() => setAnimStage(7), 3200),  // "BEGIN THE CELEBRATION ↓" Button
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleToggle = () => {
    const next = !activeIsNight;
    if (onToggleNight) {
      onToggleNight(next);
    } else {
      setInternalIsNight(next);
    }
  };

  const handleBeginCelebration = () => {
    if (onContinue) {
      onContinue();
    } else if (nextSectionRef.current) {
      nextSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-[#070b15] text-[#f7f2e7] overflow-x-hidden selection:bg-[#d4af37]/30 selection:text-[#fff]">
      
      {/* =========================================================================
          HERO VIEWPORT: FULL-HEIGHT SCENE 03 WELCOME STAGE
          ========================================================================= */}
      <section className="relative w-full h-[100dvh] min-h-[640px] flex items-center justify-center overflow-hidden">
        
        {/* DAYTIME BACKGROUND */}
        <div 
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
            !activeIsNight ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
          }`}
          style={{
            backgroundImage: `url('${DAY_WELCOME_BG}')`,
            transition: 'opacity 1000ms cubic-bezier(0.4, 0, 0.2, 1), transform 8000ms ease-out'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0704]/80 via-transparent to-[#1a1208]/40" />
        </div>

        {/* NIGHTTIME BACKGROUND */}
        <div 
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
            activeIsNight ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
          }`}
          style={{
            backgroundImage: `url('${NIGHT_WELCOME_BG}')`,
            transition: 'opacity 1000ms cubic-bezier(0.4, 0, 0.2, 1), transform 8000ms ease-out'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#050914]/90 via-[#0a1124]/40 to-[#040711]/70" />
        </div>

        {/* TOP NAVIGATION: ROYAL MONOGRAM & FLOATING DAY/NIGHT PILL */}
        <header className="absolute top-0 inset-x-0 z-40 px-3 sm:px-10 py-4 sm:py-6 flex items-center justify-between gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#d4af37]/60 bg-[#0c1222]/80 backdrop-blur-md flex items-center justify-center text-[#dfba5c] shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              <span className="text-xs font-semibold tracking-widest font-cinzel">S&amp;S</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-[9px] tracking-[0.3em] uppercase text-[#dfba5c] leading-none mb-1 font-sans">
                Royal Wedding
              </p>
              <h2 className="text-xs tracking-[0.18em] uppercase text-[#fdfaf3] font-cinzel font-medium">
                Simran &amp; Sachit
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              onClick={() => setIsMuted(prev => !prev)}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#090e1c]/75 hover:bg-[#121a30]/90 border border-[#d4af37]/45 flex items-center justify-center text-[#dfba5c] backdrop-blur-md transition-all active:scale-95 shadow-[0_4px_16px_rgba(0,0,0,0.4)] shrink-0"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={handleToggle}
              aria-label={activeIsNight ? 'Switch to Day View' : 'Switch to Night View'}
              className="group flex items-center gap-1.5 sm:gap-3 px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-full bg-[#080d1a]/85 hover:bg-[#101930]/95 border border-[#d4af37]/50 hover:border-[#d4af37] shadow-[0_6px_25px_rgba(0,0,0,0.6),0_0_15px_rgba(212,175,55,0.2)] transition-all duration-300 backdrop-blur-md active:scale-95 focus:outline-none shrink-0"
            >
              <span className="text-[#dfba5c] transition-transform duration-500 group-hover:rotate-45 shrink-0">
                {activeIsNight ? (
                  <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#f9d775] stroke-[2]" />
                ) : (
                  <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#dfba5c] stroke-[2]" />
                )}
              </span>

              <div className="flex flex-col text-left">
                <span className="hidden sm:block text-[8px] uppercase tracking-[0.2em] text-[#dfba5c]/80 font-mono leading-none">
                  {activeIsNight ? 'Night' : 'Day'}
                </span>
                <span className="text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.14em] font-semibold text-[#f7f2e7] font-cinzel leading-tight whitespace-nowrap">
                  {activeIsNight ? 'Daylight' : 'Moonlit'}
                </span>
              </div>

              <span className={`w-2 h-2 rounded-full transition-colors duration-500 shrink-0 ${
                activeIsNight ? 'bg-[#73a3ff] shadow-[0_0_6px_#73a3ff]' : 'bg-[#e5ad35] shadow-[0_0_6px_#e5ad35]'
              }`} />
            </button>
          </div>
        </header>

        {/* CENTRAL SOFT GLOW */}
        <div 
          className="absolute z-20 pointer-events-none w-[90%] max-w-2xl h-[480px] rounded-full blur-3xl opacity-75"
          style={{
            background: activeIsNight
              ? 'radial-gradient(circle, rgba(14, 21, 38, 0.85) 0%, rgba(6, 10, 20, 0.5) 55%, transparent 80%)'
              : 'radial-gradient(circle, rgba(38, 26, 14, 0.7) 0%, rgba(20, 14, 8, 0.45) 55%, transparent 80%)'
          }}
        />

        {/* CENTRAL WELCOME TYPOGRAPHY HIERARCHY */}
        <div className="relative z-30 max-w-2xl mx-auto px-6 sm:px-8 text-center flex flex-col items-center justify-center">
          
          {/* 1. Emblem */}
          <div 
            className={`transition-all duration-1000 ease-out transform ${
              animStage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
          >
            <div className="w-12 h-10 sm:w-14 sm:h-12 mx-auto mb-2 text-[#d4af37] flex items-center justify-center drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)]">
              <svg viewBox="0 0 60 50" fill="none" stroke="currentColor" className="w-full h-full">
                <path d="M 30 4 L 30 10 M 28 6 L 32 6" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 30 10 C 23 11, 16 16, 16 26 L 44 26 C 44 16, 37 11, 30 10 Z" strokeWidth="1.4" fill="currentColor" fillOpacity="0.12" />
                <path d="M 14 26 L 46 26" strokeWidth="1.8" />
                <path d="M 18 26 L 18 38 M 26 26 L 26 38 M 34 26 L 34 38 M 42 26 L 42 38" strokeWidth="1.4" />
                <path d="M 12 38 L 48 38" strokeWidth="1.8" />
                <path d="M 22 38 C 22 33, 26 31, 30 31 C 34 31, 38 33, 38 38" strokeWidth="1.4" />
                <circle cx="30" cy="20" r="2" fill="currentColor" />
              </svg>
            </div>
          </div>

          {/* 2. "THE WEDDING OF" */}
          <div 
            className={`transition-all duration-1000 ease-out delay-100 transform ${
              animStage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
          >
            <p className="font-cinzel tracking-[0.32em] sm:tracking-[0.4em] uppercase text-xs sm:text-sm text-[#e6d0a7] font-medium mb-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              The Wedding Of
            </p>
          </div>

          {/* 3. Couple's Names: "Simran Saxena & Sachit Srivastava" */}
          <div 
            className={`transition-all duration-1200 ease-out transform ${
              animStage >= 3 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-98'
            }`}
          >
            <h1 
              className="text-4xl sm:text-6xl md:text-7xl font-normal leading-[1.25] text-transparent bg-clip-text bg-gradient-to-r from-[#ebd6a7] via-[#fff5df] to-[#ebd6a7] my-1 sm:my-2 drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]"
              style={{ fontFamily: "'Great Vibes', cursive" }}
            >
              Simran Saxena &amp;<br className="sm:hidden" /> Sachit Srivastava
            </h1>
          </div>

          {/* 4. Elegant Gold Filigree Divider */}
          <div 
            className={`w-full max-w-sm sm:max-w-md my-3 sm:my-4 transition-all duration-1000 ease-out transform ${
              animStage >= 4 ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-50'
            }`}
          >
            <div className="flex items-center justify-center gap-3 text-[#d4af37]">
              <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#d4af37]/70 to-[#d4af37]" />
              <svg width="28" height="18" viewBox="0 0 40 24" fill="none" stroke="currentColor">
                <circle cx="20" cy="12" r="3.5" fill="currentColor" />
                <path d="M 12 12 C 16 6, 24 6, 28 12 C 24 18, 16 18, 12 12 Z" strokeWidth="1.2" />
                <path d="M 5 12 C 8 8, 11 8, 14 12" strokeWidth="1" />
                <path d="M 35 12 C 32 8, 29 8, 26 12" strokeWidth="1" />
              </svg>
              <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#d4af37]/70 to-[#d4af37]" />
            </div>
          </div>

          {/* 5 & 6. Invitation Text */}
          <div 
            className={`space-y-1 transition-all duration-1000 ease-out transform ${
              animStage >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
          >
            <p className="font-cinzel tracking-[0.24em] sm:tracking-[0.28em] uppercase text-[11px] sm:text-xs text-[#ebd8b7] font-normal leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              You Are Cordially Invited To
            </p>
            <p 
              className={`font-cinzel tracking-[0.2em] sm:tracking-[0.24em] uppercase text-xs sm:text-sm text-[#fdfaf3] font-medium leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] transition-all duration-1000 ${
                animStage >= 6 ? 'opacity-100' : 'opacity-0'
              }`}
            >
              Celebrate Our Wedding
            </p>
          </div>

          {/* 7. Button: "BEGIN THE CELEBRATION ↓" */}
          <div 
            className={`mt-6 sm:mt-8 transition-all duration-1000 ease-out transform ${
              animStage >= 7 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <button
              onClick={handleBeginCelebration}
              className="group relative inline-flex items-center justify-center gap-2.5 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-gradient-to-r from-[#4a1015] via-[#5a151b] to-[#4a1015] hover:from-[#621820] hover:via-[#731e27] hover:to-[#621820] border border-[#d4af37] text-[#f7ecd5] font-cinzel text-xs sm:text-sm tracking-[0.24em] uppercase shadow-[0_8px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_28px_rgba(212,175,55,0.45)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span className="font-medium drop-shadow-sm">Meet The Bride &amp; Groom</span>
              <span className="text-[#dfba5c] text-sm group-hover:translate-y-0.5 transition-transform duration-300">↓</span>
            </button>
          </div>

        </div>

      </section>

    </div>
  );
}

