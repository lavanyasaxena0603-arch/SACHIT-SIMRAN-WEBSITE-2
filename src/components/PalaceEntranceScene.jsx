import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sun, 
  Moon, 
  Play, 
  Sparkles,
  Volume2,
  VolumeX,
  Upload,
  RotateCcw,
  ArrowRight
} from 'lucide-react';

/**
 * SIMRAN SAXENA & SACHIT SRIVASTAVA — ROYAL WEDDING WEBSITE
 * SCENE 01: CINEMATIC PALACE ENTRANCE WITH DAY/NIGHT SWITCHING
 * 
 * Assets linked directly from public/assets/scene1/:
 * 1. Daytime Palace Gate Photograph: /assets/scene1/day-image.png
 * 2. Nighttime Palace 1,000 Lamps Photograph: /assets/scene1/night-image.png
 * 3. Daytime Palace Entry Video: /assets/scene1/day-video.mp4
 * 4. Nighttime Palace Entry Video: /assets/scene1/night-video.mp4
 */

const LOCAL_DAY_IMAGE = "/assets/scene1/day-image.png";
const LOCAL_NIGHT_IMAGE = "/assets/scene1/night-image.png";
const LOCAL_DAY_VIDEO = "/assets/scene1/day-video.mp4";
const LOCAL_NIGHT_VIDEO = "/assets/scene1/night-video.mp4";

