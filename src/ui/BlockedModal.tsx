/**
 * BlockedModal — opens after a tampered handoff is rejected by the SDK.
 *
 * Goals:
 *   - Make the block feel consequential (not just a colored line).
 *   - Show the actual `blockedReason` from the SDK (no fake copy).
 *   - Funnel curious viewers to CTA-3 ("Talk to maintainer") and the spec.
 *
 * It is dismissable. The parent decides when to (re-)open it.
 */

import type { InteractionResult } from '../sim/types';

interface BlockedModalProps {
  result: InteractionResult;
  totalBlocks: number;
  onDismiss: () => void;
  maintainerUrl?: string;
  specUrl?: string;
}

const DEFAULT_MAINTAINER_URL =
  'https://github.com/edisonduran/agent-did/issues/new?title=Question+from+Plaza+demo';
const DEFAULT_SPEC_URL =
  'https://github.com/edisonduran/agent-did/blob/main/docs/RFC-001-Agent-DID-Specification.md';

export function BlockedModal({
  result,
  totalBlocks,
  onDismiss,
  maintainerUrl = DEFAULT_MAINTAINER_URL,
  specUrl = DEFAULT_SPEC_URL,
}: BlockedModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="blocked-modal-title"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="mx-4 w-full max-w-md rounded-lg border border-plaza-bad/60 bg-plaza-panel p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-plaza-bad text-lg font-bold text-white">
            ✗
          </span>
          <div>
            <h2 id="blocked-modal-title" className="text-base font-semibold text-plaza-bad">
              Handoff blocked by the SDK
            </h2>
            <p className="text-[11px] text-plaza-dim">
              This is a real <span className="font-mono">VerificationBlockedError</span>, not a script.
            </p>
          </div>
        </div>

        <dl className="mb-4 space-y-1.5 rounded border border-plaza-border bg-plaza-bg/60 p-3 font-mono text-[11px] text-plaza-dim">
          <Row label="reason" value={result.blockedReason ?? 'unknown'} accent="bad" />
          <Row label="action" value={result.payload.action} />
          {typeof result.payload.amount === 'number' && (
            <Row label="amount" value={`$${result.payload.amount}`} />
          )}
          <Row label="signer" value={short(result.signerDid)} mono />
          <Row label="signature" value={short(result.signature)} mono />
        </dl>

        <p className="mb-4 text-xs text-plaza-dim">
          The receiving agent verified the Ed25519 signature on its own — no central server, no
          allow-list. Tampered bytes ⇒ instant rejection. Total handoffs blocked this session:{' '}
          <span className="font-mono text-plaza-accent">{totalBlocks}</span>.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={specUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex-1 rounded border border-plaza-border bg-plaza-bg px-3 py-2 text-center text-xs font-semibold text-plaza-accent hover:border-plaza-accent"
          >
            Read the spec →
          </a>
          <a
            href={maintainerUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex-1 rounded bg-plaza-accent px-3 py-2 text-center text-xs font-semibold text-plaza-bg hover:bg-cyan-300"
          >
            Talk to maintainer →
          </a>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 w-full text-center text-[11px] text-plaza-dim hover:text-white"
        >
          Dismiss · keep watching the loop
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: string;
  accent?: 'bad';
  mono?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-plaza-dim">{label}</dt>
      <dd
        className={[
          'min-w-0 flex-1 truncate',
          accent === 'bad' ? 'text-plaza-bad font-bold' : 'text-plaza-accent',
          mono ? 'font-mono' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function short(s: string): string {
  if (s.length <= 28) return s;
  return `${s.slice(0, 16)}…${s.slice(-8)}`;
}
