import React, { useEffect, useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { useGameStore } from './store/gameStore';
import { Lobby } from './components/Lobby/Lobby';
import { Board } from './components/Board/Board';
import { GameOver } from './components/Scores/GameOver';
import './App.css';

type AppView = 'lobby' | 'game' | 'gameover';

function App() {
  useSocket(); // Initialise la connexion WebSocket
  const { gameState, reset } = useGameStore();
  const [view, setView] = useState<AppView>('lobby');

  // Surveiller la phase de jeu pour naviguer automatiquement
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

  return (
    <div className="app">
      {view === 'lobby' && <Lobby onGameStart={() => setView('game')} />}
      {view === 'game' && <Board />}
      {view === 'gameover' && <GameOver onReplay={handleReplay} />}
    </div>
  );
}

export default App;
