# DEMO-SPEC v1 — Contributing a demo to Agent-DID-in-Action

> The Plaza is a public gallery of `@agentdid/sdk` use cases.
> Anyone can submit a demo. This document is the contract.

## 1. What a demo is

A demo is a self-contained folder under `src/demos/<your-id>/` that
shows agents using real Agent-DID signatures to do something useful.
Each demo lives behind a URL like `https://plaza.example/?demo=<your-id>`
and is rendered by the shared host (Pixi scene + HUD + telemetry).

The host gives you a stage. You declare:

- **Agents** (id, role, sprite, home tile)
- **A scenario** (one async `runOnce()` that emits signed/verified events)
- **Optional choreography** (movement between scenario runs)

You do **not** own: the canvas, the HUD, the trace inspector, the modal,
the telemetry pipeline, the keyboard shortcuts, or the URL bar. The host
handles all of that uniformly.

## 2. The contract — `DemoModule`

See [`src/demos/types.ts`](../src/demos/types.ts) for the full TypeScript
shape. Summary:

```ts
export interface DemoModule {
  manifest: DemoManifest;                                 // see §3
  agents: DemoAgent[];                                    // ≥ 2
  useCase?: DemoUseCase;                                  // optional, see §2.1
  attacker?: DemoAttacker;                                // optional, see §2.2
  createScenario(engine, opts): { runOnce(): Promise<...> };
  choreography?(scene): Promise<void>;                    // optional
}

export interface DemoAgent {
  spec: AgentSpec;
  spriteUrl: string;
  home: GridPoint;
  codeSnippet?: string;                                   // optional, see §2.3
}
```

Your `index.ts` MUST `export default` a `DemoModule`.

### 2.1 `useCase` (optional but STRONGLY RECOMMENDED)

Rendered in the right-hand panel above the live trace. Two short paragraphs:

```ts
{
  scenario:     '1–3 sentences describing the real-world situation',
  whyItMatters: '1–2 sentences explaining what would go wrong without DIDs',
}
```

Keep it plain-language. Assume the reader has never heard of DIDs.

### 2.2 `attacker` (optional, REQUIRED if your scenario reacts to attacker mode)

Declares WHO the attacker is when the user toggles **Attacker mode ON**. Two flavours:

```ts
// Flavour A — one of your agents misbehaves
{
  kind: 'malicious-agent',
  agentId: '<id from agents[]>',
  label: 'Courier-Logistics-12 (rogue)',
  description: '1–2 sentences explaining what they do',
}

// Flavour B — a man-in-the-middle on a channel between two honest agents
{
  kind: 'mitm-channel',
  from: '<id of honest sender>',
  to:   '<id of honest receiver>',
  label: 'MITM on Store → Payment',
  description: '...',
}
```

The host uses this to:
- Show a red panel "☠ Attacker" with the description.
- Render a pulsing skull badge on the canvas (over the agent or at the channel midpoint).
- Display the label in the HUD beside the toggle.

If your scenario reacts to `opts.attackerMode()` you MUST declare this so users can see who is attacking.

### 2.3 `codeSnippet` per agent (optional but RECOMMENDED)

A short multi-line string shown in the hover tooltip BEFORE the agent has
performed any action. Once it signs or verifies, the host overrides it with
the actual call (real payload + truncated signature). Keep it ≤ 6 lines and
use only `@agentdid/sdk` symbols you actually call.

## 3. The manifest — `manifest.json`

Validated by [`scripts/validate-demos.mjs`](../scripts/validate-demos.mjs)
in CI. Required fields:

