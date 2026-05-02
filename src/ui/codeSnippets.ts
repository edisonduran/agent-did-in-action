import type { InteractionPayload, InteractionResult } from '../sim/types';

function shortDid(did: string): string {
  if (did.length <= 22) return did;
  return `${did.slice(0, 16)}…${did.slice(-4)}`;
}

function shortHex(hex: string): string {
  if (hex.length <= 22) return hex;
  return `${hex.slice(0, 18)}…`;
}

function payloadLines(p: InteractionPayload, indent = '  '): string {
  const lines: string[] = [];
  lines.push(`${indent}to: '${shortDid(p.to)}',`);
  lines.push(`${indent}action: '${p.action}',`);
  if (typeof p.amount === 'number') lines.push(`${indent}amount: ${p.amount},`);
  lines.push(`${indent}nonce: '${p.nonce}',`);
  return lines.join('\n');
}

/** Snippet shown when the agent has just SIGNED a payload. */
export function snippetForSign(result: InteractionResult): string {
  return [
    '// signing with the agent\'s private key',
    'const signed = await agent.sign({',
    payloadLines(result.payload),
    '});',
    `// → signature: '${shortHex(result.signature)}'`,
  ].join('\n');
}

/** Snippet shown when the agent (the receiver) has just VERIFIED. */
export function snippetForVerify(result: InteractionResult): string {
  const verdict = result.verified
    ? '// → true ✓ identity confirmed'
    : `// → false ✗ blocked (${result.blockedReason ?? 'unknown'})`;
  return [
    '// verifying via the resolver-backed runtime',
    'const ok = await AgentRuntime.verifyClaim(',
    `  '${shortDid(result.signerDid)}',`,
    '  payload,',
    `  '${shortHex(result.signature)}',`,
    ');',
    verdict,
  ].join('\n');
}
