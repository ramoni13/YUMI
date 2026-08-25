import React, { useEffect, useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { useGameStore } from './store/gameStore';
import { Lobby } from './components/Lobby/Lobby';
import { Board } from './components/Board/Board';
import { FluxBoard } from './components/flux/FluxBoard';
import { GameOver } from './components/Scores/GameOver';
import './App.css';

type AppView = 'lobby' | 'game' | 'gameover';

function App() {
  useSocket();
  const { gameState, room, reset } = useGameStore();
  const [view, setView] = useState<AppView>('lobby');

  useEffect(() => {
    if (!gameState) return;
    if (gameState.phase === 'GAME_OVER') {
      setView('gameover');
    } else if (gameState.phase !== 'LOBBY') {
      setView('game');
    }
  }, [gameState?.phase]);

  const handleReplay = () => {
    reset();
    setView('lobby');
  };

  // Déterminer le mode depuis gameState (source de vérité en cours de partie)
  // ou depuis room (avant le démarrage)
  const gameMode = gameState?.gameMode ?? room?.gameMode ?? 'classic';

  return (
    <div className="app">
      {view === 'lobby' && <Lobby onGameStart={() => setView('game')} />}
      {view === 'game' && (
        gameMode === 'flux' ? <FluxBoard /> : <Board />
      )}
      {view === 'gameover' && <GameOver onReplay={handleReplay} />}
    </div>
  );
}

export default App;
