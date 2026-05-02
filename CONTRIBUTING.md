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
# 3. Edit index.ts: change agents, scenario, choreography.
# 4. Add tests/<your-id>.test.ts covering both attackerMode states.
# 5. Register the demo in src/demos/_registry.ts (one line).

npm run validate:demos
npm run lint
npm test -- --run
npm run build

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
npm run validate:demos && npm run lint && npm test -- --run && npm run build
```

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
