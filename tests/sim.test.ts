import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/sim/SimulationEngine';
import type { AgentSpec } from '../src/sim/types';
import type { SimEvent } from '../src/sim/events';

const SPEC: AgentSpec = {
  id: 'shopper-1',
  role: 'shopper',
  name: 'Shopper-001',
  description: 'test',
  systemPrompt: 'test',
  capabilities: ['cart.add'],
};

describe('SimulationEngine', () => {
  it('registers an agent and emits agent.spawned', async () => {
    const engine = new SimulationEngine();
    const events: SimEvent[] = [];
    engine.bus.onAny((e) => events.push(e));

    const agent = await engine.addAgent(SPEC);

    expect(engine.getAgent('shopper-1')).toBe(agent);
    expect(engine.listAgents()).toHaveLength(1);
    expect(events).toContainEqual({
      type: 'agent.spawned',
      agent: agent.snapshot(),
    });
  });

  it('rejects duplicate agent ids', async () => {
    const engine = new SimulationEngine();
    await engine.addAgent(SPEC);
    await expect(engine.addAgent(SPEC)).rejects.toThrow(/already exists/);
  });

  it('advanceTicks emits sim.tick events synchronously', () => {
    const engine = new SimulationEngine();
    const ticks: number[] = [];
    engine.bus.on('sim.tick', (e) => ticks.push(e.tick));

    engine.advanceTicks(3);

    expect(ticks).toEqual([1, 2, 3]);
    expect(engine.tick).toBe(3);
  });

  it('reset clears agents, listeners, and tick counter', async () => {
    const engine = new SimulationEngine();
    await engine.addAgent(SPEC);
    engine.advanceTicks(5);
    engine.reset();
    expect(engine.listAgents()).toHaveLength(0);
    expect(engine.tick).toBe(0);
  });

  it('typed listener only receives the requested event type', async () => {
    const engine = new SimulationEngine();
    const spawnEvents: unknown[] = [];
    engine.bus.on('agent.spawned', (e) => spawnEvents.push(e));
    await engine.addAgent(SPEC);
    engine.advanceTicks(2);
    expect(spawnEvents).toHaveLength(1);
  });
}, { timeout: 30_000 });
