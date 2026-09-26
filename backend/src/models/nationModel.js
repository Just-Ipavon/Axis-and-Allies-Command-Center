const db = require('../database/connection');
const { getTurnOrder, NATIONAL_OBJECTIVES } = require('../config/gameConfig');

const MAX_IPC = 9999;
const MAX_PURCHASE_ENTRIES = 50;
const MAX_UNIT_QTY = 999;

const parseJson = (value, fallback) => {
    try { return JSON.parse(value) ?? fallback; } catch (e) { return fallback; }
};

const toBoundedInt = (value, min, max) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) return null;
    return n;
};

const sanitizePurchases = (purchases) => {
    if (!purchases || typeof purchases !== 'object' || Array.isArray(purchases)) return {};
    const clean = {};
    Object.entries(purchases).slice(0, MAX_PURCHASE_ENTRIES).forEach(([key, qty]) => {
        const q = toBoundedInt(qty, 0, MAX_UNIT_QTY);
        if (typeof key === 'string' && key.length <= 60 && q !== null) clean[key] = q;
    });
    return clean;
};

const isAnniversary = (version) => typeof version === 'string' && version.startsWith('anniversary');

const getNextTurn = (version, currentTurn, step = 1) => {
    const turnOrder = getTurnOrder(version);
    const currIdx = Math.max(0, turnOrder.indexOf(currentTurn));
    return turnOrder[(currIdx + step + turnOrder.length) % turnOrder.length];
};

const getNations = (gameId) => db.allAsync('SELECT * FROM nations WHERE game_id = ?', [gameId]);

const updateNationStatus = async (gameId, name, income, bank, purchases, playerName) => {
    const cleanIncome = toBoundedInt(income, 0, MAX_IPC);
    const cleanBank = toBoundedInt(bank, 0, MAX_IPC);
    if (cleanIncome === null || cleanBank === null) throw new Error('Invalid income or bank value');
    await db.runAsync(
        'UPDATE nations SET income = ?, bank = ?, purchases = ?, player_name = ? WHERE game_id = ? AND name = ?',
        [cleanIncome, cleanBank, JSON.stringify(sanitizePurchases(purchases)), playerName, gameId, name]
    );
    return true;
};

// End-of-turn maintenance shared by collectIncome and advanceTurn.
const resetTurnState = async (gameId) => {
    const rows = await db.allAsync('SELECT name, factories FROM nations WHERE game_id = ?', [gameId]);
    for (const row of rows) {
        const factories = parseJson(row.factories || '[]', []);
        factories.forEach(f => { f.repairedThisTurn = 0; delete f.builtThisTurn; });
        await db.runAsync('UPDATE nations SET factories = ? WHERE game_id = ? AND name = ?', [JSON.stringify(factories), gameId, row.name]);
    }
    await db.runAsync('UPDATE nations SET purchases_locked = 0, tokens_rolled = 0 WHERE game_id = ?', [gameId]);
};

const getObjectivesBonus = (name, activeObjectives) => {
    const defs = NATIONAL_OBJECTIVES[name] || {};
    let bonus = 0;
    const details = [];
    parseJson(activeObjectives || '[]', []).forEach(objId => {
        const def = defs[objId];
        if (!def) return;
        bonus += def.reward;
        details.push(`${def.name} (+${def.reward} IPC)`);
    });
    return { bonus, details };
};

const collectIncome = async (gameId, name) => {
    const game = await db.getAsync('SELECT current_turn, game_version FROM games WHERE id = ?', [gameId]);
    if (!game) throw new Error('Game not found');
    if (game.current_turn !== name) throw new Error(`It is not ${name}'s turn`);

    const nation = await db.getAsync('SELECT income, capital_captured, active_objectives, tech FROM nations WHERE game_id = ? AND name = ?', [gameId, name]);
    if (!nation) throw new Error('Nation not found');

    const nextTurn = getNextTurn(game.game_version, game.current_turn);
    const captured = !!nation.capital_captured;

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
            if (parseJson(nation.tech || '[]', []).includes('War Bonds')) {
                const roll = Math.floor(Math.random() * 6) + 1;
                collected += roll;
                extras.push(`+${roll} IPC from War Bonds (rolled ${roll})`);
            }
        }
        logMessage = `${name} collects income (${collected} IPC). Units mobilized and funds secured.`;
        if (extras.length) logMessage += ` (Base income ${nation.income}; ${extras.join('; ')})`;
    }

    // Conditional update: a concurrent/duplicate request for the same turn changes nothing.
    const turnUpdate = await db.runAsync(
        'UPDATE games SET current_turn = ?, china_reinforcements_placed = 0 WHERE id = ? AND current_turn = ?',
        [nextTurn, gameId, name]
    );
    if (turnUpdate.changes === 0) throw new Error('Turn already advanced');

    await db.runAsync(
        'UPDATE nations SET bank = MIN(bank + ?, ?), last_collected = ?, last_purchases = purchases, purchases = ?, purchases_locked = 0 WHERE game_id = ? AND name = ?',
        [collected, MAX_IPC, collected, JSON.stringify({}), gameId, name]
    );
    await db.runAsync('INSERT INTO logs (game_id, message) VALUES (?, ?)', [gameId, logMessage]);
    await resetTurnState(gameId);
    return nextTurn;
};

