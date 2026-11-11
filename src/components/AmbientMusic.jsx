import { useRef, useEffect } from 'react';

/**
 * THE ONE SOUNDTRACK
 *
 * One looping track for the whole invitation. It is mounted exactly once, by
 * <App />, above every scene — so it never restarts when the visitor moves from
 * the entrance to the story to the celebrations. The scenes themselves stay
 * silent: every <video> on the page is forced muted, so nothing competes with
 * this.
 *
 * AUTOPLAY
 * --------
 * Browsers refuse to start audible audio without a user gesture, and they are
 * right to. So we try on mount, and if that is refused we simply wait for the
 * visitor's first interaction anywhere — the "Enter The Palace" button counts,
 * and so does a tap, a click or a key press. Whichever happens first starts it.
 * No prompt, no error, no console noise.
 *
 * MUTING
 * ------
 * The global pill does not pause the track, it mutes it (`el.muted`), so
 * unmuting drops the visitor back into the music exactly where it had got to,
 * instead of restarting it from the top. Same principle as the Day/Night film
 * swap: one playhead, never reset.
 */

const TRACK = '/assets/audio/wedding-theme.mp3';

// Deliberately below full scale: this sits under reading, on loop, for a whole
// invitation. Loud enough to be felt, quiet enough to ignore.
const TARGET_VOLUME = 0.45;
const FADE_IN_MS = 1600;

export default function AmbientMusic({ isMuted }) {
  const audioRef = useRef(null);
  const fadeRef = useRef(null);
  const startedRef = useRef(false);

  // Start playback (once) and fade it in from silence.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;

    el.volume = 0;

    const fadeIn = () => {
      if (fadeRef.current) return;
      const step = 40;
      const increment = TARGET_VOLUME / (FADE_IN_MS / step);
      fadeRef.current = setInterval(() => {
        const next = Math.min(TARGET_VOLUME, el.volume + increment);
        el.volume = next;
        if (next >= TARGET_VOLUME) {
          clearInterval(fadeRef.current);
          fadeRef.current = null;
        }
      }, step);
    };

    const attempt = () => {
      const p = el.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          startedRef.current = true;
          fadeIn();
        }).catch(() => {
          /* refused — the gesture listener below will try again */
        });
      }
    };

    attempt();

    const onGesture = () => {
      if (startedRef.current) return;
      attempt();
    };

    // `once` is not used: a refused attempt does not consume the gesture, and
    // several may fire before one succeeds.
    window.addEventListener('pointerdown', onGesture, { passive: true });
    window.addEventListener('keydown', onGesture);
    window.addEventListener('touchstart', onGesture, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener('touchstart', onGesture);
      if (fadeRef.current) clearInterval(fadeRef.current);
    };
  }, []);

  // The pill mutes, it does not stop.
  useEffect(() => {
    const el = audioRef.current;
    if (el) el.muted = isMuted;
  }, [isMuted]);

  /*
    ONE SOURCE OF SOUND — ENFORCED.

    Every <video> in this project is decorative footage, so none of them may
    ever emit audio. Each one already carries `muted`, but scenes mount and
    unmount as the visitor moves between the entrance, the story and the
    celebrations, and a clip can be created, seeked or played by code long
    after this component mounted. So the rule is enforced at runtime too:

      - mute everything that exists now
      - observe the document for videos added later, and mute those as well

    `muted` is a live property, so this cannot fight playback: it only removes
    a video's audio track from the mix, never touches its playhead.
  */
  useEffect(() => {
    const silence = (el) => {
      if (el.tagName === 'VIDEO') el.muted = true;
    };

    document.querySelectorAll('video').forEach(silence);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          silence(node);
          if (node.querySelectorAll) node.querySelectorAll('video').forEach(silence);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <audio
      ref={audioRef}
      src={TRACK}
      loop
      preload="auto"
      playsInline
      // Hidden by definition; the page has no transport controls of its own.
      aria-hidden="true"
    />
  );
}
