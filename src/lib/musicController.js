/**
 * THE ONE SOUNDTRACK — module-level singleton, not a React component.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The soundtrack used to live *inside* a component's effect. That is fine while
 * the component happens to stay mounted, but it makes the audio's life depend on
 * React's rendering decisions, and it gives the page no single owner it can ask
 * "are we actually playing?" after a tab switch, a bfcache restore, or a
 * rejected `play()`.
 *
 * This module owns exactly ONE <audio> element for the lifetime of the page.
 * React only ever *views* it. Consequences:
 *
 *   - the element is created once and never unmounted, so navigating between
 *     scenes, toggling Day/Night, or re-rendering <App /> cannot restart it;
 *   - two mounts (or a StrictMode double-invoke) share the same element, so a
 *     duplicate soundtrack is structurally impossible;
 *   - the playhead survives every mute/unmute — mute is a gain change, not a stop;
 *   - one place handles the platform reality: autoplay refusal, Android Chrome
 *     pausing audio in the background, iOS suspending the element, bfcache.
 *
 * THE TWO REPORTED DEFECTS, AND WHY THEY HAPPENED
 * -----------------------------------------------
 * 1. "Android music only starts after toggling the sound control again."
 *    The old code set a `started` flag on the first successful play and then
 *    permanently ignored every later gesture. Muting only set `el.muted`, and
 *    unmuting only cleared it. If Android Chrome had *paused* the element (which
 *    it does when the tab loses focus, when another app takes audio focus, or
 *    after a system interruption), clearing `muted` restores the gain but not the
 *    playhead — the element stays paused, so the tap appears to do nothing. The
 *    second tap then "works" because by then something else had nudged it.
 *    Fix: unmute always re-asserts playback (`play()` if paused), inside the tap.
 *
 * 2. "Music continues while the site looks stuck / music does not come back."
 *    Nothing listened for `visibilitychange`, `pageshow` or `focus`. Whatever the
 *    browser did to the element while hidden stayed done. Fix: the module
 *    remembers whether it was playing before the tab went away and resumes from
 *    the same playhead on return — never from zero.
 *
 * iOS NOTE ON VOLUME
 * ------------------
 * iOS Safari treats `HTMLMediaElement.volume` as read-only. Assigning to it is
 * silently ignored. So the fade is *probed* once: if the value does not stick we
 * skip fading entirely and leave the element at the device's level, rather than
 * leaving it at 0 (silence) forever — which is what a naive fade would do.
 */

const TRACK = '/assets/audio/wedding-theme.mp3';

// Deliberately below full scale: this sits under reading, on loop, for a whole
// invitation. Loud enough to be felt, quiet enough to ignore.
const TARGET_VOLUME = 0.45;
const FADE_IN_MS = 1600;
const FADE_STEP_MS = 40;
const START_CONFIRM_MS = 900;

/* ------------------------------------------------------------------ state */

let el = null;
let fadeTimer = 0;
let fadedIn = false;

let started = false; // playback has genuinely begun at least once
let needsGesture = false; // a play() was refused and we have no sound yet
let muted = false; // the visitor's choice
let volumeWritable = null; // null = not probed yet (iOS reports false)
let wasPlayingBeforeHide = false;
let bound = false;

const subscribers = new Set();
let snapshot = { started: false, needsGesture: false, muted: false, paused: true };

function emit(extra) {
  const next = {
    started,
    needsGesture,
    muted,
    paused: extra ? extra.paused : !el || el.paused,
  };
  if (
    next.started === snapshot.started &&
    next.needsGesture === snapshot.needsGesture &&
    next.muted === snapshot.muted &&
    next.paused === snapshot.paused
  ) {
    return;
  }
  snapshot = next;
  for (const fn of subscribers) {
    try {
      fn();
    } catch {
      /* a bad subscriber must never break playback */
    }
  }
}

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function getSnapshot() {
  return snapshot;
}

/* ------------------------------------------------------------- the element */

