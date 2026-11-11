import React, { useState, useEffect } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import EntranceJourney from './components/EntranceJourney';
import InvitationScroll from './components/InvitationScroll';
import GoldenThread from './components/GoldenThread';
import SectionHeader from './components/SectionHeader';
import GlobalControls from './components/GlobalControls';
import AmbientMusic from './components/AmbientMusic';
import RsvpSection from './components/RsvpSection';
import OrientationGate from './components/OrientationGate';
import RotateHint from './components/RotateHint';
import useOrientation from './lib/useOrientation';
import useOrientationContinuity from './lib/useOrientationContinuity';

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
  // TWO different treatments, because the two halves of the journey have
  // different stakes:
  //
  //   `OrientationGate` — a full-screen invitation to rotate. Only ever during
  //   the ENTRANCE, before the visitor has read anything, so nothing is
  //   interrupted. Always dismissible: Part 1A is explicit that nobody may be
  //   trapped, and the final creative direction's "compulsory lock" is not
  //   something a web page can actually do — `screen.orientation.lock()`
  //   requires fullscreen AND a gesture, and iOS Safari does not implement it.
  //   What we can do is attempt it from the visitor's first tap, which is what
  //   the gate does; on Android that really does rotate the screen.
  //
  //   `RotateHint` — a non-modal pill. Once Phase B is open the visitor is
  //   mid-story, so re-blocking them would be a regression, not a suggestion.
  //   It appears at most until the phone has been horizontal once, then retires
  //   for the session.
  const { isLandscape, isMobile, everLandscape } = useOrientation();
  const [gateDismissed, setGateDismissed] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);

  // Having been held sideways once, the visitor has seen the full composition;
  // neither treatment is "needed" again. `everLandscape` is computed inside the
  // orientation hook's own state update, so this is a plain derivation with no
  // second render and no effect chained to a viewport event.
  const rotateSettled = everLandscape;

  const showGate =
    isMobile && !isLandscape && !gateDismissed && !rotateSettled && stage === 'entrance';

  const showHint =
    isMobile && !isLandscape && !hintDismissed && !rotateSettled && stage !== 'entrance';

  // Rotate across a real geometry change; keep the chapter that was being read
  // under the top of the screen. Enabled only once Phase B exists to anchor to.
  useOrientationContinuity(stage !== 'entrance');

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

            {/* THE RSVP sits AFTER the seven invitation sections, in the same
                normal document flow — not inside InvitationScroll, which is
                left completely untouched. It is a sibling, so it scrolls in
                from below like every other chapter and the document stays one
                continuous sheet. */}
            <RsvpSection />
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

      {/* Above everything, including the entrance, because the very first thing
          a portrait phone sees is the invitation card — and that card is the
          one composition worst served by portrait cropping. Dismissible, so it
          can never trap anyone. Entrance only: once the story is open the
          re-suggestion is the non-modal pill below instead. */}
      <OrientationGate visible={showGate} onDismiss={() => setGateDismissed(true)} />

      {/* Non-blocking, scrolls with the page, retires itself. */}
      <RotateHint visible={showHint} onDismiss={() => setHintDismissed(true)} />
    </main>
  );
}
