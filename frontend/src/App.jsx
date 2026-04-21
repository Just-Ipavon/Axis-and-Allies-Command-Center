import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { Shield, Clock, LogOut, RotateCcw } from 'lucide-react';
import { cn } from './utils/styles';
import { TURN_ORDER } from './constants/gameData';
import LobbyScreen from './components/LobbyScreen';
import NationCard from './components/NationCard';
import MiniNationCard from './components/MiniNationCard';

function App() {
  const { gameId, setGameId, initSocket, gameData, nations, logs, role, setRole, connected, resetGame, currentTurn, verifyMasterPassword, undoTurn } = useGameStore();

  useEffect(() => {
    initSocket();
  }, [initSocket]);

  const [timerDisplay, setTimerDisplay] = useState('00:00:00');

  useEffect(() => {
     if (!gameData) return;
     const interval = setInterval(() => {
         let totalSecs = gameData.play_time || 0;
         if (gameData.last_resume_at) {
             totalSecs += Math.floor((Date.now() - gameData.last_resume_at) / 1000);
         }
         const h = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
         const m = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
         const s = String(totalSecs % 60).padStart(2, '0');
         setTimerDisplay(`${h}:${m}:${s}`);
     }, 1000);
     return () => clearInterval(interval);
  }, [gameData]);

  if (!gameId) {
    return <LobbyScreen />;
  }

  if (!gameData) {
    return <div className="min-h-screen flex items-center justify-center text-2xl font-display">Enigma Decrypting...</div>;
  }

  return (
    <div className="min-h-screen p-4 max-w-6xl mx-auto flex flex-col gap-6">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center border-b-4 border-vintage-text pb-4 gap-4">
        <div>
           <h1 className="text-4xl md:text-5xl flex items-center gap-2 mb-2">
              <Shield className="w-10 h-10" />
              Axis & Allies 1942
           </h1>
           
           <div className="flex flex-wrap items-center gap-4 mb-2">
              <div className="bg-amber-400 text-black border-2 border-black px-3 py-1 font-mono font-bold text-lg tracking-widest uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                 CODE: {gameData.id}
              </div>
              <div className="text-xl font-bold uppercase tracking-wide">
                 {gameData.room_name || `Room ${gameData.id}`}
              </div>
           </div>

           <div className="opacity-70 text-sm mt-1 flex flex-wrap items-center gap-3">
             <span className="flex items-center gap-1"><Clock size={14} /> {connected ? 'Secure Connection' : 'Radio Silence'}</span>
             <span>•</span>
             <button onClick={() => setGameId(null)} className="flex items-center gap-1 underline hover:text-red-800 font-bold"><LogOut size={14} /> Leave Operation</button>
           </div>

           {/* TURN ORDER HEADER */}
           <div className="mt-4 flex flex-wrap gap-2 items-center">
               <span className="text-xs font-bold uppercase opacity-60 mr-2 border-b border-current">Sequence / Turn:</span>
               {role === 'banker' && (
                   <button 
                       onClick={() => {
                           if (window.confirm("Are you sure you want to undo the last turn? This will revert the collected income and step back one turn.")) {
                               undoTurn();
                           }
                       }}
                       className="mr-2 px-2 py-1 bg-red-800 text-white text-[10px] uppercase font-bold hover:bg-red-700 active:scale-95 flex items-center gap-1 shadow-sm border border-black"
                   >
                       <RotateCcw size={10} /> Undo Step
                   </button>
               )}
               {TURN_ORDER.map(t => (
                   <div key={t} className={cn("px-3 py-1 font-bold border-2 transition-all duration-300", 
                        currentTurn === t 
                        ? "bg-amber-400 text-black border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] scale-105 z-10" 
                        : "opacity-60 bg-black/10 border-current"
                   )}>
                       {t}
                   </div>
               ))}
           </div>
        </div>
        
         {/* Right Side: Timer & Role Selector */}
         <div className="flex flex-col gap-3 items-end">
             {/* Timer */}
             <div className="flex items-center gap-2 bg-black/80 text-amber-500 font-display text-2xl px-4 py-1 border-2 border-amber-500 shadow-[4px_4px_0_0_rgba(180,83,9,1)]">
                 <Clock size={20} className="text-amber-500" />
                 {timerDisplay}
             </div>

             {/* Role Selector */}
             <div className="flex py-2 px-4 border-2 border-vintage-text bg-vintage-paper shadow-[4px_4px_0_0_rgba(43,42,38,1)]">
               <span className="font-bold mr-2 uppercase tracking-wide self-center">Role:</span>
               <select 
                  value={role} 
                  onChange={(e) => {
                      const newRole = e.target.value;
                      if (newRole === 'banker') {
                          const pwd = prompt("Enter Master Password to access Banker role:");
                          if (!pwd) return;
                          verifyMasterPassword(pwd)
                              .then(() => setRole(newRole))
                              .catch(err => alert("Access Denied: " + err.message));
                      } else {
                          setRole(newRole);
                      }
                  }}
                  className="bg-transparent font-bold capitalize outline-none"
               >
                  <option value="">-- Seleziona Ruolo --</option>
                  <option value="banker">Game Master (Banker)</option>
                  {nations.map(n => <option key={n.name} value={n.name}>{n.name}</option>)}
               </select>
             </div>
         </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* NATIONS GRID */}
        <div className="lg:col-span-3 flex flex-col gap-6">
           {/* If Banker: Show Grid of All Full Cards */}
           {role === 'banker' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 items-start">
                 {nations.sort((a,b) => TURN_ORDER.indexOf(a.name) - TURN_ORDER.indexOf(b.name)).map(nation => <NationCard key={nation.name} nation={nation} isEditable={true} />)}
              </div>
           )}

           {/* If Single Player: Show Top Full Card + Minimap of Others */}
           {role !== 'banker' && (
              <>
                  <div>
                      {nations.filter(n => n.name === role).map(nation => (
                          <NationCard key={nation.name} nation={nation} isEditable={true} />
                      ))}
                  </div>

                  {nations.filter(n => n.name !== role).length > 0 && (
                      <div className="pt-4 border-t-2 border-vintage-text/20">
                          <h3 className="text-xs font-bold mb-3 uppercase tracking-widest opacity-60">Global Overview</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {nations.filter(n => n.name !== role)
                                .sort((a,b) => TURN_ORDER.indexOf(a.name) - TURN_ORDER.indexOf(b.name))
                                .map(nation => (
                                  <MiniNationCard key={nation.name} nation={nation} />
                              ))}
                          </div>
                      </div>
                  )}
              </>
           )}
        </div>

        {/* SIDEBAR: LOGS & CONTROLS */}
        <div className="flex flex-col gap-4">
            <div className="border-2 border-vintage-text bg-vintage-paper p-4 shadow-[4px_4px_0_0_rgba(43,42,38,1)] flex flex-col h-[600px]">
                <h3 className="font-display text-xl border-b-2 border-vintage-text mb-2 pb-1">Communication Log</h3>
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 text-sm opacity-80">
                    {logs.map(log => (
                        <div key={log.id} className="border-b border-vintage-border border-dashed pb-1">
                            <span className="opacity-50 text-xs">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                            <br />{log.message}
                        </div>
                    ))}
                    {logs.length === 0 && <div className="italic text-center mt-4">Awaiting transmissions...</div>}
                </div>
            </div>

            {role === 'banker' && (
                <button 
                  onClick={() => {
                      const pwd = prompt("Enter Master Password to authorize complete Server Data Wipe:");
                      if (!pwd) return;
                      verifyMasterPassword(pwd)
                          .then(() => {
                              if (window.confirm("CRITICAL WARNING: This will permanently erase this operation's database. Proceed?")) {
                                  resetGame(pwd).catch(e => alert(e.message));
                              }
                          })
                          .catch(err => alert("AUTHORIZATION DENIED."));
                  }}
                  className="vintage-btn text-red-800 bg-red-100 flex justify-center items-center gap-2 mt-4"
                >
                   <RotateCcw size={16} /> Reset Game Data
                </button>
            )}
        </div>

      </div>
    </div>
  );
}

export default App;
