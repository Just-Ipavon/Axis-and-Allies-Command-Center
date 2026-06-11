import { useState } from 'react';
import { Shield, Clock, LogOut, RotateCcw, Sun, Moon } from 'lucide-react';
import { cn } from '../../../utils/styles';
import { getTurnOrder } from '../../../constants/gameData';

const FLAG_MAP = {
  'USSR': '/flags/Russians_large.png',
  'Germany': '/flags/Germans_large.png',
  'UK': '/flags/British_large.png',
  'Japan': '/flags/Japanese_large.png',
  'USA': '/flags/Americans_large.png',
  'Italy': '/flags/Italians_large.png',
};

export default function GameHeader({ 
  gameData, 
  connected, 
  setGameId, 
  role, 
  setRole, 
  currentTurn, 
  undoTurn, 
  verifyMasterPassword, 
  timerDisplay,
  nations 
}) {
  const version = gameData.game_version || '1942';
  const turnOrder = getTurnOrder(version);
  
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('axis_darkmode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('axis_darkmode', 'false');
    }
  };

  const getHeaderTitle = () => {
    if (version === 'anniversary_1941') return 'Axis & Allies Anniversary (1941)';
    if (version === 'anniversary_1942') return 'Axis & Allies Anniversary (1942)';
    return 'Axis & Allies 1942';
  };

  return (
    <header className="flex flex-col md:flex-row justify-between items-center border-b-4 border-vintage-text pb-4 gap-4">
      <div>
         <h1 className="text-[5.5vw] sm:text-3xl md:text-4xl lg:text-5xl flex items-center gap-2 mb-2 font-display uppercase tracking-wide whitespace-nowrap">
            <Shield className="w-8 h-8 md:w-10 md:h-10 shrink-0" />
            {getHeaderTitle()}
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
 
          <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold uppercase opacity-60 mr-2 border-b border-current">Sequence / Turn:</span>
              {(role === 'banker' || version.startsWith('anniversary')) && (
                  <button 
                      onClick={() => {
                          if (version.startsWith('anniversary') && role !== 'banker') {
                              const pwd = prompt("Enter Master Password to Undo Step:");
                              if (!pwd) return;
                              verifyMasterPassword(pwd)
                                  .then(() => {
                                      if (window.confirm("Are you sure you want to undo the last turn? This will revert the collected income and step back one turn.")) {
                                          undoTurn();
                                      }
                                  })
                                  .catch(err => alert("Access Denied: " + err.message));
                          } else {
                              if (window.confirm("Are you sure you want to undo the last turn? This will revert the collected income and step back one turn.")) {
                                  undoTurn();
                              }
                          }
                      }}
                      className="mr-2 px-2 py-1 bg-red-800 text-white text-[10px] uppercase font-bold hover:bg-red-700 active:scale-95 flex items-center gap-1 shadow-sm border border-black"
                  >
                      <RotateCcw size={10} /> Undo Step
                  </button>
              )}
              {turnOrder.map(t => (
                  <div key={t} className={cn("px-3 py-1 font-bold border-2 transition-all duration-300 flex items-center gap-2", 
                       currentTurn === t 
                       ? "bg-amber-400 text-black border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] scale-105 z-10" 
                       : "opacity-60 bg-black/10 border-current"
                  )}>
                      {FLAG_MAP[t] && <img src={FLAG_MAP[t]} alt={t} className="w-5 h-5 rounded-full border border-black/30 animate-in fade-in" />}
                      {t}
                  </div>
              ))}
          </div>
      </div>
      
             <div className="flex flex-col gap-3 items-end">
            <div className="flex gap-2 items-center">
                <button 
                  onClick={toggleDarkMode}
                  className="p-2 border-2 border-vintage-text bg-vintage-paper shadow-[4px_4px_0_0_rgba(43,42,38,1)] hover:bg-vintage-bg/40 active:translate-y-[1px] active:translate-x-[1px] transition-all rounded"
                  title="Toggle Theme"
                >
                  {isDark ? <Sun size={20} className="text-amber-500 shrink-0" /> : <Moon size={20} className="shrink-0" />}
                </button>
                
                <div className="flex items-center gap-2 bg-black/80 text-amber-500 font-display text-2xl px-4 py-1 border-2 border-amber-500 shadow-[4px_4px_0_0_rgba(180,83,9,1)]">
                    <Clock size={20} className="text-amber-500" />
                    {timerDisplay}
                </div>
            </div>

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
                <option value="">-- Select Role --</option>
                <option value="banker">Game Master (Banker)</option>
                {nations.map(n => <option key={n.name} value={n.name}>{n.name}</option>)}
             </select>
           </div>
       </div>
    </header>
  );
}
