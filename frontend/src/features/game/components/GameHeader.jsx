import { Shield, Clock, LogOut, RotateCcw } from 'lucide-react';
import { cn } from '../../../utils/styles';
import { TURN_ORDER } from '../../../constants/gameData';

const FLAG_MAP = {
  'USSR': '/flags/Russians_large.png',
  'Germany': '/flags/Germans_large.png',
  'UK': '/flags/British_large.png',
  'Japan': '/flags/Japanese_large.png',
  'USA': '/flags/Americans_large.png',
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
  return (
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
                 <div key={t} className={cn("px-3 py-1 font-bold border-2 transition-all duration-300 flex items-center gap-2", 
                      currentTurn === t 
                      ? "bg-amber-400 text-black border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] scale-105 z-10" 
                      : "opacity-60 bg-black/10 border-current"
                 )}>
                     {FLAG_MAP[t] && <img src={FLAG_MAP[t]} alt={t} className="w-5 h-5 rounded-full border border-black/30" />}
                     {t}
                 </div>
             ))}
         </div>
      </div>
      
       <div className="flex flex-col gap-3 items-end">
           <div className="flex items-center gap-2 bg-black/80 text-amber-500 font-display text-2xl px-4 py-1 border-2 border-amber-500 shadow-[4px_4px_0_0_rgba(180,83,9,1)]">
               <Clock size={20} className="text-amber-500" />
               {timerDisplay}
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
                <option value="">-- Seleziona Ruolo --</option>
                <option value="banker">Game Master (Banker)</option>
                {nations.map(n => <option key={n.name} value={n.name}>{n.name}</option>)}
             </select>
           </div>
       </div>
    </header>
  );
}
