import { useEffect, useRef, useState } from 'react';
import { PixiScene, type PlacedAgent } from './PixiScene';
import { SimulationEngine } from '../sim/SimulationEngine';
import type { InteractionResult } from '../sim/types';
import type { SimEvent } from '../sim/events';
import type { DemoModule, DemoSceneApi } from '../demos/types';
import { TraceInspector, type TraceEntry } from '../ui/TraceInspector';
import { AgentCodeTooltip, type AgentTooltipState } from '../ui/AgentCodeTooltip';
import { snippetForSign, snippetForVerify } from '../ui/codeSnippets';
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
  // Map agentId → most recent SDK snippet (live-updated on every interaction).
  const lastCodeRef = useRef<Map<string, string>>(new Map());
  const [ready, setReady] = useState(false);
  const [traces, setTraces] = useState<TraceEntry[]>([]);
  const [lastResult, setLastResult] = useState<InteractionResult | null>(null);
  const [tooltip, setTooltip] = useState<AgentTooltipState | null>(null);
  // Pending hide-tooltip timer. Lets the cursor travel from the sprite to the
  // tooltip box (e.g. to reach the copy button) without losing the popup.
  const tooltipHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHideTooltip = () => {
    if (tooltipHideTimerRef.current) {
      clearTimeout(tooltipHideTimerRef.current);
      tooltipHideTimerRef.current = null;
    }
  };
  const scheduleHideTooltip = (delayMs = 1500) => {
    cancelHideTooltip();
    tooltipHideTimerRef.current = setTimeout(() => {
      setTooltip(null);
      tooltipHideTimerRef.current = null;
    }, delayMs);
  };

  useEffect(() => {
    attackerRef.current = attackerMode;
  }, [attackerMode]);

  useEffect(() => {
    onBlockedRef.current = onBlocked;
  }, [onBlocked]);

  // Toggle the persistent attacker badge on the canvas when attacker mode flips
  // (or when the demo declares a different attacker).
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (!attackerMode || !demo.attacker) {
      scene.setAttackerMarker(null);
      return;
    }
    if (demo.attacker.kind === 'malicious-agent') {
      scene.setAttackerMarker({ kind: 'agent', agentId: demo.attacker.agentId });
    } else {
      scene.setAttackerMarker({
        kind: 'channel',
        fromId: demo.attacker.from,
        toId: demo.attacker.to,
      });
    }
  }, [attackerMode, demo, ready]);

  // Re-mount the engine + scene whenever the user picks a different demo.
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    setReady(false);
    setTraces([]);
    setLastResult(null);
    setTooltip(null);

    // Seed each agent's snippet with its declared default.
    const seeded = new Map<string, string>();
    for (const a of demo.agents) {
      seeded.set(a.spec.id, a.codeSnippet);
    }
    lastCodeRef.current = seeded;

    const scene = new PixiScene(containerRef.current);
    sceneRef.current = scene;
    const engine = new SimulationEngine();
    engineRef.current = engine;

    const sceneApi: DemoSceneApi = {
      moveAgent: (id, to, ms) => scene.moveAgent(id, to, ms),
      wait: (ms) => new Promise((res) => setTimeout(res, ms)),
    };

    const nameFor = (id: string): string =>
      demo.agents.find((a) => a.spec.id === id)?.spec.name ?? id;

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

      scene.setHoverHandlers({
        onEnter: (id, x, y) => {
          if (cancelled) return;
          cancelHideTooltip();
          setTooltip({
            agentId: id,
            agentName: nameFor(id),
            code: lastCodeRef.current.get(id) ?? '',
            x,
            y,
          });
        },
        onMove: (id, x, y) => {
          if (cancelled) return;
          cancelHideTooltip();
          setTooltip((prev) =>
            prev && prev.agentId === id
              ? { ...prev, x, y, code: lastCodeRef.current.get(id) ?? prev.code }
              : prev,
          );
        },
        onLeave: () => {
          if (cancelled) return;
          scheduleHideTooltip();
        },
      });

      engine.bus.onAny((evt: SimEvent) => {
        if (evt.type === 'interaction.signed') {
          const r = evt.result;
          const fromId = idForDid(engine, r.signerDid);
          const toId = idForDid(engine, r.payload.to);
          if (fromId) lastCodeRef.current.set(fromId, snippetForSign(r));
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
          if (toId) lastCodeRef.current.set(toId, snippetForVerify(r));
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
          // If the tooltip is currently showing the verifier, refresh its code in place.
          setTooltip((prev) =>
            prev && toId && prev.agentId === toId
              ? { ...prev, code: snippetForVerify(r) }
              : prev,
          );
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
      cancelHideTooltip();
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
            <TraceInspector
              traces={traces}
              latest={lastResult}
              attacker={attackerMode}
              useCase={demo.useCase}
              attackerInfo={demo.attacker}
            />
          </div>
        </div>
      )}
      <AgentCodeTooltip
        tooltip={tooltip}
        onMouseEnter={cancelHideTooltip}
        onMouseLeave={() => scheduleHideTooltip(600)}
      />
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
