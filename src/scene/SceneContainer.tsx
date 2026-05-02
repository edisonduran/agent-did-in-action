import { useEffect, useRef } from 'react';
import { PixiScene, type PlacedAgent } from './PixiScene';

const DEMO_AGENTS: PlacedAgent[] = [
  {
    id: 'shopper',
    spriteUrl: '/sprites/agent-shopper.svg',
    position: { gx: 1, gy: 1 },
    label: 'Shopper-001',
  },
  {
    id: 'store',
    spriteUrl: '/sprites/agent-store.svg',
    position: { gx: 5, gy: 2 },
    label: 'Store-Clothing-77',
  },
  {
    id: 'payment',
    spriteUrl: '/sprites/agent-payment.svg',
    position: { gx: 3, gy: 5 },
    label: 'Payment-Bot',
  },
];

export function SceneContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PixiScene | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    const scene = new PixiScene(containerRef.current);
    sceneRef.current = scene;

    (async () => {
      await scene.init();
      if (cancelled) return;
      await scene.placeAgents(DEMO_AGENTS);
    })();

    return () => {
      cancelled = true;
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-plaza-bg"
    />
  );
}
