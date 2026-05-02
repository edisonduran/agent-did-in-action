import { useEffect, useRef, useState } from 'react';
import { PixiScene, type PlacedAgent } from './PixiScene';
import { SimulationEngine } from '../sim/SimulationEngine';
import { createShoppingMallScenario } from '../sim/scenarios/shoppingMall';
import type { AgentSpec, InteractionResult } from '../sim/types';
import type { SimEvent } from '../sim/events';
import { TraceInspector, type TraceEntry } from '../ui/TraceInspector';

const SPECS: Record<string, AgentSpec> = {
  shopper: {
    id: 'shopper',
    role: 'shopper',
    name: 'Shopper-001',
    description: 'A shopping agent acting on behalf of a human',
    systemPrompt: 'You shop on behalf of your human principal',
    capabilities: ['cart.add', 'payment.authorize'],
  },
  store: {
    id: 'store',
    role: 'store',
    name: 'Store-Clothing-77',
    description: 'A clothing store agent in the Plaza',
    systemPrompt: 'You sell clothes and process payments',
    capabilities: ['inventory.read', 'price.quote', 'payment.charge'],
  },
  payment: {
    id: 'payment',
    role: 'payment-bot',
    name: 'Payment-Bot',
    description: 'A payment processor agent',
    systemPrompt: 'You verify and process charges',
    capabilities: ['payment.verify', 'payment.process'],
  },
};

const SPRITE_URL: Record<string, string> = {
  shopper: '/sprites/agent-shopper.svg',
  store: '/sprites/agent-store.svg',
  payment: '/sprites/agent-payment.svg',
};

const HOME = {
  shopper: { gx: 1, gy: 1 },
  store: { gx: 5, gy: 2 },
  payment: { gx: 3, gy: 5 },
};

interface SceneContainerProps {
  attackerMode: boolean;
}

export function SceneContainer({ attackerMode }: SceneContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PixiScene | null>(null);
  const engineRef = useRef<SimulationEngine | null>(null);
  const attackerRef = useRef(attackerMode);
  const [ready, setReady] = useState(false);
  const [traces, setTraces] = useState<TraceEntry[]>([]);
  const [lastResult, setLastResult] = useState<InteractionResult | null>(null);

  useEffect(() => {
    attackerRef.current = attackerMode;
  }, [attackerMode]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scene = new PixiScene(containerRef.current);
    sceneRef.current = scene;
    const engine = new SimulationEngine();
    engineRef.current = engine;

    (async () => {
      await scene.init();
      if (cancelled) return;

      // Create real DIDs
      await Promise.all([
        engine.addAgent(SPECS.shopper),
        engine.addAgent(SPECS.store),
        engine.addAgent(SPECS.payment),
      ]);
      if (cancelled) return;

      const placed: PlacedAgent[] = ['shopper', 'store', 'payment'].map((id) => ({
        id,
        spriteUrl: SPRITE_URL[id],
        position: HOME[id as keyof typeof HOME],
        label: SPECS[id].name,
      }));
      await scene.placeAgents(placed);
      if (cancelled) return;

      // Subscribe renderer to engine events
      engine.bus.onAny((evt: SimEvent) => {
        if (evt.type === 'interaction.signed') {
          const r = evt.result;
          const fromId = idForDid(engine, r.signerDid);
          const toId = idForDid(engine, r.payload.to);
          if (fromId && toId) scene.flashLink(fromId, toId, 'sign');
          appendTrace(setTraces, {
            phase: 'signed',
            action: r.payload.action,
            signerDid: r.signerDid,
            signature: r.signature,
            payload: r.payload,
            timestamp: Date.now(),
          });
        }
        if (evt.type === 'interaction.verified' || evt.type === 'interaction.blocked') {
          const r = evt.result;
          const fromId = idForDid(engine, r.signerDid);
          const toId = idForDid(engine, r.payload.to);
          if (fromId && toId) {
            scene.flashLink(fromId, toId, r.verified ? 'verify' : 'block');
          }
          setLastResult(r);
          appendTrace(setTraces, {
            phase: r.verified ? 'verified' : 'blocked',
            action: r.payload.action,
            signerDid: r.signerDid,
            signature: r.signature,
            payload: r.payload,
            blockedReason: r.blockedReason,
            timestamp: Date.now(),
          });
        }
      });

      const scenario = createShoppingMallScenario(engine, {
        attackerMode: () => attackerRef.current,
      });
      setReady(true);

      // Loop: walk -> sign+verify -> walk back -> repeat
      const loop = async () => {
        if (cancelled) return;
        // Shopper walks halfway to store
        scene.moveAgent('shopper', { gx: 3, gy: 1.5 }, 1200);
        await wait(1300);
        if (cancelled) return;
        await scenario.runOnce();
        if (cancelled) return;
        await wait(1500);
        if (cancelled) return;
        scene.moveAgent('shopper', HOME.shopper, 1200);
        await wait(1500);
        timer = setTimeout(loop, 800);
      };
      void loop();
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      scene.destroy();
      engine.reset();
      sceneRef.current = null;
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-plaza-bg" />
      {ready && (
        <div className="pointer-events-none absolute inset-0 flex">
          <div className="ml-auto h-full w-[360px] pointer-events-auto">
            <TraceInspector traces={traces} latest={lastResult} attacker={attackerMode} />
          </div>
        </div>
      )}
    </div>
  );
}

function idForDid(engine: SimulationEngine, did: string): string | undefined {
  for (const a of engine.listAgents()) {
    if (a.did === did) return a.spec.id;
  }
  return undefined;
}

function appendTrace(
  setter: React.Dispatch<React.SetStateAction<TraceEntry[]>>,
  entry: TraceEntry,
): void {
  setter((prev) => [entry, ...prev].slice(0, 20));
}

function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
