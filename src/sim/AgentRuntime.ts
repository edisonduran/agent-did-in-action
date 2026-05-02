/**
 * AgentRuntime — thin wrapper around `@agentdid/sdk` so the rest of
 * the simulation can speak in domain terms ("shopper signs payload",
 * "store verifies handoff") without leaking SDK internals.
 *
 * One AgentRuntime instance == one independent agent in the world,
 * with its own real Ed25519 keypair and DID document.
 */

import { ethers } from 'ethers';
import { AgentIdentity } from '@agentdid/sdk';
import type { AgentSnapshot, AgentSpec, InteractionPayload } from './types';

export interface SignedInteraction {
  payload: InteractionPayload;
  /** Hex-encoded canonical JSON of payload, what was actually signed. */
  message: string;
  signature: string;
  signerDid: string;
}

export class AgentRuntime {
  readonly spec: AgentSpec;
  readonly did: string;
  private readonly identity: AgentIdentity;
  private readonly agentPrivateKey: string;

  private constructor(args: {
    spec: AgentSpec;
    identity: AgentIdentity;
    did: string;
    agentPrivateKey: string;
  }) {
    this.spec = args.spec;
    this.identity = args.identity;
    this.did = args.did;
    this.agentPrivateKey = args.agentPrivateKey;
  }

  static async create(spec: AgentSpec): Promise<AgentRuntime> {
    const wallet = ethers.Wallet.createRandom();
    const identity = new AgentIdentity({ signer: wallet, network: 'polygon' });
    const { document, agentPrivateKey } = await identity.create({
      name: spec.name,
      description: spec.description,
      coreModel: 'simulation',
      systemPrompt: spec.systemPrompt,
      capabilities: spec.capabilities,
    });
    return new AgentRuntime({
      spec,
      identity,
      did: document.id,
      agentPrivateKey,
    });
  }

  snapshot(): AgentSnapshot {
    return {
      id: this.spec.id,
      role: this.spec.role,
      name: this.spec.name,
      did: this.did,
    };
  }

  async sign(payload: InteractionPayload): Promise<SignedInteraction> {
    const message = canonicalize(payload);
    const signature = await this.identity.signMessage(
      message,
      this.agentPrivateKey,
    );
    return { payload, message, signature, signerDid: this.did };
  }

  static async verify(signed: SignedInteraction): Promise<boolean> {
    return AgentIdentity.verifySignature(
      signed.signerDid,
      signed.message,
      signed.signature,
    );
  }

  /**
   * Verify a payload that may have been forged or tampered with.
   * Returns false on cryptographic mismatch (impostor blocked).
   */
  static async verifyClaim(
    claimedDid: string,
    payload: InteractionPayload,
    signature: string,
  ): Promise<boolean> {
    const message = canonicalize(payload);
    return AgentIdentity.verifySignature(claimedDid, message, signature);
  }
}

/**
 * Deterministic JSON serialization so signer and verifier agree on bytes.
 * Sorts keys alphabetically; refuses to serialize undefined values.
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v === undefined) return null;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.keys(v)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = (v as Record<string, unknown>)[k];
          return acc;
        }, {});
    }
    return v;
  });
}
