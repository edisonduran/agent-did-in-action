---
name: New community demo
about: Add a new demo to the Plaza gallery
labels: ['demo']
---

## Demo summary

- **Demo id (kebab-case)**: `<your-id>`
- **Title**: 
- **Tagline (≤140 chars)**: 
- **Author**: name + GitHub handle

## What does it demonstrate?

Explain in one paragraph what new property of `@agentdid/sdk` this demo
makes visible (multi-hop trust, replay, capability scoping, etc.).

## Spec compliance checklist

I confirm that this demo:

- [ ] Lives under `src/demos/<id>/` with `manifest.json`, `index.ts`, `README.md`
- [ ] Passes `npm run validate:demos`
- [ ] Passes `npm run lint`
- [ ] Adds at least one unit test under `tests/<id>.test.ts`
- [ ] Passes `npm test -- --run`
- [ ] Passes `npm run build` and the new chunk is ≤ 150 KB gz
- [ ] Uses **only** `@agentdid/sdk` for cryptography (no direct noble/ethers)
- [ ] Honours both `attackerMode: false` (no blocks) and `true` (≥1 block)
- [ ] Does not initialize its own telemetry, modals, or DOM overlays
- [ ] Makes no outbound network requests
- [ ] Is licensed Apache-2.0 or MIT (and `manifest.license` matches)
- [ ] `manifest.official` is set to `false`

## Screenshot or short clip

Drop a 3-5 s GIF or PNG that shows your demo in motion. Required for review.

## License

By submitting this PR I confirm I authored the contribution and offer it
under the Apache-2.0 (or MIT) license declared in the manifest.
