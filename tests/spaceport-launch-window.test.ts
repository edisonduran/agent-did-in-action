import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/sim/SimulationEngine';
import launchWindowDemo from '../src/demos/spaceport-launch-window/index';
import type { SimEvent } from '../src/sim/events';

async function makeEngine() {
  const engine = new SimulationEngine();
  for (const a of launchWindowDemo.agents) await engine.addAgent(a.spec);
  return engine;
}

describe('spaceport-launch-window demo', () => {
  it('honest mode: all launch-window handoffs verify', async () => {
    const engine = await makeEngine();
    const scenario = launchWindowDemo.createScenario(engine, { attackerMode: () => false });
    const results = await scenario.runOnce();
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.verified)).toBe(true);
    expect(results[2].payload.action).toBe('launch.cleared');
  });

  it('attacker mode: channel flips the final signature and launch gate blocks it', async () => {
    const engine = await makeEngine();
    const scenario = launchWindowDemo.createScenario(engine, { attackerMode: () => true });
    const results = await scenario.runOnce();
    expect(results[0].verified).toBe(true);
    expect(results[1].verified).toBe(true);
    expect(results[2].verified).toBe(false);
    expect(results[2].blockedReason).toBe('tampered-launch-clearance');
  });

  it('emits a blocked event in attacker mode', async () => {
    const engine = await makeEngine();
    const scenario = launchWindowDemo.createScenario(engine, { attackerMode: () => true });
    const types: SimEvent['type'][] = [];
    engine.bus.onAny((e) => types.push(e.type));
    await scenario.runOnce();
    expect(types).toContain('interaction.blocked');
  });
}, { timeout: 60_000 });