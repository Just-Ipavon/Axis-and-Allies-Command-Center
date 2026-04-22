import { useGameStore } from '../store/gameStore';
import { useTimer } from '../hooks/useTimer';
import GameHeader from '../features/game/components/GameHeader';
import GameMain from '../features/game/components/GameMain';
import GameSidebar from '../features/game/components/GameSidebar';

export default function GamePage() {
  const { 
    gameId, 
    setGameId, 
    gameData, 
    nations, 
    logs, 
    role, 
    setRole, 
    connected, 
    resetGame, 
    currentTurn, 
    verifyMasterPassword, 
    undoTurn 
  } = useGameStore();

  const timerDisplay = useTimer(gameData);

  if (!gameData) {
    return (
      <div className="min-h-screen flex items-center justify-center text-2xl font-display">
        Enigma Decrypting...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-6xl mx-auto flex flex-col gap-6">
      <GameHeader 
        gameData={gameData}
        connected={connected}
        setGameId={setGameId}
        role={role}
        setRole={setRole}
        currentTurn={currentTurn}
        undoTurn={undoTurn}
        verifyMasterPassword={verifyMasterPassword}
        timerDisplay={timerDisplay}
        nations={nations}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <GameMain role={role} nations={nations} />
        <GameSidebar 
          role={role} 
          logs={logs} 
          verifyMasterPassword={verifyMasterPassword} 
          resetGame={resetGame} 
        />
      </div>
    </div>
  );
}
