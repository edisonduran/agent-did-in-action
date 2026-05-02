/**
 * SimulationEngine — orchestrates a deterministic, tick-based world
 * of AgentRuntime instances. Emits events; the renderer reacts.
 *
 * Day 1 deliverable: skeleton with event bus + tick loop + agent
 * registry. Scenarios are added in Day 3.
 */

import { AgentRuntime } from './AgentRuntime';
import { EventBus } from './events';
import type { AgentSpec } from './types';

export interface EngineOptions {
  /** Logical ms between ticks. Default 250ms = 4 ticks/sec. */
  tickMs?: number;
}

export class SimulationEngine {
  readonly bus = new EventBus();
  private readonly agents = new Map<string, AgentRuntime>();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private currentTick = 0;
  private readonly tickMs: number;

  constructor(opts: EngineOptions = {}) {
    this.tickMs = opts.tickMs ?? 250;
  }

  async addAgent(spec: AgentSpec): Promise<AgentRuntime> {
    if (this.agents.has(spec.id)) {
      throw new Error(`Agent id "${spec.id}" already exists`);
    }
    const agent = await AgentRuntime.create(spec);
    this.agents.set(spec.id, agent);
    this.bus.emit({ type: 'agent.spawned', agent: agent.snapshot() });
    return agent;
  }

  getAgent(id: string): AgentRuntime | undefined {
    return this.agents.get(id);
  }

  listAgents(): AgentRuntime[] {
    return Array.from(this.agents.values());
  }

  start(): void {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => {
      this.currentTick += 1;
      this.bus.emit({ type: 'sim.tick', tick: this.currentTick });
    }, this.tickMs);
  }

  stop(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  /** Advance N ticks synchronously (test helper). */
  advanceTicks(n: number): void {
    for (let i = 0; i < n; i += 1) {
      this.currentTick += 1;
      this.bus.emit({ type: 'sim.tick', tick: this.currentTick });
    }
  }

  get tick(): number {
    return this.currentTick;
  }

  reset(): void {
    this.stop();
    this.agents.clear();
    this.bus.clear();
    this.currentTick = 0;
  }
}
