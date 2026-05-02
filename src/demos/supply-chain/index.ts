import { AgentRuntime } from '../../sim/AgentRuntime';
import type { SimulationEngine } from '../../sim/SimulationEngine';
import type { InteractionPayload, InteractionResult } from '../../sim/types';
import type {
  DemoAgent,
  DemoModule,
  DemoSceneApi,
  DemoScenarioOpts,
} from '../types';
import manifest from './manifest.json';

const AGENTS: DemoAgent[] = [
  {
    spec: {
      id: 'factory',
      role: 'factory',
      name: 'Factory-Berlin-A',
      description: 'Issues signed shipment manifests for outgoing pallets',
      systemPrompt: 'You manufacture goods and sign every outgoing shipment',
      capabilities: ['shipment.issue', 'manifest.sign'],
    },
    spriteUrl: '/sprites/agent-factory.svg',
    home: { gx: 1, gy: 2 },
    codeSnippet: [
      "// Factory signs every outgoing shipment manifest",
      "const signed = await factory.sign({",
      "  to: receiver.did,",
      "  action: 'ship.manifest',",
      "  amount: 12, // pallet count",
      "  nonce: crypto.randomUUID(),",
      "});",
    ].join('\n'),
  },
  {
    spec: {
      id: 'courier',
      role: 'courier',
      name: 'Courier-Logistics-12',
      description: 'Carries the shipment between factory and receiver',
      systemPrompt: 'You forward shipments and may not alter the manifest',
      capabilities: ['shipment.transport', 'manifest.relay'],
    },
    spriteUrl: '/sprites/agent-courier.svg',
    home: { gx: 4, gy: 3 },
    codeSnippet: [
      "// Honest courier MUST forward the factory's payload as-is",
      "await courier.relay({",
      "  to: receiver.did,",
      "  payload: factoryPayload,   // do NOT mutate",
      "  signature: factorySignature,",
      "});",
    ].join('\n'),
  },
  {
    spec: {
      id: 'receiver',
      role: 'receiver',
      name: 'Receiver-Madrid-7',
      description: 'Accepts shipments and verifies the factory manifest',
      systemPrompt: 'You only accept shipments whose manifest signature verifies',
      capabilities: ['shipment.receive', 'manifest.verify'],
    },
    spriteUrl: '/sprites/agent-warehouse.svg',
    home: { gx: 6, gy: 5 },
    codeSnippet: [
      "// Receiver verifies the FACTORY signature against the relayed payload",
      "const ok = await AgentRuntime.verifyClaim(",
      "  factoryDid,",
      "  relayedPayload,",
      "  factorySignature,",
      ");",
      "if (!ok) reject('manifest-altered');",
    ].join('\n'),
  },
];

function nonce(): string {
  return Math.random().toString(36).slice(2, 12);
}

function createScenario(engine: SimulationEngine, opts: DemoScenarioOpts) {
  return {
    async runOnce(): Promise<InteractionResult[]> {
      const factory = engine.getAgent('factory');
      const courier = engine.getAgent('courier');
      const receiver = engine.getAgent('receiver');
      if (!factory || !courier || !receiver) {
        throw new Error('supply-chain demo requires factory, courier, receiver agents');
      }
      const results: InteractionResult[] = [];

      // ---- Step A: factory issues a signed manifest to the courier ----
      const manifestPayload: InteractionPayload = {
        from: factory.did,
        to: receiver.did, // the manifest is addressed to the receiver
        action: 'ship.manifest',
        // We piggy-back on the existing typed fields: amount = pallet count.
        amount: 12,
        nonce: nonce(),
      };
      engine.bus.emit({
        type: 'interaction.started',
        from: factory.spec.id,
        to: courier.spec.id,
        payload: manifestPayload,
      });
      const issued = await factory.sign(manifestPayload);
      const issuedResult: InteractionResult = {
        payload: issued.payload,
        signature: issued.signature,
        signerDid: issued.signerDid,
        verified: false,
      };
      engine.bus.emit({ type: 'interaction.signed', result: issuedResult });
      issuedResult.verified = await AgentRuntime.verify(issued);
      engine.bus.emit({
        type: issuedResult.verified ? 'interaction.verified' : 'interaction.blocked',
        result: issuedResult,
      });
      results.push(issuedResult);

      // ---- Step B: courier relays to receiver. Honest courier = forward as-is.
      // Attacker mode = courier rewrites `amount` to 99 but keeps the original signature.
      const tampered = opts.attackerMode();
      const relayedPayload: InteractionPayload = tampered
        ? { ...issued.payload, amount: 99 }
        : issued.payload;

      engine.bus.emit({
        type: 'interaction.started',
        from: courier.spec.id,
        to: receiver.spec.id,
        payload: relayedPayload,
      });
      const relayResult: InteractionResult = {
        payload: relayedPayload,
        signature: issued.signature,
        signerDid: issued.signerDid,
        verified: false,
      };
      engine.bus.emit({ type: 'interaction.signed', result: relayResult });
      relayResult.verified = await AgentRuntime.verifyClaim(
        issued.signerDid,
        relayedPayload,
        issued.signature,
      );
      if (!relayResult.verified) relayResult.blockedReason = 'manifest-altered';
      engine.bus.emit({
        type: relayResult.verified ? 'interaction.verified' : 'interaction.blocked',
        result: relayResult,
      });
      results.push(relayResult);

      return results;
    },
  };
}

async function choreography(scene: DemoSceneApi): Promise<void> {
  // Factory hands manifest to courier
  scene.moveAgent('courier', { gx: 2.5, gy: 2.5 }, 1100);
  await scene.wait(1200);
  // Courier walks to receiver
  scene.moveAgent('courier', { gx: 5.5, gy: 4.5 }, 1300);
  await scene.wait(1400);
  // Courier returns to depot
  scene.moveAgent('courier', { gx: 4, gy: 3 }, 1100);
  await scene.wait(900);
}

const demo: DemoModule = {
  manifest: manifest as DemoModule['manifest'],
  agents: AGENTS,
  createScenario,
  choreography,
};

export default demo;
