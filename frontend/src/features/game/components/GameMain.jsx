import NationCard from './NationCard';
import MiniNationCard from './MiniNationCard';
import { getTurnOrder } from '../../../constants/gameData';

export default function GameMain({ role, nations, gameData }) {
  const version = gameData.game_version || '1942';
  const turnOrder = getTurnOrder(version);

  return (
    <div className="lg:col-span-3 flex flex-col gap-6">
      {/* If Banker: Show Grid of All Full Cards */}
      {role === 'banker' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 items-start">
          {[...nations]
            .sort((a, b) => turnOrder.indexOf(a.name) - turnOrder.indexOf(b.name))
            .map((nation) => (
              <NationCard key={nation.name} nation={nation} isEditable={true} gameVersion={version} />
            ))}
        </div>
      )}

      {/* If Single Player: Show Top Full Card + Minimap of Others */}
      {role !== 'banker' && (
        <>
          <div>
            {nations
              .filter((n) => n.name === role)
              .map((nation) => (
                <NationCard key={nation.name} nation={nation} isEditable={true} gameVersion={version} />
              ))}
          </div>

          {nations.filter((n) => n.name !== role).length > 0 && (
            <div className="pt-4 border-t-2 border-vintage-text/20">
              <h3 className="text-xs font-bold mb-3 uppercase tracking-widest opacity-60">
                Global Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nations
                  .filter((n) => n.name !== role)
                  .sort((a, b) => turnOrder.indexOf(a.name) - turnOrder.indexOf(b.name))
                  .map((nation) => (
                    <MiniNationCard key={nation.name} nation={nation} />
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
