import React, { useState, useEffect } from 'react';
import EntranceJourney from './components/EntranceJourney';
import ScrollStory from './components/ScrollStory';
import GlobalControls from './components/GlobalControls';

/**
 * TWO MOMENTS, ONE JOURNEY
 *
 *   1  EntranceJourney — invitation card, palace gate film, courtyard film.
 *                         All four videos live in one component, so nothing
 *                         unmounts between the gate and the courtyard.
 *
 *   2  ScrollStory     — the welcome, the couple and our story as THREE ACTS of
 *                         one scrolling stage. No "next screen", no button: the
 *                         visitor just keeps scrolling and one scene dissolves
 *                         into the next, the way a portfolio page reads.
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
  const [isMuted, setIsMuted] = useState(true);

  // 'entrance' -> only the entrance
  // 'handoff'  -> entrance frozen underneath, scroll stage fading in above it
  // 'story'    -> only the scroll stage
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
      <GlobalControls
        isNight={isNight}
        onToggleNight={toggleNight}
        isMuted={isMuted}
        onToggleMute={toggleMute}
      />

      {/* Normal document flow (it must own the scrollbar), but stacked ABOVE
          the frozen entrance while it dissolves in. */}
      {stage !== 'entrance' && (
        <div
          className={`relative z-[55] transition-opacity duration-[900ms] ease-linear ${
            revealed ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <ScrollStory isNight={isNight} />
        </div>
      )}

      {/* Stays fully opaque on its last frame until the scroll stage has
          covered it completely, then unmounts. */}
      {stage !== 'story' && (
        <div
          className={`fixed inset-0 z-50 ${stage === 'handoff' ? 'pointer-events-none' : ''}`}
        >
          <EntranceJourney
            isNight={isNight}
            isMuted={isMuted}
            onComplete={handleEntranceComplete}
          />
        </div>
      )}
    </main>
  );
}
