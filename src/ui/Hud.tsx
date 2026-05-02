interface HudProps {
  attackerMode: boolean;
  onToggleAttacker: (next: boolean) => void;
}

export function Hud({ attackerMode, onToggleAttacker }: HudProps) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
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
            ? 'The Store→Payment signature gets corrupted in flight. Watch the SDK reject the handoff.'
            : 'All handoffs use real Ed25519 signatures verified by @agentdid/sdk.'}
        </p>
      </div>

      <div className="pointer-events-none rounded border border-plaza-border bg-plaza-panel/80 px-3 py-2 text-[11px] text-plaza-dim backdrop-blur">
        <span className="font-mono text-plaza-accent">Day 3</span> · live sign & verify
        loop · 2 interactions per cycle
      </div>
    </div>
  );
}
