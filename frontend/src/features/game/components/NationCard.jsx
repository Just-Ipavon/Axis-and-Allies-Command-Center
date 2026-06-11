import { useState, useEffect } from 'react';
import { Lock, Unlock, Trash2, Swords, ShoppingCart, RotateCcw, Flag } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { cn } from '../../../utils/styles';
import { UNITS } from '../../../constants/gameData';
import { UnitIconResolver } from '../../../components/icons/UnitIcons';

const FLAG_MAP = {
  'USSR': '/flags/Russians_large.png',
  'Germany': '/flags/Germans_large.png',
  'UK': '/flags/British_large.png',
  'Japan': '/flags/Japanese_large.png',
  'USA': '/flags/Americans_large.png',
  'Italy': '/flags/Italians_large.png',
};

export default function NationCard({ nation, isEditable, gameVersion }) {
  const { updateNationBank, conquerTerritory, advanceTurn, collectIncome: collectIncomeStore, currentTurn, role, addFactory, removeFactory, updateFactoryDamage, transferFactory, verifyMasterPassword, lockPurchases, unlockPurchases, toggleCapitalStatus, nations, buyTechToken, refundTechToken, rollForTech, toggleNationalObjective, updateChinaTerritories, mobilizeChinaInfantry, gameData } = useGameStore();

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
  const [chinaPlacements, setChinaPlacements] = useState({});
  
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

  const handleIncomeChange = (amount) => {
    if (!isEditable || (purchasesLocked && !isBanker)) return;
    const newIncome = nation.income + amount;
    const log = `${nation.name} income changed by ${amount} (Now: ${newIncome})`;
    updateNationBank(nation.name, newIncome, nation.bank, nation.purchases, nation.player_name, log);
  };

  const handleBankChange = (amount) => {
      if (!isEditable || (purchasesLocked && !isBanker)) return;
      const newBank = nation.bank + amount;
      const log = `${nation.name} bank changed by ${amount} directly (Now: ${newBank})`;
      updateNationBank(nation.name, nation.income, newBank, nation.purchases, nation.player_name, log);
  };

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
  const totalCapacity = factories.reduce((sum, f) => sum + Math.max(0, parseInt(f.capacity || 0) - parseInt(f.damage || 0)), 0);

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

  const handleRepairQueue = (factoryId, dQty) => {
      if (!isEditable || (purchasesLocked && !isBanker)) return;
      const key = `repair_${factoryId}`;
      const currentQty = currentPurchases[key] || 0;
      const newQty = currentQty + dQty;

      if (newQty < 0) return;
      
      const factory = factories.find(f => f.id === factoryId);
      if (!factory) return;
      if (newQty > factory.damage) return; // can't repair more than the damage it has

      const costDiff = 1 * dQty; // 1 IPC per damage point
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
          .filter(([key, qty]) => qty > 0)
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

  const NATION_OBJECTIVES = {
      'USSR': [
          { id: 'no_ussr_1', name: 'Archangelsk Security', desc: 'USSR controls Archangelsk (No Allied units in territory)', reward: 5 },
          { id: 'no_ussr_2', name: 'Soviet Expansion', desc: 'USSR controls at least 3 territories originally controlled by Germany/Italy/Japan/Pro-Axis neutrals', reward: 10 }
      ],
      'Germany': [
          { id: 'no_germany_1', name: 'Lebensraum', desc: 'Germany controls France, NW Europe, Poland, Baltic States, and Bulgaria/Romania', reward: 5 },
          { id: 'no_germany_2', name: 'Eastern Front', desc: 'Germany controls Baltic States, East Poland, Belorussia, and Ukraine', reward: 5 },
          { id: 'no_germany_3', name: 'Caucasus/Karelia Control', desc: 'Germany controls Caucasus and/or Karelia', reward: 5 }
      ],
      'UK': [
          { id: 'no_uk_1', name: 'Japanese Territory Capture', desc: 'UK controls at least 1 territory originally controlled by Japan', reward: 5 },
          { id: 'no_uk_2', name: 'British Empire Integrity', desc: 'UK controls Eastern Canada, Western Canada, Gibraltar, Egypt, Australia, and India', reward: 5 },
          { id: 'no_uk_3', name: 'France/Balkans Liberation', desc: 'UK controls France and/or Balkans (liberated)', reward: 5 }
      ],
      'Japan': [
          { id: 'no_japan_1', name: 'Greater East Asia Co-Prosperity Sphere', desc: 'Japan controls at least 10 territories originally controlled by China/Allies/Neutrals', reward: 5 },
          { id: 'no_japan_2', name: 'Pacific Islands Hegemony', desc: 'Japan controls at least 3 Allied island groups', reward: 5 },
          { id: 'no_japan_3', name: 'India/Australia/Hawaii Control', desc: 'Japan controls India, Australia, and/or Hawaiian Islands', reward: 5 }
      ],
      'USA': [
          { id: 'no_usa_1', name: 'Pacific Security Zone', desc: 'USA controls Hawaiian Islands, Midway, Johnston Island, Palmyra, and Wake Island', reward: 5 },
          { id: 'no_usa_2', name: 'Western Hemisphere Security', desc: 'USA controls Central America, West Indies, and Colombia/Venezuela', reward: 5 },
          { id: 'no_usa_3', name: 'Liberation of France', desc: 'USA controls France (liberated)', reward: 5 }
      ],
      'Italy': [
          { id: 'no_italy_1', name: 'Mediterranean Dominance', desc: 'No Allied surface warships in Mediterranean (Sea Zones 13-16)', reward: 5 },
          { id: 'no_italy_2', name: 'Roman Empire Revival', desc: 'Italy controls Gibraltar, Egypt, and/or Greece', reward: 5 }
      ]
  }[nation.name] || [];

  const TECH_CHART_1 = [
      'Advanced Artillery',
      'Rockets',
      'Paratroopers',
      'Increased Factory Production',
      'War Bonds',
      'Mechanized Infantry'
  ];
  const TECH_CHART_2 = [
      'Super Submarines',
      'Jet Fighters',
      'Improved Shipyards',
      'Radar',
      'Long-Range Aircraft',
      'Heavy Bombers'
  ];
  const CHINA_TERRITORIES_LIST = ['Kiangsu', 'Hopei', 'Szechwan', 'Yunnan', 'Kwangtung'];

  const chinaControlledCount = gameData?.china_territories?.length || 0;
  const chinaInfantryAllowed = chinaControlledCount > 0 ? Math.max(1, Math.ceil(chinaControlledCount / 2)) : 0;

  const handleChinaPlacementChange = (territory, delta) => {
      const currentPlaced = Object.values(chinaPlacements).reduce((sum, q) => sum + q, 0);
      const currentQty = chinaPlacements[territory] || 0;
      const newQty = currentQty + delta;
      if (newQty < 0) return;
      if (delta > 0 && currentPlaced >= chinaInfantryAllowed) {
          alert(`You can only place up to ${chinaInfantryAllowed} infantry!`);
          return;
      }
      setChinaPlacements({ ...chinaPlacements, [territory]: newQty });
  };

  const handleChinaMobilize = () => {
      const currentPlaced = Object.values(chinaPlacements).reduce((sum, q) => sum + q, 0);
      if (currentPlaced < chinaInfantryAllowed) {
          if (!window.confirm(`You have only placed ${currentPlaced} out of ${chinaInfantryAllowed} allowed infantry. Proceed?`)) {
              return;
          }
      }
      mobilizeChinaInfantry(chinaPlacements);
      setChinaPlacements({});
  };

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
      <div className="flex justify-between items-center border-b-2 tracking-widest border-current pb-2">
        <div>
         <h2 className="text-2xl flex items-center gap-2 mb-2 relative group">
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
          <div className="flex justify-between items-end mb-1 border-b border-current/20 pb-1 flex-wrap gap-1">
             <h3 className="text-sm font-bold uppercase">Mobilization</h3>
             <span className="text-[10px] bg-white/20 px-2 py-0.5 font-bold shadow-sm border border-current">Capacity: {totalPurchased}/{totalCapacity}</span>
          </div>
          <div className={cn("flex flex-col gap-1 text-sm overflow-y-auto max-h-[170px] pr-1", purchasesLocked && !isBanker && "opacity-60 pointer-events-none")}>
             {Object.keys(UNITS).map(unit => {
                 const qty = (nation.purchases && nation.purchases[unit]) || 0;
                 return (
                     <div key={unit} className="flex justify-between items-center bg-black/10 py-1.5 px-2 gap-2">
                         <div className="flex items-center gap-1.5 flex-1 min-w-0">
                             <UnitIconResolver unitName={unit} size={26} className="text-current shrink-0" />
                             <div className="flex items-baseline gap-1.5 flex-wrap sm:flex-nowrap">
                                <span className="leading-tight whitespace-nowrap font-medium text-[13px]">{unit}</span>
                                <div className="flex gap-1.5 items-baseline">
                                   <span className="opacity-50 text-[9px] font-bold whitespace-nowrap">A{UNITS[unit].a} D{UNITS[unit].d} M{UNITS[unit].m}</span>
                                   <span className="opacity-80 text-[11px] font-bold text-amber-500/80 whitespace-nowrap">IPC {UNITS[unit].cost}</span>
                                </div>
                             </div>
                         </div>
                         {isEditable ? (
                         <div className="flex items-center gap-1 shrink-0">
                            <span className="opacity-70 text-xs w-2 text-right">{qty > 0 ? qty : ''}</span>
                            <button onClick={() => handlePurchase(unit, -1)} className="bg-black/30 h-6 w-6 flex items-center justify-center hover:bg-black/50 active:scale-95 shrink-0">-</button>
                            <button onClick={() => handlePurchase(unit, 1)} className="bg-white/30 text-black h-6 w-6 flex items-center justify-center hover:bg-white/50 active:scale-95 shrink-0">+</button>
                         </div>
                         ) : (
                             <div className="font-bold shrink-0">{qty > 0 ? `x${qty}` : ''}</div>
                         )}
                     </div>
                 )
             })}
             
             {(() => {
                 const totalPendingRepairCost = Object.entries(currentPurchases).reduce((sum, [k, qty]) => k.startsWith('repair_') ? sum + qty : sum, 0);
                 if (totalPendingRepairCost > 0) {
                     return (
                         <div className="flex justify-between items-center bg-green-900/30 border border-green-500/30 py-1.5 px-2 mt-1">
                             <span className="text-[11px] font-bold text-green-400 uppercase tracking-wider">Pending Repairs</span>
                             <span className="text-xs font-bold text-amber-500/80">IPC {totalPendingRepairCost}</span>
                         </div>
                     );
                 }
                 return null;
             })()}
          </div>
      </div>

      {/* Factories Management */}
      <div className={cn("mt-1 relative", purchasesLocked && !isBanker && "opacity-60 pointer-events-none")}>
           <div className="flex justify-between items-center mb-1">
               <h3 className="text-xs font-bold uppercase opacity-80">Industrial Complexes</h3>
               {isEditable && <button onClick={() => {
                   const tName = prompt("Add Free Setup Factory Location:");
                   if(!tName) return;
                   addFactory(nation.name, tName, parseInt(prompt("Territory IPC Value:")||1));
               }} className="text-[10px] bg-black/30 text-white px-2 py-0.5 hover:bg-black/50 active:scale-95 border border-current">ADD FREE</button>}
           </div>

           {isEditable && transferFactoryData && (
               <div className="absolute top-8 left-0 text-sm bg-[#5c5647] text-[#f4ecd8] border-2 border-current shadow-xl p-3 z-50 w-full min-w-[240px] max-w-[280px]">
                   <div className="font-bold mb-2 uppercase text-xs">Transfer {transferFactoryData.name}</div>
                   <div className="font-bold mt-2 mb-1 uppercase text-xs opacity-80">Conquered By</div>
                   <select value={transferVictim} onChange={e=>setTransferVictim(e.target.value)} className="w-full text-black px-2 py-1 font-bold outline-none cursor-pointer text-sm">
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
                       <button onClick={() => {
                           const limitedValue = Math.min(bombingRaidValue, bombingRaidData.maxDamage - bombingRaidData.currentDamage);
                           if (limitedValue > 0) {
                               updateFactoryDamage(nation.name, bombingRaidData.id, limitedValue);
                           }
                           setBombingRaidData(null);
                           setBombingRaidValue(0);
                       }} className="flex-1 bg-red-800 text-white shadow-sm border border-black font-bold py-2 uppercase hover:bg-red-700 active:scale-95">Apply Damage</button>
                       <button onClick={() => {setBombingRaidData(null); setBombingRaidValue(0);}} className="flex-1 bg-gray-800 border text-white shadow-sm border-black font-bold py-2 uppercase hover:bg-gray-700 active:scale-95">Cancel</button>
                   </div>
               </div>
           )}

            <div className="flex flex-col gap-0.5 text-sm max-h-[140px] overflow-y-auto pr-0.5">
                {factories.map(f => (
                    <div key={f.id} className="flex justify-between items-center bg-black/20 py-1 px-2 border border-white/5 shadow-sm">
                        <div className="flex flex-col leading-tight min-w-0">
                            <span className="font-bold text-[11px] truncate">{f.name}</span>
                            <div className="flex gap-2 items-center opacity-60 text-[9px] uppercase font-bold tracking-tighter">
                                <span>Cap {f.capacity}</span>
                                <span className="w-1 h-1 bg-current rounded-full opacity-20"></span>
                                <span>Max Dmg {f.capacity * 2}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0 ml-auto">
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
                                <div className={cn("font-black px-1.5 py-0.5 border text-[10px] min-w-[24px] text-center rounded-sm tracking-tighter", f.damage > 0 ? "bg-red-900/80 text-white border-red-500/50" : "bg-black/40 border-white/10 opacity-40")}>
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
                                    >💣</button>
                                    
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
                      🏆 Objectives ({(nation.active_objectives || []).length}/{NATION_OBJECTIVES.length})
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
                  <div className="bg-black/20 p-3 border border-current/20 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase text-left">Research Tokens: {nation.research_tokens || 0}</span>
                          {isEditable && (
                              <div className="flex gap-1">
                                  <button 
                                      onClick={() => buyTechToken(nation.name)} 
                                      disabled={nation.bank < 5}
                                      className="text-[9px] bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-1 px-2 uppercase shadow-sm border border-black"
                                  >
                                      Buy (+1 Token: 5 IPC)
                                  </button>
                                  {(nation.research_tokens || 0) > 0 && (
                                      <button 
                                          onClick={() => refundTechToken(nation.name)}
                                          className="text-[9px] bg-red-800 hover:bg-red-700 text-white font-bold py-1 px-2 uppercase shadow-sm border border-black"
                                      >
                                          Refund
                                      </button>
                                  )}
                              </div>
                          )}
                      </div>

                      {isEditable && (nation.research_tokens || 0) > 0 && (
                          <div className="flex gap-2">
                              <button 
                                  onClick={() => {
                                      if(window.confirm("Roll for breakthrough on Chart 1?")) {
                                          rollForTech(nation.name, 1);
                                      }
                                  }}
                                  className="flex-1 text-[10px] bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-2 uppercase shadow-sm border border-black"
                              >
                                  Roll Chart 1 (Land/Prod)
                              </button>
                              <button 
                                  onClick={() => {
                                      if(window.confirm("Roll for breakthrough on Chart 2?")) {
                                          rollForTech(nation.name, 2);
                                      }
                                  }}
                                  className="flex-1 text-[10px] bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-2 uppercase shadow-sm border border-black"
                              >
                                  Roll Chart 2 (Air/Sea)
                              </button>
                          </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 mt-1">
                          <div>
                              <div className="text-[10px] font-bold uppercase border-b border-current/20 pb-1 mb-1.5 opacity-80 text-left">Chart 1: Land & Production</div>
                              <div className="flex flex-col gap-1 text-[11px]">
                                  {TECH_CHART_1.map((t, idx) => {
                                      const hasIt = (nation.tech || []).includes(t);
                                      return (
                                          <div key={t} className={cn("px-1.5 py-0.5 border flex items-center gap-1.5 text-left", 
                                              hasIt ? "bg-green-700/45 border-green-500 text-white font-bold" : "bg-black/10 border-transparent opacity-60")}>
                                              <span className="font-mono text-[9px]">{idx + 1}.</span>
                                              <span>{t}</span>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                          <div>
                              <div className="text-[10px] font-bold uppercase border-b border-current/20 pb-1 mb-1.5 opacity-80 text-left">Chart 2: Air & Sea</div>
                              <div className="flex flex-col gap-1 text-[11px]">
                                  {TECH_CHART_2.map((t, idx) => {
                                      const hasIt = (nation.tech || []).includes(t);
                                      return (
                                          <div key={t} className={cn("px-1.5 py-0.5 border flex items-center gap-1.5 text-left", 
                                              hasIt ? "bg-green-700/45 border-green-500 text-white font-bold" : "bg-black/10 border-transparent opacity-60")}>
                                              <span className="font-mono text-[9px]">{idx + 1}.</span>
                                              <span>{t}</span>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* National Objectives Sub-Panel */}
              {openPanel === 'objectives' && (
                  <div className="bg-black/20 p-3 border border-current/20 flex flex-col gap-2.5">
                      <div className="text-xs font-bold uppercase border-b border-current/20 pb-1 text-left">National Objectives & Minor Bonuses</div>
                      <div className="flex flex-col gap-2">
                          {NATION_OBJECTIVES.map(obj => {
                              const activeObjectives = nation.active_objectives || [];
                              const isChecked = activeObjectives.includes(obj.id);
                              return (
                                  <label key={obj.id} className={cn("flex gap-3 items-start p-2 border cursor-pointer hover:bg-black/10 transition-colors text-left", 
                                      isChecked ? "bg-amber-400/20 border-amber-500/50" : "bg-black/5 border-transparent opacity-75")}>
                                      <input 
                                          type="checkbox" 
                                          checked={isChecked} 
                                          disabled={!isEditable}
                                          onChange={(e) => {
                                              if(!isEditable) return;
                                              toggleNationalObjective(nation.name, obj.id, e.target.checked);
                                          }}
                                          className="w-4 h-4 accent-amber-500 shrink-0 mt-0.5"
                                      />
                                      <div className="flex-1 flex flex-col leading-tight min-w-0">
                                          <div className="flex justify-between items-baseline gap-2">
                                              <span className="font-bold text-[11px] truncate">{obj.name}</span>
                                              <span className="text-[10px] font-black text-amber-500 whitespace-nowrap">+{obj.reward} IPC</span>
                                          </div>
                                          <span className="text-[9px] opacity-70 mt-0.5 leading-snug">{obj.desc}</span>
                                      </div>
                                  </label>
                              );
                          })}
                          {NATION_OBJECTIVES.length === 0 && (
                              <div className="italic text-xs text-center py-2 opacity-60">No custom objectives found.</div>
                          )}
                      </div>
                  </div>
              )}

              {/* China Faction Sub-Panel */}
              {openPanel === 'china' && nation.name === 'USA' && (
                  <div className="bg-black/20 p-3 border border-current/20 flex flex-col gap-3">
                      <div className="text-xs font-bold uppercase border-b border-current/20 pb-1 flex justify-between items-center">
                          <span>🇨🇳 Chinese Reinforcements Registry</span>
                          <span className="text-[9px] bg-red-800 text-white px-1.5 py-0.5 rounded">Sub-Faction</span>
                      </div>

                      <div>
                          <div className="text-[10px] font-bold uppercase opacity-85 mb-1.5 text-left">Control Map:</div>
                          <div className="grid grid-cols-2 gap-1.5">
                              {CHINA_TERRITORIES_LIST.map(terr => {
                                  const list = gameData?.china_territories || [];
                                  const controlled = list.includes(terr);
                                  return (
                                      <label key={terr} className={cn("flex items-center gap-2 px-2 py-1 border text-[11px] cursor-pointer hover:bg-black/10 transition-colors text-left", 
                                          controlled ? "bg-red-850/30 border-red-500/40 text-red-100 font-bold" : "bg-black/10 border-transparent opacity-60")}>
                                          <input 
                                              type="checkbox" 
                                              checked={controlled}
                                              disabled={!isEditable}
                                              onChange={(e) => {
                                                  if(!isEditable) return;
                                                  let newList = [...list];
                                                  if (e.target.checked) {
                                                      if (!newList.includes(terr)) newList.push(terr);
                                                  } else {
                                                      newList = newList.filter(t => t !== terr);
                                                  }
                                                  updateChinaTerritories(newList);
                                              }}
                                              className="w-3.5 h-3.5 accent-red-700 shrink-0"
                                          />
                                          <span>{terr}</span>
                                      </label>
                                  );
                              })}
                          </div>
                      </div>

                      <div className="flex bg-black/10 p-2 justify-between items-center rounded-sm text-xs border border-white/5">
                          <div className="flex flex-col text-left">
                              <span className="font-bold">China Mobilization Allowance:</span>
                              <span className="text-[9px] opacity-70">1 Inf / 2 territories (Min 1 if control ≥ 1)</span>
                          </div>
                          <span className="text-lg font-display font-bold text-red-400">{chinaInfantryAllowed} Infantry</span>
                      </div>

                      {chinaInfantryAllowed > 0 && (
                          <div className="flex flex-col gap-2 mt-1">
                              {gameData?.china_reinforcements_placed ? (
                                  <div className="text-center font-bold text-green-400 text-xs py-2 bg-green-950/20 border border-green-500/30 uppercase tracking-wider rounded-sm">
                                      ✓ Reinforcements Mobilized for this turn cycle
                                  </div>
                              ) : (
                                  <>
                                      <div className="text-[10px] font-bold uppercase opacity-85 text-left">Place Reinforcements:</div>
                                      <div className="flex flex-col gap-1">
                                          {(gameData?.china_territories || []).map(terr => {
                                              const qty = chinaPlacements[terr] || 0;
                                              return (
                                                  <div key={terr} className="flex justify-between items-center bg-black/15 py-1 px-2 rounded-sm text-xs">
                                                      <span className="font-medium">{terr}</span>
                                                      {isEditable ? (
                                                          <div className="flex items-center gap-1.5">
                                                              <button 
                                                                  onClick={() => handleChinaPlacementChange(terr, -1)}
                                                                  className="w-5 h-5 bg-black/30 flex items-center justify-center hover:bg-black/50 active:scale-95"
                                                              >-</button>
                                                              <span className="font-bold w-4 text-center">{qty || ''}</span>
                                                              <button 
                                                                  onClick={() => handleChinaPlacementChange(terr, 1)}
                                                                  className="w-5 h-5 bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95"
                                                              >+</button>
                                                          </div>
                                                      ) : (
                                                          <span className="font-bold">x{qty}</span>
                                                      )}
                                                  </div>
                                              );
                                          })}
                                      </div>
                                      {isEditable && (
                                          <button 
                                              onClick={handleChinaMobilize}
                                              disabled={Object.values(chinaPlacements).reduce((sum, q) => sum + q, 0) === 0}
                                              className="mt-1 w-full bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2 uppercase shadow-sm border border-black text-xs active:scale-95 transition-transform"
                                          >
                                              Mobilize China Infantry
                                          </button>
                                      )}
                                  </>
                              )}
                          </div>
                      )}
                  </div>
              )}
          </div>
      )}

      {isEditable && (
          <div className="pt-2 border-t-2 border-current/30 mt-auto flex justify-between gap-2 items-stretch min-h-[3rem]">
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
