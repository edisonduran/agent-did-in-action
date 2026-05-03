import { AgentRuntime } from '../../sim/AgentRuntime';
import type { SimulationEngine } from '../../sim/SimulationEngine';
import type { InteractionPayload, InteractionResult } from '../../sim/types';
import type {
  DemoAgent,
  DemoModule,
  DemoSceneApi,
  DemoScenarioOpts,
} from '../types';
import { assetPath } from '../../ui/assetPath';
import manifest from './manifest.json';

const AGENTS: DemoAgent[] = [
  {
    spec: {
      id: 'manufacturer',
      role: 'factory',
      name: 'Manufacturer-Lab-11',
      description: 'Signs the original recall notice and affected lot count',
      systemPrompt: 'You sign the exact recall scope when a contaminated lot is found',
      capabilities: ['recall.notice', 'lot.identify'],
    },
    spriteUrl: assetPath('sprites/pharma-manufacturer.svg'),
    home: { gx: 1, gy: 2 },
    codeSnippet: [
      '// Manufacturer signs the recall scope for the contaminated lots',
      'const signed = await manufacturer.sign({',
      "  to: regulator.did,",
      "  action: 'recall.notice',",
      '  claims: { recallUnits: 240 },',
      '  nonce: crypto.randomUUID(),',
      '});',
    ].join('\n'),
  },
  {
    spec: {
      id: 'regulator',
      role: 'store',
      name: 'Regulator-MedSafe',
      description: 'Verifies the manufacturer notice and signs the official recall order',
      systemPrompt: 'You only authorize a recall after the manufacturer notice verifies',
      capabilities: ['recall.verify', 'recall.authorize'],
    },
    spriteUrl: assetPath('sprites/pharma-regulator.svg'),
    home: { gx: 4, gy: 2 },
    codeSnippet: [
      '// Regulator verifies the notice, then signs the official recall order',
      'const ok = await AgentRuntime.verifyClaim(manufacturerDid, payload, signature);',
      "if (!ok) throw new Error('blocked: forged-recall-notice');",
      'const order = await regulator.sign({ ...payload, action: "recall.authorized", to: pharmacy.did });',
    ].join('\n'),
  },
  {
    spec: {
      id: 'wholesaler',
      role: 'courier',
      name: 'Wholesaler-MedRoute',
      description: 'Relays the regulator order to the hospital pharmacy',
      systemPrompt: 'You relay the exact signed regulator order to the pharmacy without changing its scope',
      capabilities: ['recall.relay', 'inventory.route'],
    },
    spriteUrl: assetPath('sprites/pharma-wholesaler.svg'),
    home: { gx: 5, gy: 4 },
    codeSnippet: [
      '// Wholesaler must relay the regulator order unchanged',
      'await wholesaler.relay({',
      '  payload: authorizedPayload,',
      '  signature: regulatorSignature,',
      '  to: pharmacy.did,',
      '});',
    ].join('\n'),
  },
  {
    spec: {
      id: 'pharmacy',
      role: 'payment-bot',
      name: 'Hospital-Pharmacy-7',
      description: 'Pulls medicine only after the regulator order verifies exactly',
      systemPrompt: 'You reject any recall whose signed scope differs from the regulator order',
      capabilities: ['recall.execute', 'recall.reject'],
    },
    spriteUrl: assetPath('sprites/pharma-pharmacy.svg'),
    home: { gx: 6, gy: 6 },
    codeSnippet: [
      '// Pharmacy verifies the regulator signature before pulling stock',
      'const ok = await AgentRuntime.verifyClaim(regulatorDid, payload, signature);',
      "if (!ok) reject('recall-scope-altered');",
    ].join('\n'),
  },
];

function nonce(): string {
  return Math.random().toString(36).slice(2, 12);
}

