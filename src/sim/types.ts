/**
 * Shared types for the Agent-DID Plaza simulation.
 *
 * Kept independent from any rendering library so the engine
 * can be unit-tested in pure Node.
 */

export type AgentRole = 'shopper' | 'store' | 'payment-bot' | 'impostor';

export interface AgentSpec {
  /** Stable id used inside the simulation (not the DID). */
  id: string;
  role: AgentRole;
  name: string;
  description: string;
  systemPrompt: string;
  capabilities: string[];
}

export interface AgentSnapshot {
  id: string;
  role: AgentRole;
  name: string;
  did: string;
}

export interface InteractionPayload {
  from: string;
  to: string;
  action: string;
  amount?: number;
  nonce: string;
}

export interface InteractionResult {
  payload: InteractionPayload;
  signature: string;
  signerDid: string;
  verified: boolean;
  blockedReason?: string;
}
