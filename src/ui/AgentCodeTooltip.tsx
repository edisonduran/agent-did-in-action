import { useEffect, useState } from 'react';

export interface AgentTooltipState {
  agentId: string;
  agentName: string;
  code: string;
  /** Screen-space coords (relative to the canvas container). */
  x: number;
  y: number;
}

interface Props {
  tooltip: AgentTooltipState | null;
  /** Called when the mouse enters/leaves the tooltip box itself.
   *  The host uses this to keep the tooltip open while the user reaches the copy button. */
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * Floating, monospace tooltip showing the SDK code an agent ran (or will run).
 * Anchored above the sprite. Pure HTML overlay — Pixi stays untouched.
 */
export function AgentCodeTooltip({ tooltip, onMouseEnter, onMouseLeave }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [tooltip?.agentId, tooltip?.code]);

  if (!tooltip) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tooltip.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // clipboard may be blocked; ignore silently
    }
  };

  // Position above the sprite, but clamp so it never escapes the canvas.
  const left = Math.max(8, Math.min(tooltip.x - 160, window.innerWidth - 340));
  const top = Math.max(8, tooltip.y - 200);

  return (
    <div
      role="tooltip"
      aria-label={`SDK code for ${tooltip.agentName}`}
      data-testid="agent-code-tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="pointer-events-auto absolute z-30 w-[320px] rounded-lg border border-cyan-500/40 bg-slate-950/95 p-3 shadow-2xl shadow-cyan-500/10 backdrop-blur"
      style={{ left, top }}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider">
        <span className="font-semibold text-cyan-300">{tooltip.agentName}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-200 hover:border-cyan-400 hover:text-cyan-200"
        >
          {copied ? '✓ copied' : '📋 copy'}
        </button>
      </div>
      <pre className="m-0 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded bg-black/60 p-2 font-mono text-[11px] leading-snug text-emerald-200">
        {tooltip.code}
      </pre>
      <div className="mt-2 text-[10px] text-slate-400">
        Real call into <span className="font-mono text-cyan-200">@agentdid/sdk</span>
      </div>
    </div>
  );
}
