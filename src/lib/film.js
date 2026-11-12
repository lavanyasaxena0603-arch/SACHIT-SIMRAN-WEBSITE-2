/**
 * RELIABLE FILM COMPLETION
 * ------------------------
 * `video.play()` resolving does NOT mean the film is running, and an `ended`
 * event is NOT a guarantee that a clip completed. Both are the reason an iPhone
 * visitor could be left standing at a frozen palace gate:
 *
 *   • on a cold, slow connection `play()` can resolve while the element is still
 *     buffering, then quietly return to a paused state a frame later;
 *   • iOS Safari can drop the tail of a clip (a decoder flush on a low-memory
 *     device, the tab losing focus for a moment) and never fire `ended` at all;
 *   • a clip that is seeked to its end, or restored from the bfcache, can sit at
 *     its last frame with no `ended` pending.
 *
 * So completion is decided by the FIRST of several independent signals, and one
 * of them is time-based, which cannot be missed:
 *
 *   1. `ended`
 *   2. `timeupdate` reaching the last `endEpsilon` seconds
 *   3. the playhead being at/past the end when the watcher is armed or re-checked
 *   4. a watchdog: the film is paused and has made no progress for a while
 *   5. a hard deadline derived from the real duration
 *
 * Every listener is attached BEFORE playback is requested by the caller, which
 * is what makes a fast clip safe: a 10s film started before the listener existed
 * can finish inside the gap.
 *
 * The same watcher also reports "it will not start", separately from "it
 * finished", because those need different UI: one advances the story, the other
 * must ask for a tap.
 */

const PROGRESS_GRACE_MS = 2600; // no playhead movement = it is not playing
const EXTRA_MS = 5000; // allowed past the end before we force the advance
const UNKNOWN_DURATION_MS = 30000; // hard ceiling when metadata never arrives
const TICK_MS = 250;

/**
 * @param {HTMLVideoElement} video
 * @param {object} opts
 * @param {() => void} opts.onEnd        film finished (advance the story)
 * @param {() => void} [opts.onBlocked]  film cannot start (ask for a tap)
 * @param {() => void} [opts.onProgress] called on each observed playhead step
 * @param {number} [opts.endEpsilon]     seconds before the true end to accept
 */
export function watchFilm(video, { onEnd, onBlocked, onProgress, endEpsilon = 0.18 } = {}) {
  if (!video) return { stop() {}, recheck() {} };

  let done = false;
  let startedAt = Date.now();
  let lastTime = video.currentTime || 0;
  let lastProgressAt = Date.now();
  let blockedReported = false;
  let playRequests = 0;
  // Has the film EVER advanced? This distinguishes "the browser refuses to start
  // this clip at all" (fatal, needs a tap) from "it played fine and a later
  // re-ask was aborted because another play was already in flight" (harmless).
  // Without it, a transient AbortError could skip the courtyard film entirely.
  let everPlayed = false;

  const duration = () => (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0);

  const finish = (why) => {
    if (done) return;
    done = true;
    cleanup();
    if (import.meta.env?.DEV) console.debug('[film] finished via', why);
    if (onEnd) onEnd();
  };

  const blocked = () => {
    if (done || blockedReported) return;
    blockedReported = true;
    if (onBlocked) onBlocked();
  };

  const atEnd = () => {
    const dur = duration();
    if (video.ended) return true;
    if (!dur) return false;
    return video.currentTime >= dur - endEpsilon;
  };

  /* ---- signals ---- */

  const onEnded = () => finish('ended');

  const onTimeUpdate = () => {
    if (atEnd()) {
      finish('timeupdate-at-end');
      return;
    }
    if (video.currentTime > lastTime + 0.01) {
      lastTime = video.currentTime;
      lastProgressAt = Date.now();
      everPlayed = true;
      if (onProgress) onProgress(video.currentTime);
    }
  };

  const onError = () => blocked();

  // `stalled`/`waiting` are informational only: both are normal mid-clip while
  // buffering and must not be treated as failure.
  const onPlaying = () => {
    startedAt = Date.now();
    lastProgressAt = Date.now();
    everPlayed = true;
    blockedReported = false;
  };

  const onVisibility = () => {
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
    // Returning from the background: the browser may have finished the clip, or
    // stopped it. Both are recoverable from here.
    if (atEnd()) finish('visible-at-end');
    else if (video.paused) {
      lastProgressAt = Date.now();
      requestPlay();
    }
  };

  /* ---- the ask ---- */

  function requestPlay() {
    if (done) return;
    playRequests += 1;
    const p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        // A refusal is only FATAL if this clip has never advanced. Once it has
        // played, a rejected re-ask is almost always an AbortError from
        // superseding an in-flight play(), and treating that as "blocked" would
        // skip a perfectly healthy film.
        if (everPlayed) return;
        if (Date.now() - startedAt > 1200 || playRequests > 2) blocked();
      });
    }
  }

  /* ---- watchdog ---- */

  const tick = () => {
    if (done) return;

    if (atEnd()) {
      finish('watchdog-at-end');
      return;
    }

    const dur = duration();
    const elapsed = Date.now() - startedAt;

    // A film that should have finished by now, but reports otherwise (iOS tail
    // drop). Trust the clock, not the element.
    if (dur && elapsed > dur * 1000 + EXTRA_MS) {
      finish('watchdog-deadline');
      return;
    }
    if (!dur && elapsed > UNKNOWN_DURATION_MS) {
      finish('watchdog-ceiling');
      return;
    }

    if (!video.paused) {
      // Playing: nudge state so a stalled decoder gets re-asked rather than
      // silently freezing on one frame.
      if (video.currentTime > lastTime + 0.01) {
        lastTime = video.currentTime;
        lastProgressAt = Date.now();
      } else if (Date.now() - lastProgressAt > PROGRESS_GRACE_MS) {
        lastProgressAt = Date.now();
        if (video.readyState >= 2) requestPlay();
      }
      return;
    }

    // Paused and not finished. Either it has not started (refused) or it was
    // interrupted. Re-ask; if that keeps failing, the visitor gets a tap.
    if (Date.now() - lastProgressAt > 900) {
      lastProgressAt = Date.now();
      if (video.readyState >= 1) requestPlay();
      else if (Date.now() - startedAt > 3500) blocked();
    }
  };

  /* ---- wiring ---- */

  video.addEventListener('ended', onEnded);
  video.addEventListener('timeupdate', onTimeUpdate);
  video.addEventListener('error', onError);
  video.addEventListener('playing', onPlaying);
  document.addEventListener('visibilitychange', onVisibility);

  const timer = setInterval(tick, TICK_MS);

  // A clip that is ALREADY at its end when we start watching (a re-entry after
  // the hand-off, or a bfcache restore) must not wait for an event that has
  // already fired.
  if (atEnd()) {
    finish('already-at-end');
  }

  function cleanup() {
    clearInterval(timer);
    video.removeEventListener('ended', onEnded);
    video.removeEventListener('timeupdate', onTimeUpdate);
    video.removeEventListener('error', onError);
    video.removeEventListener('playing', onPlaying);
    document.removeEventListener('visibilitychange', onVisibility);
  }

  return {
    stop: cleanup,
    recheck: () => {
      if (atEnd()) finish('recheck-at-end');
    },
  };
}
