import React, { useState, useRef, useEffect } from 'react';
import { Play } from 'lucide-react';
import { swapThemeVideo, playSafely } from '../lib/videoSwap';
import Monogram from './Monogram';

/**
 * ENTRANCE JOURNEY — the palace gate and the courtyard, in ONE component.
 *
 * Why they are merged
 * -------------------
 * They used to be two components swapped by React state (`setCurrentScene(2)`).
 * That unmounted the gate's <video> and mounted a brand-new courtyard <video>
 * which then had to fetch, decode and start — so the screen went black for a
 * beat in between. The user reads that as "the scenes do not join".
 *
 * Here all four videos live in the same subtree from the first paint. The
 * courtyard footage is already buffered while the gate film is still playing,
 * so when the gate's `ended` fires we simply raise the courtyard layer over
 * the gate's last frame. Nothing unmounts, nothing has to load, and there is
 * no black frame at any point.
 *
 * Phase machine:
 *   'gate'      — invitation card -> gate film playing
 *   'courtyard' — courtyard film playing over the gate's final frame
 */

const DAY_IMAGE = '/assets/scene1/day-image.png';
const NIGHT_IMAGE = '/assets/scene1/night-image.png';

/* Responsive WebP ladders, derived LOCALLY from the approved PNG sources with
   Lanczos resampling — every entry is at or below the native width, so nothing
   here is an invented "HD" upscale. The PNG stays as the <img> fallback.

   day   native 1024x682   -> 512 / 768 / 1024
   night native 1537x1023  -> 512 / 768 / 1024 / 1537                        */
const DAY_SRCSET =
  '/assets/scene1/day-image-512.webp 512w, ' +
  '/assets/scene1/day-image-768.webp 768w, ' +
  '/assets/scene1/day-image-1024.webp 1024w';
const NIGHT_SRCSET =
  '/assets/scene1/night-image-512.webp 512w, ' +
  '/assets/scene1/night-image-768.webp 768w, ' +
  '/assets/scene1/night-image-1024.webp 1024w, ' +
  '/assets/scene1/night-image-1537.webp 1537w';
const DAY_GATE_VIDEO = '/assets/scene1/day-video.mp4';
const NIGHT_GATE_VIDEO = '/assets/scene1/night-video.mp4';
const DAY_COURT_VIDEO = '/assets/scene2/day-courtyard.mp4';
const NIGHT_COURT_VIDEO = '/assets/scene2/night-courtyard.mp4';

