// Single source of truth for game rules, shared by the backend (require) and the frontend (import).
// Pure data and pure functions only: no Node or browser APIs.

export const RULES = Object.freeze({
  "versions": {
    "1942": {
      "label": "Axis & Allies 1942",
      "anniversary": false
    },
    "anniversary_1941": {
      "label": "Axis & Allies Anniversary (1941)",
      "anniversary": true
    },
    "anniversary_1942": {
      "label": "Axis & Allies Anniversary (1942)",
      "anniversary": true
    }
  },
  "alliances": {
    "Axis": [
      "Germany",
      "Japan",
      "Italy"
    ],
    "Allies": [
      "USSR",
      "UK",
      "USA"
    ]
  },
  "turnOrders": {
    "1942": [
      "USSR",
      "Germany",
      "UK",
      "Japan",
      "USA"
    ],
    "anniversary_1941": [
      "Germany",
      "USSR",
      "Japan",
      "UK",
      "Italy",
      "USA"
    ],
    "anniversary_1942": [
      "Japan",
      "USSR",
      "Germany",
      "UK",
      "Italy",
      "USA"
    ]
  },
  "startingNations": {
    "1942": [
      {
        "name": "USSR",
        "income": 24,
        "bank": 24,
        "factories": [
          {
            "id": "f-ussr1",
            "name": "Russia",
            "capacity": 8
          },
          {
            "id": "f-ussr2",
            "name": "Caucasus",
            "capacity": 4
          },
          {
            "id": "f-ussr3",
            "name": "Karelia S.S.R.",
            "capacity": 2
          }
        ]
      },
      {
        "name": "Germany",
        "income": 40,
        "bank": 40,
        "factories": [
          {
            "id": "f-ger1",
            "name": "Germany",
            "capacity": 10
          },
          {
            "id": "f-ger2",
            "name": "Italy",
            "capacity": 3
          }
        ]
      },
      {
        "name": "UK",
        "income": 30,
        "bank": 30,
        "factories": [
          {
            "id": "f-uk1",
            "name": "United Kingdom",
            "capacity": 8
          },
          {
            "id": "f-uk2",
            "name": "India",
            "capacity": 3
          }
        ]
      },
      {
        "name": "Japan",
        "income": 30,
        "bank": 30,
        "factories": [
          {
            "id": "f-jap1",
            "name": "Japan",
            "capacity": 8
          }
        ]
      },
      {
        "name": "USA",
        "income": 42,
        "bank": 42,
        "factories": [
          {
            "id": "f-usa1",
            "name": "Eastern US",
            "capacity": 12
          },
          {
            "id": "f-usa2",
            "name": "Western US",
            "capacity": 10
          }
        ]
      }
    ],
    "anniversary_1941": [
      {
        "name": "Germany",
        "income": 31,
        "bank": 31,
        "factories": [
          {
            "id": "f-ger1",
            "name": "Germany",
            "capacity": 10
          }
        ]
      },
      {
        "name": "USSR",
        "income": 30,
        "bank": 30,
        "factories": [
          {
            "id": "f-ussr1",
            "name": "Russia",
            "capacity": 8
          }
        ]
      },
      {
        "name": "Japan",
        "income": 17,
        "bank": 17,
        "factories": [
          {
            "id": "f-jap1",
            "name": "Japan",
            "capacity": 8
          }
        ]
      },
      {
        "name": "UK",
        "income": 43,
        "bank": 43,
        "factories": [
          {
            "id": "f-uk1",
            "name": "United Kingdom",
            "capacity": 8
          }
        ]
      },
      {
        "name": "Italy",
        "income": 10,
        "bank": 10,
        "factories": [
          {
            "id": "f-ita1",
            "name": "Italy",
            "capacity": 3
          }
        ]
      },
      {
        "name": "USA",
        "income": 40,
        "bank": 40,
        "factories": [
          {
            "id": "f-usa1",
            "name": "Eastern US",
            "capacity": 12
          },
          {
            "id": "f-usa2",
            "name": "Western US",
            "capacity": 10
          }
        ]
      }
    ],
    "anniversary_1942": [
      {
        "name": "Japan",
        "income": 30,
        "bank": 30,
        "factories": [
          {
            "id": "f-jap1",
            "name": "Japan",
            "capacity": 8
          }
        ]
      },
      {
        "name": "USSR",
        "income": 24,
        "bank": 24,
        "factories": [
          {
            "id": "f-ussr1",
            "name": "Russia",
            "capacity": 8
          },
          {
            "id": "f-ussr2",
            "name": "Caucasus",
            "capacity": 4
          }
        ]
      },
      {
        "name": "Germany",
        "income": 37,
        "bank": 37,
        "factories": [
          {
            "id": "f-ger1",
            "name": "Germany",
            "capacity": 10
          }
        ]
      },
      {
        "name": "UK",
        "income": 30,
        "bank": 30,
        "factories": [
          {
            "id": "f-uk1",
            "name": "United Kingdom",
            "capacity": 8
          },
          {
            "id": "f-uk2",
            "name": "India",
            "capacity": 3
          }
        ]
      },
      {
        "name": "Italy",
        "income": 10,
        "bank": 10,
        "factories": [
          {
            "id": "f-ita1",
            "name": "Italy",
            "capacity": 3
          }
        ]
      },
      {
        "name": "USA",
        "income": 42,
        "bank": 42,
        "factories": [
          {
            "id": "f-usa1",
            "name": "Eastern US",
            "capacity": 12
          },
          {
            "id": "f-usa2",
            "name": "Western US",
            "capacity": 10
          }
        ]
      }
    ]
  },
  "units": {
    "Infantry": {
      "cost": 3,
      "a": 1,
      "d": 2,
      "m": 1
    },
    "Artillery": {
      "cost": 4,
      "a": 2,
      "d": 2,
      "m": 1
    },
    "Tank": {
      "cost": 6,
      "a": 3,
      "d": 3,
      "m": 2
    },
    "AA Gun": {
      "cost": 5,
      "a": "-",
      "d": "-",
      "m": 1
    },
    "Fighter": {
      "cost": 10,
      "a": 3,
      "d": 4,
      "m": 4
    },
    "Bomber": {
      "cost": 12,
      "a": 4,
      "d": 1,
      "m": 6
    },
    "Submarine": {
      "cost": 6,
      "a": 2,
      "d": 1,
      "m": 2
    },
    "Transport": {
      "cost": 7,
      "a": 0,
      "d": 0,
      "m": 2
    },
    "Destroyer": {
      "cost": 8,
      "a": 2,
      "d": 2,
      "m": 2
    },
    "Cruiser": {
      "cost": 12,
      "a": 3,
      "d": 3,
      "m": 2
    },
    "Carrier": {
      "cost": 14,
      "a": 1,
      "d": 2,
      "m": 2
    },
    "Battleship": {
      "cost": 20,
      "a": 4,
      "d": 4,
      "m": 2
    },
    "Industrial Complex": {
      "cost": 15,
      "a": "-",
      "d": "-",
      "m": "-"
    }
  },
  "improvedShipyardsDiscount": {
    "Battleship": 3,
    "Carrier": 3,
    "Cruiser": 3,
    "Destroyer": 1,
    "Submarine": 1,
    "Transport": 1
  },
  "researchTokenCost": 5,
  "techCharts": {
    "1": [
      "Advanced Artillery",
      "Rockets",
      "Paratroopers",
      "Increased Factory Production",
      "War Bonds",
      "Mechanized Infantry"
    ],
    "2": [
      "Super Submarines",
      "Jet Fighters",
      "Improved Shipyards",
      "Radar",
      "Long-Range Aircraft",
      "Heavy Bombers"
    ]
  },
  "nationalObjectives": {
    "USSR": [
      {
        "id": "no_ussr_1",
        "name": "Archangelsk Security",
        "desc": "USSR controls Archangelsk (No Allied units in territory)",
        "reward": 5
      },
      {
        "id": "no_ussr_2",
        "name": "Soviet Expansion",
        "desc": "USSR controls at least 3 territories originally controlled by Germany/Italy/Japan/Pro-Axis neutrals",
        "reward": 10
      }
    ],
    "Germany": [
      {
        "id": "no_germany_1",
        "name": "Lebensraum",
        "desc": "Germany controls France, NW Europe, Poland, Baltic States, and Bulgaria/Romania",
        "reward": 5
      },
      {
        "id": "no_germany_2",
        "name": "Eastern Front",
        "desc": "Germany controls Baltic States, East Poland, Belorussia, and Ukraine",
        "reward": 5
      },
      {
        "id": "no_germany_3",
        "name": "Caucasus/Karelia Control",
        "desc": "Germany controls Caucasus and/or Karelia",
        "reward": 5
      }
    ],
    "UK": [
      {
        "id": "no_uk_1",
        "name": "Japanese Territory Capture",
        "desc": "UK controls at least 1 territory originally controlled by Japan",
        "reward": 5
      },
      {
        "id": "no_uk_2",
        "name": "British Empire Integrity",
        "desc": "Allies control Eastern Canada, Western Canada, Gibraltar, Egypt, Australia, and Union of South Africa",
        "reward": 5
      },
      {
        "id": "no_uk_3",
        "name": "France/Balkans Liberation",
        "desc": "UK controls France and/or Balkans (liberated)",
        "reward": 5
      }
    ],
    "Japan": [
      {
        "id": "no_japan_1",
        "name": "Greater East Asia Co-Prosperity Sphere",
        "desc": "Axis controls Manchuria, Kiangsu, and French Indo-China Thailand",
        "reward": 5
      },
      {
        "id": "no_japan_2",
        "name": "Pacific Islands Hegemony",
        "desc": "Axis controls any 4 of Kwangtung, East Indies, Borneo, Philippine Islands, New Guinea, and Solomon Islands",
        "reward": 5
      },
      {
        "id": "no_japan_3",
        "name": "India/Australia/Hawaii Control",
        "desc": "Japan controls India, Australia, and/or Hawaiian Islands",
        "reward": 5
      }
    ],
    "USA": [
      {
        "id": "no_usa_1",
        "name": "Pacific Security Zone",
        "desc": "Allies control Alaska, Aleutian Islands, Hawaiian Islands, Johnston Island, and Line Islands",
        "reward": 5
      },
      {
        "id": "no_usa_2",
        "name": "Western Hemisphere Security",
        "desc": "USA controls Central America, West Indies, and Colombia/Venezuela",
        "reward": 5
      },
      {
        "id": "no_usa_3",
        "name": "Liberation of France",
        "desc": "USA controls France (liberated)",
        "reward": 5
      }
    ],
    "Italy": [
      {
        "id": "no_italy_1",
        "name": "Mediterranean Dominance",
        "desc": "Axis controls Southern Europe, Balkans, Morocco Algeria, and Libya, with no Allied surface warships in Sea Zones 13, 14, and 15",
        "reward": 5
      },
      {
        "id": "no_italy_2",
        "name": "Roman Empire Revival",
        "desc": "Axis controls at least 3 of Egypt, Trans-Jordan, France, and Gibraltar",
        "reward": 5
      }
    ]
  },
  "chinaTerritories": [
    "Sinkiang",
    "Kansu",
    "Szechwan",
    "Shensi",
    "Kweichow",
    "Yunnan",
    "Hopei",
    "Kiangsu"
  ],
  "startingChina": {
    "1942": [],
    "anniversary_1941": [
      "Sinkiang",
      "Kansu",
      "Szechwan",
      "Shensi",
      "Kweichow"
    ],
    "anniversary_1942": [
      "Sinkiang",
      "Kansu",
      "Szechwan"
    ]
  }
});

