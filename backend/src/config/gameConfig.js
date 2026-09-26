const TURN_ORDER_1942 = ["USSR", "Germany", "UK", "Japan", "USA"];

const STARTING_DATA_1942 = [
  [
    "USSR",
    24,
    24,
    [
      { id: "f-ussr1", name: "Russia", capacity: 8, damage: 0 },
      { id: "f-ussr2", name: "Caucasus", capacity: 4, damage: 0 },
      { id: "f-ussr3", name: "Karelia S.S.R.", capacity: 2, damage: 0 },
    ],
  ],
  [
    "Germany",
    40,
    40,
    [
      { id: "f-ger1", name: "Germany", capacity: 10, damage: 0 },
      { id: "f-ger2", name: "Italy", capacity: 3, damage: 0 },
    ],
  ],
  [
    "UK",
    30,
    30,
    [
      { id: "f-uk1", name: "United Kingdom", capacity: 8, damage: 0 },
      { id: "f-uk2", name: "India", capacity: 3, damage: 0 },
    ],
  ],
  ["Japan", 30, 30, [{ id: "f-jap1", name: "Japan", capacity: 8, damage: 0 }]],
  [
    "USA",
    42,
    42,
    [
      { id: "f-usa1", name: "Eastern US", capacity: 12, damage: 0 },
      { id: "f-usa2", name: "Western US", capacity: 10, damage: 0 },
    ],
  ],
];

const TURN_ORDER_ANNIVERSARY_1941 = ["Germany", "USSR", "Japan", "UK", "Italy", "USA"];

const STARTING_DATA_ANNIVERSARY_1941 = [
  [
    "Germany",
    31,
    31,
    [{ id: "f-ger1", name: "Germany", capacity: 10, damage: 0 }],
  ],
  [
    "USSR",
    30,
    30,
    [{ id: "f-ussr1", name: "Russia", capacity: 8, damage: 0 }],
  ],
  [
    "Japan",
    17,
    17,
    [{ id: "f-jap1", name: "Japan", capacity: 8, damage: 0 }],
  ],
  [
    "UK",
    43,
    43,
    [{ id: "f-uk1", name: "United Kingdom", capacity: 8, damage: 0 }],
  ],
  [
    "Italy",
    10,
    10,
    [{ id: "f-ita1", name: "Italy", capacity: 3, damage: 0 }],
  ],
  [
    "USA",
    40,
    40,
    [
      { id: "f-usa1", name: "Eastern US", capacity: 12, damage: 0 },
      { id: "f-usa2", name: "Western US", capacity: 10, damage: 0 },
    ],
  ],
];

const TURN_ORDER_ANNIVERSARY_1942 = ["Japan", "USSR", "Germany", "UK", "Italy", "USA"];

const STARTING_DATA_ANNIVERSARY_1942 = [
  [
    "Japan",
    30,
    30,
    [{ id: "f-jap1", name: "Japan", capacity: 8, damage: 0 }],
  ],
  [
    "USSR",
    24,
    24,
    [
      { id: "f-ussr1", name: "Russia", capacity: 8, damage: 0 },
      { id: "f-ussr2", name: "Caucasus", capacity: 4, damage: 0 },
    ],
  ],
  [
    "Germany",
    37,
    37,
    [{ id: "f-ger1", name: "Germany", capacity: 10, damage: 0 }],
  ],
  [
    "UK",
    30,
    30,
    [
      { id: "f-uk1", name: "United Kingdom", capacity: 8, damage: 0 },
      { id: "f-uk2", name: "India", capacity: 3, damage: 0 },
    ],
  ],
  [
    "Italy",
    10,
    10,
    [{ id: "f-ita1", name: "Italy", capacity: 3, damage: 0 }],
  ],
  [
    "USA",
    42,
    42,
    [
      { id: "f-usa1", name: "Eastern US", capacity: 12, damage: 0 },
      { id: "f-usa2", name: "Western US", capacity: 10, damage: 0 },
    ],
  ],
];

