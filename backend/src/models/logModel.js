const db = require('../database/connection');

// Ordered by id: CURRENT_TIMESTAMP only has one-second resolution.
const getLogs = (gameId) => db.allAsync('SELECT * FROM logs WHERE game_id = ? ORDER BY id DESC LIMIT 50', [gameId]);

const addLog = async (gameId, message) => {
    await db.runAsync('INSERT INTO logs (game_id, message) VALUES (?, ?)', [gameId, message]);
    return true;
};

// Deletes the most recent log of this game whose message matches one of the LIKE patterns.
const deleteLatestLog = (gameId, ...patterns) => db.runAsync(
    `DELETE FROM logs WHERE id IN (
        SELECT id FROM logs WHERE game_id = ? AND (${patterns.map(() => 'message LIKE ?').join(' OR ')})
        ORDER BY id DESC LIMIT 1
    )`,
    [gameId, ...patterns]
);

module.exports = {
    getLogs,
    addLog,
    deleteLatestLog
};
