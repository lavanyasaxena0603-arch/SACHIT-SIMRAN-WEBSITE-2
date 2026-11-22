import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, RotateCw } from 'lucide-react';
import { swapThemeVideo, ensurePlaying } from '../lib/videoSwap';
import { watchFilm } from '../lib/film';
import { unlock as unlockMusic } from '../lib/musicController';
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
  // Shown only when the browser genuinely refuses to start the film — iOS Low
  // Power Mode, a hardened autoplay policy, or a dead file. Without this the
  // visitor sat in front of a frozen palace with no way forward, which is the
  // exact defect that was reported.
  const [needsTap, setNeedsTap] = useState(false);

  const dayGateRef = useRef(null);
  const nightGateRef = useRef(null);
  const dayCourtRef = useRef(null);
  const nightCourtRef = useRef(null);

  const entered = !showCard;
  const prevNightRef = useRef(isNight);
  const finishedRef = useRef(false);
  // The gate may only hand over to the courtyard ONCE, no matter how many
  // independent completion signals fire.
  const gateDoneRef = useRef(false);
  const watcherRef = useRef(null);

  const activeGate = useCallback(
    () => (isNight ? nightGateRef.current : dayGateRef.current),
    [isNight],
  );
  const activeCourt = useCallback(
    () => (isNight ? nightCourtRef.current : dayCourtRef.current),
    [isNight],
  );

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
      // Belt and braces for iOS: `muted` set in React can race the first paint.
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
    }
  }, [isNight]);

  /* ---------------- THE ADVANCE ----------------
     Raised by every completion signal, and idempotent. Previously this was
     attached solely to the `ended` event of a clip whose tail iOS can drop, so
     a single missed event stranded the visitor permanently. */
  const goToCourtyard = useCallback(() => {
    if (gateDoneRef.current) return;
    gateDoneRef.current = true;
    if (watcherRef.current) {
      watcherRef.current.stop();
      watcherRef.current = null;
    }

    setPhase('courtyard');
    setBurst(1);

    const court = activeCourt();
    if (court) {
      try {
        if (court.ended || court.currentTime > 0.05) court.currentTime = 0;
      } catch {
        /* poster-only state cannot seek; play() still works */
      }
      ensurePlaying(court);
    }
    setTimeout(() => setBurst(0), 900);
  }, [activeCourt]);

  const handleFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (watcherRef.current) {
      watcherRef.current.stop();
      watcherRef.current = null;
    }
    if (onComplete) onComplete();
  }, [onComplete]);

  /*
    STABLE CALLBACK REFS.

    The watcher below must never be torn down and rebuilt while a film is
    running: a teardown during the gate would recreate exactly the freeze this
    whole change exists to remove. But the handlers depend on things that change
    as the page runs (the Day/Night theme picks a different <video>, and App
    re-renders for unrelated reasons, giving `onComplete` a new identity).

    So the watchers always call through these refs, and the effects that create
    them depend only on genuine phase changes.
  */
  const cbRef = useRef({});
  // Assigning refs during render is a React anti-pattern (and flagged by lint):
  // a render that never commits would still mutate state the watchers read.
  // Effects run in declaration order, so this lands before the watchers below
  // are armed for the first time.
  useEffect(() => {
    cbRef.current = {
      gate: activeGate,
      court: activeCourt,
      goToCourtyard,
      handleFinish,
    };
  }, [activeGate, activeCourt, goToCourtyard, handleFinish]);

  /*
    Attach the completion watcher to whichever gate layer is actually on screen.

    Idempotent by design: it stops any previous watcher first, so calling it on
    arrival, after a Day/Night swap, and on re-entry to the phase all converge on
    exactly one live watcher. It also re-checks immediately, because a clip can
    reach its end between `play()` resolving and this line running.
  */
  const armGateWatcher = useCallback(() => {
    const gate = cbRef.current.gate();
    if (!gate || gateDoneRef.current) return;

    if (watcherRef.current) watcherRef.current.stop();

    watcherRef.current = watchFilm(gate, {
      onEnd: () => cbRef.current.goToCourtyard(),
      onBlocked: () => setNeedsTap(true),
    });
    watcherRef.current.recheck();
  }, []);

  /* ---------------- START THE GATE ----------------
     The tap is the iOS unlock. `ensurePlaying` retries through `canplay`/
     `loadeddata` instead of treating one rejected promise as "autoplay is
     blocked", and only a real, persistent refusal raises the tap control. */
  const startGate = useCallback(async () => {
    const gate = cbRef.current.gate();
    if (!gate) return;

    setShowCard(false);

    try {
      if (gate.currentTime > 0.05 || gate.ended) gate.currentTime = 0;
    } catch {
      /* not seekable yet — playback still starts from the beginning */
    }

    const ok = await ensurePlaying(gate);
    if (!ok) {
      setNeedsTap(true);
      return;
    }

    setNeedsTap(false);
    armGateWatcher();
  }, [armGateWatcher]);

  const handleEnter = () => {
    // The global controller also unlocks here; this call is fire-and-forget and
    // never gates the transition (audio must not block video).
    unlockMusic();
    startGate();
  };

  /* The single owner of the gate watcher. Attaching to whichever gate layer is
     actually on screen, and re-attaching after a theme swap, is what keeps the
     completion signal attached to the film that is really playing. */
  useEffect(() => {
    if (!entered) return undefined;
    if (phase !== 'gate') return undefined;
    if (gateDoneRef.current) return undefined;

    const gate = cbRef.current.gate();
    if (!gate) return undefined;

    // Nothing to watch until the visitor has started the film.
    if (gate.paused && gate.currentTime === 0 && !gate.ended) return undefined;

    armGateWatcher();

    // Deliberately NOT depending on isNight: a theme swap re-arms the watcher
    // itself (see the Day/Night effect), so a re-render must not tear one down.
    return () => {
      if (watcherRef.current) {
        watcherRef.current.stop();
        watcherRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered, phase, armGateWatcher]);

  /* The courtyard owns its own watcher: it is the act that hands over to the
     scroll story, so it must also be unable to miss its ending. */
  useEffect(() => {
    if (phase !== 'courtyard') return undefined;

    const court = cbRef.current.court();
    if (!court) return undefined;

    const watcher = watchFilm(court, {
      onEnd: () => cbRef.current.handleFinish(),
      onBlocked: () => {
        // The courtyard will not start. Rather than strand the guest behind a
        // still frame, ask once more and then let the story open regardless —
        // an audio/video failure must never block navigation.
        ensurePlaying(court).then((ok) => {
          if (!ok) cbRef.current.handleFinish();
        });
      },
    });

    return () => watcher.stop();
  }, [phase]);

  // Tidy up on unmount so no watcher survives the component.
  useEffect(
    () => () => {
      if (watcherRef.current) {
        watcherRef.current.stop();
        watcherRef.current = null;
      }
    },
    [],
  );

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
      // The visible gate layer just changed, so the completion watcher must
      // follow it. Without this, a visitor who flipped the theme mid-gate would
      // have a watcher on the now hidden film and would never advance.
      armGateWatcher();
    }
  }, [isNight, entered, phase, armGateWatcher]);

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
            Wedding Celebration
          </p>
          <h2 className="font-royal text-[11px] sm:text-sm tracking-[0.14em] uppercase text-[#fbf7ee] font-normal drop-shadow leading-tight">
            Sachit <span className="text-[#dfba5c]">&amp;</span> Simran
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

          <p className="font-cinzel text-[10px] sm:text-[12px] tracking-[0.26em] uppercase text-[#dfba5c] mb-3 font-medium leading-relaxed">
            Together We As A Family Invite You To
          </p>

          <h1 className="font-cinzel text-lg sm:text-3xl text-[#fdfaf2] font-semibold tracking-[0.12em] mb-2 leading-tight">
            SACHIT SRIVASTAVA
          </h1>

          <div className="font-script text-lg sm:text-2xl text-[#dfba5c] my-0.5">
            and
          </div>

          <h1 className="font-cinzel text-lg sm:text-3xl text-[#fdfaf2] font-semibold tracking-[0.12em] mb-2 leading-tight">
            SIMRAN SAXENA&rsquo;S
          </h1>

          <div className="flex items-center gap-3 w-full max-w-xs my-2">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#d4af37]/70 to-[#d4af37]" />
            <div className="w-2 h-2 rotate-45 border border-[#d4af37] bg-[#d4af37]/30" />
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#d4af37]/70 to-[#d4af37]" />
          </div>

          <p className="font-serif-body text-sm sm:text-lg text-[#ece5d8] italic max-w-md leading-relaxed my-2 mb-6">
            Auspicious Union
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

      {/* ---------- PLAYBACK FALLBACK (only when the browser refuses) ----------
          Autoplay is refused by iOS Low Power Mode and by hardened policies.
          Previously that refusal left the visitor on a frozen palace with no
          way to continue, which is the defect that was reported. This is the
          honest answer: a single, on-brand control that starts the film inside
          a real gesture — and, if the film still will not run, offers the way
          onward so the invitation is never a dead end. */}
      {needsTap && (
        <div className="absolute inset-0 z-[45] flex items-center justify-center p-6 bg-[#04070f]/55 backdrop-blur-[2px]">
          <div className="relative max-w-sm w-full p-7 sm:p-8 rounded-2xl bg-gradient-to-b from-[#101830]/96 via-[#0b1022]/96 to-[#050814]/98 border border-[#d4af37]/70 shadow-[0_30px_90px_rgba(0,0,0,0.9),inset_0_0_50px_rgba(212,175,55,0.12)] text-center flex flex-col items-center">
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#d4af37]/80" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#d4af37]/80" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#d4af37]/80" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#d4af37]/80" />

            <p className="font-cinzel text-[9px] sm:text-[10px] tracking-[0.3em] uppercase text-[#dfba5c] mb-3">
              One More Step
            </p>
            <p className="font-serif-body text-sm sm:text-base text-[#ece5d8] italic leading-relaxed mb-5">
              Your device paused the entrance film. Tap below to begin the
              royal welcome.
            </p>

            <button
              onClick={handleEnter}
              className="group relative inline-flex items-center gap-3 px-7 py-3 rounded-full bg-gradient-to-r from-[#ba8c22] via-[#e5c56c] to-[#ba8c22] text-[#060a15] font-cinzel font-bold text-[11px] tracking-[0.22em] uppercase shadow-[0_0_35px_rgba(212,175,55,0.5)] hover:shadow-[0_0_50px_rgba(212,175,55,0.7)] hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <RotateCw className="w-3.5 h-3.5 transition-transform group-hover:rotate-180 duration-500" />
              <span>Begin The Film</span>
            </button>

            {/* Escape hatch: the story must never be blocked by a video that
                will not decode. This is deliberately quieter than the control
                above — a fallback, not an invitation. */}
            <button
              onClick={handleFinish}
              className="mt-4 font-sans-clean text-[9px] tracking-[0.24em] uppercase text-[#b9b09c] hover:text-[#e8dcbb] transition-colors underline underline-offset-4 decoration-[#d4af37]/40"
            >
              Continue to the invitation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