export const GAME_VERSIONS = Object.keys(RULES.versions);
export const normalizeVersion = (version) => (RULES.versions[version] ? version : '1942');
export const isAnniversary = (version) => !!RULES.versions[normalizeVersion(version)].anniversary;

export const getTurnOrder = (version) => RULES.turnOrders[normalizeVersion(version)];
export const getStartingNations = (version) => RULES.startingNations[normalizeVersion(version)];
export const getStartingChina = (version) => RULES.startingChina[normalizeVersion(version)];

export const getNextTurn = (version, currentTurn, step = 1) => {
  const order = getTurnOrder(version);
  const idx = Math.max(0, order.indexOf(currentTurn));
  return order[(idx + step + order.length) % order.length];
};

export const getAlliance = (nation) => (RULES.alliances.Axis.includes(nation) ? 'Axis' : 'Allies');

export const ALL_TECHS = [...RULES.techCharts[1], ...RULES.techCharts[2]];
const hasTech = (techs, name) => Array.isArray(techs) && techs.includes(name);

// Improved Shipyards discounts naval units.
export const getUnitCost = (unitName, techs) => {
  const unit = RULES.units[unitName];
  if (!unit) return null;
  const discount = hasTech(techs, 'Improved Shipyards') ? (RULES.improvedShipyardsDiscount[unitName] || 0) : 0;
  return Math.max(1, unit.cost - discount);
};

