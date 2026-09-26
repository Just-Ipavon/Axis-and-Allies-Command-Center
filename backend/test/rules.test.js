const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../../shared/gameRules.mjs');

test('turn order wraps and steps back', () => {
    assert.equal(rules.getNextTurn('1942', 'USA'), 'USSR');
    assert.equal(rules.getNextTurn('anniversary_1941', 'Germany', -1), 'USA');
    assert.equal(rules.getNextTurn('unknown', 'USSR'), 'Germany');
});

test('Improved Shipyards discounts naval units only', () => {
    const tech = ['Improved Shipyards'];
    assert.equal(rules.getUnitCost('Battleship', tech), 17);
    assert.equal(rules.getUnitCost('Destroyer', tech), 7);
    assert.equal(rules.getUnitCost('Tank', tech), 6);
    assert.equal(rules.getUnitCost('Battleship', []), 20);
    assert.equal(rules.getUnitCost('Nope', []), null);
});

test('production capacity: IFP bonus only for 3+ IPC territories, new complexes excluded', () => {
    const ifp = ['Increased Factory Production'];
    const factories = [
        { id: 'a', capacity: 2, damage: 0 },
        { id: 'b', capacity: 8, damage: 3 },
        { id: 'c', capacity: 3, damage: 0, builtThisTurn: true },
    ];
    assert.equal(rules.getProductionCapacity(factories, []), 2 + 5);
    assert.equal(rules.getProductionCapacity(factories, ifp), 2 + 7);
    // Queued repairs count only while the cart is unlocked.
    assert.equal(rules.getCartCapacity(factories, { repair_b: 2 }, [], false), 2 + 7);
    assert.equal(rules.getCartCapacity(factories, { repair_b: 2 }, [], true), 2 + 5);
});

test('repair cost is halved (rounded up) with IFP', () => {
    assert.equal(rules.getRepairCost(3, []), 3);
    assert.equal(rules.getRepairCost(3, ['Increased Factory Production']), 2);
});

test('cart counting ignores repairs and complexes', () => {
    assert.equal(rules.countMobilizedUnits({ Infantry: 3, Tank: 1, repair_x: 2, 'Industrial Complex': 1 }), 4);
});

test('China infantry: one per two territories, rounded down', () => {
    assert.equal(rules.getChinaInfantryAllowed(1), 0);
    assert.equal(rules.getChinaInfantryAllowed(5), 2);
});

test('objectives are looked up per nation', () => {
    assert.equal(rules.getObjective('USSR', 'no_ussr_2').reward, 10);
    assert.equal(rules.getObjective('USSR', 'no_uk_1'), null);
});
