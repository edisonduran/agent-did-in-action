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
      id: 'reporter',
      role: 'shopper',
      name: 'Reporter-Ana-Desk',
      description: 'Signs the original article revision coming off the desk',
      systemPrompt: 'You produce signed drafts and never rewrite your revision history silently',
      capabilities: ['story.draft', 'story.submit'],
    },
    spriteUrl: '/sprites/agent-shopper.svg',
    home: { gx: 1, gy: 1 },
    codeSnippet: [
      '// Reporter signs the draft revision before handing it off',
      'const signed = await reporter.sign({',
      "  to: factChecker.did,",
      "  action: 'story.draft',",
      '  amount: 7, // revision number',
      '  nonce: crypto.randomUUID(),',
      '});',
    ].join('\n'),
  },
  {
    spec: {
      id: 'fact-checker',
      role: 'store',
      name: 'FactCheck-Ledger-2',
      description: 'Verifies the incoming draft and signs editorial clearance',
      systemPrompt: 'You only clear drafts whose upstream signature verifies',
      capabilities: ['story.verify', 'story.clear'],
    },
    spriteUrl: '/sprites/agent-store.svg',
    home: { gx: 4, gy: 1 },
    codeSnippet: [
      '// Fact checker verifies the reporter, then signs clearance',
      'const ok = await AgentRuntime.verifyClaim(reporterDid, payload, signature);',
      "if (!ok) throw new Error('blocked: draft-forged');",
      'const cleared = await factChecker.sign({ ...nextPayload, to: publisher.did });',
    ].join('\n'),
  },
  {
    spec: {
      id: 'editor',
      role: 'payment-bot',
      name: 'Editor-Central-9',
      description: 'Relays fact-checked stories to the publisher without changing the approved revision',
      systemPrompt: 'You may only relay the exact cleared revision upstream approved',
      capabilities: ['story.relay', 'story.release'],
    },
    spriteUrl: '/sprites/agent-payment.svg',
    home: { gx: 6, gy: 2 },
    codeSnippet: [
      '// Editor must relay the fact-check clearance unchanged',
      'await editor.relay({',
      '  payload: clearedPayload,',
      '  signature: factCheckerSignature,',
      '  to: publisher.did,',
      '});',
    ].join('\n'),
  },
  {
    spec: {
      id: 'publisher',
      role: 'warehouse',
      name: 'Publisher-CDN-Gate',
      description: 'Publishes only after the relayed clearance verifies against the approved revision',
      systemPrompt: 'You reject any relayed clearance whose bytes differ from what upstream approved',
      capabilities: ['story.publish', 'story.reject'],
    },
    spriteUrl: '/sprites/agent-warehouse.svg',
    home: { gx: 6, gy: 5 },
    codeSnippet: [
      '// Publisher verifies the editor order before going live',
      'const ok = await AgentRuntime.verifyClaim(factCheckerDid, payload, signature);',
      "if (!ok) reject('revision-altered-after-clearance');",
    ].join('\n'),
  },
];

function nonce(): string {
  return Math.random().toString(36).slice(2, 12);
}