const getTurnOrder = (version) => {
  if (version === "anniversary_1941") return TURN_ORDER_ANNIVERSARY_1941;
  if (version === "anniversary_1942") return TURN_ORDER_ANNIVERSARY_1942;
  return TURN_ORDER_1942;
};

const getStartingData = (version) => {
  if (version === "anniversary_1941") return STARTING_DATA_ANNIVERSARY_1941;
  if (version === "anniversary_1942") return STARTING_DATA_ANNIVERSARY_1942;
  return STARTING_DATA_1942;
};

// Anniversary Edition National Objectives (id -> display name and IPC reward).
// Keep in sync with ALL_OBJECTIVES in frontend/src/constants/gameData.js.
const NATIONAL_OBJECTIVES = {
  USSR: {
    no_ussr_1: { name: "Archangelsk Security", reward: 5 },
    no_ussr_2: { name: "Soviet Expansion", reward: 10 },
  },
  Germany: {
    no_germany_1: { name: "Lebensraum", reward: 5 },
    no_germany_2: { name: "Eastern Front", reward: 5 },
    no_germany_3: { name: "Caucasus/Karelia Control", reward: 5 },
  },
  UK: {
    no_uk_1: { name: "Japanese Territory Capture", reward: 5 },
    no_uk_2: { name: "British Empire Integrity", reward: 5 },
    no_uk_3: { name: "France/Balkans Liberation", reward: 5 },
  },
  Japan: {
    no_japan_1: { name: "Greater East Asia Co-Prosperity Sphere", reward: 5 },
    no_japan_2: { name: "Pacific Islands Hegemony", reward: 5 },
    no_japan_3: { name: "India/Australia/Hawaii Control", reward: 5 },
  },
  USA: {
    no_usa_1: { name: "Pacific Security Zone", reward: 5 },
    no_usa_2: { name: "Western Hemisphere Security", reward: 5 },
    no_usa_3: { name: "Liberation of France", reward: 5 },
  },
  Italy: {
    no_italy_1: { name: "Mediterranean Dominance", reward: 5 },
    no_italy_2: { name: "Roman Empire Revival", reward: 5 },
  },
};

// Anniversary Edition research charts.
const TECH_CHARTS = {
  1: ["Advanced Artillery", "Rockets", "Paratroopers", "Increased Factory Production", "War Bonds", "Mechanized Infantry"],
  2: ["Super Submarines", "Jet Fighters", "Improved Shipyards", "Radar", "Long-Range Aircraft", "Heavy Bombers"],
};
const ALL_TECHS = [...TECH_CHARTS[1], ...TECH_CHARTS[2]];

// Keep in sync with CHINA_TERRITORIES_LIST in ChinaPanel.jsx.
const CHINA_TERRITORIES = ["Sinkiang", "Kansu", "Szechwan", "Shensi", "Kweichow", "Yunnan", "Hopei", "Kiangsu"];

const getStartingChina = (version) => {
  if (version === "anniversary_1941") return ["Sinkiang", "Kansu", "Szechwan", "Shensi", "Kweichow"];
  if (version === "anniversary_1942") return ["Sinkiang", "Kansu", "Szechwan"];
  return [];
};

// AA50: China places 1 infantry for every 2 territories it controls (rounded down).
const getChinaInfantryAllowed = (territoryCount) => Math.floor(territoryCount / 2);

const GAME_VERSIONS = ["1942", "anniversary_1941", "anniversary_1942"];

module.exports = {
  NATIONAL_OBJECTIVES,
  TECH_CHARTS,
  ALL_TECHS,
  CHINA_TERRITORIES,
  GAME_VERSIONS,
  getStartingChina,
  getChinaInfantryAllowed,
  TURN_ORDER_1942,
  STARTING_DATA_1942,
  TURN_ORDER_ANNIVERSARY_1941,
  STARTING_DATA_ANNIVERSARY_1941,
  TURN_ORDER_ANNIVERSARY_1942,
  STARTING_DATA_ANNIVERSARY_1942,
  getTurnOrder,
  getStartingData,
};
