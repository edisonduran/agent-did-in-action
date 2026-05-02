import type { InteractionPayload, InteractionResult } from '../sim/types';

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
}

export function TraceInspector({ traces, latest, attacker }: TraceInspectorProps) {
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
