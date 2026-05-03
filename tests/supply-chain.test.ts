import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/sim/SimulationEngine';
import supplyChainDemo from '../src/demos/supply-chain/index';
import type { SimEvent } from '../src/sim/events';

async function makeEngine() {
  const engine = new SimulationEngine();
  for (const a of supplyChainDemo.agents) await engine.addAgent(a.spec);
  return engine;
}

describe('supply-chain demo', () => {
  it('honest mode: factory issues a manifest the receiver accepts', async () => {
    const engine = await makeEngine();
    const scenario = supplyChainDemo.createScenario(engine, { attackerMode: () => false });
    const results = await scenario.runOnce();
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.verified)).toBe(true);
    expect(results[0].payload.action).toBe('ship.manifest');
    expect(results[1].payload.claims?.pallets).toBe(12);
  });

  it('attacker mode: courier rewrites pallet count, receiver rejects with manifest-altered', async () => {
    const engine = await makeEngine();
    const scenario = supplyChainDemo.createScenario(engine, { attackerMode: () => true });
    const results = await scenario.runOnce();
    expect(results[0].verified).toBe(true); // factory's own signature still valid
    expect(results[1].verified).toBe(false);
    expect(results[1].blockedReason).toBe('manifest-altered');
    expect(results[1].payload.claims?.pallets).toBe(99);
  });

  it('emits a blocked event in attacker mode', async () => {
    const engine = await makeEngine();
    const scenario = supplyChainDemo.createScenario(engine, { attackerMode: () => true });
    const types: SimEvent['type'][] = [];
    engine.bus.onAny((e) => types.push(e.type));
    await scenario.runOnce();
    expect(types).toContain('interaction.blocked');
  });
}, { timeout: 60_000 });
