# Agent-DID in Action — the Plaza demo

> **Watch AI agents prove who they are.** Live, browser-only demo of [`@agentdid/sdk`](https://www.npmjs.com/package/@agentdid/sdk) — the reference implementation of [Agent-DID](https://github.com/edisonduran/agent-did).

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Built on @agentdid/sdk](https://img.shields.io/badge/built%20on-%40agentdid%2Fsdk%200.2.0-success)](https://www.npmjs.com/package/@agentdid/sdk)
[![CI](https://github.com/edisonduran/agent-did-in-action/actions/workflows/ci.yml/badge.svg)](https://github.com/edisonduran/agent-did-in-action/actions/workflows/ci.yml)

![Agent-DID Plaza preview](public/og-image.svg)

---

## What you see

Three agents share an isometric plaza:

- 🛒 **Shopper-001** — acts on behalf of a human
- 🏬 **Store-Clothing-77** — sells things, charges money
- 💳 **Payment-Bot** — settles payments

Every ~5 seconds the demo runs one full handoff cycle:

1. Shopper walks halfway to the Store and **signs** a `greeting` with its real Ed25519 key (cyan ✍ badge).
2. Store **verifies** the signature with `@agentdid/sdk` (green ✓ badge).
3. Store **signs** a `payment.charge $42` toward Payment-Bot.
4. Payment-Bot **verifies** the signature.
5. Shopper walks back. Loop repeats.

Toggle **Attacker mode** in the top-left and one byte of the Store→Payment signature gets flipped in flight. The SDK rejects the handoff (red ✗ badge), the receiving agent shakes red, and a modal pops up showing the real `VerificationBlockedError` reason. Nothing about this is mocked — it is the published npm package running in your browser.

---

## Why it matters

Agent-to-agent commerce only works if the receiving side can prove who is calling, with no central server in the loop. The Plaza shows that proof happening live, in code you can install today:

```bash
npm install @agentdid/sdk
```

Read the spec: [RFC-001 Agent-DID Specification](https://github.com/edisonduran/agent-did/blob/main/docs/RFC-001-Agent-DID-Specification.md).

---

## Run locally

Requires Node 20+.

```bash
git clone https://github.com/edisonduran/agent-did-in-action.git
cd agent-did-in-action
npm install
npm run dev      # http://localhost:5173
```

Production build + static preview:

```bash
npm run build
npm run preview  # http://localhost:4173
```

Tests, smoke and lint:

```bash
npm run lint     # tsc --noEmit
npm test         # vitest
npm run smoke    # node-side SDK smoke
```

End-to-end (requires `npx playwright install chromium`):

```bash
npm run test:e2e
```

---

## Telemetry

Production builds opt into [Plausible](https://plausible.io) when both env vars are set at build time:

```bash
VITE_PLAUSIBLE_DOMAIN=plaza.agent-did.dev
VITE_PLAUSIBLE_SCRIPT=https://plausible.io/js/script.js   # optional override
```

Without them, every event is routed to `console.debug` so you can validate the funnel locally. The 11 events instrumented are listed in [`src/telemetry/plausible.ts`](src/telemetry/plausible.ts) and mirror `_bmad-output/planning-artifacts/demo-launch-plan.md §3.2`.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Bundler / dev server | [Vite](https://vitejs.dev) 5 | Fast HMR, clean static build |
| UI | React 18 + TypeScript 5 | Familiar, type-safe |
| Scene | [PixiJS](https://pixijs.com) 8 | WebGL isometric tiles + sprites |
| SDK | [`@agentdid/sdk`](https://www.npmjs.com/package/@agentdid/sdk) 0.2.0 | The real published package — no mocks |
| Tests | Vitest + Playwright | Unit + cross-browser smoke |
| Hosting | Static (Vercel) | Zero backend |

---

## Repository layout

```
agent-did-in-action/
├── public/                 ← favicon, OG image, sprites
├── src/
│   ├── App.tsx             ← top-level state (attacker mode, blocked modal)
│   ├── main.tsx            ← React + telemetry bootstrap
│   ├── scene/              ← PixiJS scene + isometric grid
│   ├── sim/                ← engine, runtime, scenarios (pure TS, unit-tested)
│   ├── telemetry/          ← Plausible wrapper
│   └── ui/                 ← Header / Hud / TraceInspector / BlockedModal
├── tests/                  ← vitest unit + ui tests
├── tests-e2e/              ← Playwright cross-browser smoke
├── scripts/smoke.mjs       ← node-side SDK validation
├── vercel.json             ← deploy config + caching headers
└── .github/workflows/ci.yml
```

---

## Related

- 🏛️ **Main repo & RFC-001 spec**: <https://github.com/edisonduran/agent-did>
- 📦 **TypeScript SDK on npm**: <https://www.npmjs.com/package/@agentdid/sdk>
- 🐍 **Python SDK on PyPI**: <https://pypi.org/project/agent-did-sdk/>

---

## Contributing a demo

The gallery is open for community demos. The contract is short and CI-enforced:

- Read [`docs/DEMO-SPEC.md`](docs/DEMO-SPEC.md) — the binding spec.
- Follow the quick start in [`CONTRIBUTING.md`](CONTRIBUTING.md).
- Need an idea? Pick one from the recommended demo backlog in [`CONTRIBUTING.md`](CONTRIBUTING.md#recommended-demo-backlog).
- Open a PR with [`.github/PULL_REQUEST_TEMPLATE/demo.md`](.github/PULL_REQUEST_TEMPLATE/demo.md).

Required surface (TypeScript-enforced + CI-checked): every demo declares
a `useCase`, a `codeSnippet` per agent, and an `attacker` whenever the
scenario reacts to attacker mode. Bundle cap: 150 KB gz.

---

## License

[Apache-2.0](LICENSE) — same as the SDK and the spec.
