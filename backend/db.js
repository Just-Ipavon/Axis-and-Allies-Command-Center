const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'game.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS games (
            id TEXT PRIMARY KEY,
            current_turn TEXT,
            password TEXT,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS nations (
            game_id TEXT,
            name TEXT,
            income INTEGER,
            bank INTEGER,
            purchases TEXT,
            player_name TEXT,
            PRIMARY KEY (game_id, name)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            message TEXT
        )`);
        
        // Ensure player_name and password exist (if upgrading an existing DB)
        db.run("ALTER TABLE nations ADD COLUMN player_name TEXT", (err) => {});
        db.run("ALTER TABLE games ADD COLUMN password TEXT", (err) => {});

        // Cleanup ghost sessions
        db.run("DELETE FROM games WHERE trim(id) = '' OR id IS NULL");
        db.run("DELETE FROM nations WHERE trim(game_id) = '' OR game_id IS NULL");
        db.run("DELETE FROM logs WHERE trim(game_id) = '' OR game_id IS NULL");

        console.log('Database tables initialized and cleaned.');
        
    });
}

// Helpers
const getGamesList = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, started_at, CASE WHEN password IS NOT NULL AND password != "" THEN 1 ELSE 0 END as hasPassword FROM games ORDER BY started_at DESC', [], (err, rows) => {
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

const getNations = (gameId) => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM nations WHERE game_id = ?', [gameId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

const getLogs = (gameId) => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM logs WHERE game_id = ? ORDER BY timestamp DESC LIMIT 50', [gameId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

const createOrResetGame = (gameId, password = "") => {
    return new Promise((resolve, reject) => {
        if (!gameId || gameId.trim() === '') {
            return reject(new Error("Invalid Game ID"));
        }
        db.serialize(() => {
            db.run('INSERT OR REPLACE INTO games (id, current_turn, password) VALUES (?, ?, ?)', [gameId, 'USSR', password]);
            
            const startingData = [
                ['USSR', 24, 24],
                ['Germany', 41, 41],
                ['UK', 31, 31],
                ['Japan', 30, 30],
                ['USA', 42, 42]
            ];
            
            const stmt = db.prepare('INSERT OR REPLACE INTO nations (game_id, name, income, bank, purchases, player_name) VALUES (?, ?, ?, ?, ?, ?)');
            startingData.forEach(data => {
                stmt.run([gameId, data[0], data[1], data[2], JSON.stringify({}), '']);
            });
            stmt.finalize();

            db.run('DELETE FROM logs WHERE game_id = ?', [gameId]);
            db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', [gameId, 'Stanza Creata: Inizio delle Operazioni.']);
            resolve(true);
        });
    });
};

const updateNationStatus = (gameId, name, income, bank, purchases, playerName) => {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE nations SET income = ?, bank = ?, purchases = ?, player_name = ? WHERE game_id = ? AND name = ?',
            [income, bank, JSON.stringify(purchases), playerName, gameId, name],
            (err) => {
                if (err) reject(err);
                resolve(true);
            }
        );
    });
};

const TURN_ORDER = ['USSR', 'Germany', 'UK', 'Japan', 'USA'];

const advanceTurn = (gameId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT current_turn FROM games WHERE id = ?', [gameId], (err, game) => {
            if (err) return reject(err);
            if (!game) return reject(new Error('Game not found'));
            
            const currIdx = TURN_ORDER.indexOf(game.current_turn) || 0;
            const nextTurn = TURN_ORDER[(currIdx + 1) % TURN_ORDER.length];
            
            db.run('UPDATE games SET current_turn = ? WHERE id = ?', [nextTurn, gameId], (err) => {
                if (err) return reject(err);
                resolve(nextTurn);
            });
        });
    });
};

const conquerTerritory = (gameId, conqueror, victim, value, targetType = 'income') => {
    return new Promise((resolve, reject) => {
        const val = parseInt(value) || 0;
        if (val <= 0) return reject(new Error("Invalid value"));
        
        if (targetType === 'bank') {
            db.run('UPDATE nations SET bank = CASE WHEN bank - ? < 0 THEN 0 ELSE bank - ? END WHERE game_id = ? AND name = ?', [val, val, gameId, victim], (err) => {
                if(err) return reject(err);
                db.run('UPDATE nations SET bank = bank + ? WHERE game_id = ? AND name = ?', [val, gameId, conqueror], (err) => {
                    if(err) return reject(err);
                    db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', 
                        [gameId, `${conqueror} plundered ${val} IPCs from the bank of ${victim}.`], 
                        (err) => {
                            if (err) reject(err);
                            else resolve(true);
                        }
                    );
                });
            });
        } else {
            db.run('UPDATE nations SET income = CASE WHEN income - ? < 0 THEN 0 ELSE income - ? END WHERE game_id = ? AND name = ?', [val, val, gameId, victim], (err) => {
                if(err) return reject(err);
                db.run('UPDATE nations SET income = income + ? WHERE game_id = ? AND name = ?', [val, gameId, conqueror], (err) => {
                    if(err) return reject(err);
                    db.run('INSERT INTO logs (game_id, message) VALUES (?, ?)', 
                        [gameId, `${conqueror} conquered territory from ${victim} worth ${val} Income.`], 
                        (err) => {
                            if (err) reject(err);
                            else resolve(true);
                        }
                    );
                });
            });
        }
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

module.exports = {
    db,
    getGame,
    getGamesList,
    getNations,
    getLogs,
    createOrResetGame,
    updateNationStatus,
    advanceTurn,
    conquerTerritory,
    addLog,
    deleteGame
};
