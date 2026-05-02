/**
 * Shopping Mall scenario — the canonical "Agent-DID Plaza" demo loop.
 *
 * Story:
 *   1. Shopper greets the Store (signed payload).
 *   2. Store verifies the greeting via the SDK              -> ✅
 *   3. Store hands a charge off to Payment-Bot, signed.
 *   4. Payment-Bot verifies the handoff                     -> ✅ (or ❌ if attacker mode)
 *
 * Every interaction goes through real @agentdid/sdk signatures
 * (no mocks). The engine emits events the renderer reacts to.
 */

import { AgentRuntime } from '../AgentRuntime';
import type { SimulationEngine } from '../SimulationEngine';
import type { GridPoint } from '../../scene/isometric';
import type { InteractionPayload, InteractionResult } from '../types';

export interface ScenarioAgentLayout {
  id: string;
  home: GridPoint;
}

export interface MallScenario {
  layout: ScenarioAgentLayout[];
  runOnce(): Promise<InteractionResult[]>;
}

const HOME: Record<string, GridPoint> = {
  shopper: { gx: 1, gy: 1 },
  store: { gx: 5, gy: 2 },
  payment: { gx: 3, gy: 5 },
};

export interface MallOpts {
  /** When true, the payment handoff signature is corrupted in flight. */
  attackerMode?: () => boolean;
}

export function createShoppingMallScenario(
  engine: SimulationEngine,
  opts: MallOpts = {},
): MallScenario {
  async function runOnce(): Promise<InteractionResult[]> {
    const shopper = engine.getAgent('shopper');
    const store = engine.getAgent('store');
    const payment = engine.getAgent('payment');
    if (!shopper || !store || !payment) {
      throw new Error('Mall scenario requires shopper, store, payment agents');
    }

    const results: InteractionResult[] = [];

    // ---- Step A: shopper greets store ----
    const greeting: InteractionPayload = {
      from: shopper.did,
      to: store.did,
      action: 'greet',
      nonce: nonce(),
    };
    engine.bus.emit({
      type: 'interaction.started',
      from: shopper.spec.id,
      to: store.spec.id,
      payload: greeting,
    });
    const greetSigned = await shopper.sign(greeting);
    const greetResult: InteractionResult = {
      payload: greetSigned.payload,
      signature: greetSigned.signature,
      signerDid: greetSigned.signerDid,
      verified: false,
    };
    engine.bus.emit({ type: 'interaction.signed', result: greetResult });
    greetResult.verified = await AgentRuntime.verify(greetSigned);
    engine.bus.emit({
      type: greetResult.verified ? 'interaction.verified' : 'interaction.blocked',
      result: greetResult,
    });
    results.push(greetResult);

    // ---- Step B: store hands charge to payment ----
    const charge: InteractionPayload = {
      from: store.did,
      to: payment.did,
      action: 'charge',
      amount: 42,
      nonce: nonce(),
    };
    engine.bus.emit({
      type: 'interaction.started',
      from: store.spec.id,
      to: payment.spec.id,
      payload: charge,
    });
    const chargeSigned = await store.sign(charge);
    const tampered = opts.attackerMode?.() ?? false;
    const transmittedSig = tampered
      ? flipFirstByte(chargeSigned.signature)
      : chargeSigned.signature;

    const chargeResult: InteractionResult = {
      payload: chargeSigned.payload,
      signature: transmittedSig,
      signerDid: chargeSigned.signerDid,
      verified: false,
    };
    engine.bus.emit({ type: 'interaction.signed', result: chargeResult });

    chargeResult.verified = await AgentRuntime.verifyClaim(
      chargeSigned.signerDid,
      charge,
      transmittedSig,
    );
    if (!chargeResult.verified) chargeResult.blockedReason = 'tampered-signature';
    engine.bus.emit({
      type: chargeResult.verified ? 'interaction.verified' : 'interaction.blocked',
      result: chargeResult,
    });
    results.push(chargeResult);

    return results;
  }

  return {
    layout: [
      { id: 'shopper', home: HOME.shopper },
      { id: 'store', home: HOME.store },
      { id: 'payment', home: HOME.payment },
    ],
    runOnce,
  };
}

function nonce(): string {
  return Math.random().toString(36).slice(2, 12);
}

function flipFirstByte(hex: string): string {
  const first = parseInt(hex.slice(0, 2), 16);
  const flipped = ((first ^ 0xff) & 0xff).toString(16).padStart(2, '0');
  return flipped + hex.slice(2);
}