const advanceTurn = async (gameId) => {
    const game = await db.getAsync('SELECT current_turn, game_version FROM games WHERE id = ?', [gameId]);
    if (!game) throw new Error('Game not found');
    const nextTurn = getNextTurn(game.game_version, game.current_turn);

    await db.runAsync('UPDATE games SET current_turn = ?, china_reinforcements_placed = 0 WHERE id = ?', [nextTurn, gameId]);
    // Nothing was collected for the skipped nation, so there is nothing to undo for it.
    await db.runAsync('UPDATE nations SET last_collected = NULL WHERE game_id = ? AND name = ?', [gameId, game.current_turn]);
    await resetTurnState(gameId);
    return nextTurn;
};

const undoTurn = async (gameId) => {
    const game = await db.getAsync('SELECT current_turn, game_version FROM games WHERE id = ?', [gameId]);
    if (!game) throw new Error('Game not found');
    const prevTurn = getNextTurn(game.game_version, game.current_turn, -1);

    const row = await db.getAsync('SELECT bank, last_purchases, last_collected FROM nations WHERE game_id = ? AND name = ?', [gameId, prevTurn]);
    if (!row || row.last_collected === null || row.last_collected === undefined) {
        throw new Error('Nothing to undo');
    }

    const reverted = row.last_collected;
    const newBank = Math.max(0, row.bank - reverted);
    const restoredPurchases = row.last_purchases || JSON.stringify({});

    await db.runAsync('UPDATE games SET current_turn = ?, china_reinforcements_placed = 0 WHERE id = ?', [prevTurn, gameId]);
    await db.runAsync(
        'UPDATE nations SET bank = ?, purchases = ?, last_purchases = NULL, last_collected = NULL, purchases_locked = 0 WHERE game_id = ? AND name = ?',
        [newBank, restoredPurchases, gameId, prevTurn]
    );
    // Remove the income log that is being reverted.
    await db.runAsync(`DELETE FROM logs WHERE id IN (
        SELECT id FROM logs
        WHERE game_id = ? AND (message LIKE ? OR message LIKE ?)
        ORDER BY id DESC LIMIT 1
    )`, [gameId, `${prevTurn} collects income%`, `${prevTurn} skips income%`]);
    await db.runAsync('INSERT INTO logs (game_id, message) VALUES (?, ?)',
        [gameId, `The Banker has undone the turn. Reverted +${reverted} IPC and restored mobilization cart for ${prevTurn}.`]);
    return prevTurn;
};

