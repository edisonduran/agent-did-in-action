# Agent-DID in Action

> **Watch AI agents prove who they are.** Interactive browser demo of the [Agent-DID](https://github.com/edisonduran/agent-did) standard.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Built on @agentdid/sdk](https://img.shields.io/badge/built%20on-%40agentdid%2Fsdk%200.2.0-success)](https://www.npmjs.com/package/@agentdid/sdk)

This is the official live demo for the [Agent-DID Public Review](https://github.com/edisonduran/agent-did) — a public, browser-only playground where you can watch AI agents identify themselves cryptographically before transacting, and watch impostors get blocked in real time.

> ⚠️ **Status: Day 0 Spike.** Right now this repo only contains the viability spike that proves `@agentdid/sdk@0.2.0` runs cleanly in a browser bundle. The full interactive scene (Shopping Mall scenario, attacker mode, trace inspector) is being built next. Follow the [main repo](https://github.com/edisonduran/agent-did) for launch updates.

---

## What this demo proves

- ✅ The Agent-DID SDK can be installed from npm and run **entirely in a browser** — no backend, no mocks.
- ✅ Two independent agents can each generate their own DID, sign messages, and verify each other's signatures.
- ✅ When an impostor tampers with a signature, the verifier rejects it. **The handoff is blocked.**

Every cryptographic operation you see in the demo is the **real `@agentdid/sdk` package** that any developer can install today:

```bash
npm install @agentdid/sdk
```

---

## Run locally

Requires Node 20+.

```bash
git clone https://github.com/edisonduran/agent-did-in-action.git
cd agent-did-in-action
npm install
npm run dev
```

Open <http://localhost:5173>.

To produce a static build:

```bash
npm run build
npm run preview
```

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Bundler / dev server | [Vite](https://vitejs.dev) 5 | Fast HMR, clean static build |
| UI | React 18 + TypeScript | Familiar, type-safe |
| SDK | [`@agentdid/sdk`](https://www.npmjs.com/package/@agentdid/sdk) 0.2.0 | The real published package — no mocks |
| Hosting | Static (Vercel-friendly) | Zero backend, zero ops cost |

---

## Repository layout

```
agent-did-in-action/
├── index.html
├── src/
│   ├── main.tsx        ← React entrypoint
│   └── App.tsx         ← Day 0 spike (current state)
├── vite.config.ts
└── README.md
```

The full demo (Shopping Mall scenario, PixiJS scene, attacker toggle, trace inspector) will be built incrementally on top of this scaffold across the following days.

---

## Related

- 🏛️ **Main repo & RFC-001 spec**: <https://github.com/edisonduran/agent-did>
- 📦 **TypeScript SDK on npm**: <https://www.npmjs.com/package/@agentdid/sdk>
- 🐍 **Python SDK on PyPI**: <https://pypi.org/project/agent-did-sdk/>

---

## License

[Apache-2.0](LICENSE) — same as the SDK and the spec.