export default function EntranceJourney({ isNight, onComplete }) {
  const [showCard, setShowCard] = useState(true);
  const [phase, setPhase] = useState('gate');
  const [burst, setBurst] = useState(0);

  const dayGateRef = useRef(null);
  const nightGateRef = useRef(null);
  const dayCourtRef = useRef(null);
  const nightCourtRef = useRef(null);

  const entered = !showCard;
  const prevNightRef = useRef(isNight);
  const finishedRef = useRef(false);

  // EVERY clip on the page is silent.
  //
  // The invitation carries exactly one soundtrack (see <AmbientMusic />), so
  // these films are muted unconditionally — not "muted unless the global pill
  // says otherwise". Previously this effect unmuted whichever gate/courtyard
  // film matched the current theme, which would now fight the music track.
  useEffect(() => {
    const all = [dayGateRef.current, nightGateRef.current, dayCourtRef.current, nightCourtRef.current];
    for (const video of all) {
      if (!video) continue;
      video.muted = true;
    }
  }, [isNight]);

  // Day/Night swap — only among the layers that are actually on screen.
  useEffect(() => {
    if (prevNightRef.current === isNight) return;
    prevNightRef.current = isNight;

    if (!entered) return; // the static photographs crossfade on their own

    if (phase === 'courtyard') {
      swapThemeVideo({
        fromVideo: isNight ? dayCourtRef.current : nightCourtRef.current,
        toVideo: isNight ? nightCourtRef.current : dayCourtRef.current,
      });
    } else {
      swapThemeVideo({
        fromVideo: isNight ? dayGateRef.current : nightGateRef.current,
        toVideo: isNight ? nightGateRef.current : dayGateRef.current,
      });
    }
  }, [isNight, entered, phase]);

  const handleEnter = async () => {
    setShowCard(false);
    const active = isNight ? nightGateRef.current : dayGateRef.current;
    if (active) {
      active.currentTime = 0;
      await playSafely(active);
    }
  };

  // Gate film finished -> raise the courtyard, which is already buffered.
  const handleGateEnded = async () => {
    if (phase !== 'gate') return;
    setPhase('courtyard');
    setBurst(1);

    const court = isNight ? nightCourtRef.current : dayCourtRef.current;
    if (court) {
      if (court.ended || court.currentTime > 0.05) court.currentTime = 0;
      await playSafely(court);
    }
    setTimeout(() => setBurst(0), 900);
  };

  const handleCourtyardEnded = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (onComplete) onComplete();
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#040711] select-none font-serif-body">

      {/* ---------- STILLS (behind the card, before entering) ----------
          Real <picture> elements, not CSS backgrounds, so the browser picks the
          smallest WebP that covers this viewport and can prioritise the day
          plate (the default theme, and therefore the first paint). `sizes` is
          100vw because both are full-bleed object-cover. The PNG remains the
          <img src> fallback for any engine without WebP. */}
      <picture className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
        !entered && !isNight ? 'opacity-100 z-10' : 'opacity-0 z-0'
      }`}>
        <source type="image/webp" srcSet={DAY_SRCSET} sizes="100vw" />
        <img
          src={DAY_IMAGE}
          alt="Palace entrance at day"
          fetchPriority="high"
          decoding="async"
          className="block w-full h-full object-cover object-center"
        />
      </picture>
      <picture className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
        !entered && isNight ? 'opacity-100 z-10' : 'opacity-0 z-0'
      }`}>
        <source type="image/webp" srcSet={NIGHT_SRCSET} sizes="100vw" />
        <img
          src={NIGHT_IMAGE}
          alt="Palace entrance at night"
          decoding="async"
          className="block w-full h-full object-cover object-center"
        />
      </picture>

      {/* ---------- GATE FILM (kept mounted; holds its last frame) ---------- */}
      <video
        ref={dayGateRef}
        src={DAY_GATE_VIDEO}
        playsInline
        preload="auto"
        muted
        onEnded={handleGateEnded}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
          entered && !isNight ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      />
      <video
        ref={nightGateRef}
        src={NIGHT_GATE_VIDEO}
        playsInline
        preload="auto"
        muted
        onEnded={handleGateEnded}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
          entered && isNight ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      />

      {/* ---------- COURTYARD (preloaded from first paint) ---------- */}
      <video
        ref={dayCourtRef}
        src={DAY_COURT_VIDEO}
        playsInline
        preload="auto"
        muted
        onEnded={handleCourtyardEnded}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
          phase === 'courtyard' && !isNight ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      />
      <video
        ref={nightCourtRef}
        src={NIGHT_COURT_VIDEO}
        playsInline
        preload="auto"
        muted
        onEnded={handleCourtyardEnded}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
          phase === 'courtyard' && isNight ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      />

      {/* Golden light flood carried over from the gate, so the cut reads as a
          dissolve rather than a switch. */}
      <div
        className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-700"
        style={{
          opacity: burst * 0.85,
          background: 'radial-gradient(circle at center, #ffffff 12%, #ffe6a3 48%, rgba(255,230,163,0) 88%)',
        }}
      />

      {/* Vignette + royal frame, shared by both acts */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{ background: 'radial-gradient(circle at center, rgba(4,7,17,0.04) 45%, rgba(4,7,17,0.45) 80%, rgba(2,4,10,0.9) 100%)' }}
      />
      <div className="absolute inset-3 sm:inset-6 border border-[#d4af37]/40 pointer-events-none z-20 rounded-sm">
        <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#d4af37]" />
        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#d4af37]" />
        <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#d4af37]" />
        <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#d4af37]" />
        <div className="absolute inset-1.5 border border-[#d4af37]/15 rounded-sm" />
      </div>

      {/* ---------- Persistent header (no scene numbering: one story) ---------- */}
      {/* Offset must clear the gold frame (inset-3 on mobile, sm:inset-6), or the
          monogram rides the border line. 6/12 leaves 12px of air on both. */}
      <div className="absolute safe-left top-6 z-30 flex items-center gap-2.5 sm:top-10 sm:gap-3.5">
        <Monogram className="w-[20px] sm:w-6 h-auto shrink-0 drop-shadow-[0_2px_10px_rgba(212,175,55,0.5)]" />
        <div>
          <p className="font-cinzel text-[8px] sm:text-[9px] tracking-[0.3em] uppercase text-[#dfba5c] leading-tight">
            Royal Wedding Celebration
          </p>
          <h2 className="font-royal text-[11px] sm:text-sm tracking-[0.14em] uppercase text-[#fbf7ee] font-normal drop-shadow leading-tight">
            Simran <span className="text-[#dfba5c]">&amp;</span> Sachit
          </h2>
        </div>
      </div>

      {/* ---------- INVITATION CARD ---------- */}
      <div
        className={`absolute inset-0 z-40 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-700 ${
          showCard ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="relative max-w-xl w-full p-6 sm:p-10 rounded-2xl bg-gradient-to-b from-[#101830]/95 via-[#0b1022]/95 to-[#050814]/98 border border-[#d4af37]/70 shadow-[0_30px_90px_rgba(0,0,0,0.9),inset_0_0_50px_rgba(212,175,55,0.12)] text-center flex flex-col items-center">
          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#d4af37]/80" />
          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#d4af37]/80" />
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#d4af37]/80" />
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#d4af37]/80" />

          <div className="text-[11px] sm:text-[13px] tracking-[0.25em] text-[#dfba5c]/90 font-serif-body italic mb-2.5">
            ॥ श्री गणेशाय नमः ॥
          </div>

          <div className="relative w-14 h-16 sm:w-20 sm:h-24 mb-3 sm:mb-4 flex items-center justify-center text-[#dfba5c]">
            <Monogram className="w-full h-full drop-shadow-[0_0_18px_rgba(212,175,55,0.45)]" />
          </div>

          <span className="font-sans-clean text-[9px] sm:text-[11px] tracking-[0.34em] uppercase text-[#dfba5c] mb-2 font-medium">
            Together With Their Families
          </span>

          <h1 className="font-cinzel text-xl sm:text-4xl text-[#fdfaf2] font-semibold tracking-[0.14em] mb-1">
            SIMRAN SAXENA
          </h1>

          <div className="font-script text-xl sm:text-3xl text-[#dfba5c] my-0.5 sm:my-1">
            and
          </div>

          <h1 className="font-cinzel text-xl sm:text-4xl text-[#fdfaf2] font-semibold tracking-[0.14em] mb-2 sm:mb-3">
            SACHIT SRIVASTAVA
          </h1>

          <div className="flex items-center gap-3 w-full max-w-xs my-2">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#d4af37]/70 to-[#d4af37]" />
            <div className="w-2 h-2 rotate-45 border border-[#d4af37] bg-[#d4af37]/30" />
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#d4af37]/70 to-[#d4af37]" />
          </div>

          <p className="font-serif-body text-sm sm:text-lg text-[#ece5d8] italic max-w-md leading-relaxed my-2 mb-6">
            Cordially invite you to celebrate their auspicious union amidst royal splendour.
          </p>

          <button
            onClick={handleEnter}
            className="group relative inline-flex items-center gap-3 px-7 sm:px-10 py-3 sm:py-4 rounded-full bg-gradient-to-r from-[#ba8c22] via-[#e5c56c] to-[#ba8c22] text-[#060a15] font-cinzel font-bold text-[11px] sm:text-sm tracking-[0.22em] uppercase shadow-[0_0_35px_rgba(212,175,55,0.5)] hover:shadow-[0_0_50px_rgba(212,175,55,0.7)] hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <span>Enter The Palace</span>
            <Play className="w-3.5 h-3.5 fill-current stroke-none transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
