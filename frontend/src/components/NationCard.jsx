import { useState } from 'react';
import { Lock, Unlock, Trash2, Swords } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { cn } from '../utils/styles';
import { UNITS } from '../constants/gameData';

export default function NationCard({ nation, isEditable }) {
  const { updateNationBank, conquerTerritory, advanceTurn, currentTurn, role, addFactory, removeFactory, updateFactoryDamage, transferFactory, verifyMasterPassword } = useGameStore();

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
      if (!pwd) return;
      verifyMasterPassword(pwd)
          .then(() => setAdminEditMode(true))
          .catch(err => alert("Access Denied: " + err.message));
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
             {adminEditMode && <button onClick={() => setAdminEditMode(false)} title="Lock and Save" className="hover:scale-110"><Unlock size={10} className="text-red-500" /></button>}
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
