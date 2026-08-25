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
  const { gameState, room, selectedGameMode, reset } = useGameStore();
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

  // Priorité : gameState (en cours de partie) > selectedGameMode (choix local immédiat) > room > 'classic'
  const gameMode = gameState?.gameMode ?? selectedGameMode ?? room?.gameMode ?? 'classic';

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
