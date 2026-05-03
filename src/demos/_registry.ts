/**
 * Demo registry. Each entry is a lazy import so a demo's code is only
 * fetched when the user picks it from the gallery (or lands on its URL).
 *
 * Adding a demo:
 *   1. Drop your folder under `src/demos/<your-id>/`
 *   2. Add an entry here. Keep `manifest` static (imported eagerly) so
 *      the gallery can render the card without paying for the demo's
 *      runtime cost.
 *   3. Run `npm run validate:demos` before opening a PR.
 *
 * See docs/DEMO-SPEC.md for the contract.
 */

import type { DemoManifest, DemoModule } from './types';

import newsroomPublishChainManifest from './newsroom-publish-chain/manifest.json';
import pharmaRecallCascadeManifest from './pharma-recall-cascade/manifest.json';
import shoppingMallManifest from './shopping-mall/manifest.json';
import spaceportLaunchWindowManifest from './spaceport-launch-window/manifest.json';
import supplyChainManifest from './supply-chain/manifest.json';

export interface RegistryEntry {
  manifest: DemoManifest;
  load: () => Promise<DemoModule>;
  heroSrc?: string;
}

export const DEMO_REGISTRY: readonly RegistryEntry[] = [
  {
    heroSrc: '/heroes/newsroom-publish-chain.svg',
    manifest: newsroomPublishChainManifest as DemoManifest,
    load: () => import('./newsroom-publish-chain/index').then((m) => m.default),
  },
  {
    heroSrc: '/heroes/pharma-recall-cascade.svg',
    manifest: pharmaRecallCascadeManifest as DemoManifest,
    load: () => import('./pharma-recall-cascade/index').then((m) => m.default),
  },
  {
    heroSrc: '/heroes/shopping-mall.svg',
    manifest: shoppingMallManifest as DemoManifest,
    load: () => import('./shopping-mall/index').then((m) => m.default),
  },
  {
    heroSrc: '/heroes/spaceport-launch-window.svg',
    manifest: spaceportLaunchWindowManifest as DemoManifest,
    load: () => import('./spaceport-launch-window/index').then((m) => m.default),
  },
  {
    heroSrc: '/heroes/supply-chain.svg',
    manifest: supplyChainManifest as DemoManifest,
    load: () => import('./supply-chain/index').then((m) => m.default),
  },
];

export const DEFAULT_DEMO_ID = 'shopping-mall';

export function findDemo(id: string | null | undefined): RegistryEntry | undefined {
  if (!id) return undefined;
  return DEMO_REGISTRY.find((d) => d.manifest.id === id);
}
