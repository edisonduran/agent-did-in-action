# Contributing to Agent-DID-in-Action

Two kinds of contributions land here:

1. **Core changes** — host shell, scene engine, telemetry, build pipeline, CI.
2. **Community demos** — new entries in the gallery.

Most outside contributions will be #2. For those, follow
[`docs/DEMO-SPEC.md`](docs/DEMO-SPEC.md) — it is the binding contract.

## Quick start (community demo)

```bash
git clone https://github.com/edisonduran/agent-did-in-action
cd agent-did-in-action
npm install

# 1. Copy the official baseline as your starting point:
cp -r src/demos/shopping-mall src/demos/your-id

# 2. Edit manifest.json (id, title, author, license=Apache-2.0|MIT, official=false).
# 3. Edit index.ts. Required fields on the exported DemoModule:
#    - agents[]: each AGENT must have a `codeSnippet` (default tooltip content).
#    - useCase: { scenario, whyItMatters } shown in the side panel.
#    - attacker: { kind: 'malicious-agent' | 'mitm-channel', ... }
#                 REQUIRED if your scenario calls opts.attackerMode().
#    See docs/DEMO-SPEC.md §2.1 / §2.2 / §2.3 for the exact shapes.
# 4. Add tests/<your-id>.test.ts covering both attackerMode states.
# 5. Register the demo in src/demos/_registry.ts (one line).

npm run validate:demos
npm run lint
npm test -- --run
npm run build
npm run check:bundles    # enforces the 150 KB gz cap per demo

# Open a PR using the demo template (.github/PULL_REQUEST_TEMPLATE/demo.md).
```

## What we look for in review

- **Educational value**: every demo should make some property of the SDK
  visible that wasn't visible before. "Yet another two-agent handoff" is
  not enough — show replay protection, capability scoping, multi-hop trust,
  cross-resolver federation, etc.
- **Correctness under attack**: `attackerMode: true` must produce a real,
  cryptographic block (not a hardcoded `if`). Use `AgentRuntime.verifyClaim`
  on actual tampered payloads.
- **Performance**: stay within the 150 KB gz cap. If you need a heavy dep,
  open an issue first.
- **Polish**: a good README explaining the threat model and a 3-5 s GIF
  on the PR are the difference between merge and "please iterate".

## Local checks (one-liner)

```bash
npm run validate:demos && npm run lint && npm test -- --run && npm run build && npm run check:bundles
```

## Automated CI guardrails

CI runs the same commands you do locally, plus enforces:

| Gate | Tool | Rule |
| --- | --- | --- |
| Manifest schema | `validate:demos` | Required fields, kebab-case id, license allowlist, hero ≤ 200 KB. |
| Attacker contract | `validate:demos` | If your `index.ts` calls `opts.attackerMode()`, it MUST also export an `attacker` field (DEMO-SPEC §2.2 / MUST #11). The validator greps for this. |
| Type contract | `lint` (`tsc --noEmit`) | `useCase` and per-agent `codeSnippet` are TypeScript-required. Forgetting either fails the build. |
| Bundle budget | `check:bundles` | After `npm run build`, every `dist/assets/demo-<id>-*.js` is gzipped in memory and rejected if > 150 KB (DEMO-SPEC MUST #5). |
| Tests | `vitest` + Playwright | Your `tests/<your-id>.test.ts` must cover both attacker modes; the host's e2e smoke must still pass. |

If any of these fail on your PR, fix locally and push again — maintainers will
not merge a red CI.

## Reporting bugs / proposing core changes

Open an issue. For non-trivial host changes, open an RFC discussion
first — the demo gallery is a stable API surface for the community and
breaking it requires a major bump.

## Code of conduct

Be kind. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

## License

By contributing you agree your contribution is offered under the
Apache-2.0 license of this repository (or MIT if you explicitly mark
your demo's `manifest.license = "MIT"`).
