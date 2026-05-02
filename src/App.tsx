import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Header } from './ui/Header';
import { Hud } from './ui/Hud';
import { BlockedModal } from './ui/BlockedModal';
import type { InteractionResult } from './sim/types';
import { track, trackFirstInteraction } from './telemetry/plausible';
import { initSound, isMuted, setMuted } from './sound/cues';

// Lazy-load the scene: it pulls in PixiJS, ethers, and @agentdid/sdk
// (~600 KB compressed). Splitting them out lets the header + HUD paint
// in <100 KB so first-paint metrics stay fast.
const SceneContainer = lazy(() =>
  import('./scene/SceneContainer').then((m) => ({ default: m.SceneContainer })),
);

export default function App() {
  const [attackerMode, setAttackerMode] = useState(false);
  const [lastBlocked, setLastBlocked] = useState<InteractionResult | null>(null);
  const [blockedCount, setBlockedCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [autoOpenedFor, setAutoOpenedFor] = useState(false);
  const [muted, setMutedState] = useState(true);

  useEffect(() => {
    initSound();
    setMutedState(isMuted());
  }, []);

  const handleBlocked = useCallback(
    (result: InteractionResult) => {
      setLastBlocked(result);
      setBlockedCount((n) => n + 1);
      if (!autoOpenedFor) {
        setModalOpen(true);
        setAutoOpenedFor(true);
        track('demo.attacker.blocked.viewed', {
          reason: result.blockedReason ?? 'unknown',
          action: result.payload.action,
        });
      }
    },
    [autoOpenedFor],
  );

  const handleToggleAttacker = useCallback((next: boolean) => {
    setAttackerMode(next);
    if (!next) setAutoOpenedFor(false);
    trackFirstInteraction();
    track('demo.attacker.toggled', { state: next ? 'on' : 'off' });
  }, []);

  const handleToggleMute = useCallback(() => {
    setMutedState((current) => {
      const next = !current;
      setMuted(next);
      trackFirstInteraction();
      return next;
    });
  }, []);

  return (
    <div className="flex h-full flex-col">
      <Header />
      <main className="relative flex-1">
        <Suspense fallback={<SceneSkeleton />}>
          <SceneContainer attackerMode={attackerMode} onBlocked={handleBlocked} />
        </Suspense>
        <Hud
          attackerMode={attackerMode}
          onToggleAttacker={handleToggleAttacker}
          blockedCount={blockedCount}
          onReopenLastBlock={lastBlocked ? () => setModalOpen(true) : undefined}
          muted={muted}
          onToggleMute={handleToggleMute}
        />
        {modalOpen && lastBlocked && (
          <BlockedModal
            result={lastBlocked}
            totalBlocks={blockedCount}
            onDismiss={() => setModalOpen(false)}
          />
        )}
      </main>
    </div>
  );
}

function SceneSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-plaza-bg">
      <div className="text-center">
        <div className="mb-3 inline-block h-10 w-10 animate-spin rounded-full border-2 border-plaza-border border-t-plaza-accent" />
        <p className="text-xs text-plaza-dim">Loading the Plaza…</p>
        <p className="mt-1 text-[11px] text-plaza-dim/70">
          Generating real Ed25519 keys for three agents.
        </p>
      </div>
    </div>
  );
}
