import { describe, it, expect } from 'vitest';
import { AgentRuntime, canonicalize } from '../src/sim/AgentRuntime';
import type { AgentSpec, InteractionPayload } from '../src/sim/types';

const STORE_SPEC: AgentSpec = {
  id: 'store-77',
  role: 'store',
  name: 'Store-Clothing-77',
  description: 'A clothing store agent in the Plaza',
  systemPrompt: 'You sell clothes and process payments',
  capabilities: ['inventory.read', 'price.quote', 'payment.charge'],
};

const SHOPPER_SPEC: AgentSpec = {
  id: 'shopper-1',
  role: 'shopper',
  name: 'Shopper-001',
  description: 'A shopping agent acting on behalf of a human',
  systemPrompt: 'You shop on behalf of your human principal',
  capabilities: ['cart.add', 'payment.authorize'],
};

describe('canonicalize', () => {
  it('produces stable output regardless of key order', () => {
    const a = canonicalize({ b: 2, a: 1, c: { y: 2, x: 1 } });
    const b = canonicalize({ a: 1, c: { x: 1, y: 2 }, b: 2 });
    expect(a).toBe(b);
  });
});

describe('AgentRuntime', () => {
  it('creates a real DID and snapshot', async () => {
    const agent = await AgentRuntime.create(STORE_SPEC);
    expect(agent.did).toMatch(/^did:agent:polygon:0x[0-9a-f]{64}$/);
    expect(agent.snapshot()).toMatchObject({
      id: 'store-77',
      role: 'store',
      name: 'Store-Clothing-77',
      did: agent.did,
    });
  });

  it('signs and verifies a real interaction', async () => {
    const store = await AgentRuntime.create(STORE_SPEC);
    const payload: InteractionPayload = {
      from: store.did,
      to: 'did:agent:payment-bot',
      action: 'charge',
      amount: 42,
      nonce: 'test-nonce-1',
    };
    const signed = await store.sign(payload);
    expect(signed.signature).toMatch(/^[0-9a-f]+$/);
    const ok = await AgentRuntime.verify(signed);
    expect(ok).toBe(true);
  });

  it('rejects a tampered signature (impostor blocked)', async () => {
    const store = await AgentRuntime.create(STORE_SPEC);
    const payload: InteractionPayload = {
      from: store.did,
      to: 'did:agent:payment-bot',
      action: 'charge',
      amount: 100,
      nonce: 'test-nonce-2',
    };
    const signed = await store.sign(payload);
    // Flip the first hex byte so we always mutate the signature, regardless
    // of its original value.
    const firstByte = parseInt(signed.signature.slice(0, 2), 16);
    const flipped = ((firstByte ^ 0xff) & 0xff).toString(16).padStart(2, '0');
    const tampered = flipped + signed.signature.slice(2);
    const ok = await AgentRuntime.verifyClaim(
      signed.signerDid,
      payload,
      tampered,
    );
    expect(ok).toBe(false);
  });

  it("rejects a payload signed by someone else's DID claim", async () => {
    const store = await AgentRuntime.create(STORE_SPEC);
    const shopper = await AgentRuntime.create(SHOPPER_SPEC);
    const payload: InteractionPayload = {
      from: shopper.did,
      to: 'did:agent:payment-bot',
      action: 'charge',
      amount: 999,
      nonce: 'test-nonce-3',
    };
    // Shopper actually signs it
    const signed = await shopper.sign(payload);
    // Attacker presents it claiming to be the store
    const ok = await AgentRuntime.verifyClaim(
      store.did,
      payload,
      signed.signature,
    );
    expect(ok).toBe(false);
  });
}, { timeout: 30_000 });
