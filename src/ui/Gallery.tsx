import { useEffect, useState } from 'react';
import { DEMO_REGISTRY } from '../demos/_registry';
import { track } from '../telemetry/plausible';

interface GalleryProps {
  onPick: (id: string) => void;
}

export function Gallery({ onPick }: GalleryProps) {
  const [filter, setFilter] = useState<'all' | 'official' | 'community'>('all');

  useEffect(() => {
    track('gallery.viewed', { entries: DEMO_REGISTRY.length });
  }, []);

  const visible = DEMO_REGISTRY.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'official') return d.manifest.official;
    return !d.manifest.official;
  });

  return (
    <div className="absolute inset-0 overflow-y-auto bg-plaza-bg">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-plaza-text">
            The Plaza Gallery
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-plaza-dim">
            Pick a demo to watch real <code>@agentdid/sdk</code> signatures fly
            between agents — or build your own and add it to this page. See{' '}
            <a
              className="text-plaza-accent hover:underline"
              href="https://github.com/edisonduran/agent-did-in-action/blob/main/docs/DEMO-SPEC.md"
              target="_blank"
              rel="noreferrer"
            >
              the demo spec
            </a>{' '}
            for the contract.
          </p>
          <div className="mt-4 inline-flex rounded-md border border-plaza-border bg-plaza-panel p-1 text-xs">
            {(['all', 'official', 'community'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFilter(opt)}
                className={`rounded px-3 py-1.5 transition ${
                  filter === opt
                    ? 'bg-plaza-accent/20 text-plaza-accent'
                    : 'text-plaza-dim hover:text-plaza-text'
                }`}
              >
                {opt[0].toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </header>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visible.map(({ manifest, heroSrc }) => (
            <li key={manifest.id}>
              <button
                data-testid={`gallery-card-${manifest.id}`}
                type="button"
                onClick={() => {
                  track('gallery.demo.picked', { id: manifest.id });
                  onPick(manifest.id);
                }}
                className="group block w-full rounded-lg border border-plaza-border bg-plaza-panel p-5 text-left transition hover:border-plaza-accent/60 hover:bg-plaza-panel/80"
                style={{ borderLeftColor: manifest.accent_color, borderLeftWidth: 4 }}
              >
                {heroSrc && (
                  <div className="mb-4 overflow-hidden rounded-md border border-plaza-border bg-plaza-bg/60">
                    <img
                      src={heroSrc}
                      alt={`${manifest.title} preview art`}
                      className="h-32 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-plaza-text">
                    {manifest.title}
                  </h2>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                      manifest.official
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-sky-500/15 text-sky-300'
                    }`}
                  >
                    {manifest.official ? 'Official' : 'Community'}
                  </span>
                </div>
                <p className="text-sm text-plaza-dim">{manifest.tagline}</p>
                <p className="mt-3 text-xs italic text-plaza-dim/80">
                  Problem: {manifest.problem}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-plaza-dim">
                  <span>by @{manifest.author.github}</span>
                  <span>·</span>
                  <span>{manifest.license}</span>
                  <span>·</span>
                  <span>SDK {manifest.sdk_version}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {manifest.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-plaza-bg px-2 py-0.5 text-[10px] text-plaza-dim"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs text-plaza-accent opacity-0 transition group-hover:opacity-100">
                  Open demo →
                </p>
              </button>
            </li>
          ))}
        </ul>

        <footer className="mt-10 rounded-lg border border-dashed border-plaza-border p-5 text-sm text-plaza-dim">
          <h3 className="mb-1 text-plaza-text">Want to add your own?</h3>
          <p>
            Start a folder under{' '}
            <code className="text-plaza-accent">src/demos/&lt;your-id&gt;/</code>{' '}
            and follow{' '}
            <a
              className="text-plaza-accent hover:underline"
              href="https://github.com/edisonduran/agent-did-in-action/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noreferrer"
            >
              CONTRIBUTING.md
            </a>{' '}
            plus{' '}
            <a
              className="text-plaza-accent hover:underline"
              href="https://github.com/edisonduran/agent-did-in-action/blob/main/docs/DEMO-SPEC.md"
              target="_blank"
              rel="noreferrer"
            >
              the demo spec
            </a>{' '}
            for the required files, <code className="text-plaza-accent">DemoModule</code>{' '}
            shape, tests, and CI checks before opening a PR.
          </p>
        </footer>
      </div>
    </div>
  );
}