// Increased Factory Production (AA50): +2 units only for complexes in territories worth 3+ IPCs.
export const getFactoryProductionBonus = (factory, techs) =>
  hasTech(techs, 'Increased Factory Production') && (parseInt(factory.capacity, 10) || 0) >= 3 ? 2 : 0;

// Units a nation can mobilize this turn. A complex bought this turn cannot produce yet.
export const getProductionCapacity = (factories, techs) =>
  (factories || []).reduce((sum, f) => {
    if (f.builtThisTurn) return sum;
    const cap = parseInt(f.capacity, 10) || 0;
    const damage = parseInt(f.damage, 10) || 0;
    return sum + Math.max(0, cap + getFactoryProductionBonus(f, techs) - damage);
  }, 0);

// Increased Factory Production halves repair costs (rounded up per complex, per turn).
export const getRepairCost = (points, techs) =>
  hasTech(techs, 'Increased Factory Production') ? Math.ceil(points / 2) : points;

export const isRepairKey = (key) => key.startsWith('repair_');
export const repairKey = (factoryId) => `repair_${factoryId}`;

// Units in the cart, excluding repairs and new complexes (they do not use production capacity).
export const countMobilizedUnits = (purchases) =>
  Object.entries(purchases || {}).reduce(
    (sum, [key, qty]) => (key === 'Industrial Complex' || isRepairKey(key) ? sum : sum + qty),
    0
  );

