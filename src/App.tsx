import { useState } from 'react';
import { Header } from './ui/Header';
import { Hud } from './ui/Hud';
import { SceneContainer } from './scene/SceneContainer';

export default function App() {
  const [attackerMode, setAttackerMode] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <Header />
      <main className="relative flex-1">
        <SceneContainer attackerMode={attackerMode} />
        <Hud attackerMode={attackerMode} onToggleAttacker={setAttackerMode} />
      </main>
    </div>
  );
}
