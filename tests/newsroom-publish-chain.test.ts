import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/sim/SimulationEngine';
import newsroomDemo from '../src/demos/newsroom-publish-chain/index';
import type { SimEvent } from '../src/sim/events';

async function makeEngine() {
  const engine = new SimulationEngine();
  for (const a of newsroomDemo.agents) await engine.addAgent(a.spec);
  return engine;
}

describe('newsroom-publish-chain demo', () => {
  it('honest mode: all three handoffs verify', async () => {
    const engine = await makeEngine();
    const scenario = newsroomDemo.createScenario(engine, { attackerMode: () => false });
    const results = await scenario.runOnce();
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.verified)).toBe(true);
    expect(results[2].payload.action).toBe('story.cleared');
    expect(results[2].payload.claims?.revision).toBe(7);
  });

  it('attacker mode: editor changes revision and publisher blocks it', async () => {
    const engine = await makeEngine();
    const scenario = newsroomDemo.createScenario(engine, { attackerMode: () => true });
    const results = await scenario.runOnce();
    expect(results[0].verified).toBe(true);
    expect(results[1].verified).toBe(true);
    expect(results[2].verified).toBe(false);
    expect(results[2].payload.claims?.revision).toBe(8);
    expect(results[2].blockedReason).toBe('revision-altered-after-clearance');
  });

  it('emits the expected event sequence', async () => {
    const engine = await makeEngine();
    const scenario = newsroomDemo.createScenario(engine, { attackerMode: () => false });
    const types: SimEvent['type'][] = [];
    engine.bus.onAny((e) => types.push(e.type));
    await scenario.runOnce();
    expect(types).toEqual([
      'interaction.started',
      'interaction.signed',
      'interaction.verified',
      'interaction.started',
      'interaction.signed',
      'interaction.verified',
      'interaction.started',
      'interaction.signed',
      'interaction.verified',
    ]);
  });
}, { timeout: 60_000 });