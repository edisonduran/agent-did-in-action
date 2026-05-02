import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/sim/SimulationEngine';
import { createShoppingMallScenario } from '../src/sim/scenarios/shoppingMall';
import type { AgentSpec } from '../src/sim/types';
import type { SimEvent } from '../src/sim/events';

const SPECS: AgentSpec[] = [
  {
    id: 'shopper',
    role: 'shopper',
    name: 'Shopper-001',
    description: 'test',
    systemPrompt: 'test',
    capabilities: ['cart.add'],
  },
  {
    id: 'store',
    role: 'store',
    name: 'Store-77',
    description: 'test',
    systemPrompt: 'test',
    capabilities: ['payment.charge'],
  },
  {
    id: 'payment',
    role: 'payment-bot',
    name: 'Payment-Bot',
    description: 'test',
    systemPrompt: 'test',
    capabilities: ['payment.verify'],
  },
];

async function makeEngine() {
  const engine = new SimulationEngine();
  for (const s of SPECS) await engine.addAgent(s);
  return engine;
}

describe('shoppingMall scenario', () => {
  it('honest mode: both interactions verify', async () => {
    const engine = await makeEngine();
    const scenario = createShoppingMallScenario(engine);
    const results = await scenario.runOnce();
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.verified)).toBe(true);
    expect(results[1].payload.action).toBe('charge');
  });

  it('attacker mode: charge is blocked, greet still verifies', async () => {
    const engine = await makeEngine();
    const scenario = createShoppingMallScenario(engine, { attackerMode: () => true });
    const results = await scenario.runOnce();
    expect(results[0].verified).toBe(true); // greet
    expect(results[1].verified).toBe(false); // charge tampered
    expect(results[1].blockedReason).toBe('tampered-signature');
  });

  it('emits the expected event sequence in honest mode', async () => {
    const engine = await makeEngine();
    const scenario = createShoppingMallScenario(engine);
    const types: SimEvent['type'][] = [];
    engine.bus.onAny((e) => types.push(e.type));
    await scenario.runOnce();
    // started -> signed -> verified, twice
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
    const scenario = createShoppingMallScenario(engine, { attackerMode: () => true });
    const types: SimEvent['type'][] = [];
    engine.bus.onAny((e) => types.push(e.type));
    await scenario.runOnce();
    expect(types).toContain('interaction.blocked');
  });

  it('throws if required agents are missing', async () => {
    const engine = new SimulationEngine();
    await engine.addAgent(SPECS[0]); // only shopper
    const scenario = createShoppingMallScenario(engine);
    await expect(scenario.runOnce()).rejects.toThrow(/requires shopper, store, payment/);
  });
}, { timeout: 60_000 });
