import React from 'react';
import { cn } from '../../../../utils/styles';

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

export default function TechPanel({
  nation,
  isEditable,
  buyTechToken,
  refundTechToken,
  rollForTech,
  toggleTechnology
}) {
  return (
    <div className="bg-black/20 p-3 border border-current/20 flex flex-col gap-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <span className="text-xs font-bold uppercase text-left">
          Research Tokens: {nation.research_tokens || 0}
        </span>
        {isEditable && (
          <div className="flex flex-wrap gap-1 justify-end">
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

      {isEditable && (nation.research_tokens || 0) > 0 && (() => {
        const unrolledTokens = (nation.research_tokens || 0) - (nation.tokens_rolled || 0);
        const isDisabled = unrolledTokens <= 0;
        return (
          <div className="flex flex-col gap-2">
            {isDisabled && (
              <div className="text-[10px] font-bold text-center text-red-400 bg-red-950/20 border border-red-500/20 py-1 uppercase tracking-wider">
                All research tokens rolled this turn
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                disabled={isDisabled}
                onClick={() => {
                  if(window.confirm(`Roll for breakthrough on Chart 1 with ${unrolledTokens} dice?`)) {
                    rollForTech(nation.name, 1);
                  }
                }}
                className="flex-1 text-[10px] bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-1.5 px-2 uppercase shadow-sm border border-black"
              >
                Roll Chart 1 ({unrolledTokens} {unrolledTokens === 1 ? 'Die' : 'Dice'})
              </button>
              <button 
                disabled={isDisabled}
                onClick={() => {
                  if(window.confirm(`Roll for breakthrough on Chart 2 with ${unrolledTokens} dice?`)) {
                    rollForTech(nation.name, 2);
                  }
                }}
                className="flex-1 text-[10px] bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-1.5 px-2 uppercase shadow-sm border border-black"
              >
                Roll Chart 2 ({unrolledTokens} {unrolledTokens === 1 ? 'Die' : 'Dice'})
              </button>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
        <div>
          <div className="text-[10px] font-bold uppercase border-b border-current/20 pb-1 mb-1.5 opacity-80 text-left">
            Chart 1: Land & Production
          </div>
          <div className="flex flex-col gap-1 text-[11px]">
            {TECH_CHART_1.map((t, idx) => {
              const hasIt = (nation.tech || []).includes(t);
              return (
                <button 
                  key={t}
                  disabled={!isEditable}
                  onClick={() => toggleTechnology(nation.name, t, !hasIt)}
                  className={cn("px-1.5 py-0.5 border flex items-center gap-1.5 text-left w-full transition-colors", 
                    hasIt ? "bg-green-700/45 border-green-500 text-white font-bold hover:bg-green-700/60" : "bg-black/10 border-transparent opacity-60 hover:bg-black/25")}
                >
                  <span className="font-mono text-[9px]">{idx + 1}.</span>
                  <span>{t}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        <div>
          <div className="text-[10px] font-bold uppercase border-b border-current/20 pb-1 mb-1.5 opacity-80 text-left">
            Chart 2: Air & Sea
          </div>
          <div className="flex flex-col gap-1 text-[11px]">
            {TECH_CHART_2.map((t, idx) => {
              const hasIt = (nation.tech || []).includes(t);
              return (
                <button 
                  key={t}
                  disabled={!isEditable}
                  onClick={() => toggleTechnology(nation.name, t, !hasIt)}
                  className={cn("px-1.5 py-0.5 border flex items-center gap-1.5 text-left w-full transition-colors", 
                    hasIt ? "bg-green-700/45 border-green-500 text-white font-bold hover:bg-green-700/60" : "bg-black/10 border-transparent opacity-60 hover:bg-black/25")}
                >
                  <span className="font-mono text-[9px]">{idx + 1}.</span>
                  <span>{t}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
