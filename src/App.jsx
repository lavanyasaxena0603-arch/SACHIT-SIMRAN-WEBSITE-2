import React, { useState, useEffect } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import EntranceJourney from './components/EntranceJourney';
import InvitationScroll from './components/InvitationScroll';
import GoldenThread from './components/GoldenThread';
import SectionHeader from './components/SectionHeader';
import GlobalControls from './components/GlobalControls';
import AmbientMusic from './components/AmbientMusic';
import CinematicLayer from './components/CinematicLayer';
import FinaleSection from './components/FinaleSection';
import useOrientation from './lib/useOrientation';

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

  // ---- Orientation --------------------------------------------------------
  // THERE IS NO ROTATION EXPERIENCE ANY MORE.
  //
  // This used to drive an `OrientationGate` (a full-screen "rotate your phone"
  // overlay during the entrance) and a `RotateHint` pill during the story, both
  // of which were removed at the client's request: mobile guests must be able to
  // view the whole invitation in normal PORTRAIT, with no forced landscape, no
  // `screen.orientation.lock()`, no rotate overlay and no blank/frozen frame
  // when the device turns.
  //
  // What survives is `useOrientation`, kept for ONE purpose: `isLandscape` is a
  // dependency of the ScrollTrigger refresh below. Rotating still changes the
  // viewport height and therefore every trigger's start/end, so they get
  // re-measured on the next frame. That is a layout concern, not a prompt.
  const { isLandscape } = useOrientation();

  const handleEntranceComplete = () => {
    window.scrollTo(0, 0);
    setStage('handoff');
  };

  const handleResetToEntrance = () => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setRevealed(false);
    setStage('entrance');
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

  // A rotation changes the viewport height, which changes every ScrollTrigger
  // start/end. Refreshing on the next frame re-measures them so the golden
  // thread and every reveal stay locked to the real scroll position instead of
  // to the pre-rotation geometry. Nothing is re-mounted and no scroll position
  // is reset, so playback and progress are preserved.
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(frame);
  }, [isLandscape]);

  const toggleNight = () => setIsNight((v) => !v);
  const toggleMute = () => setIsMuted((v) => !v);

  return (
    <main className="w-full min-h-screen bg-[#040711] text-[#f7f2e7] selection:bg-[#d4af37]/30 selection:text-white">
      {/* The single soundtrack. Mounted once, above every scene, so it plays
          continuously across the whole invitation instead of restarting each
          time a scene mounts. Every <video> below it is muted. */}
      <AmbientMusic isMuted={isMuted} />

      {/* THE AAA CINEMATIC ENHANCEMENT LAYER — additive only.
          Sits above the content as a decorative overlay: gold dust, a slow
          environmental light and a corner vignette, plus a screen-space press
          glow. It renders no text and owns no layout, so it cannot shift,
          restyle or re-animate anything that was already approved. Delete this
          one line (and the component + css) to return to the previous state. */}
      <CinematicLayer isNight={isNight} />

      <GlobalControls
        isNight={isNight}
        onToggleNight={toggleNight}
        isMuted={isMuted}
        onToggleMute={toggleMute}
      />

      {/* PHASE B — normal document flow, so it owns the scrollbar. Rendered
          ABOVE the frozen entrance while it dissolves in.

          THE HEADER MUST LIVE INSIDE THE FADE. Both the entrance header and
          this one are pixel-identical (same offset, monogram width, type sizes
          and wording) so the header reads as persisting across the boundary.
          But the entrance is still mounted and fully opaque during the
          hand-off, so a header rendered OUTSIDE this wrapper sits at opacity 1
          on top of an identical opaque header — two solid copies of the same
          glyphs, which anti-aliasing renders as visibly doubled text.

          Inside the wrapper the incoming copy ramps 0 -> 1 over the outgoing
          one. Compositing a colour over the SAME colour at any alpha returns
          that colour, so every intermediate frame is identical to the first and
          the hand-off is invisible: no flicker, no duplicate, no jump, no
          disappearance and no overlap.

          The thread stays outside: at scroll 0 it is already fully retracted
          (dash offset complete, pendant at opacity 0), so it cannot paint over
          the entrance even for one frame. */}
      {stage !== 'entrance' && (
        <>
          <GoldenThread trackId="invitation-scroll" />
          <div
            className={`relative z-[55] transition-opacity duration-[900ms] ease-linear ${
              revealed ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <SectionHeader />
            <InvitationScroll isNight={isNight} />

            {/* THE FINALE — the last chapter, in the same normal document flow.
                It is deliberately NOT inside InvitationScroll, which is left
                exactly as approved. It is a flush sibling of <InvitationScroll />,
                so it scrolls up from below with no gap and no black frame, and
                the palace background it opens on never unmounts.

                The RSVP letter that used to sit between these two is gone: the
                guest register needed a Node server, a SQLite file and its own
                hosting, so the invitation is now a static frontend and the last
                section hands straight to the finale.

                ALWAYS MOUNTED. This used to be `{isNight && <FinaleSection />}`,
                which meant the finale only existed for a visitor who happened to
                toggle Night — anyone who left the site on Day (the default)
                reached the end of the document and found nothing there. That is
                the bug behind "the final celebration video is not playing".

                "Night only" is a statement about the ARTWORK, not about a
                condition: the finale is painted as a night palace with the
                varmala film, and it stays that way regardless of the Day/Night
                toggle above it. There is no Day variant and no toggle here. */}
            <FinaleSection onExit={handleResetToEntrance} />
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
