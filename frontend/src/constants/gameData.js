export const TURN_ORDER_1942 = ['USSR', 'Germany', 'UK', 'Japan', 'USA'];
export const TURN_ORDER_ANNIVERSARY_1941 = ['Germany', 'USSR', 'Japan', 'UK', 'Italy', 'USA'];
export const TURN_ORDER_ANNIVERSARY_1942 = ['Japan', 'USSR', 'Germany', 'UK', 'Italy', 'USA'];

export const getTurnOrder = (version) => {
  if (version === 'anniversary_1941') return TURN_ORDER_ANNIVERSARY_1941;
  if (version === 'anniversary_1942') return TURN_ORDER_ANNIVERSARY_1942;
  return TURN_ORDER_1942;
};

// Unit costs standard for 1942 2nd Edition and Anniversary Edition
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

export const ALL_OBJECTIVES = {
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
};

