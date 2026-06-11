import { UNITS } from '../../../constants/gameData';

export const getUnitCost = (unitName, techArray) => {
  const baseCost = UNITS[unitName].cost;
  if (Array.isArray(techArray) && techArray.includes('Improved Shipyards')) {
    if (unitName === 'Battleship' || unitName === 'Carrier' || unitName === 'Cruiser') {
      return Math.max(1, baseCost - 3);
    }
    if (unitName === 'Destroyer' || unitName === 'Submarine' || unitName === 'Transport') {
      return Math.max(1, baseCost - 1);
    }
  }
  return baseCost;
};

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
