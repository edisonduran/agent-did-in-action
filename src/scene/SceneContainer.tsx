import { useEffect, useRef, useState } from 'react';
import { PixiScene, type PlacedAgent } from './PixiScene';
import { SimulationEngine } from '../sim/SimulationEngine';
import type { InteractionResult } from '../sim/types';
import type { SimEvent } from '../sim/events';
import type { DemoModule, DemoSceneApi } from '../demos/types';
import { TraceInspector, type TraceEntry } from '../ui/TraceInspector';
import { playCue } from '../sound/cues';

interface SceneContainerProps {
  demo: DemoModule;
  attackerMode: boolean;
  onBlocked?: (result: InteractionResult) => void;
}

export function SceneContainer({ demo, attackerMode, onBlocked }: SceneContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PixiScene | null>(null);
  const engineRef = useRef<SimulationEngine | null>(null);
  const attackerRef = useRef(attackerMode);
  const onBlockedRef = useRef(onBlocked);
  const [ready, setReady] = useState(false);
  const [traces, setTraces] = useState<TraceEntry[]>([]);
  const [lastResult, setLastResult] = useState<InteractionResult | null>(null);

  useEffect(() => {
    attackerRef.current = attackerMode;
  }, [attackerMode]);

  useEffect(() => {
    onBlockedRef.current = onBlocked;
  }, [onBlocked]);

  // Re-mount the engine + scene whenever the user picks a different demo.
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    setReady(false);
    setTraces([]);
    setLastResult(null);

    const scene = new PixiScene(containerRef.current);
    sceneRef.current = scene;
    const engine = new SimulationEngine();
    engineRef.current = engine;

    const sceneApi: DemoSceneApi = {
      moveAgent: (id, to, ms) => scene.moveAgent(id, to, ms),
      wait: (ms) => new Promise((res) => setTimeout(res, ms)),
    };

    (async () => {
      await scene.init();
      if (cancelled) return;

      // Create real DIDs for every agent declared by the demo.
      await Promise.all(demo.agents.map((a) => engine.addAgent(a.spec)));
      if (cancelled) return;

      const placed: PlacedAgent[] = demo.agents.map((a) => ({
        id: a.spec.id,
        spriteUrl: a.spriteUrl,
        position: a.home,
        label: a.spec.name,
      }));
      await scene.placeAgents(placed);
      if (cancelled) return;

      engine.bus.onAny((evt: SimEvent) => {
        if (evt.type === 'interaction.signed') {
          const r = evt.result;
          const fromId = idForDid(engine, r.signerDid);
          const toId = idForDid(engine, r.payload.to);
          if (fromId && toId) scene.flashLink(fromId, toId, 'sign');
          if (fromId) scene.glowAgent(fromId, 'sign', 700);
          playCue('sign');
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
          if (toId) {
            scene.glowAgent(toId, r.verified ? 'verify' : 'block', 900);
          }
          playCue(r.verified ? 'verify' : 'block');
          if (!r.verified) {
            if (toId) scene.shakeAgent(toId, 700);
            if (fromId) scene.shakeAgent(fromId, 500);
            onBlockedRef.current?.(r);
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

      const scenario = demo.createScenario(engine, {
        attackerMode: () => attackerRef.current,
      });
      setReady(true);

      const loop = async () => {
        if (cancelled) return;
        if (demo.choreography) {
          await demo.choreography(sceneApi);
          if (cancelled) return;
        }
        await scenario.runOnce();
        if (cancelled) return;
        await sceneApi.wait(1500);
        if (cancelled) return;
        for (const a of demo.agents) {
          scene.moveAgent(a.spec.id, a.home, 1000);
        }
        await sceneApi.wait(1100);
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
  }, [demo]);

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
