/**
 * Day 0 Spike — Agent-DID in Action
 * --------------------------------------------------------------------
 * Goal: prove that @agentdid/sdk@0.2.0 (the package any dev can install
 * from npm right now) runs cleanly inside a browser bundle and supports
 * the full demo loop: create -> sign -> verify -> block-impostor.
 *
 * If this page renders all 4 checkpoints in green, the entire demo
 * sprint (Day 1+) is unblocked. If any of them fails, we triage before
 * touching another file.
 */

import { useEffect, useState } from 'react';
import { AgentIdentity } from '@agentdid/sdk';
import { ethers } from 'ethers';

type CheckStatus = 'pending' | 'pass' | 'fail';

interface Checkpoint {
  id: string;
  label: string;
  status: CheckStatus;
  detail?: string;
}

const INITIAL_CHECKS: Checkpoint[] = [
  { id: 'sdk-load', label: '1. SDK loaded in browser bundle', status: 'pending' },
  { id: 'create', label: '2. Create two real Agent-DIDs (Store + Shopper)', status: 'pending' },
  { id: 'verify-ok', label: '3. Sign payload + verify signature succeeds', status: 'pending' },
  { id: 'verify-block', label: '4. Tampered signature is rejected (blocked)', status: 'pending' }
];

interface SpikeArtifacts {
  storeDid: string;
  shopperDid: string;
  payload: string;
  signature: string;
  verifyOk: boolean;
  verifyBlocked: boolean;
}

async function runSpike(): Promise<SpikeArtifacts> {
  // Each "agent" needs a controller signer. In the demo proper, we will spawn
  // many of these. For Day 0 we just prove two interact correctly.
  const storeWallet = ethers.Wallet.createRandom();
  const shopperWallet = ethers.Wallet.createRandom();

  const storeIdentity = new AgentIdentity({ signer: storeWallet, network: 'polygon' });
  const shopperIdentity = new AgentIdentity({ signer: shopperWallet, network: 'polygon' });

  const storeAgent = await storeIdentity.create({
    name: 'Store-Clothing-77',
    description: 'Legitimate clothing store agent.',
    coreModel: 'gpt-4o-mini',
    systemPrompt: 'You sell clothes. Always honest about prices.',
    capabilities: ['accept-orders', 'request-payment']
  });

  const shopperAgent = await shopperIdentity.create({
    name: 'Shopper-001',
    description: 'Wants to buy a hoodie.',
    coreModel: 'gpt-4o-mini',
    systemPrompt: 'You are looking for a hoodie under $50.',
    capabilities: ['browse', 'pay']
  });

  const payload = JSON.stringify({
    from: storeAgent.document.id,
    to: 'did:agent:payment-bot',
    action: 'charge',
    amount: 42,
    currency: 'USD'
  });

  // Store signs an invoice request with its real Ed25519 key.
  const signature = await storeIdentity.signMessage(payload, storeAgent.agentPrivateKey);

  // Honest verification path (PaymentBot would do this).
  const verifyOk = await AgentIdentity.verifySignature(
    storeAgent.document.id,
    payload,
    signature
  );

  // Tampered signature path (impostor flips a byte, claims to be Store-77).
  const tamperedHex = signature.slice(0, -2) + (signature.endsWith('00') ? '11' : '00');
  const verifyBlocked = !(await AgentIdentity.verifySignature(
    storeAgent.document.id,
    payload,
    tamperedHex
  ));

  return {
    storeDid: storeAgent.document.id,
    shopperDid: shopperAgent.document.id,
    payload,
    signature,
    verifyOk,
    verifyBlocked
  };
}