function getElement() {
  if (el || typeof window === 'undefined') return el;

  el = document.createElement('audio');
  el.src = TRACK;
  el.loop = true;
  el.preload = 'auto';
  el.autoplay = false;
  // Same attributes the JSX element used to carry. `playsinline` keeps iOS from
  // promoting playback to its own full-screen player.
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', '');
  el.muted = muted;
  el.volume = 0;

  // A track that errors must be visible as "no sound", not as a silent failure
  // that leaves the pill showing a state the audio is not in.
  el.addEventListener('error', () => {
    needsGesture = true;
    started = false;
    emit();
  });
  el.addEventListener('playing', () => {
    started = true;
    needsGesture = false;
    if (!fadedIn) startFade();
    emit();
  });
  el.addEventListener('pause', () => emit({ paused: true }));
  el.addEventListener('play', () => emit({ paused: false }));

  // Attached to the document, not left as an orphan. Two reasons:
  //   • iOS is historically inconsistent with media elements that are not in the
  //     document tree — play() can resolve but never advance.
  //   • It makes the single-instance guarantee OBSERVABLE: `document`
  //     .querySelectorAll('audio') must return exactly one node, so a duplicate
  //     soundtrack becomes a testable fact rather than an assumption.
  // An <audio> element paints nothing, so no layout consequence.
  el.setAttribute('aria-hidden', 'true');
  el.dataset.royalSoundtrack = 'singleton';
  if (document.body) document.body.appendChild(el);

  return el;
}

/* ---------------------------------------------------------------- volume */

function probeVolumeWritable(audio) {
  if (volumeWritable !== null) return volumeWritable;
  const before = audio.volume;
  try {
    audio.volume = 0.123;
    volumeWritable = Math.abs(audio.volume - 0.123) < 0.01;
  } catch {
    volumeWritable = false;
  }
  if (!volumeWritable) audio.volume = before;
  return volumeWritable;
}

function startFade() {
  const audio = getElement();
  if (!audio) return;

  // iOS: volume is read-only. Do not leave the element at 0 waiting for a fade
  // that will never happen — that is silence, which reads as "music is broken".
  if (!probeVolumeWritable(audio)) {
    fadedIn = true;
    return;
  }

  fadedIn = true;
  clearInterval(fadeTimer);

  const increment = TARGET_VOLUME / (FADE_IN_MS / FADE_STEP_MS);
  fadeTimer = setInterval(() => {
    const next = Math.min(TARGET_VOLUME, audio.volume + increment);
    audio.volume = next;
    if (next >= TARGET_VOLUME) {
      clearInterval(fadeTimer);
      fadeTimer = 0;
    }
  }, FADE_STEP_MS);
}

/* ------------------------------------------------------------ playback */

/**
 * Confirm that a resolved `play()` promise means the media is really moving.
 * Safari can resolve `play()` and then leave the element paused a frame later,
 * which is the difference between "we called play" and "there is music".
 */
function confirmAdvancing(audio) {
  return new Promise((resolve) => {
    if (!audio.paused && audio.currentTime > 0) return resolve(true);

    const startedAt = audio.currentTime;
    const deadline = Date.now() + START_CONFIRM_MS;
    let done = false;

    const finish = (ok) => {
      if (done) return;
      done = true;
      clearInterval(timer);
      resolve(ok);
    };

    const timer = setInterval(() => {
      if (audio.paused) return finish(false);
      if (audio.currentTime > startedAt || audio.readyState >= 3) return finish(true);
      if (Date.now() > deadline) return finish(!audio.paused);
    }, 100);
  });
}

/**
 * Ask for playback. Every entry point funnels through here so the "are we
 * really playing?" bookkeeping stays in one place.
 */
export async function attemptPlay() {
  const audio = getElement();
  if (!audio) return false;

  bindGlobalHandlers();

  try {
    await audio.play();
  } catch {
    // Autoplay refusal, iOS Low Power Mode, or audio focus held elsewhere.
    needsGesture = true;
    emit();
    return false;
  }

  if (!(await confirmAdvancing(audio))) {
    // Resolved but not advancing: one more ask, then admit it needs a tap.
    try {
      await audio.play();
    } catch {
      /* fall through to the state check below */
    }
    if (audio.paused) {
      needsGesture = true;
      emit();
      return false;
    }
  }

  started = true;
  needsGesture = false;
  emit({ paused: false });
  if (!fadedIn) startFade();
  return true;
}

