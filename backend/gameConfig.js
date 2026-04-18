const TURN_ORDER = ['USSR', 'Germany', 'UK', 'Japan', 'USA'];

const STARTING_DATA = [
    ['USSR', 24, 24, [
        { id: 'f-ussr1', name: 'Russia', capacity: 8, damage: 0 },
        { id: 'f-ussr2', name: 'Caucasus', capacity: 4, damage: 0 },
        { id: 'f-ussr3', name: 'Karelia S.S.R.', capacity: 2, damage: 0 }
    ]],
    ['Germany', 41, 41, [
        { id: 'f-ger1', name: 'Germany', capacity: 10, damage: 0 },
        { id: 'f-ger2', name: 'Italy', capacity: 3, damage: 0 }
    ]],
    ['UK', 31, 31, [
        { id: 'f-uk1', name: 'United Kingdom', capacity: 8, damage: 0 },
        { id: 'f-uk2', name: 'India', capacity: 3, damage: 0 }
    ]],
    ['Japan', 30, 30, [
        { id: 'f-jap1', name: 'Japan', capacity: 8, damage: 0 }
    ]],
    ['USA', 42, 42, [
        { id: 'f-usa1', name: 'Eastern US', capacity: 12, damage: 0 },
        { id: 'f-usa2', name: 'Western US', capacity: 10, damage: 0 }
    ]]
];

module.exports = {
    TURN_ORDER,
    STARTING_DATA
};
