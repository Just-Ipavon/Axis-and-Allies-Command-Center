import { UNITS } from '../../../constants/gameData';

// Cost and capacity rules are shared with the server.
export {
  getUnitCost,
  getFactoryProductionBonus,
  getCartCapacity,
  getRepairCost,
  countMobilizedUnits,
  repairKey,
} from '../../../../../shared/gameRules.mjs';

// Unit stats as displayed in the mobilization list, including tech upgrades.
export const getUnitStats = (unitName, techArray) => {
  const baseUnit = UNITS[unitName];
  let attack = baseUnit.a;
  let defense = baseUnit.d;
  let movement = baseUnit.m;

  if (Array.isArray(techArray)) {
    if (unitName === 'Submarine' && techArray.includes('Super Submarines')) {
      attack = 3;
    }
    if (unitName === 'Fighter' && techArray.includes('Jet Fighters')) {
      attack = 4;
    }
    if (unitName === 'Fighter' && techArray.includes('Long-Range Aircraft')) {
      movement = 6;
    }
    if (unitName === 'Bomber' && techArray.includes('Long-Range Aircraft')) {
      movement = 8;
    }
    if (unitName === 'Bomber' && techArray.includes('Heavy Bombers')) {
      attack = '4 (x2)';
    }
    if (unitName === 'AA Gun' && techArray.includes('Radar')) {
      defense = 2;
    }
  }

  return { a: attack, d: defense, m: movement };
};
