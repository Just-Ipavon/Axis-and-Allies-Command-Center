import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { Shield, Clock, Plus, Minus, RotateCcw, LogOut, Trash2, Lock, Swords } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const TURN_ORDER = ['USSR', 'Germany', 'UK', 'Japan', 'USA'];

// Unit costs standard for 1942 2nd Edition
const UNITS = {
  'Infantry': { cost: 3, a: 1, d: 2, m: 1 },
  'Artillery': { cost: 4, a: 2, d: 2, m: 1 },
  'Tank': { cost: 6, a: 3, d: 3, m: 2 },
  'AA Gun': { cost: 5, a: '-', d: '-', m: 1 },
  'Fighter': { cost: 10, a: 3, d: 4, m: 4 },
  'Bomber': { cost: 12, a: 4, d: 1, m: 6 },
  'Submarine': { cost: 6, a: 2, d: 1, m: 2 },
  'Transport': { cost: 7, a: 0, d: 0, m: 2 },
  'Destroyer': { cost: 8, a: 2, d: 2, m: 2 },
  'Cruiser': { cost: 12, a: 3, d: 3, m: 2 },
  'Carrier': { cost: 14, a: 1, d: 2, m: 2 },
  'Battleship': { cost: 20, a: 4, d: 4, m: 2 },
  'Industrial Complex': { cost: 15, a: '-', d: '-', m: '-' },
};

function MiniNationCard({ nation }) {
  const colorClasses = {
      'USSR': 'bg-faction-ussr text-white border-vintage-text',
      'Germany': 'bg-faction-germany text-white border-vintage-text',
      'UK': 'bg-faction-uk text-black border-vintage-text',
      'Japan': 'bg-faction-japan text-white border-vintage-text',
      'USA': 'bg-faction-usa text-white border-vintage-text',
  }[nation.name] || 'bg-vintage-paper';

  return (
    <div className={cn("p-2 border-2 shadow-[2px_2px_0_0_rgba(43,42,38,1)] flex justify-between items-center w-full", colorClasses)}>
        <div className="font-bold text-lg tracking-wider">{nation.name}</div>
        <div className="flex gap-6 text-sm uppercase opacity-90">
            <div className="text-right whitespace-nowrap"><span className="opacity-70 text-xs block -mb-1">Income</span><span className="font-bold">{nation.income}</span></div>
            <div className="text-right whitespace-nowrap"><span className="opacity-70 text-xs block -mb-1">Bank</span><span className="font-bold text-lg font-display">{nation.bank}</span></div>
        </div>
    </div>
  )
}

