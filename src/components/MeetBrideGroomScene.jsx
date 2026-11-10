import React, { useState, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Sun, Moon, Volume2, VolumeX, Sparkles, Heart } from 'lucide-react';

/**
 * SIMRAN SAXENA & SACHIT SRIVASTAVA — ROYAL WEDDING WEBSITE
 * MEET THE BRIDE & GROOM
 * 
 * Updated with exact details from Image 5:
 * Bride:
 *   Name: Simran
 *   Parents: (Daughter of Smt. Savita Saxena & Sh. Naveen Saxena)
 *   Bio: "A vision of unconditional love, and timeless grace, and impossibly open charm — with a heart that fills every room she walks into."
 * 
 * Groom:
 *   Name: Sachit
 *   Parents: (Son of Smt. Roli Srivastava & Sh. Satyendra Srivastava)
 *   Bio: "Epitome of kindness, quiet strength, and a boundless heart — someone who makes life feel like home."
 */

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function MeetBrideGroomScene({
  isNight: controlledIsNight,
  onToggleNight,
  onScrollToNext: _onScrollToNext
}) {
  const [internalIsNight, setInternalIsNight] = useState(false);
  const activeIsNight = controlledIsNight !== undefined ? controlledIsNight : internalIsNight;
  const [isMuted, setIsMuted] = useState(true);
  const rootRef = useRef(null);

  useGSAP(() => {
    gsap.from('.reveal', { opacity: 0, y: 40, duration: 0.9, ease: 'power3.out', stagger: 0.18,
      scrollTrigger: { trigger: rootRef.current, start: 'top 60%', toggleActions: 'play none none reverse' } });
  }, { scope: rootRef });

  // Toggle Day/Night
  const handleToggle = () => {
    const next = !activeIsNight;
    if (onToggleNight) {
      onToggleNight(next);
    } else {
      setInternalIsNight(next);
    }
  };

  return (
    <div ref={rootRef} id="bride-groom-section" className="relative w-full min-h-screen bg-[#070b15] text-[#f7f2e7] overflow-x-hidden selection:bg-[#d4af37]/30 selection:text-white font-serif-body">
      
      {/* =========================================================================
          BACKGROUND IMAGES (DAY / NIGHT PALACE COURTYARD WITH FULL ARCHES)
          ========================================================================= */}
      
      {/* Day Background */}
      <div 
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
          !activeIsNight ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
        }`}
        style={{
          backgroundImage: `url('/assets/couple/palace-day.jpg')`,
          transition: 'opacity 1000ms cubic-bezier(0.4, 0, 0.2, 1), transform 8000ms ease-out'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />
      </div>

      {/* Night Background */}
      <div 
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
          activeIsNight ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
        }`}
        style={{
          backgroundImage: `url('/assets/couple/palace-night.jpg')`,
          transition: 'opacity 1000ms cubic-bezier(0.4, 0, 0.2, 1), transform 8000ms ease-out'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/40" />
      </div>

      {/* Royal Film Vignette Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(circle at center, rgba(4,7,17,0.05) 50%, rgba(4,7,17,0.45) 85%, rgba(2,4,10,0.85) 100%)'
        }}
      />

      {/* Royal Gold Filigree Border Accent */}
      <div className="absolute inset-3 sm:inset-6 border border-[#d4af37]/35 pointer-events-none z-20 rounded-sm">
        <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#d4af37]" />
        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#d4af37]" />
        <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#d4af37]" />
        <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#d4af37]" />
        <div className="absolute inset-1.5 border border-[#d4af37]/15 rounded-sm" />
      </div>

      {/* =========================================================================
          TOP NAVIGATION BAR
          ========================================================================= */}
      <header className="relative z-30 px-6 sm:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#d4af37]/60 bg-[#0c1222]/85 backdrop-blur-md flex items-center justify-center text-[#dfba5c] shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <span className="font-cinzel text-xs font-semibold tracking-widest text-[#f3e5ab]">S&amp;S</span>
          </div>
          <div className="hidden sm:block text-left">
            <p className="font-cinzel text-[9px] tracking-[0.3em] uppercase text-[#dfba5c] leading-none mb-1">
              Royal Wedding
            </p>
            <h2 className="font-royal text-xs tracking-[0.16em] uppercase text-[#fdfaf3] font-medium">
              Simran &amp; Sachit
            </h2>
          </div>
        </div>

        {/* Floating Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMuted(prev => !prev)}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#090e1c]/80 hover:bg-[#121a30]/90 border border-[#d4af37]/45 flex items-center justify-center text-[#dfba5c] backdrop-blur-md transition-all active:scale-95 shadow-md"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4 text-[#dfba5c]" />}
          </button>

          <button
            onClick={handleToggle}
            aria-label={activeIsNight ? 'Switch to Day View' : 'Switch to Night View'}
            className="group flex items-center gap-2 sm:gap-3 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#080d1a]/85 hover:bg-[#101930]/95 border border-[#d4af37]/50 hover:border-[#d4af37] shadow-[0_6px_25px_rgba(0,0,0,0.6),0_0_15px_rgba(212,175,55,0.2)] transition-all duration-300 backdrop-blur-md active:scale-95"
          >
            <span className="text-[#dfba5c] transition-transform duration-500 group-hover:rotate-45">
              {activeIsNight ? (
                <Sun className="w-4 h-4 text-[#f9d775] stroke-[2]" />
              ) : (
                <Moon className="w-4 h-4 text-[#dfba5c] stroke-[2]" />
              )}
            </span>

            <div className="flex flex-col text-left">
              <span className="font-sans-clean text-[8px] uppercase tracking-[0.2em] text-[#dfba5c]/80 leading-none">
                {activeIsNight ? 'Night' : 'Day'}
              </span>
              <span className="font-cinzel text-[11px] sm:text-xs uppercase tracking-[0.14em] font-semibold text-[#f7f2e7] leading-tight">
                {activeIsNight ? 'Daylight' : 'Moonlit'}
              </span>
            </div>

            <span className={`w-2 h-2 rounded-full transition-colors duration-500 ${
              activeIsNight ? 'bg-[#73a3ff] shadow-[0_0_6px_#73a3ff]' : 'bg-[#e5ad35] shadow-[0_0_6px_#e5ad35]'
            }`} />
          </button>
        </div>
      </header>

      {/* =========================================================================
          CONTENT SECTION: MEET THE BRIDE & GROOM
          ========================================================================= */}
      <section className="relative z-20 max-w-6xl mx-auto px-4 sm:px-8 py-4 sm:py-8 flex flex-col items-center">
        
        {/* Section Header */}
        <div className="reveal text-center mb-6 sm:mb-10">
          <span className="font-cinzel text-xs sm:text-sm tracking-[0.35em] uppercase text-[#dfba5c] font-medium">
            Meet The
          </span>
          <h1 className="font-cinzel text-3xl sm:text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-[#ebd6a7] via-[#fff5df] to-[#ebd6a7] font-semibold tracking-[0.12em] mt-1 mb-3 drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
            BRIDE &amp; GROOM
          </h1>

          {/* Filigree divider */}
          <div className="flex items-center justify-center gap-3 text-[#d4af37] max-w-xs mx-auto">
            <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#d4af37]/70 to-[#d4af37]" />
            <Sparkles className="w-4 h-4" />
            <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#d4af37]/70 to-[#d4af37]" />
          </div>
        </div>

        {/* Dual Cards: Bride on Left, Groom on Right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-14 w-full max-w-4xl">
          
          {/* ===================================================================
              1. THE BRIDE: SIMRAN
              =================================================================== */}
          <div className="reveal group relative flex flex-col items-center text-center p-6 sm:p-8 rounded-2xl bg-[#090e1c]/80 hover:bg-[#0c1428]/90 border border-[#d4af37]/50 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(212,175,55,0.08)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1">
            
            {/* Arched Portrait Frame */}
            <div className="relative w-48 sm:w-56 h-64 sm:h-72 mb-6 rounded-t-full border-4 border-[#d4af37]/80 overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.7),0_0_20px_rgba(212,175,55,0.25)]">
              <img
                src={activeIsNight ? '/assets/couple/bride-night.png' : '/assets/couple/bride-day.png'}
                alt="Simran — The Bride"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Sub-label */}
            <span className="font-cinzel text-xs tracking-[0.3em] uppercase text-[#dfba5c] font-semibold mb-1">
              THE BRIDE
            </span>

            {/* Bride's Name from Image 5 */}
            <h2 className="font-royal text-2xl sm:text-3xl text-[#fdfaf3] font-normal tracking-wide my-1">
              Simran
            </h2>

            {/* Parentage details from Image 5 */}
            <p className="font-serif-body text-sm sm:text-base text-[#dfba5c] italic tracking-wide mb-3 font-medium">
              (Daughter of Smt. Savita Saxena &amp; Sh. Naveen Saxena)
            </p>

            {/* Gold Accent Line */}
            <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent my-2" />

            {/* Bride Bio Quote from Image 3/4 */}
            <p className="font-serif-body text-xs sm:text-sm text-[#dad2c3] italic leading-relaxed max-w-sm">
              &ldquo;A vision of unconditional love, and timeless grace, and impossibly open charm — with a heart that fills every room she walks into.&rdquo;
            </p>
          </div>

          {/* ===================================================================
              2. THE GROOM: SACHIT
              =================================================================== */}
          <div className="reveal group relative flex flex-col items-center text-center p-6 sm:p-8 rounded-2xl bg-[#090e1c]/80 hover:bg-[#0c1428]/90 border border-[#d4af37]/50 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(212,175,55,0.08)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1">
            
            {/* Arched Portrait Frame */}
            <div className="relative w-48 sm:w-56 h-64 sm:h-72 mb-6 rounded-t-full border-4 border-[#d4af37]/80 overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.7),0_0_20px_rgba(212,175,55,0.25)]">
              <img
                src={activeIsNight ? '/assets/couple/groom-night.png' : '/assets/couple/groom-day.png'}
                alt="Sachit — The Groom"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Sub-label */}
            <span className="font-cinzel text-xs tracking-[0.3em] uppercase text-[#dfba5c] font-semibold mb-1">
              THE GROOM
            </span>

            {/* Groom's Name from Image 5 */}
            <h2 className="font-royal text-2xl sm:text-3xl text-[#fdfaf3] font-normal tracking-wide my-1">
              Sachit
            </h2>

            {/* Parentage details from Image 5 */}
            <p className="font-serif-body text-sm sm:text-base text-[#dfba5c] italic tracking-wide mb-3 font-medium">
              (Son of Smt. Roli Srivastava &amp; Sh. Satyendra Srivastava)
            </p>

            {/* Gold Accent Line */}
            <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent my-2" />

            {/* Groom Bio Quote from Image 3/4 */}
            <p className="font-serif-body text-xs sm:text-sm text-[#dad2c3] italic leading-relaxed max-w-sm">
              &ldquo;Epitome of kindness, quiet strength, and a boundless heart — someone who makes life feel like home.&rdquo;
            </p>
          </div>

        </div>

        {/* Bottom Filigree and Love Motif */}
        <div className="flex items-center gap-3 mt-6 mb-4 text-[#d4af37]">
          <span className="w-16 h-[1px] bg-[#d4af37]/40" />
          <Heart className="w-4 h-4 fill-[#d4af37]/30 text-[#d4af37]" />
          <span className="w-16 h-[1px] bg-[#d4af37]/40" />
        </div>

        {/* Scroll down continuation indicator to Scene 5 */}
        <div 
          onClick={() => {
            const el = document.getElementById('scroll-story-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="group flex flex-col items-center gap-1.5 cursor-pointer pb-6 transition-all hover:scale-105"
        >
          <span className="font-cinzel text-[11px] tracking-[0.28em] uppercase text-[#dfba5c] group-hover:text-white transition-colors">
            Scroll Down To Our Story
          </span>
          <span className="text-[#dfba5c] text-sm animate-bounce">↓</span>
        </div>

      </section>
    </div>
  );
}


