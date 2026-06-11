import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';

function App() {
  const { gameId, initSocket } = useGameStore();

  useEffect(() => {
    initSocket();
  }, [initSocket]);

  useEffect(() => {
    const isDark = localStorage.getItem('axis_darkmode') === 'true';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  if (!gameId) {
    return <LobbyPage />;
  }

  return <GamePage />;
}

export default App;
