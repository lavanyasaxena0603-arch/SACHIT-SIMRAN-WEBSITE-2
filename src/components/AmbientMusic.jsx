import { useEffect } from 'react';
import { initMusic, setMuted, unlock } from '../lib/musicController';

/**
 * THE ONE SOUNDTRACK — React binding for src/lib/musicController.js
 *
 * This component deliberately owns NO audio element. The <audio> is a
 * module-level singleton in the controller, created once for the lifetime of the
 * page. That is what makes the guarantees on this site structural rather than
 * hopeful:
 *
 *   - navigating between scenes cannot restart the music, because nothing about
 *     the music lives in a component's effect;
 *   - mounting this twice (React StrictMode, or a future duplicate) cannot
 *     create two soundtracks — both refs would point at the same element;
 *   - the playhead survives mute/unmute, Day/Night, and the entrance hand-off.
 *
 * RESPONSIBILITIES HERE, AND ONLY HERE:
 *   1. mount / unmount -> init the singleton
 *   2. the isMuted prop -> the visitor's choice
 *   3. the first user gesture -> iOS unlock
 *   4. expose real playback state so the pill cannot lie about being muted
 *
 * `startedRef` used to live here and permanently stopped all retries after the
 * first success. That is exactly why Android needed a second tap on the sound
 * control. Recovery now lives in the controller, which always re-asserts
 * playback after an interruption.
 */

/** Real controller state, so the sound pill reflects the true audio state. */

export default function AmbientMusic({ isMuted }) {
  // 1. Create (or attach to) the single element. A failed first attempt before
  //    any gesture is expected and is not surfaced anywhere.
  useEffect(() => {
    initMusic({ muted: isMuted });
    // Intentionally not depending on isMuted: initialisation happens once, and
    // the mute effect below owns the value from then on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. The visitor's choice. Un-muting resumes the same playhead, and re-asserts
  //    playback if the browser suspended the element (the Android defect).
  useEffect(() => {
    setMuted(isMuted);
  }, [isMuted]);

  // 3. iOS unlock. The "Enter The Palace" button is the gesture that matters,
  //    but any earlier tap/click/keypress works too, and the controller keeps
  //    listening so a later refusal can still be recovered. Listening here as
  //    well makes the unlock immediate on the very same gesture rather than one
  //    task later, which is the difference between iOS allowing it and not.
  useEffect(() => {
    const onGesture = () => unlock();
    window.addEventListener('pointerdown', onGesture, { passive: true, capture: true });
    window.addEventListener('touchstart', onGesture, { passive: true, capture: true });
    window.addEventListener('keydown', onGesture, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', onGesture, { capture: true });
      window.removeEventListener('touchstart', onGesture, { capture: true });
      window.removeEventListener('keydown', onGesture, { capture: true });
    };
  }, []);

  /*
    ONE SOURCE OF SOUND — ENFORCED.

    Every <video> in this project is decorative footage, so none of them may emit
    audio. Each already carries `muted`, but scenes mount and unmount as the
    visitor moves between them, and a clip can be created, seeked or played by
    code long after this component mounted. So the rule is enforced at runtime:

      - mute everything that exists now
      - observe the document for videos added later, and mute those too

    `muted` is a live property, so this never touches a playhead — it only
    removes a video's audio track from the mix.
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

  // No JSX: the audio element belongs to the controller, not to React's tree.
  return null;
}