export default function App() {
  const [checks, setChecks] = useState<Checkpoint[]>(INITIAL_CHECKS);
  const [artifacts, setArtifacts] = useState<SpikeArtifacts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const next: Checkpoint[] = INITIAL_CHECKS.map((c) => ({ ...c }));
      try {
        // 1. SDK load — already happened by virtue of the import succeeding.
        next[0].status = 'pass';
        next[0].detail = 'AgentIdentity imported from @agentdid/sdk@0.2.0';
        setChecks([...next]);

        const result = await runSpike();
        setArtifacts(result);

        next[1].status = 'pass';
        next[1].detail = `Store: ${result.storeDid.slice(0, 40)}…  Shopper: ${result.shopperDid.slice(0, 40)}…`;
        setChecks([...next]);

        next[2].status = result.verifyOk ? 'pass' : 'fail';
        next[2].detail = result.verifyOk
          ? 'Signature verified against the registered DID document.'
          : 'Verification returned false on a legitimate signature. Investigate.';
        setChecks([...next]);

        next[3].status = result.verifyBlocked ? 'pass' : 'fail';
        next[3].detail = result.verifyBlocked
          ? 'Tampered signature was rejected by the SDK. Impostor would be blocked.'
          : 'Tampered signature was accepted. This is a critical SDK / spike issue.';
        setChecks([...next]);
      } catch (err) {
        setError(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
      }
    })();
  }, []);

  const allPass = checks.every((c) => c.status === 'pass');
  const anyFail = checks.some((c) => c.status === 'fail') || error !== null;

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        maxWidth: 880,
        margin: '40px auto',
        padding: '0 20px',
        color: '#1f2937',
        lineHeight: 1.5
      }}
    >
      <header style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 16, marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Agent-DID in Action</h1>
        <p style={{ margin: '8px 0 0', color: '#6b7280' }}>
          Day 0 Spike — validating <code>@agentdid/sdk@0.2.0</code> in a browser bundle.
        </p>
      </header>

      <section
        aria-live="polite"
        style={{
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
          background: anyFail ? '#fef2f2' : allPass ? '#ecfdf5' : '#f9fafb',
          border: `1px solid ${anyFail ? '#fecaca' : allPass ? '#a7f3d0' : '#e5e7eb'}`
        }}
      >
        <strong>
          {anyFail
            ? 'FAIL — see details below.'
            : allPass
              ? 'ALL PASS — Day 0 spike complete. Day 1+ unblocked.'
              : 'Running spike…'}
        </strong>
      </section>

      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {checks.map((c) => (
          <li
            key={c.id}
            style={{
              display: 'flex',
              gap: 12,
              padding: '12px 0',
              borderBottom: '1px solid #f3f4f6'
            }}
          >
            <span style={{ width: 28, fontSize: 20 }} aria-hidden>
              {c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : '⏳'}
            </span>
            <div>
              <div style={{ fontWeight: 500 }}>{c.label}</div>
              {c.detail && (
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4, fontFamily: 'ui-monospace, monospace' }}>
                  {c.detail}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      {error && (
        <pre
          style={{
            marginTop: 24,
            padding: 16,
            background: '#1f2937',
            color: '#fca5a5',
            borderRadius: 8,
            overflowX: 'auto',
            fontSize: 13
          }}
        >
          {error}
        </pre>
      )}

      {artifacts && (
        <details style={{ marginTop: 32 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 500 }}>
            Inspect signed payload + signature (real cryptographic artifacts)
          </summary>
          <pre
            style={{
              marginTop: 12,
              padding: 16,
              background: '#0f172a',
              color: '#e2e8f0',
              borderRadius: 8,
              overflowX: 'auto',
              fontSize: 12
            }}
          >
{`payload:   ${artifacts.payload}
signature: ${artifacts.signature}`}
          </pre>
        </details>
      )}

      <footer style={{ marginTop: 48, fontSize: 13, color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
        Built on <code>@agentdid/sdk@0.2.0</code> · No mocks · Apache-2.0 ·{' '}
        <a href="https://github.com/edisonduran/agent-did" style={{ color: '#2563eb' }}>
          Main repo
        </a>
      </footer>
    </div>
  );
}
