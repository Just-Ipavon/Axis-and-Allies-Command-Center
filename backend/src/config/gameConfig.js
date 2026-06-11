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

module.exports = {
  TURN_ORDER: TURN_ORDER_1942,
  STARTING_DATA: STARTING_DATA_1942,
  TURN_ORDER_1942,
  STARTING_DATA_1942,
  TURN_ORDER_ANNIVERSARY_1941,
  STARTING_DATA_ANNIVERSARY_1941,
  TURN_ORDER_ANNIVERSARY_1942,
  STARTING_DATA_ANNIVERSARY_1942,
  getTurnOrder,
  getStartingData,
};
