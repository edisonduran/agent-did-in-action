import { describe, it, expect } from 'vitest';
import { snippetForSign, snippetForVerify } from '../src/ui/codeSnippets';
import type { InteractionResult } from '../src/sim/types';

const baseResult: InteractionResult = {
  payload: {
    from: 'did:plc:from1234567890abcdef',
    to: 'did:plc:to1234567890abcdefxx',
    action: 'charge',
    claims: { priceUsd: 42 },
    nonce: 'abc123',
  },
  signature: '0x1234567890abcdef1234567890abcdef',
  signerDid: 'did:plc:from1234567890abcdef',
  verified: true,
};

describe('codeSnippets', () => {
  it('snippetForSign includes action, claims, nonce, and a shortened signature', () => {
    const out = snippetForSign(baseResult);
    expect(out).toContain("action: 'charge'");
    expect(out).toContain('claims: {');
    expect(out).toContain('priceUsd: 42');
    expect(out).toContain("nonce: 'abc123'");
    expect(out).toContain('signature:');
    // signature should be truncated with ellipsis
    expect(out).toMatch(/0x1234567890abcdef…/);
    expect(out).toContain('await agent.sign');
  });

  it('snippetForSign omits claims when not present', () => {
    const r: InteractionResult = {
      ...baseResult,
      payload: { ...baseResult.payload, claims: undefined },
    };
    const out = snippetForSign(r);
    expect(out).not.toContain('claims: {');
    expect(out).toContain("action: 'charge'");
  });

  it('snippetForVerify shows ✓ on success', () => {
    const out = snippetForVerify({ ...baseResult, verified: true });
    expect(out).toContain('await AgentRuntime.verifyClaim');
    expect(out).toContain('true');
    expect(out).toContain('✓');
  });

  it('snippetForVerify shows blockedReason on failure', () => {
    const out = snippetForVerify({
      ...baseResult,
      verified: false,
      blockedReason: 'manifest-altered',
    });
    expect(out).toContain('false');
    expect(out).toContain('manifest-altered');
    expect(out).toContain('✗');
  });
});
