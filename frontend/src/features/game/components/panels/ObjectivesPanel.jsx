import React from 'react';
import { cn } from '../../../../utils/styles';
import { ALL_OBJECTIVES } from '../../../../constants/gameData';

export default function ObjectivesPanel({
  nation,
  isEditable,
  toggleNationalObjective
}) {
  const objectives = ALL_OBJECTIVES[nation.name] || [];

  return (
    <div className="bg-black/20 p-3 border border-current/20 flex flex-col gap-2">
      <div className="text-xs font-bold uppercase tracking-wider border-b border-current/20 pb-1.5 opacity-80 text-left">
        National Objectives (Select to activate reward)
      </div>
      <div className="flex flex-col gap-1.5 text-[11px] max-h-[190px] overflow-y-auto pr-0.5">
        {objectives.map(obj => {
          const isActive = (nation.active_objectives || []).includes(obj.id);
          return (
            <button
              key={obj.id}
              disabled={!isEditable}
              onClick={() => toggleNationalObjective(nation.name, obj.id, !isActive)}
              className={cn("p-2 border flex flex-col gap-0.5 text-left w-full transition-colors", 
                isActive ? "bg-green-700/45 border-green-500 text-white font-bold" : "bg-black/10 border-transparent opacity-60 hover:bg-black/25")}
            >
              <div className="flex justify-between items-center w-full font-bold">
                <span>{obj.name}</span>
                <span className="text-amber-500/90 text-[10px]">+{obj.reward} IPC</span>
              </div>
              <span className="opacity-70 text-[9px] font-normal leading-tight mt-0.5">
                {obj.desc}
              </span>
            </button>
          );
        })}
        {objectives.length === 0 && (
          <div className="italic opacity-60 text-xs py-2 text-center">
            No objectives defined for {nation.name}.
          </div>
        )}
      </div>
    </div>
  );
}
