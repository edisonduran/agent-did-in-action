#!/usr/bin/env node
/**
 * Enforces MUST #5 of docs/DEMO-SPEC.md:
 *   Each demo's added bundle must be <= 150 KB gzipped.
 *
 * Reads dist/assets/demo-<id>-*.js produced by `npm run build`,
 * gzips each one in memory, and exits 1 if any exceeds the cap.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS = join(ROOT, 'dist', 'assets');
const CAP_BYTES = 150 * 1024;

if (!existsSync(ASSETS)) {
  console.error(`[check-demo-bundles] no dist/assets dir — run \`npm run build\` first`);
  process.exit(1);
}

const chunks = readdirSync(ASSETS).filter(
  (f) => f.startsWith('demo-') && f.endsWith('.js'),
);

if (chunks.length === 0) {
  console.error('[check-demo-bundles] no demo chunks found in dist/assets');
  process.exit(1);
}

let failed = false;
for (const file of chunks) {
  const raw = readFileSync(join(ASSETS, file));
  const gz = gzipSync(raw, { level: 9 });
  const kb = (gz.length / 1024).toFixed(2);
  // Recover demo id: demo-<id>-<hash>.js where <hash> is alnum/underscore (no dashes).
  const id = file.replace(/^demo-/, '').replace(/-[A-Za-z0-9_]+\.js$/, '');
  if (gz.length > CAP_BYTES) {
    console.error(
      `[check-demo-bundles] ✗ ${id}: ${kb} KB gzipped > 150 KB cap (MUST #5)`,
    );
    failed = true;
  } else {
    console.log(`[check-demo-bundles] ✓ ${id}: ${kb} KB gzipped`);
  }
}

if (failed) {
  console.error('\n[check-demo-bundles] At least one demo exceeds the 150 KB gz cap.');
  process.exit(1);
}
console.log(`\n[check-demo-bundles] All ${chunks.length} demo bundles within budget.`);
