import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/sim/SimulationEngine';
import shoppingMallDemo from '../src/demos/shopping-mall/index';
import type { SimEvent } from '../src/sim/events';

async function makeEngine() {
  const engine = new SimulationEngine();
  for (const a of shoppingMallDemo.agents) await engine.addAgent(a.spec);
  return engine;
}

describe('shopping-mall demo', () => {
  it('honest mode: both interactions verify', async () => {
    const engine = await makeEngine();
    const scenario = shoppingMallDemo.createScenario(engine, { attackerMode: () => false });
    const results = await scenario.runOnce();
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.verified)).toBe(true);
    expect(results[1].payload.action).toBe('charge');
  });

  it('attacker mode: charge is blocked, greet still verifies', async () => {
    const engine = await makeEngine();
    const scenario = shoppingMallDemo.createScenario(engine, { attackerMode: () => true });
    const results = await scenario.runOnce();
    expect(results[0].verified).toBe(true);
    expect(results[1].verified).toBe(false);
    expect(results[1].blockedReason).toBe('tampered-signature');
  });

  it('emits the expected event sequence in honest mode', async () => {
    const engine = await makeEngine();
    const scenario = shoppingMallDemo.createScenario(engine, { attackerMode: () => false });
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
    ]);
  });

  it('emits interaction.blocked in attacker mode', async () => {
    const engine = await makeEngine();
    const scenario = shoppingMallDemo.createScenario(engine, { attackerMode: () => true });
    const types: SimEvent['type'][] = [];
    engine.bus.onAny((e) => types.push(e.type));
    await scenario.runOnce();
    expect(types).toContain('interaction.blocked');
  });

  it('throws if required agents are missing', async () => {
    const engine = new SimulationEngine();
    await engine.addAgent(shoppingMallDemo.agents[0].spec); // only shopper
    const scenario = shoppingMallDemo.createScenario(engine, { attackerMode: () => false });
    await expect(scenario.runOnce()).rejects.toThrow(/shopper, store, payment/);
  });
}, { timeout: 60_000 });
