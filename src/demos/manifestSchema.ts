import { z } from 'zod';

/**
 * Zod schema for `manifest.json` — the source of truth for the gallery
 * card. Keep in sync with `src/demos/types.ts > DemoManifest`.
 *
 * Used by `scripts/validate-demos.mjs` (CI) and runtime registry tests.
 */
export const ManifestSchema = z
  .object({
    id: z
      .string()
      .min(2)
      .max(40)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be kebab-case'),
    spec_version: z.literal('1'),
    title: z.string().min(3).max(60),
    tagline: z.string().min(8).max(140),
    author: z.object({
      name: z.string().min(1).max(80),
      github: z
        .string()
        .min(1)
        .max(39)
        .regex(/^[a-zA-Z0-9-]+$/, 'github handle without @'),
    }),
    license: z.enum(['Apache-2.0', 'MIT']),
    sdk_version: z
      .string()
      .regex(/^[\^~]?\d+\.\d+\.\d+/, 'must be a semver-ish range like ^0.2.0'),
    tags: z
      .array(
        z
          .string()
          .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'tags must be lowercase kebab-case'),
      )
      .min(1)
      .max(8),
    official: z.boolean(),
    accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be #rrggbb'),
    problem: z.string().min(8).max(200),
    hero: z.string().optional(),
  })
  .strict();

export type Manifest = z.infer<typeof ManifestSchema>;
