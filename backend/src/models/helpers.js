const db = require('../database/connection');

const MAX_IPC = 9999;

const parseJson = (value, fallback) => {
    if (value === null || value === undefined || value === '') return fallback;
    try { return JSON.parse(value) ?? fallback; } catch (e) { return fallback; }
};

const toBoundedInt = (value, min, max) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) return null;
    return n;
};

// Loads a nation row with its JSON columns parsed. Throws when it does not exist.
const getNation = async (gameId, name) => {
    const row = await db.getAsync('SELECT * FROM nations WHERE game_id = ? AND name = ?', [gameId, name]);
    if (!row) throw new Error('Nation not found');
    return {
        ...row,
        purchases: parseJson(row.purchases, {}),
        factories: parseJson(row.factories, []),
        tech: parseJson(row.tech, []),
        active_objectives: parseJson(row.active_objectives, []),
        last_purchases: parseJson(row.last_purchases, null)
    };
};

// Writes the given fields of a nation; JSON values are serialized.
const updateNation = (gameId, name, fields) => {
    const columns = Object.keys(fields);
    const values = columns.map(c => {
        const v = fields[c];
        return v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
    });
    return db.runAsync(
        `UPDATE nations SET ${columns.map(c => `${c} = ?`).join(', ')} WHERE game_id = ? AND name = ?`,
        [...values, gameId, name]
    );
};

module.exports = { MAX_IPC, parseJson, toBoundedInt, getNation, updateNation };
