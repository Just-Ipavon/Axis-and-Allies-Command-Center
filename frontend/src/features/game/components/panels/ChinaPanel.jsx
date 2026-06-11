import React, { useState } from 'react';
import { useGameStore } from '../../../../store/gameStore';
import { cn } from '../../../../utils/styles';

const CHINA_TERRITORIES_LIST = ['Sinkiang', 'Kansu', 'Szechwan', 'Shensi', 'Kweichow', 'Yunnan', 'Hopei', 'Kiangsu'];

export default function ChinaPanel({ isEditable }) {
  const { gameData, updateChinaTerritories, mobilizeChinaInfantry } = useGameStore();
  const [chinaPlacements, setChinaPlacements] = useState({});

  const list = gameData?.china_territories || [];
  const chinaControlledCount = list.length;
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

  const toggleChinaTerritory = (terr, controlled) => {
    let newList = [...list];
    if (controlled) {
      if (!newList.includes(terr)) newList.push(terr);
    } else {
      newList = newList.filter(t => t !== terr);
    }
    updateChinaTerritories(newList);
  };

  const totalPlaced = Object.values(chinaPlacements).reduce((sum, q) => sum + q, 0);

  return (
    <div className="bg-black/20 p-3 border border-current/20 flex flex-col gap-3">
      <div>
        <div className="text-xs font-bold uppercase border-b border-current/20 pb-1 mb-2 opacity-80 text-left">
          Chinese Faction Dashboard
        </div>
        <div className="text-[10px] opacity-75 uppercase mb-2 font-medium text-left">
          China controlled: <span className="font-bold text-amber-500">{chinaControlledCount}/8</span> base territories
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Territories checklist */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-tight opacity-70 mb-1.5 text-left">Base Control</div>
          <div className="flex flex-col gap-1 text-[11px] max-h-[220px] overflow-y-auto pr-0.5">
            {CHINA_TERRITORIES_LIST.map(terr => {
              const controlled = list.includes(terr);
              return (
                <label 
                  key={terr} 
                  className={cn("px-2 py-1 border flex items-center gap-2 cursor-pointer transition-colors text-left", 
                    controlled ? "bg-red-850/30 border-red-500/40 text-red-100 font-bold" : "bg-black/10 border-transparent opacity-60")}
                >
                  <input 
                    type="checkbox" 
                    disabled={!isEditable}
                    checked={controlled}
                    onChange={(e) => toggleChinaTerritory(terr, e.target.checked)}
                    className="w-3.5 h-3.5 accent-red-600 rounded shrink-0 cursor-pointer"
                  />
                  <span className="truncate">{terr}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Mobilization/Placement */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-tight opacity-70 mb-1.5 text-left">
            Mobilize ({totalPlaced}/{chinaInfantryAllowed})
          </div>
          <div className="flex flex-col gap-1 text-[11px] max-h-[160px] overflow-y-auto pr-0.5 mb-2">
            {CHINA_TERRITORIES_LIST.map(terr => {
              // Only allow placement in currently controlled territories
              const isControlled = list.includes(terr);
              const qty = chinaPlacements[terr] || 0;
              if (!isControlled) return null;
              
              return (
                <div key={terr} className="flex justify-between items-center bg-black/10 p-1.5 gap-1.5">
                  <span className="truncate flex-1 font-medium">{terr}</span>
                  {isEditable ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="opacity-70 text-[10px] w-2.5 text-right font-bold">{qty > 0 ? qty : ''}</span>
                      <button onClick={() => handleChinaPlacementChange(terr, -1)} className="bg-black/30 h-5 w-5 flex items-center justify-center hover:bg-black/50 active:scale-95 text-xs">-</button>
                      <button onClick={() => handleChinaPlacementChange(terr, 1)} className="bg-white/30 text-black h-5 w-5 flex items-center justify-center hover:bg-white/50 active:scale-95 text-xs">+</button>
                    </div>
                  ) : (
                    <span className="font-bold">{qty > 0 ? `x${qty}` : ''}</span>
                  )}
                </div>
              );
            })}
            {chinaControlledCount === 0 && (
              <div className="text-[9px] italic opacity-50 py-3 text-center">
                No territories controlled to place units.
              </div>
            )}
          </div>
          {isEditable && chinaControlledCount > 0 && (
            <button 
              disabled={totalPlaced === 0}
              onClick={handleChinaMobilize}
              className="w-full text-[10px] bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-1.5 uppercase shadow-sm border border-black transition-colors"
            >
              Place Infantry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