// Total IPC value of a cart, used for refunds when the cart is restored.
export const getCartCost = (purchases, techs) =>
  Object.entries(purchases || {}).reduce((sum, [key, qty]) => {
    if (isRepairKey(key)) return sum + getRepairCost(qty, techs);
    const cost = getUnitCost(key, techs);
    return cost === null ? sum : sum + cost * qty;
  }, 0);

export const getObjective = (nation, objectiveId) =>
  (RULES.nationalObjectives[nation] || []).find((o) => o.id === objectiveId) || null;

// AA50: China places 1 infantry for every 2 territories it controls (rounded down).
export const getChinaInfantryAllowed = (territoryCount) => Math.floor(territoryCount / 2);

// Queued (not yet confirmed) repairs already count toward this turn's capacity.
export const applyPendingRepairs = (factories, purchases) =>
  (factories || []).map((f) => {
    const queued = (purchases || {})[repairKey(f.id)] || 0;
    return queued ? { ...f, damage: Math.max(0, (f.damage || 0) - queued) } : f;
  });

// Capacity for the current cart: repairs are applied to damage only when the cart is locked.
export const getCartCapacity = (factories, purchases, techs, locked) =>
  getProductionCapacity(locked ? factories : applyPendingRepairs(factories, purchases), techs);
