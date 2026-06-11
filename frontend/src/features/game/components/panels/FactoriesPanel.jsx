import React from 'react';
import { Flag, Trash2 } from 'lucide-react';
import { cn } from '../../../../utils/styles';

export default function FactoriesPanel({
  nation,
  isEditable,
  purchasesLocked,
  isBanker,
  factories,
  hasIncreasedProd,
  adminEditMode,
  transferFactoryData,
  setTransferFactoryData,
  transferVictim,
  setTransferVictim,
  enemyAlliance,
  bombingRaidData,
  setBombingRaidData,
  bombingRaidValue,
  setBombingRaidValue,
  currentPurchases,
  addFactory,
  removeFactory,
  updateFactoryDamage,
  transferFactory,
  handleRepairQueue
}) {
  return (
    <div className={cn("mt-1 relative", purchasesLocked && !isBanker && "opacity-60 pointer-events-none")}>
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-xs font-bold uppercase opacity-80">Industrial Complexes</h3>
        {isEditable && (
          <button 
            onClick={() => {
              const tName = prompt("Add Free Setup Factory Location:");
              if(!tName) return;
              addFactory(nation.name, tName, parseInt(prompt("Territory IPC Value:") || 1));
            }} 
            className="text-[10px] bg-black/30 text-white px-2 py-0.5 hover:bg-black/50 active:scale-95 border border-current"
          >
            ADD FREE
          </button>
        )}
      </div>

      {isEditable && transferFactoryData && (
        <div className="absolute top-8 left-0 text-sm bg-[#5c5647] text-[#f4ecd8] border-2 border-current shadow-xl p-3 z-50 w-full min-w-[240px] max-w-[280px]">
          <div className="font-bold mb-2 uppercase text-xs">Transfer {transferFactoryData.name}</div>
          <div className="font-bold mt-2 mb-1 uppercase text-xs opacity-80">Conquered By</div>
          <select 
            value={transferVictim} 
            onChange={e => setTransferVictim(e.target.value)} 
            className="w-full text-black px-2 py-1 font-bold outline-none cursor-pointer text-sm"
          >
            <option value="">-- Select Conqueror --</option>
            {enemyAlliance.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => {
                if (!transferVictim) return alert("Select a conqueror");
                transferFactory(nation.name, transferVictim, transferFactoryData.id);
                setTransferFactoryData(null);
                setTransferVictim('');
              }} 
              className="flex-1 bg-blue-800 text-white shadow-sm border border-black font-bold py-2 uppercase hover:bg-blue-700 active:scale-95"
            >
              Transfer
            </button>
            <button 
              onClick={() => { setTransferFactoryData(null); setTransferVictim(''); }} 
              className="flex-1 bg-red-900 border text-white shadow-sm border-black font-bold py-2 uppercase hover:bg-red-800 active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isEditable && bombingRaidData && (
        <div className="absolute top-8 left-0 text-sm bg-[#4a1a1a] text-[#f4ecd8] border-2 border-red-500 shadow-xl p-3 z-50 w-full min-w-[240px] max-w-[280px]">
          <div className="font-bold mb-2 uppercase text-xs flex items-center gap-2">
            <span className="text-xl">💣</span> Bombing Raid: {bombingRaidData.name}
          </div>
          <div className="text-[10px] opacity-80 mb-3 uppercase">Current Damage: {bombingRaidData.currentDamage} / {bombingRaidData.maxDamage}</div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase opacity-70">Total Damage to Apply:</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setBombingRaidValue(Math.max(0, bombingRaidValue - 1))} className="w-10 h-10 bg-black/40 border border-white/20 flex items-center justify-center text-xl hover:bg-black/60">-</button>
              <input 
                type="number" 
                value={bombingRaidValue}
                onChange={(e) => setBombingRaidValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 h-10 bg-black/60 border border-red-500 text-white text-center font-bold text-lg outline-none"
              />
              <button onClick={() => setBombingRaidValue(Math.min(bombingRaidData.maxDamage - bombingRaidData.currentDamage, bombingRaidValue + 1))} className="w-10 h-10 bg-black/40 border border-white/20 flex items-center justify-center text-xl hover:bg-black/60">+</button>
            </div>
            <div className="text-[9px] italic opacity-60 mt-1">Note: Total damage cannot exceed Max Damage ({bombingRaidData.maxDamage}).</div>
          </div>

          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => {
                const limitedValue = Math.min(bombingRaidValue, bombingRaidData.maxDamage - bombingRaidData.currentDamage);
                if (limitedValue > 0) {
                  updateFactoryDamage(nation.name, bombingRaidData.id, limitedValue);
                }
                setBombingRaidData(null);
                setBombingRaidValue(0);
              }} 
              className="flex-1 bg-red-800 text-white shadow-sm border border-black font-bold py-2 uppercase hover:bg-red-700 active:scale-95"
            >
              Apply Damage
            </button>
            <button onClick={() => { setBombingRaidData(null); setBombingRaidValue(0); }} className="flex-1 bg-gray-800 border text-white shadow-sm border-black font-bold py-2 uppercase hover:bg-gray-700 active:scale-95">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-0.5 text-sm max-h-[140px] overflow-y-auto pr-0.5">
        {factories.map(f => (
          <div key={f.id} className="flex flex-col sm:flex-row justify-between sm:items-center bg-black/20 py-2 px-2 border border-white/5 shadow-sm gap-2">
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-bold text-[11px] truncate">{f.name}</span>
              <div className="flex gap-2 items-center opacity-60 text-[9px] uppercase font-bold tracking-tighter">
                <span>Cap {hasIncreasedProd ? `${f.capacity} + 2` : f.capacity}</span>
                <span className="w-1 h-1 bg-current rounded-full opacity-20"></span>
                <span>Max Dmg {f.capacity * 2}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 justify-between sm:justify-end shrink-0 sm:ml-auto w-full sm:w-auto border-t sm:border-t-0 border-white/10 pt-1.5 sm:pt-0">
              {adminEditMode ? (
                <input 
                  type="number" 
                  className="w-10 h-5 bg-black/40 border border-amber-500 text-amber-500 font-bold px-1 text-center outline-none text-[10px]"
                  value={f.damage}
                  onChange={(e) => {
                    const newVal = parseInt(e.target.value) || 0;
                    const delta = newVal - f.damage;
                    updateFactoryDamage(nation.name, f.id, delta, false, true); 
                  }}
                />
              ) : (
                <div className={cn("font-black px-1.5 py-0.5 border text-[10px] min-w-[24px] text-center rounded-sm tracking-tighter", 
                  f.damage > 0 ? "bg-red-900/80 text-white border-red-500/50" : "bg-black/40 border-white/10 opacity-40")}>
                  {f.damage > 0 ? `DMG ${f.damage}` : 'OK'}
                </div>
              )}

              {isEditable && (
                <div className="flex gap-1 items-center border-l border-white/10 pl-1.5 ml-1">
                  <button 
                    onClick={() => {
                      setBombingRaidData({ id: f.id, name: f.name, currentDamage: f.damage, maxDamage: f.capacity * 2 });
                      setBombingRaidValue(1);
                    }} 
                    title="Bombing Raid" 
                    className="w-5 h-5 rounded-sm bg-red-950 text-white flex justify-center items-center hover:bg-red-800 active:scale-95 text-[10px] border border-red-500/30"
                  >
                    💣
                  </button>
                  
                  <button onClick={() => setTransferFactoryData({ id: f.id, name: f.name, capacity: f.capacity })} title="Transfer" className="w-5 h-5 rounded-sm bg-blue-900 text-white flex justify-center items-center hover:bg-blue-700 active:scale-95 text-[10px] border border-blue-500/30">
                    <Flag size={11} />
                  </button>
                  
                  <button onClick={() => { if(window.confirm(`Discard ${f.name}?`)) removeFactory(nation.name, f.id); }} className="w-5 h-5 rounded-sm bg-zinc-900 text-white flex justify-center items-center hover:bg-red-900 active:scale-95 border border-white/10">
                    <Trash2 size={10} />
                  </button>
                  
                  {(!purchasesLocked || isBanker) && f.damage > 0 && (
                    <div className="flex items-center gap-0.5 bg-green-950/40 px-1 py-0.5 border border-green-500/30 rounded-sm ml-1">
                      <button onClick={() => handleRepairQueue(f.id, -1)} className="w-4 h-4 bg-black/40 text-white flex justify-center items-center hover:bg-black/60 active:scale-95 text-[10px]">-</button>
                      <span className="text-[10px] font-black w-3 text-center text-green-400">{currentPurchases[`repair_${f.id}`] || 0}</span>
                      <button onClick={() => handleRepairQueue(f.id, 1)} className="w-4 h-4 bg-white/10 text-white flex justify-center items-center hover:bg-white/20 active:scale-95 text-[10px]">+</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {factories.length === 0 && <div className="italic opacity-60 text-xs text-center border-t border-b border-dashed border-current py-1 my-1">No production sites.</div>}
      </div>
    </div>
  );
}
