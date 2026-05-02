interface HudProps {
  attackerMode: boolean;
  onToggleAttacker: (next: boolean) => void;
  blockedCount: number;
  onReopenLastBlock?: () => void;
  muted: boolean;
  onToggleMute: () => void;
  demoTitle?: string;
  onBackToGallery?: () => void;
  attackerLabel?: string;
}

export function Hud({
  attackerMode,
  onToggleAttacker,
  blockedCount,
  onReopenLastBlock,
  muted,
  onToggleMute,
  demoTitle,
  onBackToGallery,
  attackerLabel,
}: HudProps) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
      {(demoTitle || onBackToGallery) && (
        <div className="pointer-events-auto rounded border border-plaza-border bg-plaza-panel/95 px-3 py-2 backdrop-blur">
          {onBackToGallery && (
            <button
              type="button"
              onClick={onBackToGallery}
              className="text-[11px] text-plaza-dim hover:text-plaza-accent"
            >
              ← Gallery
            </button>
          )}
          {demoTitle && (
            <p className="mt-0.5 text-xs font-semibold text-plaza-text">
              {demoTitle}
            </p>
          )}
        </div>
      )}
      <div className="pointer-events-auto rounded border border-plaza-border bg-plaza-panel/95 px-3 py-2 backdrop-blur">
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={attackerMode}
            onChange={(e) => onToggleAttacker(e.target.checked)}
            className="h-4 w-4 accent-plaza-bad"
          />
          <span className="font-semibold">
            {attackerMode ? (
              <span className="text-plaza-bad">Attacker mode ON</span>
            ) : (
              <span className="text-plaza-good">Attacker mode OFF</span>
            )}
          </span>
        </label>
        <p className="mt-1 max-w-[260px] text-[11px] text-plaza-dim">
          {attackerMode
            ? 'A handoff signature gets tampered with in flight. Watch the SDK reject it.'
            : 'All handoffs use real Ed25519 signatures verified by @agentdid/sdk.'}
        </p>
        {attackerMode && attackerLabel && (
          <p className="mt-1 max-w-[260px] text-[11px] font-semibold text-plaza-bad">
            <span aria-hidden>☠</span> {attackerLabel}
          </p>
        )}
        {blockedCount > 0 && (
          <button
            type="button"
            onClick={onReopenLastBlock}
            disabled={!onReopenLastBlock}
            className="mt-2 flex w-full items-center justify-between rounded border border-plaza-bad/50 bg-plaza-bad/10 px-2 py-1 text-[11px] text-plaza-bad hover:border-plaza-bad disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>
              <span className="font-mono font-bold">{blockedCount}</span> handoff
              {blockedCount === 1 ? '' : 's'} blocked
            </span>
            <span className="text-[10px] uppercase opacity-80">View last →</span>
          </button>
        )}
        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={!muted}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          className="mt-2 flex w-full items-center justify-between rounded border border-plaza-border bg-plaza-bg/40 px-2 py-1 text-[11px] text-plaza-dim hover:border-plaza-accent hover:text-plaza-accent"
        >
          <span>{muted ? '🔇 Sound off' : '🔊 Sound on'}</span>
          <span className="text-[10px] uppercase opacity-70">
            {muted ? 'click to unmute' : 'click to mute'}
          </span>
        </button>
      </div>

      <div className="pointer-events-none rounded border border-plaza-border bg-plaza-panel/80 px-3 py-2 text-[11px] text-plaza-dim backdrop-blur">
        <span className="font-mono text-plaza-accent">Day 7</span> · gallery · community demos
      </div>
    </div>
  );
}
