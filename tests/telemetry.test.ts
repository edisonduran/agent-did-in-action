import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  bootstrapTelemetry,
  track,
  trackFirstInteraction,
  __resetTelemetryForTests,
} from '../src/telemetry/plausible';

beforeEach(() => {
  __resetTelemetryForTests();
  vi.restoreAllMocks();
});

describe('telemetry: dev mode (no Plausible domain set)', () => {
  it('routes events to console.debug instead of network', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    bootstrapTelemetry({ devMode: true });
    track('demo.loaded');
    track('cta.maintainer.clicked', { source: 'blocked-modal' });
    expect(spy).toHaveBeenCalledWith('[telemetry:dev]', 'demo.loaded', {});
    expect(spy).toHaveBeenCalledWith(
      '[telemetry:dev]',
      'cta.maintainer.clicked',
      { source: 'blocked-modal' },
    );
  });

  it('never throws even if console.debug throws', () => {
    vi.spyOn(console, 'debug').mockImplementation(() => {
      throw new Error('boom');
    });
    bootstrapTelemetry({ devMode: true });
    expect(() => track('demo.loaded')).not.toThrow();
  });
});

describe('telemetry: production mode (domain configured)', () => {
  it('forwards to window.plausible when present', () => {
    const calls: Array<[string, unknown]> = [];
    (globalThis as unknown as { window: Window }).window = {
      ...(globalThis as unknown as { window?: Window }).window,
      plausible: ((event: string, opts?: unknown) => {
        calls.push([event, opts]);
      }) as Window['plausible'],
    } as Window;
    bootstrapTelemetry({ domain: 'plaza.test', devMode: false });
    track('cta.sdk.clicked', { surface: 'header' });
    expect(calls).toEqual([
      ['cta.sdk.clicked', { props: { surface: 'header' } }],
    ]);
  });

  it('drops events silently if window.plausible is missing', () => {
    (globalThis as unknown as { window: Window }).window = {} as Window;
    bootstrapTelemetry({ domain: 'plaza.test', devMode: false });
    expect(() => track('demo.loaded')).not.toThrow();
  });
});

describe('trackFirstInteraction', () => {
  it('only fires demo.interaction.first once per session', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    bootstrapTelemetry({ devMode: true });
    trackFirstInteraction();
    trackFirstInteraction();
    trackFirstInteraction();
    const interactionCalls = spy.mock.calls.filter(
      (c) => c[1] === 'demo.interaction.first',
    );
    expect(interactionCalls).toHaveLength(1);
  });
});
