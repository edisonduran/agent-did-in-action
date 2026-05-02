# Shopping Mall

**Author**: Agent-DID core team · **License**: Apache-2.0 · **Status**: Official baseline

The canonical Agent-DID demo. A shopper agent walks across the Plaza,
greets a clothing store, and the store hands a charge off to a payment
bot. Every handoff is a real Ed25519 signature over a canonicalized JSON
payload, verified through the SDK's resolver.

## What it demonstrates

- `signer.sign(payload)` for arbitrary action objects.
- `AgentRuntime.verify*` against the in-memory mock resolver.
- Live behavior under tampered transport: when `attackerMode` is on, the
  charge signature is byte-flipped in flight and the payment bot rejects
  it with `blockedReason: "tampered-signature"`.

## Files

- `manifest.json` — gallery metadata, validated against the spec.
- `index.ts` — agents + scenario + optional choreography.

## How to extend

Fork this folder, change the agents, the action names, and the steps in
`createScenario.runOnce`. See [`docs/DEMO-SPEC.md`](../../../docs/DEMO-SPEC.md)
for the full contract and contribution flow.
