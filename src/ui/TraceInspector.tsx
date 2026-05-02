import type { InteractionPayload, InteractionResult } from '../sim/types';
import type { DemoAttacker, DemoUseCase } from '../demos/types';

export interface TraceEntry {
  phase: 'signed' | 'verified' | 'blocked';
  action: string;
  signerDid: string;
  signature: string;
  payload: InteractionPayload;
  blockedReason?: string;
  timestamp: number;
}

interface TraceInspectorProps {
  traces: TraceEntry[];
  latest: InteractionResult | null;
  attacker: boolean;
  useCase?: DemoUseCase;
  attackerInfo?: DemoAttacker;
}

export function TraceInspector({
  traces,
  latest,
  attacker,
  useCase,
  attackerInfo,
}: TraceInspectorProps) {
  return (
    <aside className="flex h-full flex-col border-l border-plaza-border bg-plaza-panel/95 backdrop-blur">
      <header className="border-b border-plaza-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-plaza-accent">Live trace</h2>
          {attacker && (
            <span className="rounded bg-plaza-bad px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Attacker mode
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-plaza-dim">
          Real signatures from <span className="font-mono">@agentdid/sdk</span>.
        </p>
      </header>

      {useCase && (
        <section className="border-b border-plaza-border px-4 py-3">
          <h3 className="mb-1 text-[10px] font-bold uppercase text-plaza-dim">
            Use case
          </h3>
          <p className="text-[12px] leading-snug text-plaza-text">
            {useCase.scenario}
          </p>
          <p className="mt-2 text-[11px] leading-snug text-plaza-dim">
            <span className="font-semibold text-plaza-accent">Why it matters: </span>
            {useCase.whyItMatters}
          </p>
          <p
            className="mt-2 rounded border border-plaza-border/60 bg-plaza-bg/40 px-2 py-1 text-[10px] leading-snug text-plaza-dim"
            data-testid="crypto-disclaimer"
          >
            <span className="font-semibold text-plaza-accent">No blockchain. </span>
            Real Ed25519 keys are generated in this browser tab and never leave it.
            Signatures are real; there is no on-chain registry, no RPC call, no gas.
          </p>
        </section>
      )}

      {attacker && attackerInfo && (
        <section
          className="border-b border-plaza-border bg-plaza-bad/10 px-4 py-3"
          data-testid="attacker-panel"
        >
          <h3 className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-plaza-bad">
            <span aria-hidden>☠</span> Attacker
          </h3>
          <p className="text-[12px] font-semibold text-plaza-bad">
            {attackerInfo.label}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-plaza-dim">
            {attackerInfo.description}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-wide text-plaza-dim">
            Type:{' '}
            <span className="font-mono text-plaza-bad">
              {attackerInfo.kind === 'malicious-agent'
                ? 'malicious-agent'
                : 'mitm-channel'}
            </span>
          </p>
        </section>
      )}

      {latest && (
        <div className="border-b border-plaza-border px-4 py-3">
          <div
            className={`mb-1 text-xs font-bold uppercase ${
              latest.verified ? 'text-plaza-good' : 'text-plaza-bad'
            }`}
          >
            {latest.verified ? '\u2713 Verified' : '\u2717 Blocked'}
            {latest.blockedReason && (
              <span className="ml-2 text-plaza-dim">({latest.blockedReason})</span>
            )}
          </div>
          <div className="font-mono text-[11px] text-plaza-dim">
            <div>action: <span className="text-plaza-accent">{latest.payload.action}</span></div>
            {typeof latest.payload.amount === 'number' && (
              <div>amount: <span className="text-plaza-accent">${latest.payload.amount}</span></div>
            )}
            <div className="truncate" title={latest.signerDid}>signer: {short(latest.signerDid)}</div>
            <div className="truncate" title={latest.signature}>sig: {short(latest.signature)}</div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <h3 className="mb-2 text-[10px] font-bold uppercase text-plaza-dim">History</h3>
        <ul className="space-y-1">
          {traces.length === 0 && (
            <li className="text-xs text-plaza-dim">No interactions yet…</li>
          )}
          {traces.map((t, i) => (
            <li
              key={i}
              className="rounded border border-plaza-border bg-plaza-bg/60 px-2 py-1 font-mono text-[11px]"
            >
              <span
                className={
                  t.phase === 'verified'
                    ? 'text-plaza-good'
                    : t.phase === 'blocked'
                      ? 'text-plaza-bad'
                      : 'text-plaza-accent'
                }
              >
                {t.phase}
              </span>{' '}
              <span className="text-plaza-dim">{t.action}</span>{' '}
              <span className="text-plaza-dim">{short(t.signerDid)}</span>
            </li>
          ))}
        </ul>
      </div>

      <footer className="border-t border-plaza-border px-4 py-2 text-[10px] text-plaza-dim">
        Day 3 — live signing & verification
      </footer>
    </aside>
  );
}

function short(s: string): string {
  if (s.length <= 24) return s;
  return `${s.slice(0, 14)}…${s.slice(-6)}`;
}
