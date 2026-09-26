const db = require('../database/connection');
const { hashPassword, verifyPassword } = require('../utils/auth');
const {
    RULES,
    normalizeVersion,
    getTurnOrder,
    getStartingNations,
    getStartingChina,
    getChinaInfantryAllowed
} = require('../config/gameConfig');
const { addLog } = require('./logModel');

const getGamesList = () => db.allAsync(
    "SELECT id, room_name, game_version, CASE WHEN password IS NOT NULL AND password != '' THEN 1 ELSE 0 END as hasPassword FROM games ORDER BY id DESC"
);

const getGame = (gameId) => db.getAsync('SELECT * FROM games WHERE id = ?', [gameId]);

const getGameByRoomName = (roomName) => db.getAsync('SELECT * FROM games WHERE LOWER(room_name) = LOWER(?)', [roomName]);

// Writes a fresh game state. Password values must already be hashed.
// Callers run inside db.withLock, so the explicit transaction never nests.
const writeFreshGame = async (gameId, passwordHash, masterHash, roomName, gameVersion) => {
    const version = normalizeVersion(gameVersion);
    const startingTurn = getTurnOrder(version)[0];
    const now = Date.now();

    await db.runAsync('BEGIN IMMEDIATE');
    try {
        await db.runAsync('INSERT OR REPLACE INTO games (id, room_name, current_turn, password, master_password, play_time, last_resume_at, last_empty_at, game_version, china_territories, china_reinforcements_placed) VALUES (?, ?, ?, ?, ?, 0, ?, NULL, ?, ?, 0)',
            [gameId, roomName, startingTurn, passwordHash, masterHash, now, version, JSON.stringify(getStartingChina(version))]);
        await db.runAsync('DELETE FROM nations WHERE game_id = ?', [gameId]);
        for (const nation of getStartingNations(version)) {
            const factories = nation.factories.map(f => ({ ...f, damage: 0, repairedThisTurn: 0 }));
            await db.runAsync('INSERT INTO nations (game_id, name, income, bank, purchases, player_name, factories, research_tokens, tech, active_objectives, capital_captured, tokens_rolled, purchases_locked, last_purchases, last_collected) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, 0, 0, NULL, NULL)',
                [gameId, nation.name, nation.income, nation.bank, '{}', '', JSON.stringify(factories), '[]', '[]']);
        }
        await db.runAsync('DELETE FROM logs WHERE game_id = ?', [gameId]);
        await addLog(gameId, 'Room Created: Operations Commenced.');
        await db.runAsync('COMMIT');
    } catch (err) {
        await db.runAsync('ROLLBACK').catch(() => {});
        throw err;
    }
    return true;
};

const createOrResetGame = async (gameId, password = "", masterPassword = "", roomName = "Operation Enigma", gameVersion = "1942") => {
    if (!gameId || gameId.trim() === '') throw new Error("Invalid Game ID");
    const hashedPwd = await hashPassword(password);
    const hashedMaster = await hashPassword(masterPassword);
    return writeFreshGame(gameId, hashedPwd, hashedMaster, roomName, gameVersion);
};

// Resets the game state while keeping the room/master passwords, name and edition.
const resetGameState = async (gameId) => {
    const game = await getGame(gameId);
    if (!game) throw new Error('Game not found');
    return writeFreshGame(gameId, game.password || '', game.master_password || '', game.room_name || 'Unknown Operation', game.game_version);
};

const updateGameTime = (gameId, playTime, lastResumeAt, lastEmptyAt) => db.runAsync(
    'UPDATE games SET play_time = ?, last_resume_at = ?, last_empty_at = ? WHERE id = ?',
    [playTime, lastResumeAt, lastEmptyAt, gameId]
);

const verifyMasterPassword = async (gameId, password) => {
    if (process.env.ADMIN_OVERRIDE_PASSWORD && password === process.env.ADMIN_OVERRIDE_PASSWORD) return true;
    const row = await db.getAsync('SELECT master_password FROM games WHERE id = ?', [gameId]);
    if (!row) throw new Error('Game not found');
    // A room created without a master password has no banker access at all.
    if (!row.master_password || !(await verifyPassword(password, row.master_password))) {
        throw new Error('Invalid Master Password');
    }
    return true;
};

const verifyRoomPassword = async (gameId, password) => {
    const row = await db.getAsync('SELECT password FROM games WHERE id = ?', [gameId]);
    if (!row) throw new Error('Game not found');
    if (!row.password) return true;
    if (!(await verifyPassword(password, row.password))) throw new Error('Invalid Room Password');
    return true;
};

const deleteGame = async (gameId) => {
    await db.runAsync('DELETE FROM games WHERE id = ?', [gameId]);
    await db.runAsync('DELETE FROM nations WHERE game_id = ?', [gameId]);
    await db.runAsync('DELETE FROM logs WHERE game_id = ?', [gameId]);
    return true;
};

const updateChinaTerritories = async (gameId, territories) => {
    if (!Array.isArray(territories)) throw new Error('Invalid territories');
    const clean = [...new Set(territories.filter(t => RULES.chinaTerritories.includes(t)))];
    await db.runAsync('UPDATE games SET china_territories = ? WHERE id = ?', [JSON.stringify(clean), gameId]);
    return true;
};

const mobilizeChinaInfantry = async (gameId, placements) => {
    const game = await db.getAsync('SELECT current_turn, china_territories, china_reinforcements_placed FROM games WHERE id = ?', [gameId]);
    if (!game) throw new Error('Game not found');
    if (game.current_turn !== 'USA') throw new Error('Chinese infantry can only be placed during the USA turn');
    if (game.china_reinforcements_placed) throw new Error('Chinese reinforcements already placed this turn');

    let controlled = [];
    try { controlled = JSON.parse(game.china_territories || '[]'); } catch (e) { /* keep empty */ }

    if (!placements || typeof placements !== 'object') throw new Error('Invalid placements');
    const entries = Object.entries(placements)
        .map(([t, qty]) => [t, parseInt(qty, 10) || 0])
        .filter(([t, qty]) => qty > 0 && controlled.includes(t));
    const total = entries.reduce((sum, [, qty]) => sum + qty, 0);
    const allowed = getChinaInfantryAllowed(controlled.length);
    if (total === 0) throw new Error('No infantry placed');
    if (total > allowed) throw new Error(`China can place at most ${allowed} infantry`);

    const details = entries.map(([t, qty]) => `${qty} in ${t}`).join(', ');
    await db.runAsync('UPDATE games SET china_reinforcements_placed = 1 WHERE id = ?', [gameId]);
    await addLog(gameId, `🇨🇳 China Mobilization: Placed Chinese Infantry (${details}).`);
    return true;
};

module.exports = {
    getGamesList,
    getGame,
    getGameByRoomName,
    createOrResetGame,
    resetGameState,
    updateGameTime,
    verifyMasterPassword,
    verifyRoomPassword,
    deleteGame,
    updateChinaTerritories,
    mobilizeChinaInfantry
};
