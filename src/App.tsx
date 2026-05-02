import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from './ui/Header';
import { Hud } from './ui/Hud';
import { BlockedModal } from './ui/BlockedModal';
import { Gallery } from './ui/Gallery';
import type { InteractionResult } from './sim/types';
import { track, trackFirstInteraction } from './telemetry/plausible';
import { initSound, isMuted, setMuted } from './sound/cues';
import { findDemo } from './demos/_registry';
import type { DemoModule } from './demos/types';

// Lazy-load the scene: it pulls in PixiJS, ethers, and @agentdid/sdk
// (~600 KB compressed). Splitting them out lets the header + HUD paint
// in <100 KB so first-paint metrics stay fast.
const SceneContainer = lazy(() =>
  import('./scene/SceneContainer').then((m) => ({ default: m.SceneContainer })),
);

function readDemoIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  return url.searchParams.get('demo');
}

function writeDemoIdToUrl(id: string | null): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (id) {
    url.searchParams.set('demo', id);
  } else {
    url.searchParams.delete('demo');
  }
  window.history.pushState({}, '', url.toString());
}

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(() => readDemoIdFromUrl());
  const [demo, setDemo] = useState<DemoModule | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
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

  useEffect(() => {
    const onPop = () => setSelectedId(readDemoIdFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const entry = useMemo(() => findDemo(selectedId), [selectedId]);
  useEffect(() => {
    if (!selectedId) {
      setDemo(null);
      setDemoError(null);
      return;
    }
    if (!entry) {
      setDemo(null);
      setDemoError(`Demo "${selectedId}" not found.`);
      return;
    }
    let cancelled = false;
    setDemo(null);
    setDemoError(null);
    setBlockedCount(0);
    setLastBlocked(null);
    setAutoOpenedFor(false);
    setModalOpen(false);
    entry
      .load()
      .then((m) => {
        if (!cancelled) setDemo(m);
      })
      .catch((err) => {
        if (!cancelled) setDemoError(String(err?.message ?? err));
      });
    return () => {
      cancelled = true;
    };
  }, [entry, selectedId]);

  const handlePick = useCallback((id: string) => {
    setSelectedId(id);
    writeDemoIdToUrl(id);
    trackFirstInteraction();
  }, []);

  const handleBack = useCallback(() => {
    setSelectedId(null);
    writeDemoIdToUrl(null);
    track('gallery.returned', {});
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
      <Header onLogoClick={selectedId ? handleBack : undefined} />
      <main className="relative flex-1">
        {!selectedId && <Gallery onPick={handlePick} />}
        {selectedId && demoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-plaza-bg text-center text-plaza-dim">
            <p className="text-sm">{demoError}</p>
            <button
              type="button"
              onClick={handleBack}
              className="rounded border border-plaza-border px-3 py-1.5 text-xs text-plaza-text hover:border-plaza-accent/60"
            >
              ← Back to gallery
            </button>
          </div>
        )}
        {selectedId && demo && !demoError && (
          <>
            <Suspense fallback={<SceneSkeleton title={demo.manifest.title} />}>
              <SceneContainer
                demo={demo}
                attackerMode={attackerMode}
                onBlocked={handleBlocked}
              />
            </Suspense>
            <Hud
              attackerMode={attackerMode}
              onToggleAttacker={handleToggleAttacker}
              blockedCount={blockedCount}
              onReopenLastBlock={lastBlocked ? () => setModalOpen(true) : undefined}
              muted={muted}
              onToggleMute={handleToggleMute}
              demoTitle={demo.manifest.title}
              onBackToGallery={handleBack}
            />
            {modalOpen && lastBlocked && (
              <BlockedModal
                result={lastBlocked}
                totalBlocks={blockedCount}
                onDismiss={() => setModalOpen(false)}
              />
            )}
          </>
        )}
        {selectedId && !demo && !demoError && <SceneSkeleton title={selectedId} />}
      </main>
    </div>
  );
}

function SceneSkeleton({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-plaza-bg">
      <div className="text-center">
        <div className="mb-3 inline-block h-10 w-10 animate-spin rounded-full border-2 border-plaza-border border-t-plaza-accent" />
        <p className="text-xs text-plaza-dim">Loading {title}…</p>
        <p className="mt-1 text-[11px] text-plaza-dim/70">
          Generating real Ed25519 keys for the agents.
        </p>
      </div>
    </div>
  );
}