function createScenario(engine: SimulationEngine, opts: DemoScenarioOpts) {
  return {
    async runOnce(): Promise<InteractionResult[]> {
      const manufacturer = engine.getAgent('manufacturer');
      const regulator = engine.getAgent('regulator');
      const wholesaler = engine.getAgent('wholesaler');
      const pharmacy = engine.getAgent('pharmacy');
      if (!manufacturer || !regulator || !wholesaler || !pharmacy) {
        throw new Error(
          'pharma-recall-cascade demo requires manufacturer, regulator, wholesaler, pharmacy agents',
        );
      }

      const results: InteractionResult[] = [];

      const recallUnits = 240;
      const notice: InteractionPayload = {
        from: manufacturer.did,
        to: regulator.did,
        action: 'recall.notice',
        claims: { recallUnits },
        nonce: nonce(),
      };
      engine.bus.emit({
        type: 'interaction.started',
        from: manufacturer.spec.id,
        to: regulator.spec.id,
        payload: notice,
      });
      const noticeSigned = await manufacturer.sign(notice);
      const noticeResult: InteractionResult = {
        payload: noticeSigned.payload,
        signature: noticeSigned.signature,
        signerDid: noticeSigned.signerDid,
        verified: false,
      };
      engine.bus.emit({ type: 'interaction.signed', result: noticeResult });
      noticeResult.verified = await AgentRuntime.verify(noticeSigned);
      engine.bus.emit({
        type: noticeResult.verified ? 'interaction.verified' : 'interaction.blocked',
        result: noticeResult,
      });
      results.push(noticeResult);

      const authorized: InteractionPayload = {
        from: regulator.did,
        to: pharmacy.did,
        action: 'recall.authorized',
        claims: { recallUnits },
        nonce: nonce(),
      };
      engine.bus.emit({
        type: 'interaction.started',
        from: regulator.spec.id,
        to: wholesaler.spec.id,
        payload: authorized,
      });
      const authorizedSigned = await regulator.sign(authorized);
      const authorizedResult: InteractionResult = {
        payload: authorizedSigned.payload,
        signature: authorizedSigned.signature,
        signerDid: authorizedSigned.signerDid,
        verified: false,
      };
      engine.bus.emit({ type: 'interaction.signed', result: authorizedResult });
      authorizedResult.verified = await AgentRuntime.verify(authorizedSigned);
      engine.bus.emit({
        type: authorizedResult.verified ? 'interaction.verified' : 'interaction.blocked',
        result: authorizedResult,
      });
      results.push(authorizedResult);

      const relayedAuthorized: InteractionPayload = {
        ...authorizedSigned.payload,
        claims: {
          ...(authorizedSigned.payload.claims ?? {}),
          recallUnits: opts.attackerMode() ? 24 : recallUnits,
        },
      };
      engine.bus.emit({
        type: 'interaction.started',
        from: wholesaler.spec.id,
        to: pharmacy.spec.id,
        payload: relayedAuthorized,
      });
      const relayResult: InteractionResult = {
        payload: relayedAuthorized,
        signature: authorizedSigned.signature,
        signerDid: authorizedSigned.signerDid,
        verified: false,
      };
      engine.bus.emit({ type: 'interaction.signed', result: relayResult });
      relayResult.verified = await AgentRuntime.verifyClaim(
        authorizedSigned.signerDid,
        relayedAuthorized,
        authorizedSigned.signature,
      );
      if (!relayResult.verified) relayResult.blockedReason = 'recall-scope-altered';
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
  scene.moveAgent('wholesaler', { gx: 4.5, gy: 3.2 }, 1000);
  await scene.wait(1100);
  scene.moveAgent('wholesaler', { gx: 5.8, gy: 5.2 }, 1100);
  await scene.wait(1200);
  scene.moveAgent('wholesaler', { gx: 5, gy: 4 }, 800);
  await scene.wait(900);
}

const demo: DemoModule = {
  manifest: manifest as DemoModule['manifest'],
  agents: AGENTS,
  useCase: {
    scenario:
      'A contaminated medicine lot triggers a four-agent recall cascade: manufacturer, regulator, wholesaler, and hospital pharmacy. The regulator signs the official recall scope, and downstream automation must preserve that exact scope until the pharmacy pulls stock.',
    whyItMatters:
      'In safety-critical recalls, shrinking the signed batch count can be as dangerous as forging the recall from scratch. DID-backed signatures let the pharmacy prove whether the wholesaler preserved the regulator’s exact recall order or silently changed the scope.',
  },
  attacker: {
    kind: 'malicious-agent',
    agentId: 'wholesaler',
    label: 'Wholesaler-MedRoute (rogue)',
    description:
      'The wholesaler changes the affected lot count from 240 to 24 while keeping the regulator’s original signature. The pharmacy blocks the handoff because the signed bytes no longer match the authorized recall scope.',
  },
  createScenario,
  choreography,
};

export default demo;