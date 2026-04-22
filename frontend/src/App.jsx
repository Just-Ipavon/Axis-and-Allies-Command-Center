import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';

function App() {
  const { gameId, initSocket } = useGameStore();

  useEffect(() => {
    initSocket();
  }, [initSocket]);

  if (!gameId) {
    return <LobbyPage />;
  }

  return <GamePage />;
}

export default App;