function NationCard({ nation, isEditable }) {
  const { updateNationBank, conquerTerritory, advanceTurn, currentTurn, role, addFactory, removeFactory, updateFactoryDamage, transferFactory } = useGameStore();

  const isMyTurn = currentTurn === nation.name;
  const canCollect = isEditable && isMyTurn;
  const [battleMode, setBattleMode] = useState(false);
  const [battleVictim, setBattleVictim] = useState('');
  const [battleValue, setBattleValue] = useState(1);
  const [battleTargetType, setBattleTargetType] = useState('income');
  const [adminEditMode, setAdminEditMode] = useState(false);
  const [transferFactoryData, setTransferFactoryData] = useState(null);
  const [transferVictim, setTransferVictim] = useState('');

  const requestAdminMode = () => {
      const pwd = prompt("Enter Master Admin Code to manually override IPC values:");
      if (pwd === "562656") setAdminEditMode(true);
      else alert("Access Denied");
  };

  const AXIS = ['Germany', 'Japan'];
  const ALLIES = ['USSR', 'UK', 'USA'];
  const isAxis = AXIS.includes(nation.name);
  const enemyAlliance = isAxis ? ALLIES : AXIS;

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

  const handleIncomeManualChange = (e) => {
      if (!isEditable) return;
      let val = e.target.value;
      if (val === '') val = 0;
      else val = parseInt(val) || 0;
      updateNationBank(nation.name, val, nation.bank, nation.purchases, nation.player_name);
  };

  const handleBankManualChange = (e) => {
      if (!isEditable) return;
      let val = e.target.value;
      if (val === '') val = 0;
      else val = parseInt(val) || 0;
      updateNationBank(nation.name, nation.income, val, nation.purchases, nation.player_name);
  };

  const factories = nation.factories || [];
  const totalCapacity = factories.reduce((sum, f) => sum + Math.max(0, parseInt(f.capacity || 0) - parseInt(f.damage || 0)), 0);

  const currentPurchases = nation.purchases || {};
  let totalPurchased = 0;
  Object.entries(currentPurchases).forEach(([unit, qty]) => {
      if (unit !== 'Industrial Complex') totalPurchased += qty;
  });

  const handlePurchase = (unit, dQty) => {
      if (!isEditable) return;
      const currentQty = currentPurchases[unit] || 0;
      const newQty = currentQty + dQty;

      if (newQty < 0) return; // can't buy negative

      if (dQty > 0 && unit !== 'Industrial Complex') {
          if (totalPurchased >= totalCapacity) {
              return alert(`Maximum production capacity (${totalCapacity}) reached! You must remove items or build more capacity to purchase more units!`);
          }
      }

      const costDiff = UNITS[unit].cost * dQty;
      if (nation.bank - costDiff < 0) return alert("Not enough IPCs in Bank!"); 

      if (unit === 'Industrial Complex' && dQty > 0) {
          const tName = prompt("Enter the Territory name for this new Industrial Complex:");
          if (!tName) return; 
          const cap = prompt(`Enter the base IPC Value of ${tName}:`);
          if (!cap) return;
          addFactory(nation.name, tName, parseInt(cap));
      }

      const newBank = nation.bank - costDiff;
      const newPurchases = { ...currentPurchases, [unit]: newQty };

      updateNationBank(nation.name, nation.income, newBank, newPurchases, nation.player_name);
  };

  const handleConquer = () => {
      if (!battleVictim) return alert("Select a target nation");
      conquerTerritory(nation.name, battleVictim, battleValue, battleTargetType);
      setBattleMode(false);
  };

  const collectIncome = () => {
      if (!isEditable) return;
      
      const items = Object.entries(nation.purchases || {})
          .filter(([_, qty]) => qty > 0)
          .map(([unit, qty]) => `${qty}x ${unit}`)
          .join(', ');
          
      const purchaseStr = items ? ` (Mobilized: ${items})` : '';
      const log = `${nation.name} collects income (${nation.income} IPC).${purchaseStr}`;
      
      // Also clear purchases for the new turn
      updateNationBank(nation.name, nation.income, nation.bank + nation.income, {}, nation.player_name, log);
      advanceTurn();
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
          <div className="text-sm uppercase opacity-80 flex justify-end items-center gap-1">
             Bank (IPC)
             {isEditable && !adminEditMode && <button onClick={requestAdminMode} title="Unlock manual editing" className="opacity-50 hover:opacity-100 hover:text-amber-400"><Lock size={10} /></button>}
             {adminEditMode && <Lock size={10} className="text-red-500" title="Editing Unlocked" />}
          </div>
          {adminEditMode ? (
             <input 
                 type="number" 
                 className="text-3xl font-display w-24 bg-transparent outline-none text-right border-b border-dashed border-red-500 focus:bg-black/10" 
                 value={nation.bank} 
                 onChange={handleBankManualChange} 
             />
          ) : (
             <div className="text-3xl font-display">{nation.bank}</div>
          )}
        </div>
      </div>

      {/* Income Tracker */}
      <div className="flex bg-black/20 p-2 justify-between items-center">
         <div className="relative">
            <div className="text-xs uppercase opacity-80">Income</div>
            {adminEditMode ? (
               <input 
                   type="number" 
                   className="text-xl font-bold w-16 bg-transparent outline-none border-b border-dashed border-red-500 focus:bg-black/10" 
                   value={nation.income} 
                   onChange={handleIncomeManualChange} 
               />
            ) : (
               <div className="text-xl font-bold">{nation.income}</div>
            )}

            {isEditable && battleMode && (
               <div className="absolute top-12 left-0 text-sm bg-[#5c5647] text-[#f4ecd8] border-2 border-current shadow-xl p-3 z-50 w-64">
                   <div className="font-bold mb-1 uppercase text-xs opacity-80">Conquered Value</div>
                   <input type="number" value={battleValue} onChange={e=>setBattleValue(e.target.value)} className="w-full text-black px-2 py-1 font-bold outline-none" min={1} />
                   
                   <div className="font-bold mt-2 mb-1 uppercase text-xs opacity-80">Target:</div>
                   <div className="flex gap-4 text-xs font-bold mb-2">
                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={battleTargetType==='bank'} onChange={()=>setBattleTargetType('bank')} /> Bank IPC</label>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={battleTargetType==='income'} onChange={()=>setBattleTargetType('income')} /> Income</label>
                   </div>

                   <div className="font-bold mt-2 mb-1 uppercase text-xs opacity-80">From Nation</div>
                   <select value={battleVictim} onChange={e=>setBattleVictim(e.target.value)} className="w-full text-black px-2 py-1 font-bold outline-none cursor-pointer">
                      <option value="">-- Select Enemy --</option>
                      {enemyAlliance.map(n => <option key={n} value={n}>{n}</option>)}
                   </select>
                   <div className="flex gap-2 mt-4">
                       <button onClick={handleConquer} className="flex-1 bg-green-700 text-white shadow-sm border border-black font-bold py-2 uppercase hover:bg-green-600 active:scale-95">Confirm</button>
                       <button onClick={()=>setBattleMode(false)} className="flex-1 bg-red-900 border text-white shadow-sm border-black font-bold py-2 uppercase hover:bg-red-800 active:scale-95">Cancel</button>
                   </div>
               </div>
            )}
         </div>
      </div>

      {/* Purchase Section */}
      <div className="flex-1 mt-2">
          <div className="flex justify-between items-end mb-1 border-b border-current/20 pb-1">
             <h3 className="text-sm font-bold uppercase">Mobilization</h3>
             <span className="text-xs bg-white/20 px-2 py-0.5 font-bold shadow-sm border border-current">Capacity limit: {totalPurchased}/{totalCapacity}</span>
          </div>
          <div className="flex flex-col gap-1 text-sm overflow-y-auto max-h-[170px] pr-1">
             {Object.keys(UNITS).map(unit => {
                 const qty = (nation.purchases && nation.purchases[unit]) || 0;
                 return (
                     <div key={unit} className="flex justify-between items-center bg-black/10 py-1.5 px-2">
                         <div className="pr-1 flex items-baseline gap-2">
                             <span>{unit}</span>
                             <span className="opacity-50 text-[10px] font-bold">A{UNITS[unit].a} D{UNITS[unit].d} M{UNITS[unit].m}</span>
                             <span className="opacity-80 text-xs font-bold text-amber-500/80">IPC {UNITS[unit].cost}</span>
                         </div>
                         {isEditable ? (
                         <div className="flex items-center gap-1">
                            <span className="opacity-70 text-xs w-2 text-right">{qty > 0 ? qty : ''}</span>
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

      {/* Factories Management */}
      <div className="mt-1 relative">
           <div className="flex justify-between items-center mb-1">
               <h3 className="text-xs font-bold uppercase opacity-80">Industrial Complexes</h3>
               {isEditable && <button onClick={() => {
                   const tName = prompt("Add Free Setup Factory Location:");
                   if(!tName) return;
                   addFactory(nation.name, tName, parseInt(prompt("Territory IPC Value:")||1));
               }} className="text-[10px] bg-black/30 text-white px-2 py-0.5 hover:bg-black/50 active:scale-95 border border-current">ADD FREE</button>}
           </div>

           {isEditable && transferFactoryData && (
               <div className="absolute top-8 left-0 text-sm bg-[#5c5647] text-[#f4ecd8] border-2 border-current shadow-xl p-3 z-50 w-[260px]">
                   <div className="font-bold mb-2 uppercase text-xs">Transfer {transferFactoryData.name} ({transferFactoryData.capacity} IPC)</div>
                   <div className="font-bold mt-2 mb-1 uppercase text-xs opacity-80">Conquered By</div>
                   <select value={transferVictim} onChange={e=>setTransferVictim(e.target.value)} className="w-full text-black px-2 py-1 font-bold outline-none cursor-pointer">
                      <option value="">-- Select Conqueror --</option>
                      {enemyAlliance.map(n => <option key={n} value={n}>{n}</option>)}
                   </select>
                   <div className="flex gap-2 mt-4">
                       <button onClick={() => {
                           if (!transferVictim) return alert("Select a conqueror");
                           transferFactory(nation.name, transferVictim, transferFactoryData.id);
                           setTransferFactoryData(null);
                           setTransferVictim('');
                       }} className="flex-1 bg-blue-800 text-white shadow-sm border border-black font-bold py-2 uppercase hover:bg-blue-700 active:scale-95">Transfer</button>
                       <button onClick={() => {setTransferFactoryData(null); setTransferVictim('');}} className="flex-1 bg-red-900 border text-white shadow-sm border-black font-bold py-2 uppercase hover:bg-red-800 active:scale-95">Cancel</button>
                   </div>
               </div>
           )}

           <div className="flex flex-col gap-1 text-sm max-h-[120px] overflow-y-auto">
               {factories.map(f => (
                   <div key={f.id} className="flex justify-between items-center bg-black/20 p-1 px-2 text-xs border border-current shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]">
                       <div className="flex flex-col">
                           <span className="font-bold">{f.name} (Cap {f.capacity})</span>
                           <span className="opacity-60 text-[10px]">Max Dmg: {f.capacity * 2}</span>
                       </div>
                       <div className="flex items-center gap-1">
                           <div className={cn("font-bold px-1.5 border min-w-[36px] text-center", f.damage > 0 ? "bg-red-800 text-white border-red-900" : "bg-black/20 border-current opacity-80")}>
                               Dmg: {f.damage}
                           </div>
                            {isEditable && (
                               <div className="flex gap-1 ml-1">
                                    <button onClick={() => updateFactoryDamage(nation.name, f.id, 1)} title="Add 1 Damage (Bombing Raid)" className="w-6 h-5 bg-red-900 text-white flex justify-center items-center font-bold hover:bg-red-700 active:scale-95">+</button>
                                    <button onClick={() => updateFactoryDamage(nation.name, f.id, 1, true)} disabled={!f.repairedThisTurn} title="Undo Repair (Refund 1 IPC)" className={cn("w-6 h-5 flex justify-center items-center font-bold active:scale-95", f.repairedThisTurn ? "bg-amber-500 text-black hover:bg-amber-400" : "bg-black/40 text-white/50 cursor-not-allowed")}>↩️</button>
                                    <button onClick={() => updateFactoryDamage(nation.name, f.id, -1)} title="Repair 1 Damage (Cost: 1 IPC Bank)" className="w-6 h-5 bg-green-700 text-white flex justify-center items-center font-bold hover:bg-green-600 active:scale-95">-</button>
                                    <button onClick={() => {
                                        setTransferFactoryData({ id: f.id, name: f.name, capacity: f.capacity });
                                    }} title="Transfer Factory to conqueror" className="w-6 h-5 bg-blue-800 text-white flex justify-center text-xs pb-0.5 items-center hover:bg-blue-700 active:scale-95">🔄</button>
                                    <button onClick={() => { if(window.confirm(`Discard ${f.name} factory?`)) removeFactory(nation.name, f.id); }} className="w-6 h-5 bg-black/80 text-white flex justify-center items-center hover:bg-red-800 active:scale-95"><Trash2 size={12} /></button>
                               </div>
                           )}
                       </div>
                   </div>
               ))}
               {factories.length === 0 && <div className="italic opacity-60 text-xs text-center border-t border-b border-dashed border-current py-1 my-1">No production sites.</div>}
       </div>
      </div>

      {isEditable && (
          <div className="pt-2 border-t-2 border-current/30 mt-auto flex justify-between gap-2 items-stretch h-12">
              <button onClick={() => setBattleMode(!battleMode)} className={cn("flex-1 flex justify-center items-center gap-1 font-bold px-3 shadow transition-all text-black text-[13px]", battleMode ? "bg-amber-400" : "bg-white/80 hover:bg-white")}>
                  <Swords size={18} /> Battle Report
              </button>

              {canCollect ? (
                  <button onClick={collectIncome} className="bg-green-600/90 text-white font-bold px-4 border border-current shadow hover:bg-green-600 active:scale-95 flex-1 text-center">
                      Collect Income
                  </button>
              ) : (
                  <div className="flex-1 border border-current font-bold bg-black/20 text-current flex justify-center items-center text-xs uppercase text-center leading-tight">
                      Not Your<br/>Turn
                  </div>
              )}
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
      const mPwd = prompt('MANDATORY: Enter a Master Password to manage this room (Banker, Delete, Reset):');
      if (!mPwd) return alert('Master Password is required to create a room!');
      const pwd = prompt('Enter an optional Room Password for other players (leave blank for public access):') || '';
      try {
        await setGameId({ gameId: newRoomName.trim(), password: pwd, masterPassword: mPwd, isCreating: true });
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
  const { gameId, setGameId, initSocket, gameData, nations, logs, role, setRole, connected, resetGame, currentTurn, verifyMasterPassword } = useGameStore();

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

           {/* TURN ORDER HEADER */}
           <div className="mt-4 flex flex-wrap gap-2 items-center">
               <span className="text-xs font-bold uppercase opacity-60 mr-2 border-b border-current">Sequence / Turn:</span>
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
              <option value="banker">Game Master (Banker)</option>
              {nations.map(n => <option key={n.name} value={n.name}>{n.name}</option>)}
           </select>
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
