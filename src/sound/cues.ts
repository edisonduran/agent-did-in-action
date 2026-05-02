/**
 * Tiny WebAudio sound design for the Plaza demo.
 *
 * Goals:
 *   - Zero dependencies, no asset files. Tones are synthesized on demand.
 *   - Fully muted by default (`isMuted()` returns true unless the user
 *     explicitly toggled). Persisted in localStorage so the choice
 *     survives reloads.
 *   - All operations are best-effort: a failing AudioContext (Safari
 *     autoplay policies, no user gesture, etc.) never throws.
 *
 * Sound vocabulary:
 *   - sign:    short cyan blip (sine, ~520Hz, 80ms)
 *   - verify:  ascending two-note (sine, 660 -> 880Hz)
 *   - block:   harsh sawtooth thud (180Hz drop, 250ms)
 */

const STORAGE_KEY = 'plaza:muted';

let ctx: AudioContext | null = null;
let muted = true;
let initialized = false;

function readPersisted(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true; // default muted
    return raw === '1';
  } catch {
    return true;
  }
}

function writePersisted(value: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // ignore (private mode, etc.)
  }
}

export function initSound(): void {
  if (initialized) return;
  initialized = true;
  muted = readPersisted();
}

export function isMuted(): boolean {
  if (!initialized) initSound();
  return muted;
}

export function setMuted(next: boolean): void {
  if (!initialized) initSound();
  muted = next;
  writePersisted(next);
}

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctor =
      (typeof window !== 'undefined' &&
        ((window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext)) ||
      null;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneSpec {
  freq: number;
  durMs: number;
  type?: OscillatorType;
  gain?: number;
  /** Linear ramp to this frequency over the tone's lifetime. */
  glideTo?: number;
  /** Delay before the tone starts (ms). */
  delayMs?: number;
}

function playTone(spec: ToneSpec): void {
  const audio = ensureCtx();
  if (!audio) return;
  try {
    const start = audio.currentTime + (spec.delayMs ?? 0) / 1000;
    const dur = spec.durMs / 1000;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = spec.type ?? 'sine';
    osc.frequency.setValueAtTime(spec.freq, start);
    if (spec.glideTo) {
      osc.frequency.linearRampToValueAtTime(spec.glideTo, start + dur);
    }
    const peak = spec.gain ?? 0.08;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  } catch {
    // Best effort.
  }
}

export type SoundCue = 'sign' | 'verify' | 'block';

export function playCue(cue: SoundCue): void {
  if (!initialized) initSound();
  if (muted) return;
  switch (cue) {
    case 'sign':
      playTone({ freq: 520, durMs: 90, type: 'sine', gain: 0.06 });
      break;
    case 'verify':
      playTone({ freq: 660, durMs: 90, type: 'sine', gain: 0.06 });
      playTone({ freq: 880, durMs: 130, type: 'sine', gain: 0.06, delayMs: 90 });
      break;
    case 'block':
      playTone({ freq: 220, durMs: 250, type: 'sawtooth', gain: 0.09, glideTo: 90 });
      break;
  }
}

/** Test-only reset. */
export function __resetSoundForTests(): void {
  ctx = null;
  muted = true;
  initialized = false;
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
