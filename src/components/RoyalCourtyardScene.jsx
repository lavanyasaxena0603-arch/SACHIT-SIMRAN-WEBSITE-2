import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  Upload,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

/**
 * SIMRAN SAXENA & SACHIT SRIVASTAVA — ROYAL WEDDING WEBSITE
 * TASK 02: SCENE 02 — THE GRAND ROYAL COURTYARD REVEAL
 * 
 * Features:
 * - Direct visual continuity from Scene 01's golden-white entrance flash.
 * - Dual Day / Night video playback with exact timestamp sync and 700ms crossfade.
 * - Single-source audio routing to eliminate phasing or echo.
 * - Settle-and-hold on the final panoramic courtyard composition (reserving space for Scene 03).
 * - Full fidelity canvas renderer fallback matching approved footage details (fountain, rose petals, diyas).
 * - Pre-wired to approved local video assets in public/assets/scene2/
 */

const DEFAULT_DAY_COURTYARD = "/assets/scene2/day-courtyard.mp4";
const DEFAULT_NIGHT_COURTYARD = "/assets/scene2/night-courtyard.mp4";

export default function RoyalCourtyardScene({
  isNight: controlledIsNight,
  onToggleNight,
  onSceneComplete
}) {
  // Day / Night state (independent or controlled by parent)
  const [internalIsNight, setInternalIsNight] = useState(false);
  const activeIsNight = controlledIsNight !== undefined ? controlledIsNight : internalIsNight;

  // Scene playback states — Scene 02 now runs by itself, so it is "started" on mount.
  const [isPlaying, setIsPlaying] = useState(true);
  const [isSceneFinished, setIsSceneFinished] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Transition from Scene 01: golden light burst dissolve
  const [lightBurstOpacity, setLightBurstOpacity] = useState(1);

  // Local asset binding for direct .mp4 testing (pre-linked to Scene 2 assets)
  const [dayVideoSrc, setDayVideoSrc] = useState(DEFAULT_DAY_COURTYARD);
  const [nightVideoSrc, setNightVideoSrc] = useState(DEFAULT_NIGHT_COURTYARD);
  const [showAssetDrawer, setShowAssetDrawer] = useState(false);
  const [areVideosInverted, setAreVideosInverted] = useState(false);

  // References
  const dayVideoRef = useRef(null);
  const nightVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // Simulation playback state (used when custom MP4 files are not mounted or as fallback)
  const simCurrentTimeRef = useRef(0);
  const DURATION = 10.0; // 10 second cinematic reveal

  // Rose petals simulation particles
  const petalsRef = useRef([]);

  // Initialize petals
  useEffect(() => {
    const petals = [];
    for (let i = 0; i < 45; i++) {
      petals.push({
        x: Math.random(),
        y: Math.random(),
        size: 5 + Math.random() * 8,
        speedY: 0.0008 + Math.random() * 0.0016,
        speedX: (Math.random() - 0.5) * 0.0006,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 2,
        opacity: 0.5 + Math.random() * 0.5,
        color: i % 3 === 0 ? '#ffb7c5' : (i % 3 === 1 ? '#e86f88' : '#fff0f3')
      });
    }
    petalsRef.current = petals;
  }, []);

  // Preload videos on component mount
  useEffect(() => {
    if (dayVideoRef.current) dayVideoRef.current.load();
    if (nightVideoRef.current) nightVideoRef.current.load();
  }, [dayVideoSrc, nightVideoSrc]);

  // Soften the golden entrance light flash inherited from Scene 01.
  // Scene 02 mounts the instant Scene 01's footage ends, so this runs on mount.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLightBurstOpacity(0);
    }, 350);
    return () => clearTimeout(timeout);
  }, []);

  // Safe video play helper
  const safePlay = async (video) => {
    if (!video) return false;
    try {
      await video.play();
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Playback error caught:', err);
      }
      return false;
    }
  };

  // Scene 02 is fully automatic: the courtyard footage begins the moment this
  // scene mounts, because Scene 01 hands over from its own `onEnded`. There is
  // no intro card, no button and no black gap between the two scenes.
  const hasAutoStartedRef = useRef(false);

  const beginPlayback = useCallback(async () => {
    if (hasAutoStartedRef.current) return;
    const activeVideo = activeIsNight ? nightVideoRef.current : dayVideoRef.current;
    if (!activeVideo) return;

    setIsPlaying(true);
    setIsSceneFinished(false);
    simCurrentTimeRef.current = 0;
    if (activeVideo.ended) activeVideo.currentTime = 0;

    const ok = await safePlay(activeVideo);
    if (ok) hasAutoStartedRef.current = true;
  }, [activeIsNight]);

  // Start on mount, and retry once the footage can actually play.
  useEffect(() => {
    beginPlayback();
  }, [beginPlayback, dayVideoSrc, nightVideoSrc]);

  // Synchronized Day / Night Switching
  const handleDayNightToggle = useCallback(async () => {
    const nextNight = !activeIsNight;

    if (onToggleNight) {
      onToggleNight(nextNight);
    } else {
      setInternalIsNight(nextNight);
    }

    // Video synchronization
    if (dayVideoSrc || nightVideoSrc) {
      const fromVideo = activeIsNight ? nightVideoRef.current : dayVideoRef.current;
      const toVideo = nextNight ? nightVideoRef.current : dayVideoRef.current;

      if (fromVideo && toVideo) {
        const currentTimestamp = fromVideo.currentTime;
        const currentRate = fromVideo.playbackRate;
        const isCurrentlyPlaying = !fromVideo.paused && !fromVideo.ended;

        toVideo.currentTime = currentTimestamp;
        toVideo.playbackRate = currentRate;

        // Single-source playback: only the incoming video may run, otherwise the
        // outgoing one keeps decoding behind the crossfade (double audio + wasted CPU).
        toVideo.muted = isMuted;
        fromVideo.muted = true;
        fromVideo.pause();

        if (isCurrentlyPlaying) {
          await safePlay(toVideo);
        } else {
          toVideo.pause();
        }
      }
    }
  }, [activeIsNight, onToggleNight, dayVideoSrc, nightVideoSrc, isMuted]);

  // Audio mute toggle
  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    const activeVideo = activeIsNight ? nightVideoRef.current : dayVideoRef.current;
    if (activeVideo) {
      activeVideo.muted = nextMuted;
    }
  };

  // Swap Day / Night mapping
  const handleSwapVideos = () => {
    const currDay = dayVideoSrc;
    const currNight = nightVideoSrc;
    setDayVideoSrc(currNight);
    setNightVideoSrc(currDay);
    setAreVideosInverted(prev => !prev);
  };

  // File picker handler for testing local MP4 files
  const handleLocalVideoUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (type === 'day') setDayVideoSrc(url);
      if (type === 'night') setNightVideoSrc(url);
    }
  };

  // High-fidelity procedural courtyard canvas rendering (runs if no videos or behind them)
  useEffect(() => {
    if (dayVideoSrc) return; // canvas is only a fallback when no video exists
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let lastTimestamp = performance.now();

    const render = (now) => {
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      // Update simulation time
      if (isPlaying && !isSceneFinished) {
        simCurrentTimeRef.current += delta;
        if (simCurrentTimeRef.current >= DURATION) {
          simCurrentTimeRef.current = DURATION;
          setIsSceneFinished(true);
          setIsPlaying(false);
          if (onSceneComplete) onSceneComplete();
        }
      }

      const progress = Math.min(simCurrentTimeRef.current / DURATION, 1.0);
      const cameraTrack = 1 + Math.sin(progress * Math.PI * 0.5) * 0.22;

      const width = (canvas.width = window.innerWidth);
      const height = (canvas.height = window.innerHeight);

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(cameraTrack, cameraTrack);
      ctx.translate(-width / 2, -height / 2);

      // 1. SKY & HORIZON
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.65);
      if (!activeIsNight) {
        skyGrad.addColorStop(0, '#5ea3db');
        skyGrad.addColorStop(0.5, '#99c5eb');
        skyGrad.addColorStop(1, '#f7e7ce');
      } else {
        skyGrad.addColorStop(0, '#040714');
        skyGrad.addColorStop(0.5, '#0b162e');
        skyGrad.addColorStop(1, '#1b233a');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Night Full Moon
      if (activeIsNight) {
        const moonX = width * 0.76;
        const moonY = height * 0.16;
        const moonRadius = Math.min(width, height) * 0.045;

        const moonGlow = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.2, moonX, moonY, moonRadius * 3.5);
        moonGlow.addColorStop(0, 'rgba(255, 250, 220, 0.45)');
        moonGlow.addColorStop(1, 'rgba(255, 250, 220, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRadius * 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fffce8';
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. PALACE ARCHITECTURE
      const palaceBaseY = height * 0.62;
      const archColor = !activeIsNight ? '#efe6d5' : '#221e2e';
      const archHighlight = !activeIsNight ? '#fffdf7' : '#e6b95c';

      ctx.fillStyle = archColor;
      ctx.fillRect(width * 0.1, height * 0.22, width * 0.8, palaceBaseY - height * 0.22);

      // Central Dome
      const domeCenterX = width * 0.5;
      const domeBaseY = height * 0.24;
      const domeRadius = Math.min(width, height) * 0.14;

      ctx.beginPath();
      ctx.arc(domeCenterX, domeBaseY, domeRadius, Math.PI, 0);
      ctx.fillStyle = archColor;
      ctx.fill();
      ctx.strokeStyle = archHighlight;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Side Domes
      [width * 0.28, width * 0.72].forEach((x) => {
        ctx.beginPath();
        ctx.arc(x, domeBaseY + 20, domeRadius * 0.65, Math.PI, 0);
        ctx.fillStyle = archColor;
        ctx.fill();
        ctx.strokeStyle = archHighlight;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Palace Windows & Illumination
      const windowRows = 2;
      const windowCols = 9;
      for (let r = 0; r < windowRows; r++) {
        for (let c = 0; c < windowCols; c++) {
          const winX = width * 0.18 + c * (width * 0.07);
          const winY = height * 0.32 + r * 50;
          ctx.beginPath();
          ctx.arc(winX, winY, 14, Math.PI, 0);
          ctx.rect(winX - 14, winY, 28, 22);
          ctx.fillStyle = activeIsNight ? 'rgba(255, 195, 80, 0.85)' : '#4a3b32';
          ctx.fill();
          if (activeIsNight) {
            ctx.shadowColor = '#e5ad35';
            ctx.shadowBlur = 12;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      }

      // 3. OPULENT MARBLE COURTYARD FLOOR
      const floorGrad = ctx.createLinearGradient(0, palaceBaseY, 0, height);
      if (!activeIsNight) {
        floorGrad.addColorStop(0, '#ebd8c3');
        floorGrad.addColorStop(0.5, '#f7eee4');
        floorGrad.addColorStop(1, '#e3ceb6');
      } else {
        floorGrad.addColorStop(0, '#151322');
        floorGrad.addColorStop(0.5, '#1e1c30');
        floorGrad.addColorStop(1, '#0e0d17');
      }
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, palaceBaseY, width, height - palaceBaseY);

      // Floor perspective diagonal lines
      ctx.strokeStyle = !activeIsNight ? 'rgba(180, 150, 120, 0.35)' : 'rgba(212, 175, 55, 0.2)';
      ctx.lineWidth = 1.2;
      for (let i = -10; i <= 20; i++) {
        ctx.beginPath();
        ctx.moveTo(width * 0.5 + i * (width * 0.05), palaceBaseY);
        ctx.lineTo(width * 0.5 + i * (width * 0.16), height);
        ctx.stroke();
      }

      // 4. CENTRAL FOUNTAIN & REFLECTING POOL
      const poolCenterX = width * 0.5;
      const poolCenterY = height * 0.78;
      const poolRadiusX = width * 0.22;
      const poolRadiusY = height * 0.11;

      ctx.beginPath();
      ctx.ellipse(poolCenterX, poolCenterY, poolRadiusX, poolRadiusY, 0, 0, Math.PI * 2);
      ctx.fillStyle = !activeIsNight ? '#d6c0a6' : '#2c2538';
      ctx.fill();
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Water Surface
      ctx.beginPath();
      ctx.ellipse(poolCenterX, poolCenterY, poolRadiusX * 0.94, poolRadiusY * 0.92, 0, 0, Math.PI * 2);
      const waterGrad = ctx.createLinearGradient(0, poolCenterY - poolRadiusY, 0, poolCenterY + poolRadiusY);
      if (!activeIsNight) {
        waterGrad.addColorStop(0, '#7bb8d4');
        waterGrad.addColorStop(1, '#4f94b8');
      } else {
        waterGrad.addColorStop(0, '#162b47');
        waterGrad.addColorStop(1, '#091524');
      }
      ctx.fillStyle = waterGrad;
      ctx.fill();

      // Fountain Bowl & Spout
      const fountainTopY = poolCenterY - height * 0.15;
      ctx.fillStyle = !activeIsNight ? '#fffdfa' : '#d5cbbe';
      ctx.beginPath();
      ctx.moveTo(poolCenterX - 18, poolCenterY);
      ctx.lineTo(poolCenterX - 8, fountainTopY);
      ctx.lineTo(poolCenterX + 8, fountainTopY);
      ctx.lineTo(poolCenterX + 18, poolCenterY);
      ctx.fill();

      // 5. NIGHT DIYAS & CANDLE ILLUMINATION
      if (activeIsNight) {
        const diyaCount = 18;
        for (let d = 0; d < diyaCount; d++) {
          const angle = (d / diyaCount) * Math.PI * 2;
          const diyaX = poolCenterX + Math.cos(angle) * (poolRadiusX + 16);
          const diyaY = poolCenterY + Math.sin(angle) * (poolRadiusY + 10);

          const flicker = 0.85 + Math.sin(now * 0.01 + d) * 0.15;
          const diyaGlow = ctx.createRadialGradient(diyaX, diyaY, 2, diyaX, diyaY, 22 * flicker);
          diyaGlow.addColorStop(0, 'rgba(255, 220, 100, 0.95)');
          diyaGlow.addColorStop(0.4, 'rgba(240, 140, 30, 0.5)');
          diyaGlow.addColorStop(1, 'rgba(240, 140, 30, 0)');

          ctx.fillStyle = diyaGlow;
          ctx.beginPath();
          ctx.arc(diyaX, diyaY, 22 * flicker, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 6. ROSE PETAL PARTICLES
      petalsRef.current.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotSpeed;

        if (p.y > 1.05) {
          p.y = -0.05;
          p.x = Math.random();
        }

        const px = p.x * width;
        const py = p.y * height;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;

        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isSceneFinished, activeIsNight, onSceneComplete, dayVideoSrc]);

  // Video loop & end sync
  const handleVideoEnded = () => {
    setIsSceneFinished(true);
    setIsPlaying(false);
    if (onSceneComplete) onSceneComplete();
  };

  return (
    <div className="relative w-screen h-screen h-[100dvh] overflow-hidden bg-[#040710] select-none font-serif-body">

      {/* =========================================================================
          VISUAL MEDIA LAYERS: PROCEDURAL CANVAS & CINEMATIC MP4s
          ========================================================================= */}

      {/* Procedural Courtyard Canvas (runs as dynamic background or standalone fallback) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
      />

      {/* Day Courtyard Video */}
      {dayVideoSrc && (
        <video
          ref={dayVideoRef}
          src={dayVideoSrc}
          playsInline
          preload="auto"
          onEnded={handleVideoEnded}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            !activeIsNight ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        />
      )}

      {/* Night Courtyard Video */}
      {nightVideoSrc && (
        <video
          ref={nightVideoRef}
          src={nightVideoSrc}
          playsInline
          preload="auto"
          muted
          onEnded={handleVideoEnded}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            activeIsNight ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        />
      )}

      {/* =========================================================================
          SCENE 01 -> SCENE 02 OPTICAL LIGHT DISSOLVE
          Eases the bright golden-white light burst from the gate entry to reveal courtyard
          ========================================================================= */}
      <div
        className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-1000 ease-out"
        style={{
          opacity: lightBurstOpacity,
          background: 'radial-gradient(circle at center, #ffffff 15%, #ffe6a3 50%, rgba(255, 230, 163, 0) 90%)'
        }}
      />

      {/* Royal Film Vignette Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          background: 'radial-gradient(circle at center, rgba(4,7,16,0.05) 45%, rgba(4,7,16,0.45) 80%, rgba(2,4,10,0.88) 100%)'
        }}
      />

      {/* Royal Gold Filigree Border Accent */}
      <div className="absolute inset-3 sm:inset-6 border border-[#d4af37]/40 pointer-events-none z-25 rounded-sm">
        <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#d4af37]" />
        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#d4af37]" />
        <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#d4af37]" />
        <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#d4af37]" />
        <div className="absolute inset-1.5 border border-[#d4af37]/15 rounded-sm" />
      </div>

      {/* =========================================================================
          TOP-LEFT ROYAL MONOGRAM & SCENE BADGE
          ========================================================================= */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-30 flex items-center gap-3.5 select-none">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-[#d4af37]/80 bg-[#090e1c]/85 backdrop-blur-md flex items-center justify-center text-[#dfba5c] shadow-[0_4px_25px_rgba(0,0,0,0.7),0_0_15px_rgba(212,175,55,0.25)]">
          <span className="font-cinzel text-xs sm:text-sm font-bold tracking-widest text-[#f3e5ab]">S&amp;S</span>
        </div>
        <div>
          <p className="font-cinzel text-[9px] sm:text-[10px] tracking-[0.3em] uppercase text-[#dfba5c] leading-tight">
            Scene 02
          </p>
          <h2 className="font-royal text-sm sm:text-base tracking-[0.14em] uppercase text-[#fbf7ee] font-normal drop-shadow">
            The Royal Courtyard Reveal
          </h2>
        </div>
      </div>

      {/* =========================================================================
          TOP-RIGHT CONTROLS: DAY/NIGHT SWITCHER & AUDIO
          ========================================================================= */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-30 flex items-center gap-2.5 sm:gap-3">
        
        {/* Audio Mute/Unmute */}
        <button
          onClick={handleMuteToggle}
          title={isMuted ? "Unmute Courtyard Ambience" : "Mute Sound"}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#080d1a]/80 hover:bg-[#121a33]/95 border border-[#d4af37]/50 flex items-center justify-center text-[#dfba5c] backdrop-blur-md transition-all active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4 text-[#dfba5c] animate-pulse" />}
        </button>

        {/* Day / Night Floating Pill Switch */}
        <button
          onClick={handleDayNightToggle}
          aria-label={activeIsNight ? 'Switch to Day View' : 'Switch to Night View'}
          className="group relative flex items-center gap-2.5 sm:gap-3.5 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[#080d1a]/85 hover:bg-[#0e1629]/95 border border-[#d4af37]/60 hover:border-[#dfba5c] shadow-[0_6px_25px_rgba(0,0,0,0.7),0_0_20px_rgba(212,175,55,0.2)] transition-all duration-300 backdrop-blur-md active:scale-95 focus:outline-none"
        >
          <div className="relative text-[#dfba5c] transition-transform duration-500 group-hover:rotate-45">
            {activeIsNight ? (
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-[#f9d775] stroke-[2]" />
            ) : (
              <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-[#dfba5c] stroke-[2]" />
            )}
          </div>

          <div className="flex flex-col text-left">
            <span className="font-sans-clean text-[8px] sm:text-[9px] uppercase tracking-[0.22em] text-[#dfba5c]/85 leading-none">
              {activeIsNight ? 'Mode: Night' : 'Mode: Day'}
            </span>
            <span className="font-cinzel text-xs sm:text-sm uppercase tracking-[0.16em] font-semibold text-[#f7f2e7]">
              {activeIsNight ? 'Switch To Day' : 'Switch To Night'}
            </span>
          </div>

          <span
            className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
              activeIsNight ? 'bg-[#82aaff] shadow-[0_0_10px_#82aaff]' : 'bg-[#f0ba42] shadow-[0_0_10px_#f0ba42]'
            }`}
          />
        </button>
      </div>

      {/* =========================================================================
          DISCREET ASSET INSPECTOR (BOTTOM-LEFT)
          Allows quick binding & swapping of approved MP4s directly in the browser
          ========================================================================= */}
      {import.meta.env.DEV && (
      <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 z-30">
        <button
          onClick={() => setShowAssetDrawer((prev) => !prev)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#080d1a]/80 hover:bg-[#101930]/95 border border-[#d4af37]/40 text-[10px] text-[#dfba5c] font-sans-clean tracking-wider backdrop-blur-md transition-all shadow-lg"
        >
          <Upload className="w-3 h-3" />
          <span>Scene 02 Asset Inspector</span>
          {showAssetDrawer ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>

        {showAssetDrawer && (
          <div className="absolute bottom-12 left-0 w-84 sm:w-96 p-5 rounded-xl bg-[#090e1c]/98 border border-[#d4af37]/50 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-[11px] text-[#e0d6c5] font-sans-clean space-y-3.5 z-50">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-cinzel font-semibold text-[#dfba5c] tracking-wider uppercase text-[11px]">
                Scene 02 Approved Assets
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-500/30">
                Connected to public/assets/scene2
              </span>
            </div>

            {/* Invert day/night mapping button */}
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
                <span className="text-[#dfba5c] font-semibold">Day Video:</span>
                <p className="text-gray-300 truncate font-mono">{dayVideoSrc || 'Procedural Fallback'}</p>
              </div>
              <div className="p-2 rounded bg-black/40 border border-white/5 space-y-1">
                <span className="text-[#dfba5c] font-semibold">Night Video:</span>
                <p className="text-gray-300 truncate font-mono">{nightVideoSrc || 'Procedural Fallback'}</p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-300 mb-1">
                Upload Custom Day Courtyard (.mp4):
              </label>
              <input
                type="file"
                accept="video/mp4,video/*"
                onChange={(e) => handleLocalVideoUpload(e, 'day')}
                className="w-full text-[10px] text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-[#d4af37]/20 file:text-[#dfba5c] cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-300 mb-1">
                Upload Custom Night Courtyard (.mp4):
              </label>
              <input
                type="file"
                accept="video/mp4,video/*"
                onChange={(e) => handleLocalVideoUpload(e, 'night')}
                className="w-full text-[10px] text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-[#d4af37]/20 file:text-[#dfba5c] cursor-pointer"
              />
            </div>

            <div className="pt-2 text-[9px] text-[#9b9382] border-t border-white/10 flex items-center justify-between">
              <span>Fountain, rose petals, and reflecting pool rendered.</span>
              <button 
                onClick={() => setShowAssetDrawer(false)}
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

