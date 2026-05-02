import { Header } from './ui/Header';
import { SceneContainer } from './scene/SceneContainer';

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <Header />
      <main className="relative flex-1">
        <SceneContainer />
        <div className="pointer-events-none absolute bottom-3 left-3 rounded border border-plaza-border bg-plaza-panel/90 px-3 py-2 text-xs text-plaza-dim">
          Day 2 — Pixi scene scaffold. Agents are static; Day 3 wires the
          simulation engine and live signing.
        </div>
      </main>
    </div>
  );
}
