import React, { useState, useEffect } from 'react';
import EntranceJourney from './components/EntranceJourney';
import InvitationScroll from './components/InvitationScroll';
import GoldenThread from './components/GoldenThread';
import SectionHeader from './components/SectionHeader';
import GlobalControls from './components/GlobalControls';
import AmbientMusic from './components/AmbientMusic';

/**
 * TWO PHASES, ONE DOCUMENT
 *
 *   PHASE A — EntranceJourney (cinematic, visitor has no scrollbar)
 *             invitation card, palace gate film, courtyard film. All four videos
 *             live in one component, so nothing unmounts between gate and
 *             courtyard. Preserved exactly as approved.
 *
 *   PHASE B — InvitationScroll (the invitation proper)
 *             welcome, bride & groom, our story, countdown, engagement, wedding,
 *             closing — SEVEN REAL `<section>` ELEMENTS IN NORMAL DOCUMENT FLOW.
 *
 * WHY THIS IS A REWRITE OF THE PHASE-B ARCHITECTURE AND NOT A TWEAK
 * -----------------------------------------------------------------
 * The previous phase B was two tall tracks (ScrollStory 480vh,
 * CelebrationJourney 360vh), each holding ONE `sticky top-0 h-[100dvh]` stage
 * with every scene stacked inside it as `absolute inset-0`. A layer inside a
 * sticky stage is already pinned to the viewport, so it has nowhere to go: the
 * only transition it can perform is an opacity crossfade. Scene "arrival" was a
 * tween position, never a document position — which is exactly why the journey
 * felt like a slideshow and could not move physically no matter how the tweens
 * were tuned.
 *
 * Real sections in flow fix it at the source: the browser scrolls the document,
 * so the outgoing section physically leaves through the top and the incoming one
 * physically rises from below. Sections are flush siblings, so no gap, spacer or
 * black separator can open between them. Reversal is native — scroll up and the
 * browser plays the same movement backwards. GSAP is then free to do what it is
 * good at: small, independent, reversible per-element reveals.
 *
 * THE HAND-OFF (this is what kills the black moment)
 * --------------------------------------------------
 * When the courtyard film ends, the entrance does NOT unmount and does not
 * fade out. It freezes on its final frame, fully opaque, as a fixed layer.
 * Then the scroll stage — mounted in normal document flow so it owns the
 * scrollbar immediately — fades IN ON TOP of it, from 0 to 1.
 *
 * The scroll stage's bottom layer is that very same final frame, extracted from
 * the film at the same 1280x720. So while the dissolve runs, both layers are
 * showing the identical image: the screen never goes dark, and when the
 * entrance is finally removed a moment later the pixels have not changed.
 *
 * Fading the *incoming* layer up over the outgoing one (instead of fading the
 * outgoing one down) is the whole trick — a fade-to-zero of the only opaque
 * layer would expose the page background, which is the black gap the user saw.
 *
 * Day/Night and sound are rendered once, above everything, so there is a
 * single toggle for the whole journey.
 */

const FADE_MS = 900;

export default function App() {
  const [isNight, setIsNight] = useState(false);
  // The invitation's soundtrack is meant to be heard, so sound is ON by
  // default. Browsers still require a gesture before audible playback, so
  // <AmbientMusic /> waits for the first tap/click/keypress and starts then.
  const [isMuted, setIsMuted] = useState(false);

  // 'entrance' -> only the cinematic entrance (Phase A)
  // 'handoff'  -> entrance frozen underneath, invitation document fading in above it
  // 'story'    -> only the invitation document (Phase B)
  const [stage, setStage] = useState('entrance');
  const [revealed, setRevealed] = useState(false);

  const handleEntranceComplete = () => {
    window.scrollTo(0, 0);
    setStage('handoff');
  };

  useEffect(() => {
    if (stage !== 'handoff') return;
    // Commit one frame at opacity 0 so the browser can actually animate to 1.
    const raf = requestAnimationFrame(() => setRevealed(true));
    const id = setTimeout(() => setStage('story'), FADE_MS + 120);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(id);
    };
  }, [stage]);

  const toggleNight = () => setIsNight((v) => !v);
  const toggleMute = () => setIsMuted((v) => !v);

  return (
    <main className="w-full min-h-screen bg-[#040711] text-[#f7f2e7] selection:bg-[#d4af37]/30 selection:text-white">
      {/* The single soundtrack. Mounted once, above every scene, so it plays
          continuously across the whole invitation instead of restarting each
          time a scene mounts. Every <video> below it is muted. */}
      <AmbientMusic isMuted={isMuted} />

      <GlobalControls
        isNight={isNight}
        onToggleNight={toggleNight}
        isMuted={isMuted}
        onToggleMute={toggleMute}
      />

      {/* PHASE B — normal document flow, so it owns the scrollbar. Rendered
          ABOVE the frozen entrance while it dissolves in.

          The thread and header live OUTSIDE the fading wrapper so they do not
          fade with it: they are chrome for the whole invitation journey, and
          keeping them siblings of the fade avoids a second opacity channel
          fighting the ScrollTrigger writes inside.

          `InvitationScroll` is one continuous stack of flush `<section>`
          siblings. That is the entire mechanism of physical upward movement —
          there is deliberately no sticky stage, no pinned track and no tweened
          scene position left in phase B. */}
      {stage !== 'entrance' && (
        <>
          <GoldenThread trackId="invitation-scroll" />
          <SectionHeader />
          <div
            className={`relative z-[55] transition-opacity duration-[900ms] ease-linear ${
              revealed ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <InvitationScroll isNight={isNight} />
          </div>
        </>
      )}

      {/* Stays fully opaque on its last frame until the scroll stage has
          covered it completely, then unmounts. */}
      {stage !== 'story' && (
        <div
          className={`fixed inset-0 z-50 ${stage === 'handoff' ? 'pointer-events-none' : ''}`}
        >
          <EntranceJourney isNight={isNight} onComplete={handleEntranceComplete} />
        </div>
      )}
    </main>
  );
}
