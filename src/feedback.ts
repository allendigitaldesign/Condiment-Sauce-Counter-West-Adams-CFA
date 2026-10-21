/**
 * The click you hear on a tap.
 *
 * Built in the browser rather than played from a file — nothing extra to
 * download over the store's wifi, and nothing for the service worker to get
 * wrong. Adapted from the Care Calendar's dings.
 *
 * Nothing can make a sound until the screen has been touched once since the
 * page loaded. That is a browser rule, not a setting, so the very first tap
 * after a reload is silent; `unlock()` runs on that first touch and every tap
 * after it is heard. iPads also cannot vibrate, so the tile's flash is always
 * the main signal and the sound only backs it up.
 */

const MUTE_KEY = 'cfa-counter:muted';

let context: AudioContext | null = null;
let muted = readMuted();

const listeners = new Set<() => void>();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

export const isMuted = (): boolean => muted;

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, String(value));
  } catch {
    // Remembered until the page reloads, which is good enough.
  }
  for (const listener of listeners) listener();
}

/** Lets the mute button re-render when the setting changes. */
export function onMuteChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Called on the first touch anywhere. Safe to call repeatedly. */
export function unlock(): void {
  const ctx = audio();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

function audio(): AudioContext | null {
  if (context) return context;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    return null;
  }
  return context;
}

function note(frequency: number, length: number, level: number, shape: OscillatorType): void {
  const ctx = audio();
  if (!ctx) return;

  const start = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  // A few milliseconds of attack rather than none: an instant start clicks.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);

  const osc = ctx.createOscillator();
  osc.type = shape;
  osc.frequency.value = frequency;
  osc.connect(gain);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

/** One counted. Short and light — it will be heard hundreds of times a day. */
export function counted(): void {
  if (muted) return;
  note(880, 0.07, 0.12, 'sine');
}

/** One taken back. Low and dull — an undo should not feel like a count. */
export function uncounted(): void {
  if (muted) return;
  note(220, 0.09, 0.09, 'triangle');
}
