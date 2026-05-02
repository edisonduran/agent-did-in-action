import { useCallback, useState } from 'react';
import { Header } from './ui/Header';
import { Hud } from './ui/Hud';
import { BlockedModal } from './ui/BlockedModal';
import { SceneContainer } from './scene/SceneContainer';
import type { InteractionResult } from './sim/types';
import { track, trackFirstInteraction } from './telemetry/plausible';

export default function App() {
  const [attackerMode, setAttackerMode] = useState(false);
  const [lastBlocked, setLastBlocked] = useState<InteractionResult | null>(null);
  const [blockedCount, setBlockedCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [autoOpenedFor, setAutoOpenedFor] = useState(false);

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

  return (
    <div className="flex h-full flex-col">
      <Header />
      <main className="relative flex-1">
        <SceneContainer attackerMode={attackerMode} onBlocked={handleBlocked} />
        <Hud
          attackerMode={attackerMode}
          onToggleAttacker={handleToggleAttacker}
          blockedCount={blockedCount}
          onReopenLastBlock={lastBlocked ? () => setModalOpen(true) : undefined}
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
