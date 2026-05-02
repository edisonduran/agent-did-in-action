export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-plaza-border bg-plaza-panel px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-plaza-accent font-mono text-sm font-bold text-plaza-bg">
          DID
        </div>
        <div>
          <div className="font-semibold text-plaza-accent">Agent-DID Plaza</div>
          <div className="text-xs text-plaza-dim">
            Watch AI agents prove who they are
          </div>
        </div>
      </div>
      <nav className="flex items-center gap-3 text-sm">
        <a
          href="https://github.com/edisonduran/agent-did-in-action"
          target="_blank"
          rel="noreferrer"
          className="rounded border border-plaza-border px-3 py-1.5 text-plaza-dim hover:border-plaza-accent hover:text-plaza-accent"
        >
          ★ Star on GitHub
        </a>
        <a
          href="https://www.npmjs.com/package/@agentdid/sdk"
          target="_blank"
          rel="noreferrer"
          className="rounded bg-plaza-accent px-3 py-1.5 font-medium text-plaza-bg hover:bg-cyan-300"
        >
          Try the SDK
        </a>
      </nav>
    </header>
  );
}
