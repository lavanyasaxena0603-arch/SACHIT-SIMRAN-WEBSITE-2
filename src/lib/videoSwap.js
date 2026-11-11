/**
 * Shared helpers for the Day/Night video hand-off.
 *
 * Why this exists
 * ---------------
 * The old toggle did `target.currentTime = ts` and then called `play()` on the
 * very next line. On a video that has not been played yet the seek is
 * asynchronous: `play()` can start from 0 while the seek is still in flight,
 * which is why the footage visibly "jumped ~1 second back" on every mode
 * change. It also paused the outgoing video first, so for a moment nothing was
 * decoding and the crossfade showed a stalled/black frame.
 *
 * The correct order is:
 *   1. seek the incoming video,
 *   2. wait until that seek has actually landed,
 *   3. start playing it,
 *   4. only then pause the outgoing one.
 * Step 4 comes last so the outgoing layer keeps its final frame behind the
 * crossfade and there is never a gap.
 */

/** Wait for a pending seek to land (or give up after `timeout` ms). */
export function seekTo(video, time, timeout = 900) {
  return new Promise((resolve) => {
    if (!video) return resolve(false);

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    // Clamp so we never seek past the end, which would fire `ended`.
    const target = Math.max(0, duration ? Math.min(time, duration - 0.06) : time);

    if (Math.abs(video.currentTime - target) < 0.04 && video.readyState >= 2) {
      return resolve(true);
    }

    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', onSeeked);
      resolve(ok);
    };
    const onSeeked = () => finish(true);

    video.addEventListener('seeked', onSeeked);
    try {
      video.currentTime = target;
    } catch {
      finish(false);
    }
    setTimeout(() => finish(false), timeout);
  });
}

/** play() that swallows the abort error that fires when a play is superseded. */
export async function playSafely(video) {
  if (!video) return false;
  try {
    await video.play();
    return true;
  } catch (err) {
    if (err && err.name !== 'AbortError') {
      console.warn('Playback error caught:', err);
    }
    return false;
  }
}

/**
 * Start a film on arrival, and KEEP trying until it is actually running.
 *
 * WHY THIS REPLACES A BARE `playSafely()`
 * --------------------------------------
 * A single `play()` call is not enough. On first arrival the element has often
 * only fetched metadata, so `play()` rejects with `NotSupportedError` (the
 * decoder has no frame yet) or aborts because the browser is still opening the
 * byte range. The old code treated that first rejection as "autoplay is
 * blocked", raised the needs-a-tap state, and the visitor was shown a play
 * button on a film that would have started perfectly well a few hundred
 * milliseconds later.
 *
 * Instead: ask again whenever the element reports it has data, up to `attempts`
 * times. Only after every attempt has failed do we admit it needs a gesture —
 * and by then it genuinely does (iOS Low Power Mode, a hardened autoplay
 * policy, or a dead file).
 *
 * The retries are cheap: they are driven by `canplay`/`loadeddata`, never by a
 * polling timer, so nothing spins while the film is healthy.
 */
export async function ensurePlaying(video, { attempts = 4 } = {}) {
  if (!video) return false;

  for (let i = 0; i < attempts; i += 1) {
    if (!video.paused && !video.ended) return true;

    const ok = await playSafely(video);
    if (ok) return true;

    // `ended` is not a failure: the film finished, nothing to start.
    if (video.ended) return true;

    // Wait for the decoder to produce a frame before asking again.
    await new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        video.removeEventListener('canplay', done);
        video.removeEventListener('loadeddata', done);
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(done, 700);
      video.addEventListener('canplay', done, { once: true });
      video.addEventListener('loadeddata', done, { once: true });
    });
  }

  return !video.paused && !video.ended;
}

/**
 * Swap the visible Day/Night video while preserving the exact playhead.
 * Returns the timestamp that was carried across, so callers can verify sync.
 */
export async function swapThemeVideo({ fromVideo, toVideo, muted = true }) {
  if (!fromVideo || !toVideo) return null;

  const wasPlaying = !fromVideo.paused && !fromVideo.ended && !fromVideo.seeking;
  const rate = fromVideo.playbackRate || 1;

  // 1: FREEZE the outgoing playhead before anything else.
  //
  // This ordering matters more than it looks. If the outgoing video keeps
  // playing while we seek the incoming one, it advances during the seek and
  // the incoming layer then starts *behind* where the outgoing one got to —
  // which is what produced the visible "jumps back a second" on mode change.
  // A paused <video> keeps painting its current frame, so freezing it is
  // invisible underneath the crossfade.
  fromVideo.pause();

  const stamp = fromVideo.currentTime;

  // 2: land the seek on the exact frozen timestamp.
  await seekTo(toVideo, stamp);
  toVideo.playbackRate = rate;
  toVideo.muted = muted;

  // 3: start the incoming layer from that same frame.
  if (wasPlaying) {
    await playSafely(toVideo);
  } else {
    toVideo.pause();
  }

  // 4: retire the outgoing layer's audio last.
  fromVideo.muted = true;

  return stamp;
}
