import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initSound,
  isMuted,
  setMuted,
  playCue,
  __resetSoundForTests,
} from '../src/sound/cues';

class FakeStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
  key(_i: number) { return null; }
  get length() { return this.map.size; }
}

beforeEach(() => {
  __resetSoundForTests();
  (globalThis as unknown as { localStorage: Storage }).localStorage =
    new FakeStorage() as unknown as Storage;
});

describe('sound cues', () => {
  it('defaults to muted on first run', () => {
    initSound();
    expect(isMuted()).toBe(true);
  });

  it('persists mute state to localStorage', () => {
    initSound();
    setMuted(false);
    expect(isMuted()).toBe(false);
    expect(localStorage.getItem('plaza:muted')).toBe('0');

    // Simulate a fresh page load
    __resetSoundForTests();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      ...localStorage,
      getItem: (k: string) => (k === 'plaza:muted' ? '0' : null),
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage;
    initSound();
    expect(isMuted()).toBe(false);
  });

  it('playCue is a no-op when muted (no AudioContext required)', () => {
    initSound();
    expect(isMuted()).toBe(true);
    expect(() => {
      playCue('sign');
      playCue('verify');
      playCue('block');
    }).not.toThrow();
  });

  it('playCue never throws even if AudioContext is missing', () => {
    initSound();
    setMuted(false);
    // No window.AudioContext in node — should swallow.
    expect(() => playCue('sign')).not.toThrow();
    expect(() => playCue('verify')).not.toThrow();
    expect(() => playCue('block')).not.toThrow();
  });

  it('playCue tries to create oscillators when unmuted and AudioContext is present', () => {
    initSound();
    setMuted(false);
    const oscStarts = vi.fn();
    const fakeCtx = {
      currentTime: 0,
      destination: {},
      createOscillator: () => ({
        type: 'sine',
        frequency: {
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
        },
        connect: function () { return this; },
        start: oscStarts,
        stop: () => {},
      }),
      createGain: () => ({
        gain: {
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: function () { return this; },
      }),
    };
    (globalThis as unknown as { window: Window }).window = {
      AudioContext: function () { return fakeCtx; },
    } as unknown as Window;
    playCue('verify');
    // Verify cue plays two oscillators
    expect(oscStarts).toHaveBeenCalledTimes(2);
  });
});
