# Cold-chain Supply Bots

**Author**: Agent-DID core team · **License**: Apache-2.0 · **Status**: Official baseline

A second reference demo, built to prove the demo spec works for shapes
that aren't "two-step retail handoff". A factory issues a signed shipment
manifest. A courier carries it across the Plaza to a receiver. The receiver
verifies the **factory's** signature against the relayed payload — not the
courier's.

## What it demonstrates

- **Multi-hop trust**: the trust anchor is the factory, even though the
  message arrives via the courier. The courier never re-signs.
- **Payload tampering** (vs Day-4 transport tampering): in attacker mode
  the courier rewrites `amount` from 12 pallets to 99 but keeps the
  original signature. Verification fails because the canonicalized JSON
  no longer matches what the factory signed.
- A different `blockedReason` (`manifest-altered`) so the trace inspector
  shows variety.

## Files

- `manifest.json` — gallery metadata.
- `index.ts` — agents, scenario, choreography (3-leg courier walk).

## Why this demo matters

It shows that Agent-DID handoffs are **payload-bound**, not just
transport-bound. A man-in-the-middle that re-broadcasts a stale signature
over a different payload is caught. This is the core property that makes
multi-agent systems composable: any party can verify a claim end-to-end
without trusting the relay.
