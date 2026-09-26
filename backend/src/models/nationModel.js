const db = require('../database/connection');
const {
    RULES,
    isAnniversary,
    getNextTurn,
    getUnitCost,
    getRepairCost,
    getCartCapacity,
    countMobilizedUnits,
    getObjective,
    isRepairKey,
    repairKey
} = require('../config/gameConfig');
const { MAX_IPC, toBoundedInt, getNation, updateNation } = require('./helpers');
const { addLog, deleteLatestLog } = require('./logModel');
const { addFactory } = require('./factoryModel');

const IC = 'Industrial Complex';

const getNations = (gameId) => db.allAsync('SELECT * FROM nations WHERE game_id = ?', [gameId]);

const getGameRow = async (gameId) => {
    const game = await db.getAsync('SELECT current_turn, game_version FROM games WHERE id = ?', [gameId]);
    if (!game) throw new Error('Game not found');
    return game;
};

const setPlayerName = async (gameId, name, playerName) => {
    await getNation(gameId, name);
    await updateNation(gameId, name, { player_name: playerName });
    return true;
};

// Game Master override of the economy values.
const adminSetEconomy = async (gameId, name, income, bank) => {
    const cleanIncome = toBoundedInt(income, 0, MAX_IPC);
    const cleanBank = toBoundedInt(bank, 0, MAX_IPC);
    if (cleanIncome === null || cleanBank === null) throw new Error('Invalid income or bank value');
    const nation = await getNation(gameId, name);
    await updateNation(gameId, name, { income: cleanIncome, bank: cleanBank });
    const changes = [];
    if (nation.income !== cleanIncome) changes.push(`income ${nation.income} → ${cleanIncome}`);
    if (nation.bank !== cleanBank) changes.push(`bank ${nation.bank} → ${cleanBank}`);
    if (changes.length) await addLog(gameId, `🛠️ Game Master adjusted ${name}: ${changes.join(', ')}.`);
    return true;
};

const assertCartEditable = (nation, isBanker) => {
    if (nation.capital_captured) throw new Error('Capital captured: cannot purchase units');
    if (nation.purchases_locked && !isBanker) throw new Error('Purchases are already confirmed');
};

/**
 * Adds or removes units from the cart. Costs, bank and production capacity are
 * computed here, so clients only send the intent (unit + delta).
 * Buying an Industrial Complex needs { territoryName, capacity } and creates the
 * factory immediately, flagged as built this turn (it cannot produce yet).
 */
const adjustPurchase = async (gameId, name, unit, delta, { territoryName, capacity } = {}, isBanker = false) => {
    if (!RULES.units[unit]) throw new Error('Unknown unit');
    const step = toBoundedInt(delta, -20, 20);
    if (!step) throw new Error('Invalid quantity');
    if (unit === IC && Math.abs(step) !== 1) throw new Error('Industrial Complexes are bought one at a time');

    const nation = await getNation(gameId, name);
    assertCartEditable(nation, isBanker);

    const purchases = { ...nation.purchases };
    const newQty = (purchases[unit] || 0) + step;
    if (newQty < 0) throw new Error('Nothing to remove');

    if (step > 0 && unit !== IC) {
        const capacity = getCartCapacity(nation.factories, purchases, nation.tech, nation.purchases_locked);
        if (countMobilizedUnits(purchases) + step > capacity) {
            throw new Error(`Maximum production capacity (${capacity}) reached`);
        }
    }

    const cost = getUnitCost(unit, nation.tech) * step;
    if (nation.bank - cost < 0) throw new Error('Not enough IPCs in Bank');

    let factories = nation.factories;
    if (unit === IC && step > 0) {
        factories = [...factories, await addFactory(gameId, name, territoryName, capacity, { builtThisTurn: true })];
    } else if (unit === IC && step < 0) {
        // Remove the most recent complex bought this turn, if it is still there.
        const idx = factories.map(f => !!f.builtThisTurn).lastIndexOf(true);
        if (idx !== -1) factories = factories.filter((_, i) => i !== idx);
    }

    if (newQty === 0) delete purchases[unit]; else purchases[unit] = newQty;
    await updateNation(gameId, name, { bank: nation.bank - cost, purchases, factories });
    return true;
};

// Queues repair points for a damaged complex (paid now, applied when the cart is confirmed).
const adjustRepair = async (gameId, name, factoryId, delta, isBanker = false) => {
    const step = toBoundedInt(delta, -40, 40);
    if (!step) throw new Error('Invalid quantity');
    const nation = await getNation(gameId, name);
    assertCartEditable(nation, isBanker);
    if (nation.purchases_locked) throw new Error('Unlock the cart before changing repairs');

    const factory = nation.factories.find(f => f.id === factoryId);
    if (!factory) throw new Error('Factory not found');

    const key = repairKey(factoryId);
    const purchases = { ...nation.purchases };
    const oldQty = purchases[key] || 0;
    const newQty = oldQty + step;
    if (newQty < 0 || newQty > (factory.damage || 0)) throw new Error('Invalid repair amount');

    const cost = getRepairCost(newQty, nation.tech) - getRepairCost(oldQty, nation.tech);
    if (nation.bank - cost < 0) throw new Error('Not enough IPCs in Bank');

    if (newQty === 0) delete purchases[key]; else purchases[key] = newQty;
    await updateNation(gameId, name, { bank: nation.bank - cost, purchases });
    return true;
};

