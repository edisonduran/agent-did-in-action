import { track } from '../telemetry/plausible';

const SHARE_TEXT = 'Watch AI agents prove who they are — live browser demo of @agentdid/sdk';

function handleShare(url: string) {
  track('cta.share.clicked');
  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    SHARE_TEXT,
  )}&url=${encodeURIComponent(url)}`;
  window.open(tweet, '_blank', 'noopener,noreferrer');
}

interface HeaderProps {
  onLogoClick?: () => void;
  title: string;
  subtitle: string;
}

export function Header({ onLogoClick, title, subtitle }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-plaza-border bg-plaza-panel px-4 py-3">
      <button
        type="button"
        onClick={onLogoClick}
        disabled={!onLogoClick}
        title={onLogoClick ? 'Back to gallery' : undefined}
        className="flex items-center gap-3 text-left disabled:cursor-default"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded bg-plaza-accent font-mono text-sm font-bold text-plaza-bg">
          DID
        </div>
        <div className="min-w-0">
          <div
            className="truncate font-semibold text-plaza-accent"
            data-testid="app-header-title"
          >
            {title}
          </div>
          <div
            className="max-w-[44rem] truncate text-xs text-plaza-dim"
            data-testid="app-header-subtitle"
          >
            {subtitle}
          </div>
        </div>
      </button>
      <nav className="flex items-center gap-2 text-sm">
        <a
          href="https://github.com/edisonduran/agent-did/blob/main/docs/RFC-001-Agent-DID-Specification.md"
          target="_blank"
          rel="noreferrer"
          onClick={() => track('cta.spec.clicked', { source: 'header' })}
          className="hidden rounded border border-plaza-border px-3 py-1.5 text-plaza-dim hover:border-plaza-accent hover:text-plaza-accent sm:inline-block"
        >
          Spec
        </a>
        <a
          href="https://github.com/edisonduran/agent-did-in-action"
          target="_blank"
          rel="noreferrer"
          onClick={() => track('demo.viewsource.clicked')}
          className="hidden rounded border border-plaza-border px-3 py-1.5 text-plaza-dim hover:border-plaza-accent hover:text-plaza-accent sm:inline-block"
        >
          View source
        </a>
        <button
          type="button"
          onClick={() =>
            handleShare(
              typeof window !== 'undefined' ? window.location.href : 'https://agent-did.dev',
            )
          }
          className="rounded border border-plaza-border px-3 py-1.5 text-plaza-dim hover:border-plaza-accent hover:text-plaza-accent"
        >
          Share
        </button>
        <a
          href="https://github.com/edisonduran/agent-did-in-action"
          target="_blank"
          rel="noreferrer"
          onClick={() => track('cta.star.clicked')}
          className="rounded border border-plaza-border px-3 py-1.5 text-plaza-dim hover:border-plaza-accent hover:text-plaza-accent"
        >
          ★ Star
        </a>
        <a
          href="https://www.npmjs.com/package/@agentdid/sdk"
          target="_blank"
          rel="noreferrer"
          onClick={() => track('cta.sdk.clicked', { source: 'header' })}
          className="rounded bg-plaza-accent px-3 py-1.5 font-medium text-plaza-bg hover:bg-cyan-300"
        >
          Try the SDK
        </a>
      </nav>
    </header>
  );
}
