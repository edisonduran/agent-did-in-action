/**
 * AgentRuntime — thin wrapper around `@agentdid/sdk` so the rest of
 * the simulation can speak in domain terms ("shopper signs payload",
 * "store verifies handoff") without leaking SDK internals.
 *
 * One AgentRuntime instance == one independent agent in the world,
 * with its own real Ed25519 keypair and did:webvh DID document.
 *
 * All agents of a browser session share one in-memory AgentDidClient:
 * it holds their did:webvh logs and resolves their DIDs, with no network.
 */

const world = new AgentDidClient();

import { AgentDidClient, AgentIdentity, LocalKeySigner, canonicalizeJson } from '@agentdid/sdk';
import type { AgentSnapshot, AgentSpec, InteractionPayload } from './types';

export interface SignedInteraction {
  payload: InteractionPayload;
  /** RFC 8785 canonical JSON of payload, what was actually signed. */
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
    // The controller (the human or organisation behind the agent) holds its own Ed25519 key
    const [controllerSigner] = LocalKeySigner.generate();
    const identity = new AgentIdentity({ controllerSigner, client: world });
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
    return world.verifySignature(
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
    return world.verifySignature(claimedDid, message, signature);
  }
}

/**
 * RFC 8785 (JCS) canonical JSON, from the SDK, so signer and verifier agree on bytes.
 */
export function canonicalize(value: unknown): string {
  return canonicalizeJson(value);
}
