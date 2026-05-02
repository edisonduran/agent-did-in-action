import { describe, it, expect } from 'vitest';
import { DEMO_REGISTRY, findDemo } from '../src/demos/_registry';

describe('demo registry', () => {
  it('exposes at least one demo with a unique kebab-case id', () => {
    expect(DEMO_REGISTRY.length).toBeGreaterThan(0);
    const ids = DEMO_REGISTRY.map((d) => d.manifest.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('every manifest declares spec_version "1"', () => {
    for (const { manifest } of DEMO_REGISTRY) {
      expect(manifest.spec_version).toBe('1');
    }
  });

  it('findDemo returns undefined for unknown ids and the entry for known ones', () => {
    expect(findDemo(null)).toBeUndefined();
    expect(findDemo('does-not-exist')).toBeUndefined();
    expect(findDemo('shopping-mall')?.manifest.id).toBe('shopping-mall');
  });

  it('every demo can be lazy-loaded and exports a default DemoModule', async () => {
    for (const entry of DEMO_REGISTRY) {
      const mod = await entry.load();
      expect(mod.manifest.id).toBe(entry.manifest.id);
      expect(typeof mod.createScenario).toBe('function');
      expect(Array.isArray(mod.agents)).toBe(true);
      expect(mod.agents.length).toBeGreaterThan(0);
    }
  });
});
