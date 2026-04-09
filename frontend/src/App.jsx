import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { Shield, Clock, Plus, Minus, RotateCcw, LogOut, Trash2, Lock } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Unit costs standard for 1942 2nd Edition
const UNIT_COSTS = {
  'Infantry': 3,
  'Artillery': 4,
  'Tank': 5,
  'AA Gun': 6,
  'Fighter': 10,
  'Bomber': 12,
  'Submarine': 6,
  'Transport': 7,
  'Destroyer': 8,
  'Cruiser': 12,
  'Carrier': 14,
  'Battleship': 20,
  'Industrial Complex': 15,
};

function NationCard({ nation, isEditable }) {
  const { updateNationBank } = useGameStore();

  const handleIncomeChange = (amount) => {
    if (!isEditable) return;
    const newIncome = nation.income + amount;
    const log = `${nation.name} income changed by ${amount} (Now: ${newIncome})`;
    updateNationBank(nation.name, newIncome, nation.bank, nation.purchases, nation.player_name, log);
  };

  const handleBankChange = (amount) => {
      if (!isEditable) return;
      const newBank = nation.bank + amount;
      const log = `${nation.name} bank changed by ${amount} directly (Now: ${newBank})`;
      updateNationBank(nation.name, nation.income, newBank, nation.purchases, nation.player_name, log);
  };

  const handlePurchase = (unit, dQty) => {
      if (!isEditable) return;
      const currentPurchases = nation.purchases || {};
      const currentQty = currentPurchases[unit] || 0;
      const newQty = currentQty + dQty;

      if (newQty < 0) return; // can't buy negative

      const costDiff = UNIT_COSTS[unit] * dQty;
      if (nation.bank - costDiff < 0) return; // Not enough money

      const newBank = nation.bank - costDiff;
      const newPurchases = { ...currentPurchases, [unit]: newQty };

      updateNationBank(nation.name, nation.income, newBank, newPurchases, nation.player_name);
  };

  const collectIncome = () => {
      if (!isEditable) return;
      const log = `${nation.name} collects income (${nation.income} IPC).`;
      
      // Also clear purchases for the new turn
      updateNationBank(nation.name, nation.income, nation.bank + nation.income, {}, nation.player_name, log);
  };

  const handlePlayerNameChange = (e) => {
      if (!isEditable) return;
      updateNationBank(nation.name, nation.income, nation.bank, nation.purchases, e.target.value);
  };

  const colorClasses = {
      'USSR': 'bg-faction-ussr text-white border-vintage-text',
      'Germany': 'bg-faction-germany text-white border-vintage-text',
      'UK': 'bg-faction-uk text-black border-vintage-text',
      'Japan': 'bg-faction-japan text-white border-vintage-text',
      'USA': 'bg-faction-usa text-white border-vintage-text',
  }[nation.name] || 'bg-vintage-paper';

  return (
    <div className={cn("p-4 border-2 shadow-[4px_4px_0_0_rgba(43,42,38,1)] flex flex-col gap-4", colorClasses)}>
      <div className="flex justify-between items-center border-b-2 tracking-widest border-current pb-2">
        <div>
           <h2 className="text-2xl">{nation.name}</h2>
           {isEditable ? (
             <input 
                 type="text" 
                 placeholder="Player Name" 
                 value={nation.player_name || ''} 
                 onChange={handlePlayerNameChange}
                 className="bg-black/20 text-sm p-1 outline-none w-32 border-b border-dashed border-current focus:bg-black/30 placeholder-current/50" 
             />
           ) : (
             <div className="text-sm italic opacity-80">{nation.player_name || 'No Commander'}</div>
           )}
        </div>
        <div className="text-right">
          <div className="text-sm uppercase opacity-80">Bank (IPC)</div>
          <div className="text-3xl font-display">{nation.bank}</div>
        </div>
      </div>

      {/* Income Tracker */}
      <div className="flex bg-black/20 p-2 justify-between items-center">
         <div>
            <div className="text-xs uppercase opacity-80">Income</div>
            <div className="text-xl font-bold">{nation.income}</div>
         </div>
         {isEditable && (
             <div className="flex gap-2">
                 <button onClick={() => handleIncomeChange(-1)} className="bg-black/30 p-1 hover:bg-black/50 active:scale-95"><Minus size={16} /></button>
                 <button onClick={() => handleIncomeChange(1)} className="bg-white/30 text-black p-1 hover:bg-white/50 active:scale-95"><Plus size={16} /></button>
             </div>
         )}
      </div>

      {/* Purchase Section */}
      <div className="flex-1 mt-2">
          <h3 className="text-sm font-bold uppercase mb-2">Mobilization</h3>
          <div className="flex flex-col gap-1 text-sm overflow-y-auto max-h-[300px] pr-1">
             {Object.keys(UNIT_COSTS).map(unit => {
                 const qty = (nation.purchases && nation.purchases[unit]) || 0;
                 return (
                     <div key={unit} className="flex justify-between items-center bg-black/10 py-1.5 px-2">
                         <div className="pr-1" title={`${unit} (${UNIT_COSTS[unit]})`}>{unit}</div>
                         {isEditable ? (
                         <div className="flex items-center gap-1">
                            <span className="opacity-70 text-xs w-2 text-right">{qty || ''}</span>
                            <button onClick={() => handlePurchase(unit, -1)} className="bg-black/30 h-5 w-5 flex items-center justify-center hover:bg-black/50 active:scale-95">-</button>
                            <button onClick={() => handlePurchase(unit, 1)} className="bg-white/30 text-black h-5 w-5 flex items-center justify-center hover:bg-white/50 active:scale-95">+</button>
                         </div>
                         ) : (
                             <div className="font-bold">{qty > 0 ? `x${qty}` : ''}</div>
                         )}
                     </div>
                 )
             })}
          </div>
      </div>

      {isEditable && (
          <div className="pt-2 border-t-2 border-current/30 mt-auto flex justify-between gap-2">
              <div className="flex gap-1">
                 <button onClick={() => handleBankChange(-1)} className="bg-black/30 p-2 hover:bg-black/50">- IPC</button>
                 <button onClick={() => handleBankChange(1)} className="bg-white/30 text-black p-2 hover:bg-white/50">+ IPC</button>
              </div>
              <button onClick={collectIncome} className="bg-green-600/80 text-white font-bold p-2 border border-current shadow-sm hover:bg-green-600 active:scale-95 flex-1 text-center">
                  Collect Income
              </button>
          </div>
      )}
    </div>
  );
}

