import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot, retry } from './musicController';

/**
 * React bindings for the singleton soundtrack.
 *
 * These live in their own module (not next to the <AmbientMusic /> component)
 * for two reasons:
 *
 *   1. Fast refresh: a file that exports a component AND hooks/helpers cannot be
 *      hot-swapped safely, so oxlint's react(only-export-components) rule flags
 *      it. Keeping the component file to a single component export keeps the
 *      dev experience clean.
 *   2. Ownership: the audio state belongs to the controller, so the hooks that
 *      read it belong beside the controller rather than beside the UI that
 *      happens to render it.
 */

/** True state of the soundtrack, so the sound pill can never lie about it. */
export function useMusicState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Ask for playback again after a genuine refusal. Must run inside a gesture. */
export function retryMusic() {
  return retry();
}