// Applies (sign = -1) or reverts (sign = +1) the queued repairs on the factories.
const shiftRepairDamage = (factories, purchases, sign) => factories.map(f => {
    const qty = purchases[repairKey(f.id)] || 0;
    if (!qty) return f;
    return { ...f, damage: Math.max(0, Math.min((f.damage || 0) + sign * qty, f.capacity * 2)) };
});

const describeCart = (purchases, factories) => Object.entries(purchases)
    .filter(([, qty]) => qty > 0)
    .map(([key, qty]) => {
        if (isRepairKey(key)) {
            const factory = factories.find(f => repairKey(f.id) === key);
            return `${qty}x Repair in ${factory ? factory.name : 'Factory'}`;
        }
        return `${qty}x ${key}`;
    })
    .join(', ');

const lockPurchases = async (gameId, name) => {
    const nation = await getNation(gameId, name);
    if (nation.purchases_locked) return true;
    const items = describeCart(nation.purchases, nation.factories);
    if (!items) throw new Error('The cart is empty');
    await updateNation(gameId, name, {
        purchases_locked: 1,
        factories: shiftRepairDamage(nation.factories, nation.purchases, -1)
    });
    await addLog(gameId, `${name} confirms purchases: ${items}`);
    return true;
};

const unlockPurchases = async (gameId, name) => {
    const nation = await getNation(gameId, name);
    if (!nation.purchases_locked) return true;
    await updateNation(gameId, name, {
        purchases_locked: 0,
        factories: shiftRepairDamage(nation.factories, nation.purchases, +1)
    });
    await deleteLatestLog(gameId, `${name} confirms purchases:%`);
    return true;
};

// End-of-turn maintenance shared by collectIncome and advanceTurn.
const resetTurnState = async (gameId) => {
    const rows = await db.allAsync('SELECT name FROM nations WHERE game_id = ?', [gameId]);
    for (const { name } of rows) {
        const nation = await getNation(gameId, name);
        const factories = nation.factories.map(({ builtThisTurn, ...f }) => ({ ...f, repairedThisTurn: 0 }));
        await updateNation(gameId, name, { factories, purchases_locked: 0, tokens_rolled: 0 });
    }
};

const getObjectivesBonus = (name, activeObjectives) => {
    let bonus = 0;
    const details = [];
    activeObjectives.forEach(objId => {
        const obj = getObjective(name, objId);
        if (!obj) return;
        bonus += obj.reward;
        details.push(`${obj.name} (+${obj.reward} IPC)`);
    });
    return { bonus, details };
};

const collectIncome = async (gameId, name) => {
    const game = await getGameRow(gameId);
    if (game.current_turn !== name) throw new Error(`It is not ${name}'s turn`);
    const nation = await getNation(gameId, name);
    const captured = !!nation.capital_captured;
    const hasCart = Object.values(nation.purchases).some(qty => qty > 0);
    if (!captured && hasCart && !nation.purchases_locked) throw new Error('Confirm the cart before collecting income');

    let collected = 0;
    let logMessage;
    if (captured) {
        logMessage = `${name} skips income collection (Capital Captured).`;
    } else {
        const extras = [];
        collected = nation.income;
        if (isAnniversary(game.game_version)) {
            const { bonus, details } = getObjectivesBonus(name, nation.active_objectives);
            if (bonus > 0) {
                collected += bonus;
                extras.push(`+${bonus} IPC from National Objectives: ${details.join(', ')}`);
            }
            if (nation.tech.includes('War Bonds')) {
                const roll = Math.floor(Math.random() * 6) + 1;
                collected += roll;
                extras.push(`+${roll} IPC from War Bonds (rolled ${roll})`);
            }
        }
        logMessage = `${name} collects income (${collected} IPC). Units mobilized and funds secured.`;
        if (extras.length) logMessage += ` (Base income ${nation.income}; ${extras.join('; ')})`;
    }

    // Conditional update: a duplicate request for the same turn changes nothing.
    const nextTurn = getNextTurn(game.game_version, name);
    const turnUpdate = await db.runAsync(
        'UPDATE games SET current_turn = ?, china_reinforcements_placed = 0 WHERE id = ? AND current_turn = ?',
        [nextTurn, gameId, name]
    );
    if (turnUpdate.changes === 0) throw new Error('Turn already advanced');

    await updateNation(gameId, name, {
        bank: Math.min(nation.bank + collected, MAX_IPC),
        last_collected: collected,
        last_purchases: nation.purchases,
        purchases: {}
    });
    await addLog(gameId, logMessage);
    await resetTurnState(gameId);
    return nextTurn;
};