function LobbyScreen() {
  const { setGameId, availableRooms, fetchRooms, connected, deleteRoom } = useGameStore();
  const [newRoomName, setNewRoomName] = useState('');

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if(newRoomName.trim()) {
      const pwd = prompt('Enter an optional password to protect this operation (leave blank for public access):') || '';
      try {
        await setGameId({ gameId: newRoomName.trim(), password: pwd, isCreating: true });
      } catch (err) {
        alert(`ERROR: ${err.message}`);
      }
    }
  };

  const handleJoin = async (room) => {
      let pwd = '';
      if (room.hasPassword) {
          pwd = prompt(`Enter password for ${room.id}:`) || '';
      }
      try {
          await setGameId({ gameId: room.id, password: pwd });
      } catch (err) {
          alert(`ERROR: ${err.message}`);
      }
  };

  const handleDelete = async (e, room) => {
      e.stopPropagation();
      const pwd = prompt(`Authorize permanent deletion of ${room.id}. Enter MASTER admin code:`);
      if (pwd === null) return;
      
      try {
          await deleteRoom(room.id, pwd);
      } catch (err) {
          alert(`ACCESS DENIED: ${err.message}`);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-vintage-paper border-4 border-vintage-text shadow-[8px_8px_0_0_rgba(43,42,38,1)] p-8">
        
        <div className="text-center mb-8 border-b-2 border-vintage-text pb-6">
          <Shield className="w-16 h-16 mx-auto mb-4 text-vintage-text" />
          <h1 className="text-4xl font-display uppercase tracking-wider text-vintage-text">
            Axis & Allies
          </h1>
          <h2 className="text-xl font-display tracking-widest text-vintage-text/80 mt-1">
            Command Center
          </h2>
          <div className="mt-2 flex justify-center items-center gap-2 text-sm opacity-70">
            <span className={cn("w-3 h-3 rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]", connected ? "bg-green-500" : "bg-red-500")} />
            {connected ? "Server Online" : "Connecting to HQ..."}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
              <Clock size={16} /> Active Operations
            </h3>
            <div className="bg-black/5 border border-vintage-text/30 h-48 overflow-y-auto p-2 space-y-2 shadow-inner">
              {availableRooms.length === 0 ? (
                <div className="text-center italic opacity-60 mt-8">No active operations found.</div>
              ) : (
                availableRooms.map(room => (
                  <div key={room.id} className="flex gap-1">
                    <button 
                      onClick={() => handleJoin(room)}
                      className="flex-1 text-left px-3 py-2 bg-vintage-bg border border-vintage-text/50 hover:bg-black/10 active:scale-[0.98] transition-all font-bold flex justify-between items-center"
                    >
                      <span className="flex items-center gap-2">
                          {room.id} 
                          {room.hasPassword ? <Lock size={14} className="opacity-70" /> : null}
                      </span>
                      <span className="text-xs opacity-50 uppercase">Join &rarr;</span>
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, room)}
                      className="px-3 py-2 bg-vintage-bg border border-vintage-text/50 hover:bg-red-800 hover:text-white transition-all outline-none"
                      title="Delete Operation"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <button onClick={fetchRooms} className="text-xs uppercase underline mt-2 opacity-70 hover:opacity-100">Refresh List</button>
          </div>

          <div className="pt-4 border-t-2 border-vintage-text/20">
            <h3 className="font-bold uppercase tracking-wide mb-3">Initiate New Operation</h3>
            <form onSubmit={handleCreate} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Operation Code Name" 
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                className="flex-1 bg-vintage-bg border-2 border-vintage-text p-2 outline-none focus:bg-white/50"
                required
              />
              <button type="submit" className="vintage-btn whitespace-nowrap">
                Create
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { gameId, setGameId, initSocket, gameData, nations, logs, role, setRole, connected, resetGame } = useGameStore();

  useEffect(() => {
    initSocket();
  }, [initSocket]);

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
           <h1 className="text-4xl md:text-5xl flex items-center gap-2">
              <Shield className="w-10 h-10" />
              Axis & Allies 1942
           </h1>
           <div className="opacity-70 text-sm mt-1 flex items-center gap-3">
             <span className="flex items-center gap-1"><Clock size={14} /> Room: <strong>{gameData.id}</strong></span>
             <span>•</span>
             <span>{connected ? 'Secure Connection' : 'Radio Silence'}</span>
             <span>•</span>
             <button onClick={() => setGameId(null)} className="flex items-center gap-1 underline hover:text-red-800"><LogOut size={14} /> Leave Room</button>
           </div>
        </div>
        
        {/* Role Selector */}
        <div className="flex py-2 px-4 border-2 border-vintage-text bg-vintage-paper shadow-[4px_4px_0_0_rgba(43,42,38,1)]">
           <span className="font-bold mr-2 uppercase tracking-wide self-center">Role:</span>
           <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              className="bg-transparent font-bold capitalize outline-none"
           >
              <option value="banker">Game Master (Banker)</option>
              {nations.map(n => <option key={n.name} value={n.name}>{n.name}</option>)}
           </select>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* NATIONS GRID */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {nations.map(nation => {
              const isEditable = role === 'banker' || role === nation.name;
              return <NationCard key={nation.name} nation={nation} isEditable={isEditable} />
           })}
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
                      if(window.confirm("RESET GAME? This will wipe all data.")) resetGame();
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
