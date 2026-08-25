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
    } else if (gameState.phase !== 'LOBBY' && gameState.phase !== 'SETUP') {
      setView('game');
    }
  }, [gameState?.phase]);

  const handleReplay = () => {
    reset();
    setView('lobby');
  };

  // Résolution du mode — recalculé à chaque render
  // gameState.gameMode : source absolue quand la partie tourne
  // selectedGameMode   : fixé dès le choix dans le Lobby ou le join_room
  // room.gameMode      : fallback depuis la salle
  // 'flux'             : valeur par défaut
  const resolvedGameMode =
    gameState?.gameMode ??
    selectedGameMode ??
    room?.gameMode ??
    'flux';

  return (
    <div className="app">
      {view === 'lobby' && <Lobby onGameStart={() => setView('game')} />}
      {view === 'game' && (
        resolvedGameMode === 'flux' ? <FluxBoard /> : <Board />
      )}
      {view === 'gameover' && <GameOver onReplay={handleReplay} />}
    </div>
  );
}

export default App;
