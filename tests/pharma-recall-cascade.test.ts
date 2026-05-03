import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/sim/SimulationEngine';
import pharmaRecallDemo from '../src/demos/pharma-recall-cascade/index';
import type { SimEvent } from '../src/sim/events';

async function makeEngine() {
  const engine = new SimulationEngine();
  for (const a of pharmaRecallDemo.agents) await engine.addAgent(a.spec);
  return engine;
}

describe('pharma-recall-cascade demo', () => {
  it('honest mode: recall notice, regulator order, and relay all verify', async () => {
    const engine = await makeEngine();
    const scenario = pharmaRecallDemo.createScenario(engine, { attackerMode: () => false });
    const results = await scenario.runOnce();
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.verified)).toBe(true);
    expect(results[2].payload.action).toBe('recall.authorized');
    expect(results[2].payload.claims?.recallUnits).toBe(240);
  });

  it('attacker mode: wholesaler shrinks the scope and pharmacy blocks it', async () => {
    const engine = await makeEngine();
    const scenario = pharmaRecallDemo.createScenario(engine, { attackerMode: () => true });
    const results = await scenario.runOnce();
    expect(results[0].verified).toBe(true);
    expect(results[1].verified).toBe(true);
    expect(results[2].verified).toBe(false);
    expect(results[2].payload.claims?.recallUnits).toBe(24);
    expect(results[2].blockedReason).toBe('recall-scope-altered');
  });

  it('emits a blocked event in attacker mode', async () => {
    const engine = await makeEngine();
    const scenario = pharmaRecallDemo.createScenario(engine, { attackerMode: () => true });
    const types: SimEvent['type'][] = [];
    engine.bus.onAny((e) => types.push(e.type));
    await scenario.runOnce();
    expect(types).toContain('interaction.blocked');
  });
}, { timeout: 60_000 });