const advanceTurn = async (gameId) => {
    const game = await getGameRow(gameId);
    const nextTurn = getNextTurn(game.game_version, game.current_turn);
    await db.runAsync('UPDATE games SET current_turn = ?, china_reinforcements_placed = 0 WHERE id = ?', [nextTurn, gameId]);
    // Nothing was collected for the skipped nation, so there is nothing to undo for it.
    await updateNation(gameId, game.current_turn, { last_collected: null });
    await addLog(gameId, `The Banker skipped ${game.current_turn}'s turn.`);
    await resetTurnState(gameId);
    return nextTurn;
};

const undoTurn = async (gameId) => {
    const game = await getGameRow(gameId);
    const prevTurn = getNextTurn(game.game_version, game.current_turn, -1);
    const nation = await getNation(gameId, prevTurn);
    if (nation.last_collected === null || nation.last_collected === undefined) throw new Error('Nothing to undo');

    const reverted = nation.last_collected;
    const restored = nation.last_purchases || {};

    await db.runAsync('UPDATE games SET current_turn = ?, china_reinforcements_placed = 0 WHERE id = ?', [prevTurn, gameId]);
    await updateNation(gameId, prevTurn, {
        bank: Math.max(0, nation.bank - reverted),
        purchases: restored,
        // The restored cart is unlocked again, so its confirmed repairs are reverted too.
        factories: shiftRepairDamage(nation.factories, restored, +1),
        last_purchases: null,
        last_collected: null,
        purchases_locked: 0
    });
    await deleteLatestLog(gameId, `${prevTurn} collects income%`, `${prevTurn} skips income%`);
    await addLog(gameId, `The Banker has undone the turn. Reverted +${reverted} IPC and restored mobilization cart for ${prevTurn}.`);
    return prevTurn;
};

const conquerTerritory = async (gameId, conqueror, victim, value, targetType = 'income', liberatedFor = null) => {
    const val = toBoundedInt(parseInt(value, 10), 1, 100);
    if (val === null) throw new Error('Invalid value');
    if (!conqueror || !victim || conqueror === victim) throw new Error('Invalid nations');

    const victimRow = await getNation(gameId, victim);
    const conquerorRow = await getNation(gameId, conqueror);
    const victimIncome = Math.max(0, victimRow.income - val);

    if (targetType === 'capital') {
        const plunder = victimRow.bank;
        await updateNation(gameId, victim, { income: victimIncome, bank: 0, capital_captured: 1 });
        await updateNation(gameId, conqueror, { income: conquerorRow.income + val, bank: Math.min(conquerorRow.bank + plunder, MAX_IPC) });
        await addLog(gameId, `🏆 ${conqueror} conquered the CAPITAL of ${victim} worth ${val} Income, plundering ${plunder} IPCs from their bank!`);
        return true;
    }

    await updateNation(gameId, victim, { income: victimIncome });

    if (liberatedFor && liberatedFor !== conqueror) {
        const owner = await getNation(gameId, liberatedFor);
        if (!owner.capital_captured) {
            await updateNation(gameId, liberatedFor, { income: owner.income + val });
            await addLog(gameId, `🕊️ ${conqueror} liberated territory from ${victim} for ${liberatedFor} (+${val} Income for ${liberatedFor}).`);
            return true;
        }
        // Rules: while the original owner's capital is enemy-held, the liberator keeps the territory and its income.
        await updateNation(gameId, conqueror, { income: conquerorRow.income + val });
        await addLog(gameId, `${conqueror} took territory from ${victim} worth ${val} Income (held by ${conqueror} while ${liberatedFor}'s capital is captured).`);
        return true;
    }

    await updateNation(gameId, conqueror, { income: conquerorRow.income + val });
    await addLog(gameId, `${conqueror} conquered territory from ${victim} worth ${val} Income.`);
    return true;
};

const toggleCapitalStatus = async (gameId, name, isCaptured) => {
    await getNation(gameId, name);
    await updateNation(gameId, name, { capital_captured: isCaptured ? 1 : 0 });
    await addLog(gameId, `The capital of ${name} has been marked as ${isCaptured ? 'CAPTURED' : 'LIBERATED'}.`);
    return true;
};

module.exports = {
    getNations,
    setPlayerName,
    adminSetEconomy,
    adjustPurchase,
    adjustRepair,
    lockPurchases,
    unlockPurchases,
    collectIncome,
    advanceTurn,
    undoTurn,
    conquerTerritory,
    toggleCapitalStatus
};