const conquerTerritory = async (gameId, conqueror, victim, value, targetType = 'income', liberatedFor = null) => {
    const val = toBoundedInt(parseInt(value, 10), 1, 100);
    if (val === null) throw new Error("Invalid value");
    if (!conqueror || !victim || conqueror === victim) throw new Error('Invalid nations');

    const victimRow = await db.getAsync('SELECT bank FROM nations WHERE game_id = ? AND name = ?', [gameId, victim]);
    const conquerorRow = await db.getAsync('SELECT name FROM nations WHERE game_id = ? AND name = ?', [gameId, conqueror]);
    if (!victimRow || !conquerorRow) throw new Error('Nation not found');

    const reduceVictim = 'UPDATE nations SET income = MAX(income - ?, 0)';

    if (targetType === 'capital') {
        const victimBank = victimRow.bank;
        await db.runAsync(`${reduceVictim}, bank = 0, capital_captured = 1 WHERE game_id = ? AND name = ?`, [val, gameId, victim]);
        await db.runAsync('UPDATE nations SET income = income + ?, bank = MIN(bank + ?, ?) WHERE game_id = ? AND name = ?', [val, victimBank, MAX_IPC, gameId, conqueror]);
        await db.runAsync('INSERT INTO logs (game_id, message) VALUES (?, ?)',
            [gameId, `🏆 ${conqueror} conquered the CAPITAL of ${victim} worth ${val} Income, plundering ${victimBank} IPCs from their bank!`]);
        return true;
    }

    await db.runAsync(`${reduceVictim} WHERE game_id = ? AND name = ?`, [val, gameId, victim]);

    if (liberatedFor && liberatedFor !== conqueror) {
        const owner = await db.getAsync('SELECT capital_captured FROM nations WHERE game_id = ? AND name = ?', [gameId, liberatedFor]);
        if (!owner) throw new Error('Original owner not found');
        if (!owner.capital_captured) {
            await db.runAsync('UPDATE nations SET income = income + ? WHERE game_id = ? AND name = ?', [val, gameId, liberatedFor]);
            await db.runAsync('INSERT INTO logs (game_id, message) VALUES (?, ?)',
                [gameId, `🕊️ ${conqueror} liberated territory from ${victim} for ${liberatedFor} (+${val} Income for ${liberatedFor}).`]);
            return true;
        }
        // Rules: while the original owner's capital is enemy-held, the liberator keeps the territory and its income.
        await db.runAsync('UPDATE nations SET income = income + ? WHERE game_id = ? AND name = ?', [val, gameId, conqueror]);
        await db.runAsync('INSERT INTO logs (game_id, message) VALUES (?, ?)',
            [gameId, `${conqueror} took territory from ${victim} worth ${val} Income (held by ${conqueror} while ${liberatedFor}'s capital is captured).`]);
        return true;
    }

    await db.runAsync('UPDATE nations SET income = income + ? WHERE game_id = ? AND name = ?', [val, gameId, conqueror]);
    await db.runAsync('INSERT INTO logs (game_id, message) VALUES (?, ?)',
        [gameId, `${conqueror} conquered territory from ${victim} worth ${val} Income.`]);
    return true;
};

const toggleCapitalStatus = async (gameId, name, isCaptured) => {
    const result = await db.runAsync('UPDATE nations SET capital_captured = ? WHERE game_id = ? AND name = ?', [isCaptured ? 1 : 0, gameId, name]);
    if (result.changes === 0) throw new Error('Nation not found');
    const status = isCaptured ? 'CAPTURED' : 'LIBERATED';
    await db.runAsync('INSERT INTO logs (game_id, message) VALUES (?, ?)',
        [gameId, `The capital of ${name} has been marked as ${status}.`]);
    return true;
};

const lockPurchases = async (gameId, name, logMessage) => {
    const row = await db.getAsync('SELECT purchases, factories FROM nations WHERE game_id = ? AND name = ?', [gameId, name]);
    if (!row) return true;

    const purchases = parseJson(row.purchases || '{}', {});
    const factories = parseJson(row.factories || '[]', []);
    let modifiedFactories = false;
    const finalPurchases = {};

    Object.entries(purchases).forEach(([key, qty]) => {
        if (key.startsWith('repair_')) {
            const factoryId = key.slice('repair_'.length);
            const factory = factories.find(f => f.id === factoryId);
            if (factory && qty > 0) {
                factory.damage = Math.max(0, factory.damage - qty);
                modifiedFactories = true;
            }
        } else {
            finalPurchases[key] = qty;
        }
    });

    if (modifiedFactories) {
        await db.runAsync('UPDATE nations SET purchases_locked = 1, factories = ?, purchases = ? WHERE game_id = ? AND name = ?',
            [JSON.stringify(factories), JSON.stringify(finalPurchases), gameId, name]);
    } else {
        await db.runAsync('UPDATE nations SET purchases_locked = 1 WHERE game_id = ? AND name = ?', [gameId, name]);
    }
    if (logMessage) {
        await db.runAsync('INSERT INTO logs (game_id, message) VALUES (?, ?)', [gameId, logMessage]);
    }
    return true;
};

const unlockPurchases = async (gameId, name) => {
    await db.runAsync('UPDATE nations SET purchases_locked = 0 WHERE game_id = ? AND name = ?', [gameId, name]);
    // Delete the most recent 'confirms purchases' log for this nation
    await db.runAsync(`DELETE FROM logs WHERE id IN (
        SELECT id FROM logs
        WHERE game_id = ? AND message LIKE ?
        ORDER BY id DESC LIMIT 1
    )`, [gameId, `${name} confirms purchases:%`]);
    return true;
};

module.exports = {
    getNations,
    updateNationStatus,
    collectIncome,
    advanceTurn,
    conquerTerritory,
    undoTurn,
    lockPurchases,
    unlockPurchases,
    toggleCapitalStatus
};
