/**
 * Event bus for the simulation.
 *
 * Render and telemetry layers subscribe; the SimulationEngine emits.
 * Intentionally tiny — we don't need RxJS.
 */

import type { AgentSnapshot, InteractionResult } from './types';

export type SimEvent =
  | { type: 'agent.spawned'; agent: AgentSnapshot }
  | { type: 'interaction.started'; from: string; to: string; payload: unknown }
  | { type: 'interaction.signed'; result: InteractionResult }
  | { type: 'interaction.verified'; result: InteractionResult }
  | { type: 'interaction.blocked'; result: InteractionResult }
  | { type: 'sim.tick'; tick: number };

export type SimEventType = SimEvent['type'];

type Listener<E extends SimEvent = SimEvent> = (event: E) => void;

export class EventBus {
  private listeners = new Map<SimEventType | '*', Set<Listener>>();

  on<T extends SimEventType>(
    type: T,
    listener: Listener<Extract<SimEvent, { type: T }>>,
  ): () => void {
    return this.addListener(type, listener as Listener);
  }

  onAny(listener: Listener): () => void {
    return this.addListener('*', listener);
  }

  emit(event: SimEvent): void {
    const exact = this.listeners.get(event.type);
    exact?.forEach((l) => l(event));
    const wildcard = this.listeners.get('*');
    wildcard?.forEach((l) => l(event));
  }

  clear(): void {
    this.listeners.clear();
  }

  private addListener(key: SimEventType | '*', listener: Listener): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);
    return () => set!.delete(listener);
  }
}
