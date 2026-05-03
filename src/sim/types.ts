/**
 * Shared types for the Agent-DID in Action simulation.
 *
 * Kept independent from any rendering library so the engine
 * can be unit-tested in pure Node.
 */

export type AgentRole =
  | 'shopper'
  | 'store'
  | 'payment-bot'
  | 'impostor'
  // Roles introduced by additional demos. Adding a new role does not
  // require host changes — keep the union open to whatever the gallery
  // contributes.
  | 'factory'
  | 'courier'
  | 'receiver'
  | (string & {});

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

export type InteractionClaimValue = string | number | boolean;

export type InteractionClaims = Record<string, InteractionClaimValue>;

export interface InteractionPayload {
  from: string;
  to: string;
  action: string;
  claims?: InteractionClaims;
  nonce: string;
}

export interface InteractionResult {
  payload: InteractionPayload;
  signature: string;
  signerDid: string;
  verified: boolean;
  blockedReason?: string;
}
