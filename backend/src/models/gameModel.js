const db = require('../database/connection');
const { hashPassword, verifyPassword } = require('../utils/auth');
const { STARTING_DATA } = require('../config/gameConfig');

const getGamesList = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, room_name, CASE WHEN password IS NOT NULL AND password != "" THEN 1 ELSE 0 END as hasPassword FROM games ORDER BY id DESC', [], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

const getGame = (gameId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM games WHERE id = ?', [gameId], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
};

const getGameByRoomName = (roomName) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM games WHERE LOWER(room_name) = LOWER(?)', [roomName], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
};

const createOrResetGame = (gameId, password = "", masterPassword = "", roomName = "Operation Enigma") => {
    return new Promise((resolve, reject) => {
        if (!gameId || gameId.trim() === '') {
            return reject(new Error("Invalid Game ID"));
        }
        const hashedPwd = hashPassword(password);
        const hashedMaster = hashPassword(masterPassword);
        db.serialize(() => {
            const now = Date.now();
            db.run('INSERT OR REPLACE INTO games (id, room_name, current_turn, password, master_password, play_time, last_resume_at, last_empty_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)', [gameId, roomName, 'USSR', hashedPwd, hashedMaster, 0, now]);
            
            const stmt = db.prepare('INSERT OR REPLACE INTO nations (game_id, name, income, bank, purchases, player_name, factories) VALUES (?, ?, ?, ?, ?, ?, ?)');
            STARTING_DATA.forEach(data => {
                stmt.run([gameId, data[0], data[1], data[2], JSON.stringify({}), '', JSON.stringify(data[3] || [])]);
            });
            stmt.finalize();

            db.run('DELETE FROM logs WHERE game_id = ?', [gameId]);
            db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', [gameId, 'Room Created: Operations Commenced.']);
            resolve(true);
        });
    });
};

const updateGameTime = (gameId, playTime, lastResumeAt, lastEmptyAt) => {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE games SET play_time = ?, last_resume_at = ?, last_empty_at = ? WHERE id = ?',
            [playTime, lastResumeAt, lastEmptyAt, gameId],
            (err) => {
                if (err) reject(err);
                resolve(true);
            }
        );
    });
};

const verifyMasterPassword = (gameId, password) => {
    return new Promise((resolve, reject) => {
        if (process.env.ADMIN_OVERRIDE_PASSWORD && password === process.env.ADMIN_OVERRIDE_PASSWORD) return resolve(true);
        db.get('SELECT master_password FROM games WHERE id = ?', [gameId], (err, row) => {
            if(err) return reject(err);
            if(!row) return reject(new Error('Game not found'));
            if (verifyPassword(password, row.master_password)) {
                resolve(true);
            } else {
                reject(new Error('Invalid Master Password'));
            }
        });
    });
};

const verifyRoomPassword = (gameId, password) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT password FROM games WHERE id = ?', [gameId], (err, row) => {
            if(err) return reject(err);
            if(!row) return reject(new Error('Game not found'));
            
            if (!row.password || row.password === "") return resolve(true);

            if (verifyPassword(password, row.password)) {
                resolve(true);
            } else {
                reject(new Error('Invalid Room Password'));
            }
        });
    });
};

const deleteGame = (gameId) => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('DELETE FROM games WHERE id = ?', [gameId]);
            db.run('DELETE FROM nations WHERE game_id = ?', [gameId]);
            db.run('DELETE FROM logs WHERE game_id = ?', [gameId], (err) => {
                if(err) reject(err);
                resolve(true);
            });
        });
    });
};

const updateGameTurn = (gameId, nextTurn) => {
    return new Promise((resolve, reject) => {
        db.run('UPDATE games SET current_turn = ? WHERE id = ?', [nextTurn, gameId], (err) => {
            if (err) reject(err);
            resolve(true);
        });
    });
};

module.exports = {
    getGamesList,
    getGame,
    getGameByRoomName,
    createOrResetGame,
    updateGameTime,
    verifyMasterPassword,
    verifyRoomPassword,
    deleteGame,
    updateGameTurn
};
