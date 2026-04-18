export const TURN_ORDER = ['USSR', 'Germany', 'UK', 'Japan', 'USA'];

// Unit costs standard for 1942 2nd Edition
export const UNITS = {
  'Infantry': { cost: 3, a: 1, d: 2, m: 1 },
  'Artillery': { cost: 4, a: 2, d: 2, m: 1 },
  'Tank': { cost: 6, a: 3, d: 3, m: 2 },
  'AA Gun': { cost: 5, a: '-', d: '-', m: 1 },
  'Fighter': { cost: 10, a: 3, d: 4, m: 4 },
  'Bomber': { cost: 12, a: 4, d: 1, m: 6 },
  'Submarine': { cost: 6, a: 2, d: 1, m: 2 },
  'Transport': { cost: 7, a: 0, d: 0, m: 2 },
  'Destroyer': { cost: 8, a: 2, d: 2, m: 2 },
  'Cruiser': { cost: 12, a: 3, d: 3, m: 2 },
  'Carrier': { cost: 14, a: 1, d: 2, m: 2 },
  'Battleship': { cost: 20, a: 4, d: 4, m: 2 },
  'Industrial Complex': { cost: 15, a: '-', d: '-', m: '-' },
};
