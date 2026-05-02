#!/usr/bin/env node
/**
 * Validates every src/demos/<id>/manifest.json against the schema and
 * checks the folder structure required by docs/DEMO-SPEC.md.
 *
 * Exits with code 1 on the first failure so CI can gate PRs.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DEMOS_DIR = join(ROOT, 'src', 'demos');

// Inline schema (kept in sync with src/demos/manifestSchema.ts so this script
// stays a zero-dep node entry that runs before TS compilation).
const REQUIRED_KEYS = [
  'id',
  'spec_version',
  'title',
  'tagline',
  'author',
  'license',
  'sdk_version',
  'tags',
  'official',
  'accent_color',
  'problem',
];
const ALLOWED_LICENSES = new Set(['Apache-2.0', 'MIT']);

function fail(msg) {
  console.error(`[validate-demos] ✗ ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`[validate-demos] ✓ ${msg}`);
}

function isKebab(s) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
}

function validateManifest(folderId, m, file) {
  for (const k of REQUIRED_KEYS) {
    if (!(k in m)) return fail(`${file}: missing key "${k}"`);
  }
  if (m.id !== folderId) {
    return fail(`${file}: manifest.id "${m.id}" must match folder name "${folderId}"`);
  }
  if (!isKebab(m.id)) return fail(`${file}: id must be kebab-case`);
  if (m.spec_version !== '1') return fail(`${file}: spec_version must be "1"`);
  if (typeof m.title !== 'string' || m.title.length < 3 || m.title.length > 60)
    return fail(`${file}: title must be 3..60 chars`);
  if (typeof m.tagline !== 'string' || m.tagline.length > 140)
    return fail(`${file}: tagline must be ≤140 chars`);
  if (!m.author?.name || !m.author?.github)
    return fail(`${file}: author.{name,github} required`);
  if (!/^[a-zA-Z0-9-]+$/.test(m.author.github))
    return fail(`${file}: author.github must be a bare handle (no @)`);
  if (!ALLOWED_LICENSES.has(m.license))
    return fail(`${file}: license must be Apache-2.0 or MIT`);
  if (!/^[\^~]?\d+\.\d+\.\d+/.test(m.sdk_version))
    return fail(`${file}: sdk_version must look like ^0.2.0`);
  if (!Array.isArray(m.tags) || m.tags.length < 1 || m.tags.length > 8)
    return fail(`${file}: tags must be 1..8 entries`);
  for (const t of m.tags) if (!isKebab(t)) return fail(`${file}: tag "${t}" not kebab-case`);
  if (typeof m.official !== 'boolean')
    return fail(`${file}: official must be boolean`);
  if (!/^#[0-9a-fA-F]{6}$/.test(m.accent_color))
    return fail(`${file}: accent_color must be #rrggbb`);
  if (typeof m.problem !== 'string' || m.problem.length < 8 || m.problem.length > 200)
    return fail(`${file}: problem must be 8..200 chars`);
  ok(`${m.id}: manifest valid`);
  return true;
}

function validateFolder(folder) {
  const id = folder;
  const dir = join(DEMOS_DIR, folder);
  const manifestPath = join(dir, 'manifest.json');
  const indexTs = join(dir, 'index.ts');
  const readmePath = join(dir, 'README.md');
  if (!existsSync(manifestPath)) return fail(`${id}: manifest.json missing`);
  if (!existsSync(indexTs)) return fail(`${id}: index.ts missing`);
  if (!existsSync(readmePath)) return fail(`${id}: README.md missing`);
  let m;
  try {
    m = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    return fail(`${id}: manifest.json not valid JSON: ${e.message}`);
  }
  if (!validateManifest(id, m, manifestPath)) return false;
  // Hero size check
  if (m.hero) {
    const heroPath = join(dir, m.hero);
    if (!existsSync(heroPath)) return fail(`${id}: hero "${m.hero}" not found`);
    const sz = statSync(heroPath).size;
    if (sz > 200 * 1024) return fail(`${id}: hero ${sz}B > 200KB cap`);
  }
  return true;
}

function main() {
  if (!existsSync(DEMOS_DIR)) {
    console.error(`No demos dir at ${DEMOS_DIR}`);
    process.exit(1);
  }
  const entries = readdirSync(DEMOS_DIR).filter((name) => {
    if (name.startsWith('_')) return false;
    if (name === 'types.ts' || name === 'manifestSchema.ts') return false;
    return statSync(join(DEMOS_DIR, name)).isDirectory();
  });

  if (entries.length === 0) {
    console.error('No demo folders found under src/demos/');
    process.exit(1);
  }

  const ids = new Set();
  for (const folder of entries) {
    if (!isKebab(folder)) {
      fail(`folder name "${folder}" is not kebab-case`);
      continue;
    }
    if (ids.has(folder)) {
      fail(`duplicate folder id "${folder}"`);
      continue;
    }
    ids.add(folder);
    validateFolder(folder);
  }

  if (process.exitCode === 1) {
    console.error('\n[validate-demos] Some demos failed validation. See above.');
  } else {
    console.log(`\n[validate-demos] All ${entries.length} demos valid.`);
  }
}

main();
