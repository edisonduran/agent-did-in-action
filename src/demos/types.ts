/**
 * Public contract every Agent-DID-in-Action demo MUST implement.
 *
 * See docs/DEMO-SPEC.md for the full specification (must / must-not lists,
 * validation pipeline, contribution flow).
 *
 * Stability: this surface is versioned via `manifest.spec_version`.
 * Breaking changes require a major bump and a migration note in CHANGELOG.
 */

import type { AgentSpec, InteractionResult } from '../sim/types';
import type { SimulationEngine } from '../sim/SimulationEngine';
import type { GridPoint } from '../scene/isometric';

/** Static metadata used by the gallery and the validator. */
export interface DemoManifest {
  /** kebab-case unique id; also used in the URL (`?demo=<id>`). */
  id: string;
  /** Spec version this demo targets. Today: `"1"`. */
  spec_version: '1';
  /** ≤ 60 chars. */
  title: string;
  /** ≤ 140 chars, shown on the gallery card. */
  tagline: string;
  /** Author identity. `github` is the handle without `@`. */
  author: { name: string; github: string };
  /** SPDX identifier. Only Apache-2.0 or MIT accepted. */
  license: 'Apache-2.0' | 'MIT';
  /** Minimum @agentdid/sdk version required (semver, e.g. `^0.2.0`). */
  sdk_version: string;
  /** Free-form tags for filtering (lowercase, kebab-case). */
  tags: string[];
  /** True for demos maintained by the core team. PR template forces `false` for community submissions. */
  official: boolean;
  /** Hex color used as the card accent and highlights. */
  accent_color: `#${string}`;
  /** One-line problem statement shown on the card. */
  problem: string;
  /** Optional path (relative to the demo folder) to a hero image ≤ 200KB. */
  hero?: string;
}

/** A placed agent: spec + visual sprite + starting tile on the grid. */
export interface DemoAgent {
  spec: AgentSpec;
  spriteUrl: string;
  home: GridPoint;
  /**
   * Optional default SDK snippet shown in the hover tooltip BEFORE this agent
   * has performed any action. Once it signs / verifies, the host overrides
   * this with the actual call (with real payload + signature snippets).
   *
   * Multi-line strings are fine; rendered in a monospace tooltip.
   * Keep it short — ideally ≤ 6 lines.
   */
  codeSnippet?: string;
}

/**
 * Helpers a demo can use to drive choreography between scenario runs.
 * Provided by the host (SceneContainer); demos must NOT touch the
 * Pixi scene or DOM directly.
 */
export interface DemoSceneApi {
  moveAgent(id: string, to: GridPoint, ms: number): void;
  wait(ms: number): Promise<void>;
}

export interface DemoScenarioOpts {
  /** Returns the current attacker-mode toggle state from the host HUD. */
  attackerMode: () => boolean;
}

export interface DemoScenario {
  /** Run one full interaction cycle. The host re-invokes this on a loop. */
  runOnce(): Promise<InteractionResult[]>;
}

/**
 * Plain-language description of WHAT this demo simulates and WHY it matters.
 * Rendered in the right-hand panel above the live trace.
 */
export interface DemoUseCase {
  /** 1–3 sentences: the real-world situation being modeled. */
  scenario: string;
  /** 1–2 sentences: what would go wrong without DIDs / signed claims. */
  whyItMatters: string;
}

/**
 * Who the attacker is in this demo when the user toggles "Attacker mode".
 * Two flavours:
 *  - `malicious-agent`: one of the demo's own agents misbehaves
 *    (e.g. courier rewrites the manifest).
 *  - `mitm-channel`: a network-level adversary tampers with bytes in
 *    transit between two honest agents.
 */
export type DemoAttacker =
  | {
      kind: 'malicious-agent';
      /** id of the agent (must exist in `agents[]`). */
      agentId: string;
      /** Short label, e.g. "Courier-Logistics-12 (rogue)". */
      label: string;
      /** 1–2 sentences explaining what the attacker is doing. */
      description: string;
    }
  | {
      kind: 'mitm-channel';
      /** id of the sender (honest). */
      from: string;
      /** id of the receiver (honest). */
      to: string;
      /** Short label, e.g. "MITM on Store → Payment". */
      label: string;
      description: string;
    };

/** The full demo bundle. Each demo folder exports one of these as default. */
export interface DemoModule {
  manifest: DemoManifest;
  agents: DemoAgent[];
  /** Optional narrative shown in the side panel. */
  useCase?: DemoUseCase;
  /** Optional attacker model surfaced when attackerMode is ON. */
  attacker?: DemoAttacker;
  /**
   * Build the scenario. Called once per host mount.
   * MUST use the supplied engine for all signing/verification.
   */
  createScenario(engine: SimulationEngine, opts: DemoScenarioOpts): DemoScenario;
  /**
   * Optional choreography invoked between scenario runs (movement, pauses).
   * If omitted, the host runs scenarios back-to-back with a 1.5s pause.
   */
  choreography?(scene: DemoSceneApi): Promise<void>;
}
