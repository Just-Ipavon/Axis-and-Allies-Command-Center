/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Lock, Unlock, Swords, ShoppingCart, RotateCcw, Flag } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { cn } from '../../../utils/styles';
import { getUnitCost } from '../utils/techEffects';
import MobilizationPanel from './panels/MobilizationPanel';
import FactoriesPanel from './panels/FactoriesPanel';
import TechPanel from './panels/TechPanel';
import ObjectivesPanel from './panels/ObjectivesPanel';
import ChinaPanel from './panels/ChinaPanel';
import { ALL_OBJECTIVES } from '../../../constants/gameData';


const FLAG_MAP = {
  'USSR': '/flags/Russians_large.png',
  'Germany': '/flags/Germans_large.png',
  'UK': '/flags/British_large.png',
  'Japan': '/flags/Japanese_large.png',
  'USA': '/flags/Americans_large.png',
  'Italy': '/flags/Italians_large.png',
};

export default function NationCard({ nation, isEditable, gameVersion }) {
  const { updateNationBank, conquerTerritory, collectIncome: collectIncomeStore, currentTurn, role, addFactory, removeFactory, updateFactoryDamage, transferFactory, verifyMasterPassword, lockPurchases, unlockPurchases, toggleCapitalStatus, nations, buyTechToken, refundTechToken, rollForTech, toggleNationalObjective, toggleTechnology, gameData } = useGameStore();

  const isMyTurn = currentTurn === nation.name;
  const canCollect = isEditable && isMyTurn;
  const [battleMode, setBattleMode] = useState(false);
  const [battleVictim, setBattleVictim] = useState('');
  const [battleValue, setBattleValue] = useState(1);
  const [battleTargetType, setBattleTargetType] = useState('income');
  const [battleLiberatedFor, setBattleLiberatedFor] = useState('');
  const isCapitalCaptured = !!nation.capital_captured;
  const [adminEditMode, setAdminEditMode] = useState(false);
  const [transferFactoryData, setTransferFactoryData] = useState(null);
  const [transferVictim, setTransferVictim] = useState('');
  const [bombingRaidData, setBombingRaidData] = useState(null);
  const [bombingRaidValue, setBombingRaidValue] = useState(0);
  const [openPanel, setOpenPanel] = useState(null);
  
  // Local states to prevent input lag
  const [localPlayerName, setLocalPlayerName] = useState(nation.player_name || '');
  const [localBank, setLocalBank] = useState(nation.bank);
  const [localIncome, setLocalIncome] = useState(nation.income);

  // Sync local states with prop updates from server
  useEffect(() => {
    setLocalPlayerName(nation.player_name || '');
  }, [nation.player_name]);

  useEffect(() => {
    setLocalBank(nation.bank);
  }, [nation.bank]);

  useEffect(() => {
    setLocalIncome(nation.income);
  }, [nation.income]);

  const purchasesLocked = !!nation.purchases_locked || isCapitalCaptured;
  const currentPurchases = nation.purchases || {};
  const hasPurchases = Object.values(currentPurchases).some(qty => qty > 0);
  const isBanker = role === 'banker';

  const requestAdminMode = () => {
      const pwd = prompt("Enter Master Admin Code to manually override IPC values:");
      if (!pwd) return;
      verifyMasterPassword(pwd)
          .then(() => setAdminEditMode(true))
          .catch(err => alert("Access Denied: " + err.message));
  };

  const AXIS = ['Germany', 'Japan', 'Italy'];
  const ALLIES = ['USSR', 'UK', 'USA'];
  const isAxis = AXIS.includes(nation.name);
  const activeNations = (nations || []).map(n => n.name);
  const activeAxis = AXIS.filter(name => activeNations.includes(name));
  const activeAllies = ALLIES.filter(name => activeNations.includes(name));
  const enemyAlliance = isAxis ? activeAllies : activeAxis;



  const handlePlayerNameChange = (e) => {
      setLocalPlayerName(e.target.value);
  };

  const handlePlayerNameBlur = () => {
      if (!isEditable) return;
      if (localPlayerName !== nation.player_name) {
          updateNationBank(nation.name, nation.income, nation.bank, nation.purchases, localPlayerName);
      }
  };

  const handleIncomeManualChange = (e) => {
      let val = e.target.value;
      if (val === '') setLocalIncome('');
      else setLocalIncome(parseInt(val) || 0);
  };

  const handleIncomeManualBlur = () => {
      if (!isEditable || (purchasesLocked && !isBanker)) return;
      const finalVal = localIncome === '' ? 0 : localIncome;
      if (finalVal !== nation.income) {
          updateNationBank(nation.name, finalVal, nation.bank, nation.purchases, nation.player_name);
      }
  };

  const handleBankManualChange = (e) => {
      let val = e.target.value;
      if (val === '') setLocalBank('');
      else setLocalBank(parseInt(val) || 0);
  };

  const handleBankManualBlur = () => {
      if (!isEditable || (purchasesLocked && !isBanker)) return;
      const finalVal = localBank === '' ? 0 : localBank;
      if (finalVal !== nation.bank) {
          updateNationBank(nation.name, nation.income, finalVal, nation.purchases, nation.player_name);
      }
  };

  const factories = nation.factories || [];
  const hasIncreasedProd = Array.isArray(nation.tech) && nation.tech.includes('Increased Factory Production');
  const totalCapacity = factories.reduce((sum, f) => {
      const baseCap = parseInt(f.capacity || 0);
      const bonus = hasIncreasedProd ? 2 : 0;
      const damage = parseInt(f.damage || 0);
      return sum + Math.max(0, baseCap + bonus - damage);
  }, 0);

  let totalPurchased = 0;
  Object.entries(currentPurchases).forEach(([unit, qty]) => {
      if (unit !== 'Industrial Complex' && !unit.startsWith('repair_')) totalPurchased += qty;
  });

  const handlePurchase = (unit, dQty) => {
      if (!isEditable || (purchasesLocked && !isBanker)) return;
      const currentQty = currentPurchases[unit] || 0;
      const newQty = currentQty + dQty;

      if (newQty < 0) return; // can't buy negative

      if (dQty > 0 && unit !== 'Industrial Complex') {
          if (totalPurchased >= totalCapacity) {
              return alert(`Maximum production capacity (${totalCapacity}) reached! You must remove items or build more capacity to purchase more units!`);
          }
      }

      const costDiff = getUnitCost(unit, nation.tech) * dQty;
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

  const handleRepairQueue = (factoryId, dQty) => {
      if (!isEditable || (purchasesLocked && !isBanker)) return;
      const key = `repair_${factoryId}`;
      const currentQty = currentPurchases[key] || 0;
      const newQty = currentQty + dQty;

      if (newQty < 0) return;
      
      const factory = factories.find(f => f.id === factoryId);
      if (!factory) return;
      if (newQty > factory.damage) return; // can't repair more than the damage it has

      const oldCost = hasIncreasedProd ? Math.ceil(currentQty / 2) : currentQty;
      const newCost = hasIncreasedProd ? Math.ceil(newQty / 2) : newQty;
      const costDiff = newCost - oldCost;
      if (nation.bank - costDiff < 0) return alert("Not enough IPCs in Bank!"); 

      const newBank = nation.bank - costDiff;
      const newPurchases = { ...currentPurchases, [key]: newQty };

      updateNationBank(nation.name, nation.income, newBank, newPurchases, nation.player_name);
  };



  const handleConquer = () => {
      if (!battleVictim) return alert("Select a target nation");
      conquerTerritory(nation.name, battleVictim, battleValue, battleTargetType, battleLiberatedFor || null);
      setBattleMode(false);
  };

  const handleConfirmCart = () => {
      if (!isEditable || purchasesLocked) return;
      const items = Object.entries(nation.purchases || {})
          .filter((entry) => entry[1] > 0)
          .map(([key, qty]) => {
              if (key.startsWith('repair_')) {
                  const fName = factories.find(f => f.id === key.split('_')[1])?.name || 'Factory';
                  return `${qty}x Repair in ${fName}`;
              }
              return `${qty}x ${key}`;
          })
          .join(', ');
      
      const log = `${nation.name} confirms purchases: ${items}`;
      lockPurchases(nation.name, log);
  };

   const collectIncome = () => {
       if (!isEditable) return;
       
       if (isCapitalCaptured) {
           const log = `${nation.name} skips income collection (Capital Captured).`;
           collectIncomeStore(nation.name, log);
           return;
       }

       if (!hasPurchases) {
           if (!window.confirm("The cart is empty. Are you sure you want to collect income and pass the turn without mobilizing troops?")) {
               return;
           }
       }
       
       const log = `${nation.name} collects income (${nation.income} IPC). Units mobilized and funds secured.`;
       collectIncomeStore(nation.name, log);
   };

  const chinaControlledCount = gameData?.china_territories?.length || 0;
  const objectivesCount = ALL_OBJECTIVES[nation.name]?.length || 0;

  const isAnniversary = gameVersion && gameVersion.startsWith('anniversary');

  const colorClasses = {
      'USSR': 'bg-faction-ussr text-white border-vintage-text',
      'Germany': 'bg-faction-germany text-white border-vintage-text',
      'UK': 'bg-faction-uk text-black border-vintage-text',
      'Japan': 'bg-faction-japan text-white border-vintage-text',
      'USA': 'bg-faction-usa text-white border-vintage-text',
      'Italy': 'bg-faction-italy text-white border-vintage-text',
  }[nation.name] || 'bg-vintage-paper';

  return (
    <div className={cn("p-4 border-2 shadow-[4px_4px_0_0_rgba(43,42,38,1)] flex flex-col gap-4", colorClasses)}>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b-2 tracking-widest border-current pb-2 gap-2">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <h2 className="text-2xl flex items-center justify-center sm:justify-start gap-2 mb-1 relative group">
            {FLAG_MAP[nation.name] && <img src={FLAG_MAP[nation.name]} alt={nation.name} className="w-8 h-8 rounded-full border border-black/30" />}
            {nation.name}
            {isCapitalCaptured && (
                <button 
                    onClick={() => { if(window.confirm(`Liberate ${nation.name}'s capital?`)) toggleCapitalStatus(nation.name, false) }}
                    className="ml-2 text-[10px] bg-red-900 text-white px-2 py-0.5 rounded shadow flex items-center gap-1 hover:bg-green-700 transition-colors uppercase font-bold tracking-wider"
                    title="Click to Liberate Capital"
                >
                    ⚠️ Captured
                </button>
            )}
            {!isCapitalCaptured && adminEditMode && (
                <button 
                    onClick={() => toggleCapitalStatus(nation.name, true)}
                    className="ml-2 text-[10px] bg-black/30 text-white/50 px-2 py-0.5 rounded hover:text-white hover:bg-red-900 transition-colors uppercase font-bold tracking-wider"
                    title="Force Capital Capture"
                >
                    Set Captured
                </button>
            )}
          </h2>
          {isEditable ? (
             <input 
                 type="text" 
                 placeholder="Player Name" 
                 value={localPlayerName} 
                 onChange={handlePlayerNameChange}
                 onBlur={handlePlayerNameBlur}
                 onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                 className="bg-black/20 text-sm p-1 outline-none w-32 border-b border-dashed border-current focus:bg-black/30 placeholder-current/50 text-center sm:text-left" 
             />
          ) : (
             <div className="text-sm italic opacity-80">{nation.player_name || 'No Commander'}</div>
          )}
        </div>
        <div className="text-center sm:text-right flex flex-row sm:flex-col justify-between sm:justify-end items-center sm:items-end w-full sm:w-auto border-t sm:border-t-0 border-current/10 pt-2 sm:pt-0">
          <div className="text-sm uppercase opacity-80 flex items-center gap-1">
             Bank (IPC)
             {isEditable && !adminEditMode && <button onClick={requestAdminMode} title="Unlock manual editing" className="opacity-50 hover:opacity-100 hover:text-amber-400"><Lock size={10} /></button>}
             {adminEditMode && <button onClick={() => setAdminEditMode(false)} title="Lock and Save" className="hover:scale-110"><Unlock size={10} className="text-red-500" /></button>}
          </div>
          {adminEditMode ? (
             <input 
                 type="number" 
                 className="text-3xl font-display w-24 bg-transparent outline-none text-right border-b border-dashed border-red-500 focus:bg-black/10" 
                 value={localBank} 
                 onChange={handleBankManualChange} 
                 onBlur={handleBankManualBlur}
                 onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
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
                   value={localIncome} 
                   onChange={handleIncomeManualChange} 
                   onBlur={handleIncomeManualBlur}
                   onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
               />
            ) : (
               <div className="text-xl font-bold">{nation.income}</div>
            )}

            {isEditable && battleMode && (
               <div className="absolute top-12 left-0 text-sm bg-[#5c5647] text-[#f4ecd8] border-2 border-current shadow-xl p-3 z-50 w-full min-w-[240px] max-w-[280px]">
                   <div className="font-bold mb-1 uppercase text-xs opacity-80">Conquered Value</div>
                   <input type="number" value={battleValue} onChange={e=>setBattleValue(e.target.value)} className="w-full text-black px-2 py-1 font-bold outline-none" min={1} />
                   
                   <div className="mt-2 mb-2">
                       <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">
                           <input type="checkbox" checked={battleTargetType==='capital'} onChange={(e)=>setBattleTargetType(e.target.checked ? 'capital' : 'income')} className="w-4 h-4 accent-amber-500" />
                           🏆 Is it an ENEMY Capital? (Steal Bank)
                       </label>
                   </div>

                   <div className="font-bold mt-2 mb-1 uppercase text-xs opacity-80">From Nation</div>
                   <select value={battleVictim} onChange={e=>setBattleVictim(e.target.value)} className="w-full text-black px-2 py-1 font-bold outline-none cursor-pointer">
                      <option value="">-- Select Enemy --</option>
                      {enemyAlliance.map(n => <option key={n} value={n}>{n}</option>)}
                   </select>

                   <div className="font-bold mt-2 mb-1 uppercase text-xs opacity-80">Original Owner (If liberating)</div>
                   <select value={battleLiberatedFor} onChange={e=>setBattleLiberatedFor(e.target.value)} className="w-full text-black px-2 py-1 font-bold outline-none cursor-pointer">
                      <option value="">-- Self --</option>
                      {(isAxis ? activeAxis : activeAllies).filter(n=>n!==nation.name).map(n => <option key={n} value={n}>{n}</option>)}
                   </select>
                   <div className="flex gap-2 mt-4">
                       <button onClick={handleConquer} className="flex-1 bg-green-700 text-white shadow-sm border border-black font-bold py-2 uppercase hover:bg-green-600 active:scale-95 text-xs">Confirm</button>
                       <button onClick={()=>setBattleMode(false)} className="flex-1 bg-red-900 border text-white shadow-sm border-black font-bold py-2 uppercase hover:bg-red-800 active:scale-95 text-xs">Cancel</button>
                   </div>
               </div>
            )}
         </div>
         {isBanker && purchasesLocked && (
             <button onClick={() => unlockPurchases(nation.name)} title="Banker: Unlock Cart" className="bg-amber-600 text-white px-2 py-1 rounded text-[10px] flex items-center gap-1 hover:bg-amber-500 whitespace-nowrap">
                 <RotateCcw size={10} /> Unlock Cart
             </button>
         )}
      </div>
      {/* Purchase Section */}
      <div className="flex-1 mt-2 relative">
          {isCapitalCaptured && (
              <div className="absolute inset-0 z-10 bg-black/50 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-2 border-y-2 border-red-500/50">
                  <span className="text-xl">⚠️</span>
                  <span className="font-black text-red-500 uppercase tracking-widest text-sm drop-shadow-md">Capital Captured</span>
                  <span className="text-[10px] uppercase font-bold opacity-80 mt-1">Cannot mobilize units</span>
              </div>
          )}
          <MobilizationPanel
              nation={nation}
              isEditable={isEditable}
              purchasesLocked={purchasesLocked}
              isBanker={isBanker}
              totalPurchased={totalPurchased}
              totalCapacity={totalCapacity}
              currentPurchases={currentPurchases}
              handlePurchase={handlePurchase}
              hasIncreasedProd={hasIncreasedProd}
          />
      </div>

      {/* Factories Management */}
      <FactoriesPanel
          nation={nation}
          isEditable={isEditable}
          purchasesLocked={purchasesLocked}
          isBanker={isBanker}
          factories={factories}
          hasIncreasedProd={hasIncreasedProd}
          adminEditMode={adminEditMode}
          transferFactoryData={transferFactoryData}
          setTransferFactoryData={setTransferFactoryData}
          transferVictim={transferVictim}
          setTransferVictim={setTransferVictim}
          enemyAlliance={enemyAlliance}
          bombingRaidData={bombingRaidData}
          setBombingRaidData={setBombingRaidData}
          bombingRaidValue={bombingRaidValue}
          setBombingRaidValue={setBombingRaidValue}
          currentPurchases={currentPurchases}
          addFactory={addFactory}
          removeFactory={removeFactory}
          updateFactoryDamage={updateFactoryDamage}
          transferFactory={transferFactory}
          handleRepairQueue={handleRepairQueue}
      />

      {/* Anniversary Edition Features Panel */}
      {isAnniversary && (
          <div className="mt-4 border-t border-current/20 pt-4 flex flex-col gap-2">
              <div className="flex gap-2">
                  <button 
                      onClick={() => setOpenPanel(openPanel === 'tech' ? null : 'tech')}
                      className={cn("flex-1 text-[11px] font-bold uppercase tracking-wider py-1.5 px-2 border border-current shadow-sm flex items-center justify-center gap-1", 
                          openPanel === 'tech' ? "bg-amber-500 text-black font-black" : "bg-black/10 hover:bg-black/20")}
                  >
                      🔬 Tech R&D ({(nation.tech || []).length})
                  </button>
                  <button 
                      onClick={() => setOpenPanel(openPanel === 'objectives' ? null : 'objectives')}
                      className={cn("flex-1 text-[11px] font-bold uppercase tracking-wider py-1.5 px-2 border border-current shadow-sm flex items-center justify-center gap-1", 
                          openPanel === 'objectives' ? "bg-amber-500 text-black font-black" : "bg-black/10 hover:bg-black/20")}
                  >
                      🏆 Objectives ({(nation.active_objectives || []).length}/{objectivesCount})
                  </button>
                  {nation.name === 'USA' && (
                      <button 
                          onClick={() => setOpenPanel(openPanel === 'china' ? null : 'china')}
                          className={cn("flex-1 text-[11px] font-bold uppercase tracking-wider py-1.5 px-2 border border-current shadow-sm flex items-center justify-center gap-1", 
                              openPanel === 'china' ? "bg-red-800 text-white font-black" : "bg-black/10 hover:bg-black/20")}
                      >
                          🇨🇳 China ({chinaControlledCount})
                      </button>
                  )}
              </div>

              {/* R&D Sub-Panel */}
              {openPanel === 'tech' && (
                  <TechPanel
                      nation={nation}
                      isEditable={isEditable}
                      buyTechToken={buyTechToken}
                      refundTechToken={refundTechToken}
                      rollForTech={rollForTech}
                      toggleTechnology={toggleTechnology}
                  />
              )}

              {/* National Objectives Sub-Panel */}
              {openPanel === 'objectives' && (
                  <ObjectivesPanel
                      nation={nation}
                      isEditable={isEditable}
                      toggleNationalObjective={toggleNationalObjective}
                  />
              )}

              {/* China Faction Sub-Panel */}
              {openPanel === 'china' && nation.name === 'USA' && (
                  <ChinaPanel isEditable={isEditable} />
              )}
          </div>
      )}


      {isEditable && (
          <div className="pt-2 border-t-2 border-current/30 mt-auto flex flex-col sm:flex-row justify-between gap-2 items-stretch min-h-[3rem]">
              {isMyTurn && !purchasesLocked && hasPurchases && (
                  <button onClick={handleConfirmCart} className="flex-1 bg-amber-500 text-black font-bold px-2 py-2 shadow hover:bg-amber-400 active:scale-95 flex items-center justify-center gap-1 text-[13px] leading-tight">
                      <ShoppingCart size={16} className="shrink-0" /> Confirm Cart
                  </button>
              )}

              <button onClick={() => setBattleMode(!battleMode)} className={cn("flex-1 flex justify-center items-center gap-1 font-bold px-3 py-2 shadow transition-all text-black text-[13px] leading-tight", battleMode ? "bg-amber-400" : "bg-white/80 hover:bg-white")}>
                  <Swords size={18} className="shrink-0" /> Battle Report
              </button>

              {canCollect ? (
                  <button 
                    onClick={collectIncome} 
                    disabled={hasPurchases && !purchasesLocked && !isCapitalCaptured}
                    className={cn("font-bold px-4 py-2 border border-current shadow active:scale-95 flex-1 flex items-center justify-center text-center text-[13px] leading-tight", 
                        (hasPurchases && !purchasesLocked && !isCapitalCaptured) ? "bg-gray-500 opacity-50 cursor-not-allowed" : 
                        isCapitalCaptured ? "bg-red-800 text-white hover:bg-red-700" : "bg-green-600/90 text-white hover:bg-green-600")}
                  >
                      {isCapitalCaptured ? "Skip Income" : "Collect Income"}
                  </button>
              ) : (
                  <div className="flex-1 border border-current font-bold bg-black/20 text-current flex justify-center items-center text-xs uppercase text-center leading-tight py-2 px-1">
                      Not Your<br/>Turn
                  </div>
              )}
          </div>
      )}
    </div>
  );
}