/* ------------------------------------------------------------- public API */

/** The visitor's mute choice. Un-muting resumes the SAME playhead. */
export function setMuted(next) {
  muted = !!next;
  const audio = getElement();
  if (!audio) {
    emit();
    return;
  }

  audio.muted = muted;

  if (muted) {
    // Mute is a gain change only: the playhead keeps running underneath, so
    // un-muting drops back into the music exactly where it had got to.
    emit();
    return;
  }

  // Un-muting. If the browser suspended the element while we were muted (the
  // Android defect), `muted = false` alone produces no sound. Re-assert
  // playback. This call runs inside the visitor's tap, so it is permitted.
  if (audio.paused) {
    attemptPlay();
  } else {
    started = true;
    needsGesture = false;
    emit({ paused: false });
  }
}

/**
 * Called from any user gesture. This is the initial unlock on iOS: the
 * "Enter The Palace" tap, or any earlier tap/click/keypress.
 */
export function unlock() {
  const audio = getElement();
  if (!audio) return;
  bindGlobalHandlers();
  if (audio.paused) attemptPlay();
}

export function isMuted() {
  return muted;
}

/** Best-effort: a retry affordance was shown and the visitor tapped it, or any
 *  gesture arrived while we still had no sound. */
export function retry() {
  const audio = getElement();
  if (!audio) return Promise.resolve(false);
  if (audio.paused) return attemptPlay();
  return Promise.resolve(true);
}

export function isPlaying() {
  return !!el && !el.paused;
}

/* ------------------------------------------------- background / foreground */

function onVisibilityChange() {
  if (typeof document === 'undefined') return;
  const audio = getElement();

  if (document.visibilityState === 'hidden') {
    // Remember intent. We do NOT pause by hand — the browser decides what to do
    // while hidden, and fighting it produces the "restarts from the beginning"
    // behaviour.
    wasPlayingBeforeHide = !!audio && !audio.paused;
    return;
  }

  // Back in the foreground.
  if (audio && audio.paused && !muted && (wasPlayingBeforeHide || started)) {
    attemptPlay();
  }
  wasPlayingBeforeHide = false;
  emit();
}

function onPageShow(e) {
  // `persisted` means the page came back from the bfcache — it was frozen, and
  // any media it had is stopped. Resume without resetting the playhead.
  if (e && e.persisted && !muted) {
    const audio = getElement();
    if (audio && audio.paused) attemptPlay();
  }
}

function onPageHide() {
  wasPlayingBeforeHide = !!el && !el.paused;
}

function onFocus() {
  const audio = el;
  if (audio && audio.paused && !muted && started) attemptPlay();
}

function onBlur() {
  // Record only; do not pause. Pausing on blur would cut the music every time
  // the visitor taps the address bar.
  wasPlayingBeforeHide = !!el && !el.paused;
}

/* ------------------------------------------------------------- gestures */

function onFirstGesture() {
  // Nothing to do while we are already playing; but keep the listener so a
  // later refusal (e.g. after an interruption) can still be recovered.
  if (el && !el.paused) return;
  if (muted) return; // the visitor chose silence — do not start behind their back
  attemptPlay();
}

function bindGlobalHandlers() {
  if (bound || typeof window === 'undefined') return;
  bound = true;

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('focus', onFocus);
  window.addEventListener('blur', onBlur);

  // iOS will only start audible media inside a gesture. Listen for the first
  // one anywhere on the page; `once` is deliberately NOT used, because a
  // refused attempt does not consume a gesture and a later one may succeed.
  window.addEventListener('pointerdown', onFirstGesture, { passive: true });
  window.addEventListener('touchstart', onFirstGesture, { passive: true });
  window.addEventListener('keydown', onFirstGesture);
}

/**
 * Mount-time entry point. Creates the single element and makes one polite
 * attempt (which will legitimately fail before any gesture — that failure is
 * expected and is not surfaced to the visitor).
 */
export function initMusic({ muted: initialMuted = false } = {}) {
  muted = !!initialMuted;
  const audio = getElement();
  if (!audio) return;
  audio.muted = muted;
  bindGlobalHandlers();
  emit();
  if (!muted) attemptPlay();
}