| Field           | Type     | Constraint                                         |
| --------------- | -------- | -------------------------------------------------- |
| `id`            | string   | kebab-case, 2..40 chars, must equal folder name    |
| `spec_version`  | string   | exactly `"1"` for this version of the spec         |
| `title`         | string   | 3..60 chars                                        |
| `tagline`       | string   | ≤ 140 chars; one sentence shown on the gallery card |
| `author`        | object   | `{ name, github }` — `github` is the bare handle    |
| `license`       | string   | `Apache-2.0` or `MIT`                              |
| `sdk_version`   | string   | semver range, e.g. `^0.2.0`                         |
| `tags`          | string[] | 1..8 lowercase kebab-case tags                      |
| `official`      | boolean  | community submissions MUST set `false`              |
| `accent_color`  | string   | `#rrggbb`                                           |
| `problem`       | string   | 8..200 chars; one-line user-facing problem statement |
| `hero`          | string?  | optional path to image ≤ 200 KB                     |

## 4. MUST

A demo MUST:

1. Sit entirely under `src/demos/<id>/` with `manifest.json`, `index.ts`, `README.md`.
2. Validate with `npm run validate:demos`.
3. Use **only** `@agentdid/sdk` for cryptography. No `noble`, no `ethers`, no
   ad-hoc Web Crypto. The point of the gallery is to dogfood the SDK.
4. Sign and verify through the supplied `engine` and `AgentRuntime`. The host
   wires telemetry to the engine's event bus — bypassing it makes your demo
   invisible in the trace inspector.
5. Keep its added bundle size **≤ 150 KB gzipped** (measured by build).
6. Be deterministic enough that `attackerMode: false` produces only verified
   handoffs, and `attackerMode: true` produces at least one block. The HUD
   counter relies on this.
7. Ship at least one unit test under `tests/<id>.test.ts` covering both modes.
8. Pass `npm run lint`, `npm test -- --run`, and `npm run build`.
9. Be Apache-2.0 or MIT licensed. The PR description is your CLA-light: by
   merging you agree your contribution is offered under that license.
10. Declare an `attacker` (§2.2) **if and only if** your scenario branches on
    `opts.attackerMode()`. The HUD must always be able to tell the user who is
    being simulated as malicious.

## 5. MUST NOT

A demo MUST NOT:

- Initialize its own telemetry, analytics, or error reporting. The host's
  Plausible wrapper is shared and consent-respecting.
- Make outbound network requests. The mock resolver is in-memory; if you
  need a remote resolver, propose it in an RFC first.
- Touch `localStorage`/`sessionStorage` outside the prefix `demo:<id>:*`.
- Render its own DOM, modals, or overlays. The HUD slot is the host's.
- Use `eval`, `new Function`, dynamic `import()` of remote URLs, or
  `dangerouslySetInnerHTML` with non-static content.
- Block the main thread for more than 16 ms in steady state.
- Include binary blobs > 200 KB in the repo (use external CDN links in the
  README if needed).

## 6. Validation pipeline

1. **Local**: `npm run validate:demos && npm run lint && npm test -- --run && npm run build`
2. **CI** (`.github/workflows/ci.yml`): runs the same plus `npm run test:e2e`.
3. **Bundle**: `npm run build` reports a chunk per demo (`dist/assets/demo-<id>-*.js`).
   If yours exceeds the 150 KB gz cap a maintainer will ask you to trim deps.

## 7. Contribution flow

1. Fork the repo, create a branch `demo/<your-id>`.
2. Copy `src/demos/shopping-mall` as a starting point. Replace files.
3. Run the local checks above.
4. Open a PR using the template (`.github/PULL_REQUEST_TEMPLATE/demo.md`).
5. One core maintainer review + one community review = merge.
6. Your demo appears in the gallery at the next deploy.

## 8. Maintenance & deprecation

Community demos are owned by their authors. If a demo fails CI for two
consecutive SDK minor releases without a fix, maintainers will:

1. Open an issue tagging the author with a 14-day grace window.
2. If unresolved, move the demo to `src/demos/_archived/` and remove it
   from the registry. The folder stays in git history forever.

Official demos are maintained by the core team and held to the same bar.

## 9. Versioning the spec

This is `spec_version: "1"`. Breaking changes (e.g. renaming `DemoModule`
methods) require a major bump and a migration script. Additive changes
(new optional manifest fields) ship under v1.

---

Questions? Open a discussion or ping the maintainers in the PR. Thanks
for adding to the Plaza.
