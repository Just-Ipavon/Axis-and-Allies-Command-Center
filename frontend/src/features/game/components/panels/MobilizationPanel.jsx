import React from 'react';
import { cn } from '../../../../utils/styles';
import { UNITS } from '../../../../constants/gameData';
import { UnitIconResolver } from '../../../../components/icons/UnitIcons';
import { getUnitCost, getUnitStats } from '../../utils/techEffects';

export default function MobilizationPanel({
  nation,
  isEditable,
  purchasesLocked,
  isBanker,
  totalPurchased,
  totalCapacity,
  currentPurchases,
  handlePurchase,
  hasIncreasedProd
}) {
  return (
    <div className="flex-1 mt-2 relative">
      <div className="flex justify-between items-end mb-1 border-b border-current/20 pb-1 flex-wrap gap-1">
        <h3 className="text-sm font-bold uppercase">Mobilization</h3>
        <span className="text-[10px] bg-white/20 px-2 py-0.5 font-bold shadow-sm border border-current">
          Capacity: {totalPurchased}/{totalCapacity}
        </span>
      </div>
      <div className={cn("flex flex-col gap-1 text-sm overflow-y-auto max-h-[170px] pr-1", 
        purchasesLocked && !isBanker && "opacity-60 pointer-events-none")}>
        
        {Object.keys(UNITS).map(unit => {
          const qty = (nation.purchases && nation.purchases[unit]) || 0;
          return (
            <div key={unit} className="flex justify-between items-center bg-black/10 py-1.5 px-2 gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <UnitIconResolver unitName={unit} size={26} className="text-current shrink-0" />
                <div className="flex items-baseline gap-1.5 flex-wrap sm:flex-nowrap">
                  <span className="leading-tight whitespace-nowrap font-medium text-[13px]">{unit}</span>
                  <div className="flex gap-1.5 items-baseline">
                    {(() => {
                      const stats = getUnitStats(unit, nation.tech);
                      const cost = getUnitCost(unit, nation.tech);
                      return (
                        <>
                          <span className="opacity-50 text-[9px] font-bold whitespace-nowrap">
                            A{stats.a} D{stats.d} M{stats.m}
                          </span>
                          <span className="opacity-80 text-[11px] font-bold text-amber-500/80 whitespace-nowrap">
                            IPC {cost}
                          </span>
                        </>
                      );
                    })()}
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
          );
        })}
        
        {(() => {
          const totalPendingRepairCost = Object.entries(currentPurchases).reduce((sum, [k, qty]) => {
            if (k.startsWith('repair_')) {
              return sum + (hasIncreasedProd ? Math.ceil(qty / 2) : qty);
            }
            return sum;
          }, 0);
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
  );
}
