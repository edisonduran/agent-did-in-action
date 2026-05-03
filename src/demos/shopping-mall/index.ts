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
      id: 'shopper',
      role: 'shopper',
      name: 'Shopper-001',
      description: 'A shopping agent acting on behalf of a human',
      systemPrompt: 'You shop on behalf of your human principal',
      capabilities: ['cart.add', 'payment.authorize'],
    },
    spriteUrl: '/sprites/agent-shopper.svg',
    home: { gx: 1, gy: 1 },
    codeSnippet: [
      "// Shopper greets the store on behalf of its human",
      "const signed = await shopper.sign({",
      "  to: store.did,",
      "  action: 'greet',",
      "  nonce: crypto.randomUUID(),",
      "});",
    ].join('\n'),
  },
  {
    spec: {
      id: 'store',
      role: 'store',
      name: 'Store-Clothing-77',
      description: 'A clothing store agent in the Plaza',
      systemPrompt: 'You sell clothes and process payments',
      capabilities: ['inventory.read', 'price.quote', 'payment.charge'],
    },
    spriteUrl: '/sprites/agent-store.svg',
    home: { gx: 5, gy: 2 },
    codeSnippet: [
      "// Store quotes a price and forwards a signed charge",
      "const signed = await store.sign({",
      "  to: payment.did,",
      "  action: 'charge',",
      "  claims: { priceUsd: 42 },",
      "  nonce: crypto.randomUUID(),",
      "});",
    ].join('\n'),
  },
  {
    spec: {
      id: 'payment',
      role: 'payment-bot',
      name: 'Payment-Bot',
      description: 'A payment processor agent',
      systemPrompt: 'You verify and process charges',
      capabilities: ['payment.verify', 'payment.process'],
    },
    spriteUrl: '/sprites/agent-payment.svg',
    home: { gx: 3, gy: 5 },
    codeSnippet: [
      "// Payment bot verifies the signature before charging",
      "const ok = await AgentRuntime.verifyClaim(",
      "  signerDid,",
      "  payload,",
      "  signature,",
      ");",
      "if (!ok) throw new Error('blocked: tampered-signature');",
    ].join('\n'),
  },
];

function nonce(): string {
  return Math.random().toString(36).slice(2, 12);
}

function flipFirstByte(hex: string): string {
  const first = parseInt(hex.slice(0, 2), 16);
  const flipped = ((first ^ 0xff) & 0xff).toString(16).padStart(2, '0');
  return flipped + hex.slice(2);
}

function createScenario(engine: SimulationEngine, opts: DemoScenarioOpts) {
  return {
    async runOnce(): Promise<InteractionResult[]> {
      const shopper = engine.getAgent('shopper');
      const store = engine.getAgent('store');
      const payment = engine.getAgent('payment');
      if (!shopper || !store || !payment) {
        throw new Error('shopping-mall demo requires shopper, store, payment agents');
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
      const priceUsd = 42;
      const charge: InteractionPayload = {
        from: store.did,
        to: payment.did,
        action: 'charge',
        claims: { priceUsd },
        nonce: nonce(),
      };
      engine.bus.emit({
        type: 'interaction.started',
        from: store.spec.id,
        to: payment.spec.id,
        payload: charge,
      });
      const chargeSigned = await store.sign(charge);
      const tampered = opts.attackerMode();
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
    },
  };
}

async function choreography(scene: DemoSceneApi): Promise<void> {
  scene.moveAgent('shopper', { gx: 3, gy: 1.5 }, 1200);
  await scene.wait(1300);
}

const demo: DemoModule = {
  manifest: manifest as DemoModule['manifest'],
  agents: AGENTS,
  useCase: {
    scenario:
      'A shopping agent buys clothes on behalf of its human, the store agent quotes a price and forwards a signed charge to a payment-bot. Every handoff is a signed claim against the agent’s DID.',
    whyItMatters:
      'Without DIDs, any party on the network could replay or modify the charge and the payment-bot would have no way to tell. With DIDs, a single flipped bit invalidates the signature and the bot rejects the charge automatically.',
  },
  attacker: {
    kind: 'mitm-channel',
    from: 'store',
    to: 'payment',
    label: 'MITM on Store → Payment',
    description:
      'A man-in-the-middle on the network between the store and the payment-bot flips one byte of the signature in flight. The store and the bot are honest — the attacker is the channel itself.',
  },
  createScenario,
  choreography,
};

export default demo;