function createScenario(engine: SimulationEngine, opts: DemoScenarioOpts) {
  return {
    async runOnce(): Promise<InteractionResult[]> {
      const reporter = engine.getAgent('reporter');
      const factChecker = engine.getAgent('fact-checker');
      const editor = engine.getAgent('editor');
      const publisher = engine.getAgent('publisher');
      if (!reporter || !factChecker || !editor || !publisher) {
        throw new Error(
          'newsroom-publish-chain demo requires reporter, fact-checker, editor, publisher agents',
        );
      }

      const results: InteractionResult[] = [];

      const draft: InteractionPayload = {
        from: reporter.did,
        to: factChecker.did,
        action: 'story.draft',
        amount: 7,
        nonce: nonce(),
      };
      engine.bus.emit({
        type: 'interaction.started',
        from: reporter.spec.id,
        to: factChecker.spec.id,
        payload: draft,
      });
      const draftSigned = await reporter.sign(draft);
      const draftResult: InteractionResult = {
        payload: draftSigned.payload,
        signature: draftSigned.signature,
        signerDid: draftSigned.signerDid,
        verified: false,
      };
      engine.bus.emit({ type: 'interaction.signed', result: draftResult });
      draftResult.verified = await AgentRuntime.verify(draftSigned);
      engine.bus.emit({
        type: draftResult.verified ? 'interaction.verified' : 'interaction.blocked',
        result: draftResult,
      });
      results.push(draftResult);

      const clearance: InteractionPayload = {
        from: factChecker.did,
        to: publisher.did,
        action: 'story.cleared',
        amount: draft.amount,
        nonce: nonce(),
      };
      engine.bus.emit({
        type: 'interaction.started',
        from: factChecker.spec.id,
        to: editor.spec.id,
        payload: clearance,
      });
      const clearanceSigned = await factChecker.sign(clearance);
      const clearanceResult: InteractionResult = {
        payload: clearanceSigned.payload,
        signature: clearanceSigned.signature,
        signerDid: clearanceSigned.signerDid,
        verified: false,
      };
      engine.bus.emit({ type: 'interaction.signed', result: clearanceResult });
      clearanceResult.verified = await AgentRuntime.verify(clearanceSigned);
      engine.bus.emit({
        type: clearanceResult.verified ? 'interaction.verified' : 'interaction.blocked',
        result: clearanceResult,
      });
      results.push(clearanceResult);

      const tampered = opts.attackerMode();
      const relayedClearance: InteractionPayload = {
        ...clearanceSigned.payload,
        amount: tampered ? 8 : clearanceSigned.payload.amount,
      };
      engine.bus.emit({
        type: 'interaction.started',
        from: editor.spec.id,
        to: publisher.spec.id,
        payload: relayedClearance,
      });
      const orderResult: InteractionResult = {
        payload: relayedClearance,
        signature: clearanceSigned.signature,
        signerDid: clearanceSigned.signerDid,
        verified: false,
      };
      engine.bus.emit({ type: 'interaction.signed', result: orderResult });
      orderResult.verified = await AgentRuntime.verifyClaim(
        clearanceSigned.signerDid,
        relayedClearance,
        clearanceSigned.signature,
      );
      if (!orderResult.verified) orderResult.blockedReason = 'revision-altered-after-clearance';
      engine.bus.emit({
        type: orderResult.verified ? 'interaction.verified' : 'interaction.blocked',
        result: orderResult,
      });
      results.push(orderResult);

      return results;
    },
  };
}

async function choreography(scene: DemoSceneApi): Promise<void> {
  scene.moveAgent('fact-checker', { gx: 2.5, gy: 1 }, 900);
  await scene.wait(1000);
  scene.moveAgent('editor', { gx: 5.5, gy: 2.5 }, 900);
  await scene.wait(1000);
  scene.moveAgent('fact-checker', { gx: 4, gy: 1 }, 700);
  scene.moveAgent('editor', { gx: 6, gy: 2 }, 700);
  await scene.wait(800);
}

const demo: DemoModule = {
  manifest: manifest as DemoModule['manifest'],
  agents: AGENTS,
  useCase: {
    scenario:
      'A newsroom pipeline moves a story through four agents: reporter, fact-checker, editor, and publisher. The reporter signs the draft, the fact-checker signs editorial clearance, and the editor must relay that cleared revision unchanged to the publisher.',
    whyItMatters:
      'Without DID-backed signatures, a late-stage editorial bot or compromised automation step could silently publish a different revision than the one upstream approved. With signed handoffs, the publisher can prove whether the relayed bytes still match the cleared story revision.',
  },
  attacker: {
    kind: 'malicious-agent',
    agentId: 'editor',
    label: 'Editor-Central-9 (rogue)',
    description:
      'After the fact-checker clears revision 7, the editor changes the relayed revision to 8 while keeping the fact-checker’s original signature. The publisher rejects the handoff because the signed bytes no longer match the approved revision.',
  },
  createScenario,
  choreography,
};

export default demo;