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
      id: 'weather-station',
      role: 'warehouse',
      name: 'Weather-Orbit-12',
      description: 'Signs the weather and wind envelope for the next launch window',
      systemPrompt: 'You sign launch-weather windows and never approve conditions you did not measure',
      capabilities: ['launch.weather', 'launch.wind-score'],
    },
    spriteUrl: assetPath('sprites/spaceport-weather.svg'),
    home: { gx: 1, gy: 1 },
    codeSnippet: [
      '// Weather station signs the approved launch wind score',
      'const signed = await weather.sign({',
      "  to: rangeSafety.did,",
      "  action: 'launch.weather-window',",
      '  claims: { windowMinutes: 18 },',
      '  nonce: crypto.randomUUID(),',
      '});',
    ].join('\n'),
  },
  {
    spec: {
      id: 'range-safety',
      role: 'store',
      name: 'Range-Safety-Gamma',
      description: 'Signs the final launch clearance once upstream weather verifies',
      systemPrompt: 'You only clear launches whose upstream weather report verifies',
      capabilities: ['launch.verify', 'launch.clear'],
    },
    spriteUrl: assetPath('sprites/spaceport-range-safety.svg'),
    home: { gx: 4, gy: 1 },
    codeSnippet: [
      '// Range safety verifies weather, then signs launch clearance',
      'const ok = await AgentRuntime.verifyClaim(weatherDid, payload, signature);',
      "if (!ok) throw new Error('blocked: weather-forged');",
      'const clearance = await rangeSafety.sign({ ...payload, to: launchGate.did });',
    ].join('\n'),
  },
  {
    spec: {
      id: 'flight-control',
      role: 'payment-bot',
      name: 'Flight-Control-Blue',
      description: 'Relays the signed clearance to the launch gate',
      systemPrompt: 'You relay the exact launch clearance bytes to the launch gate',
      capabilities: ['launch.relay', 'launch.dispatch'],
    },
    spriteUrl: assetPath('sprites/spaceport-flight-control.svg'),
    home: { gx: 6, gy: 2 },
    codeSnippet: [
      '// Flight control relays the range-safety clearance unchanged',
      'await flightControl.relay({',
      '  payload: clearancePayload,',
      '  signature: rangeSafetySignature,',
      '  to: launchGate.did,',
      '});',
    ].join('\n'),
  },
  {
    spec: {
      id: 'launch-gate',
      role: 'factory',
      name: 'Launch-Gate-9',
      description: 'Opens the window only after the relayed range-safety signature verifies',
      systemPrompt: 'You open the launch window only after range-safety bytes verify exactly',
      capabilities: ['launch.open', 'launch.reject'],
    },
    spriteUrl: assetPath('sprites/spaceport-launch-gate.svg'),
    home: { gx: 6, gy: 5 },
    codeSnippet: [
      '// Launch gate verifies range-safety before opening the window',
      'const ok = await AgentRuntime.verifyClaim(rangeSafetyDid, payload, signature);',
      "if (!ok) reject('tampered-launch-clearance');",
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
      const weather = engine.getAgent('weather-station');
      const rangeSafety = engine.getAgent('range-safety');
      const flightControl = engine.getAgent('flight-control');
      const launchGate = engine.getAgent('launch-gate');
      if (!weather || !rangeSafety || !flightControl || !launchGate) {
        throw new Error(
          'spaceport-launch-window demo requires weather-station, range-safety, flight-control, launch-gate agents',
        );
      }

      const results: InteractionResult[] = [];

      const windowMinutes = 18;
      const weatherPayload: InteractionPayload = {
        from: weather.did,
        to: rangeSafety.did,
        action: 'launch.weather-window',
        claims: { windowMinutes },
        nonce: nonce(),
      };
      engine.bus.emit({
        type: 'interaction.started',
        from: weather.spec.id,
        to: rangeSafety.spec.id,
        payload: weatherPayload,
      });
      const weatherSigned = await weather.sign(weatherPayload);
      const weatherResult: InteractionResult = {
        payload: weatherSigned.payload,
        signature: weatherSigned.signature,
        signerDid: weatherSigned.signerDid,
        verified: false,
      };
      engine.bus.emit({ type: 'interaction.signed', result: weatherResult });
      weatherResult.verified = await AgentRuntime.verify(weatherSigned);
      engine.bus.emit({
        type: weatherResult.verified ? 'interaction.verified' : 'interaction.blocked',
        result: weatherResult,
      });
      results.push(weatherResult);

      const clearance: InteractionPayload = {
        from: rangeSafety.did,
        to: launchGate.did,
        action: 'launch.cleared',
        claims: { windowMinutes },
        nonce: nonce(),
      };
      engine.bus.emit({
        type: 'interaction.started',
        from: rangeSafety.spec.id,
        to: flightControl.spec.id,
        payload: clearance,
      });
      const clearanceSigned = await rangeSafety.sign(clearance);
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
      const relayedClearance: InteractionPayload = { ...clearanceSigned.payload };
      const relayedSignature = tampered
        ? flipFirstByte(clearanceSigned.signature)
        : clearanceSigned.signature;
      engine.bus.emit({
        type: 'interaction.started',
        from: flightControl.spec.id,
        to: launchGate.spec.id,
        payload: relayedClearance,
      });
      const relayResult: InteractionResult = {
        payload: relayedClearance,
        signature: relayedSignature,
        signerDid: clearanceSigned.signerDid,
        verified: false,
      };
      engine.bus.emit({ type: 'interaction.signed', result: relayResult });
      relayResult.verified = await AgentRuntime.verifyClaim(
        clearanceSigned.signerDid,
        relayedClearance,
        relayedSignature,
      );
      if (!relayResult.verified) relayResult.blockedReason = 'tampered-launch-clearance';
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
  scene.moveAgent('range-safety', { gx: 2.5, gy: 1 }, 900);
  await scene.wait(1000);
  scene.moveAgent('flight-control', { gx: 5.5, gy: 2.5 }, 900);
  await scene.wait(1000);
  scene.moveAgent('range-safety', { gx: 4, gy: 1 }, 700);
  scene.moveAgent('flight-control', { gx: 6, gy: 2 }, 700);
  await scene.wait(800);
}

const demo: DemoModule = {
  manifest: manifest as DemoModule['manifest'],
  agents: AGENTS,
  useCase: {
    scenario:
      'A spaceport launch window depends on four autonomous agents: a weather station signs the wind envelope, range safety signs the clearance, flight control relays it, and the launch gate decides whether the window opens.',
    whyItMatters:
      'In real launch operations, the most dangerous failure is often the boring one: a corrupted last-hop signal that still looks official. DID-backed signatures let the launch gate distinguish a real range-safety clearance from a one-byte forgery on the channel.',
  },
  attacker: {
    kind: 'mitm-channel',
    from: 'flight-control',
    to: 'launch-gate',
    label: 'MITM on Flight Control → Launch Gate',
    description:
      'All operational agents stay honest. The attacker is the network path between flight control and the launch gate, which flips one byte of the range-safety signature while the clearance is in flight.',
  },
  createScenario,
  choreography,
};

export default demo;