export default function PalaceEntranceScene({ 
  isNight: controlledIsNight,
  onToggleNight,
  onProceedToScene2 
}) {
  // Mode state: false = Day (Sandstone courtyard), true = Night (Thousand lamps)
  const [internalIsNight, setInternalIsNight] = useState(false);
  const isNight = controlledIsNight !== undefined ? controlledIsNight : internalIsNight;
  
  // Transition state: false = static photograph mode, true = active video playback
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  
  // Invitation card overlay state
  const [showInvitationGate, setShowInvitationGate] = useState(true);
  
  // Global audio mute state
  const [isMuted, setIsMuted] = useState(true);

  // Asset URLs
  const [dayVideoUrl, setDayVideoUrl] = useState(LOCAL_DAY_VIDEO);
  const [nightVideoUrl, setNightVideoUrl] = useState(LOCAL_NIGHT_VIDEO);
  const [dayImageUrl] = useState(LOCAL_DAY_IMAGE);
  const [nightImageUrl] = useState(LOCAL_NIGHT_IMAGE);

  // Video mapping toggle (in case day & night videos need to be inverted)
  const [areVideosInverted, setAreVideosInverted] = useState(false);

  // Hidden custom file picker drawer toggle
  const [showFilePicker, setShowFilePicker] = useState(false);

  // Video element references
  const dayVideoRef = useRef(null);
  const nightVideoRef = useRef(null);

  // Preload videos on component mount
  useEffect(() => {
    if (dayVideoRef.current) dayVideoRef.current.load();
    if (nightVideoRef.current) nightVideoRef.current.load();
  }, [dayVideoUrl, nightVideoUrl]);

  // Safe playback trigger
  const playVideoSafely = async (video) => {
    if (!video) return;
    try {
      if (video.paused) {
        await video.play();
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Playback error:', err);
      }
    }
  };

  /**
   * STEP 1: OPENING INTERACTION
   * Triggered when the visitor clicks "Enter The Palace" on the royal card.
   * Crossfades from the static photograph directly into the camera-entry video.
   */
  const handleEnterPalace = async () => {
    setShowInvitationGate(false);
    setIsPlayingVideo(true);

    const activeVideo = isNight ? nightVideoRef.current : dayVideoRef.current;
    const standbyVideo = isNight ? dayVideoRef.current : nightVideoRef.current;

    if (activeVideo) {
      activeVideo.currentTime = 0;
      activeVideo.muted = isMuted;
      await playVideoSafely(activeVideo);
    }

    if (standbyVideo) {
      standbyVideo.currentTime = 0;
      standbyVideo.muted = true;
    }
  };

  /**
   * Reset back to the Gate Entrance Invitation card
   */
  const handleResetGate = () => {
    if (dayVideoRef.current) {
      dayVideoRef.current.pause();
      dayVideoRef.current.currentTime = 0;
    }
    if (nightVideoRef.current) {
      nightVideoRef.current.pause();
      nightVideoRef.current.currentTime = 0;
    }
    setIsPlayingVideo(false);
    setShowInvitationGate(true);
  };

  /**
   * STEP 2: SYNCHRONIZED DAY / NIGHT SWITCHING
   * Seamless crossfade preserving exact timestamp
   */
  const handleDayNightToggle = useCallback(async () => {
    const nextNight = !isNight;

    if (onToggleNight) {
      onToggleNight(nextNight);
    } else {
      setInternalIsNight(nextNight);
    }

    if (!isPlayingVideo) {
      return;
    }

    const sourceVideo = isNight ? nightVideoRef.current : dayVideoRef.current;
    const targetVideo = nextNight ? nightVideoRef.current : dayVideoRef.current;

    if (!sourceVideo || !targetVideo) {
      return;
    }

    const currentTimestamp = sourceVideo.currentTime;
    const isPlaying = !sourceVideo.paused && !sourceVideo.ended;
    const currentRate = sourceVideo.playbackRate;

    targetVideo.currentTime = currentTimestamp;
    targetVideo.playbackRate = currentRate;

    targetVideo.muted = isMuted;
    sourceVideo.muted = true;
    // Only one video may decode at a time — otherwise the outgoing one keeps
    // playing behind the crossfade (double audio and wasted CPU/battery).
    sourceVideo.pause();

    if (isPlaying) {
      await playVideoSafely(targetVideo);
    } else {
      targetVideo.pause();
    }
  }, [isNight, isPlayingVideo, isMuted, onToggleNight]);

  // Global sound toggle
  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    const activeVideo = isNight ? nightVideoRef.current : dayVideoRef.current;
    if (activeVideo) {
      activeVideo.muted = nextMuted;
    }
  };

  // Swap Video Assignment if the two videos are inverted
  const handleSwapVideos = () => {
    const currentDay = dayVideoUrl;
    const currentNight = nightVideoUrl;
    setDayVideoUrl(currentNight);
    setNightVideoUrl(currentDay);
    setAreVideosInverted(prev => !prev);
  };

  // Local file upload helpers for testing local files
  const handleLocalFile = (e, targetSetter) => {
    const file = e.target.files?.[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      targetSetter(blobUrl);
    }
  };

  return (
    <div className="relative w-screen h-screen h-[100dvh] overflow-hidden bg-[#040711] select-none font-serif-body">
      
      {/* =========================================================================
          MEDIA LAYERS: 2 PHOTOGRAPHS (STATIC) + 2 FULL-CINEMATIC VIDEOS (ACTIVE)
          ========================================================================= */}

      {/* ASSET 01: Daytime Palace Photograph (Static Opening) */}
      <img
        src={dayImageUrl}
        alt="Simran & Sachit Palace Entrance - Day"
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          !isPlayingVideo && !isNight ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 pointer-events-none scale-105'
        }`}
        style={{ transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 10s ease-out' }}
      />

      {/* ASSET 03: Nighttime Palace Photograph (Static Opening with 1,000 Lamps) */}
      <img
        src={nightImageUrl}
        alt="Simran & Sachit Palace Entrance - Night"
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          !isPlayingVideo && isNight ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 pointer-events-none scale-105'
        }`}
        style={{ transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1), transform 10s ease-out' }}
      />

      {/* ASSET 02: Daytime Palace Entry Video (Gate Opening & Forward Camera) */}
      <video
        ref={dayVideoRef}
        src={dayVideoUrl}
        playsInline
        preload="auto"
        onEnded={() => onProceedToScene2 && onProceedToScene2()}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isPlayingVideo && !isNight ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      />

      {/* ASSET 04: Nighttime Palace Entry Video (Illuminated Gateway & Courtyard) */}
      <video
        ref={nightVideoRef}
        src={nightVideoUrl}
        playsInline
        preload="auto"
        onEnded={() => onProceedToScene2 && onProceedToScene2()}
        muted
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isPlayingVideo && isNight ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      />

      {/* Cinematic Royal Vignette Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          background: 'radial-gradient(circle at center, rgba(4,7,17,0.05) 45%, rgba(4,7,17,0.5) 80%, rgba(2,4,10,0.92) 100%)'
        }}
      />

      {/* Royal Gold Filigree Border Accent */}
      <div className="absolute inset-3 sm:inset-6 border border-[#d4af37]/40 pointer-events-none z-20 rounded-sm">
        {/* Corner Ornaments */}
        <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#d4af37]" />
        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#d4af37]" />
        <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#d4af37]" />
        <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#d4af37]" />

        {/* Inner subtle second border */}
        <div className="absolute inset-1.5 border border-[#d4af37]/15 rounded-sm" />
      </div>

      {/* =========================================================================
          TOP-LEFT ROYAL MONOGRAM
          ========================================================================= */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-30 flex items-center gap-3.5 select-none">
        <div className="relative group cursor-pointer" onClick={handleResetGate} title="Click to view Invitation Card">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-[#d4af37]/80 bg-[#090e1c]/85 backdrop-blur-md flex items-center justify-center text-[#dfba5c] shadow-[0_4px_25px_rgba(0,0,0,0.7),0_0_15px_rgba(212,175,55,0.25)] transition-transform duration-300 group-hover:scale-105">
            <span className="font-cinzel text-xs sm:text-sm font-bold tracking-widest text-[#f3e5ab]">S&amp;S</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#d4af37] flex items-center justify-center shadow-sm">
            <Sparkles className="w-2 h-2 text-[#040711]" />
          </div>
        </div>
        <div>
          <p className="font-cinzel text-[9px] sm:text-[10px] tracking-[0.3em] uppercase text-[#dfba5c] leading-tight">
            Royal Wedding Celebration
          </p>
          <h2 className="font-royal text-sm sm:text-base tracking-[0.14em] uppercase text-[#fbf7ee] font-normal drop-shadow">
            Simran <span className="text-[#dfba5c]">&amp;</span> Sachit
          </h2>
        </div>
      </div>

      {/* =========================================================================
          TOP-RIGHT CONTROLS: DAY/NIGHT SWITCH & AUDIO
          ========================================================================= */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-30 flex items-center gap-2.5 sm:gap-3">
        
        {/* Reset Gate Button (Visible during video playback) */}
        {isPlayingVideo && (
          <button
            onClick={handleResetGate}
            title="Re-open Invitation Gate Card"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#090e1c]/80 hover:bg-[#121a33]/95 border border-[#d4af37]/50 flex items-center justify-center text-[#dfba5c] backdrop-blur-md transition-all active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
          >
            <RotateCcw className="w-4 h-4 text-[#dfba5c]" />
          </button>
        )}

        {/* Audio Mute/Unmute */}
        <button
          onClick={toggleSound}
          title={isMuted ? "Unmute Royal Ambience" : "Mute Sound"}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#090e1c]/80 hover:bg-[#121a33]/95 border border-[#d4af37]/50 flex items-center justify-center text-[#dfba5c] backdrop-blur-md transition-all active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4 text-[#dfba5c] animate-pulse" />}
        </button>

        {/* Day / Night Switch */}
        <button
          onClick={handleDayNightToggle}
          aria-label={isNight ? "Switch to Day View" : "Switch to Night View"}
          className="group relative flex items-center gap-2.5 sm:gap-3.5 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[#080d1a]/85 hover:bg-[#0e1629]/95 border border-[#d4af37]/60 hover:border-[#dfba5c] shadow-[0_6px_25px_rgba(0,0,0,0.7),0_0_20px_rgba(212,175,55,0.2)] transition-all duration-300 backdrop-blur-md active:scale-95 focus:outline-none"
        >
          <div className="relative text-[#dfba5c] transition-transform duration-500 group-hover:rotate-45">
            {isNight ? (
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-[#f9d775] stroke-[2]" />
            ) : (
              <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-[#dfba5c] stroke-[2]" />
            )}
          </div>

          <div className="flex flex-col text-left">
            <span className="font-sans-clean text-[8px] sm:text-[9px] uppercase tracking-[0.22em] text-[#dfba5c]/85 leading-none">
              {isNight ? 'Current: Night' : 'Current: Day'}
            </span>
            <span className="font-cinzel text-xs sm:text-sm uppercase tracking-[0.16em] font-semibold text-[#f7f2e7]">
              {isNight ? 'Switch To Day' : 'Switch To Night'}
            </span>
          </div>

          <span className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
            isNight 
              ? 'bg-[#82aaff] shadow-[0_0_10px_#82aaff]' 
              : 'bg-[#f0ba42] shadow-[0_0_10px_#f0ba42]'
          }`} />
        </button>
      </div>

      {/* =========================================================================
          ROYAL INVITATION CARD (INTERACTIVE ENTRY GATE OVERLAY)
          ========================================================================= */}
      {showInvitationGate && (
        <div 
          onClick={handleEnterPalace}
          className="absolute inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-[#040711]/70 backdrop-blur-md cursor-pointer transition-opacity duration-1000"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-xl w-full p-8 sm:p-12 rounded-2xl bg-gradient-to-b from-[#101830]/95 via-[#0b1022]/95 to-[#050814]/98 border border-[#d4af37]/70 shadow-[0_30px_90px_rgba(0,0,0,0.9),inset_0_0_50px_rgba(212,175,55,0.12)] text-center flex flex-col items-center "
          >
            {/* Ornate Card Corners */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#d4af37]/80" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#d4af37]/80" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#d4af37]/80" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#d4af37]/80" />

            {/* Auspicious Vedic Sanskrit Shloka */}
            <div className="text-[12px] sm:text-[13px] tracking-[0.25em] text-[#dfba5c]/90 font-serif-body italic mb-3">
              ॥ श्री गणेशाय नमः ॥
            </div>

            {/* Emblem Circle */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-4 rounded-full border border-[#d4af37]/80 flex items-center justify-center bg-gradient-to-b from-[#141e3d] to-[#080d1c] text-[#dfba5c] shadow-[0_0_35px_rgba(212,175,55,0.35)]">
              <span className="font-cinzel text-lg sm:text-xl font-bold tracking-widest text-[#f3e5ab]">S&amp;S</span>
              <div className="absolute -top-1 w-2 h-2 rounded-full bg-[#d4af37] shadow-[0_0_8px_#d4af37]" />
            </div>

            <span className="font-sans-clean text-[10px] sm:text-[11px] tracking-[0.38em] uppercase text-[#dfba5c] mb-2 font-medium">
              Together With Their Families
            </span>

            <h1 className="font-cinzel text-2xl sm:text-4xl text-[#fdfaf2] font-semibold tracking-[0.16em] mb-1">
              SIMRAN SAXENA
            </h1>
            
            <div className="font-script text-2xl sm:text-3xl text-[#dfba5c] my-0.5 sm:my-1">
              and
            </div>

            <h1 className="font-cinzel text-2xl sm:text-4xl text-[#fdfaf2] font-semibold tracking-[0.16em] mb-3">
              SACHIT SRIVASTAVA
            </h1>

            {/* Gold divider line */}
            <div className="flex items-center gap-3 w-full max-w-xs my-2.5">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#d4af37]/70 to-[#d4af37]" />
              <div className="w-2 h-2 rotate-45 border border-[#d4af37] bg-[#d4af37]/30" />
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#d4af37]/70 to-[#d4af37]" />
            </div>

            <p className="font-serif-body text-base sm:text-lg text-[#ece5d8] italic max-w-md leading-relaxed my-2">
              Cordially invite you to celebrate their auspicious union amidst royal splendour.
            </p>

            <div className="font-sans-clean text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-[#c7beaf] mb-7 space-y-1">
              <p className="text-[#dfba5c] font-semibold">SCENE 01 — THE PALACE ENTRANCE</p>
              <p>Experience the grand sandstone gates &amp; the thousand lamps.</p>
            </div>

            {/* Action CTA Button */}
            <button
              onClick={handleEnterPalace}
              className="group relative inline-flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-gradient-to-r from-[#ba8c22] via-[#e5c56c] to-[#ba8c22] text-[#060a15] font-cinzel font-bold text-xs sm:text-sm tracking-[0.25em] uppercase shadow-[0_0_35px_rgba(212,175,55,0.5)] hover:shadow-[0_0_50px_rgba(212,175,55,0.7)] hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <span>Enter The Palace</span>
              <Play className="w-3.5 h-3.5 fill-current stroke-none transition-transform group-hover:translate-x-0.5" />
            </button>

            <span className="font-sans-clean text-[10px] text-[#9c9381] tracking-widest uppercase mt-5">
              Tap anywhere or click above to begin the cinematic journey
            </span>
          </div>
        </div>
      )}

      {/* =========================================================================
          BOTTOM-RIGHT FLOATING SCENE 2 NAVIGATION / REVEAL TEASER
          ========================================================================= */}
      {isPlayingVideo && (
        <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-30 flex items-center gap-3">
          <button
            onClick={() => {
              if (onProceedToScene2) {
                onProceedToScene2();
              } else {
                
              }
            }}
            className="group flex items-center gap-3 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[#080d1a]/85 hover:bg-[#121c36]/95 border border-[#d4af37]/70 text-[#fdfaf2] text-xs sm:text-sm font-cinzel tracking-wider backdrop-blur-md shadow-[0_6px_25px_rgba(0,0,0,0.7)] transition-all hover:scale-105"
          >
            <span className="text-[#dfba5c]">Next: Scene 2</span>
            <span className="hidden sm:inline text-white/90">Palace Courtyard</span>
            <ArrowRight className="w-4 h-4 text-[#dfba5c] transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      )}

      {/* =========================================================================
          DISCREET ASSET INSPECTOR & VIDEO SWAPPER (BOTTOM-LEFT)
          ========================================================================= */}
      {import.meta.env.DEV && (
      <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 z-30">
        <button
          onClick={() => setShowFilePicker(prev => !prev)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#080d1a]/80 hover:bg-[#101930]/95 border border-[#d4af37]/40 text-[10px] text-[#dfba5c] font-sans-clean tracking-wider backdrop-blur-md transition-all shadow-lg"
        >
          <Upload className="w-3 h-3" />
          <span>Asset Inspector &amp; Settings</span>
        </button>

        {showFilePicker && (
          <div className="absolute bottom-12 left-0 w-84 sm:w-96 p-5 rounded-xl bg-[#090e1c]/98 border border-[#d4af37]/50 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-[11px] text-[#e0d6c5] font-sans-clean space-y-3.5 z-50">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-cinzel font-semibold text-[#dfba5c] tracking-wider uppercase text-[11px]">
                Scene 01 Asset Controls
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-500/30">
                Connected to public/assets
              </span>
            </div>

            {/* Video invert toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
              <div>
                <p className="text-white font-medium text-[11px]">Invert Day / Night Video</p>
                <p className="text-[10px] text-gray-400">Swap which video plays during Day vs Night</p>
              </div>
              <button
                onClick={handleSwapVideos}
                className="px-3 py-1.5 rounded bg-[#d4af37]/20 hover:bg-[#d4af37]/35 text-[#dfba5c] border border-[#d4af37]/50 text-[10px] font-semibold transition-colors"
              >
                {areVideosInverted ? 'Swap Back' : 'Swap Mapping'}
              </button>
            </div>

            <div className="space-y-2 text-[10px]">
              <div className="p-2 rounded bg-black/40 border border-white/5 space-y-1">
                <span className="text-[#dfba5c] font-semibold">Active Day Video:</span>
                <p className="text-gray-300 truncate font-mono">{dayVideoUrl}</p>
              </div>
              <div className="p-2 rounded bg-black/40 border border-white/5 space-y-1">
                <span className="text-[#dfba5c] font-semibold">Active Night Video:</span>
                <p className="text-gray-300 truncate font-mono">{nightVideoUrl}</p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-300 mb-1">Upload Custom Day Video (.mp4):</label>
              <input 
                type="file" 
                accept="video/mp4,video/*" 
                onChange={(e) => handleLocalFile(e, setDayVideoUrl)}
                className="w-full text-[10px] text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-[#d4af37]/20 file:text-[#dfba5c] cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-300 mb-1">Upload Custom Night Video (.mp4):</label>
              <input 
                type="file" 
                accept="video/mp4,video/*" 
                onChange={(e) => handleLocalFile(e, setNightVideoUrl)}
                className="w-full text-[10px] text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-[#d4af37]/20 file:text-[#dfba5c] cursor-pointer"
              />
            </div>

            <div className="pt-2 text-[9px] text-[#9b9382] border-t border-white/10 flex items-center justify-between">
              <span>Scene 2 assets already detected in parent folder.</span>
              <button 
                onClick={() => setShowFilePicker(false)}
                className="text-[#dfba5c] hover:underline"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
      )}

    </div>
  );
}

