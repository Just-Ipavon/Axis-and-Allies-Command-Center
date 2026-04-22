const db = require('../database/connection');

const getLogs = (gameId) => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM logs WHERE game_id = ? ORDER BY timestamp DESC LIMIT 50', [gameId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

const addLog = (gameId, message) => {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', [gameId, message], (err) => {
            if (err) reject(err);
            resolve(true);
        });
    });
};

const deleteLogsForGame = (gameId) => {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM logs WHERE game_id = ?', [gameId], (err) => {
            if (err) reject(err);
            resolve(true);
        });
    });
};

module.exports = {
    getLogs,
    addLog,
    deleteLogsForGame
};
