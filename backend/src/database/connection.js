const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ensure db path is relative to the backend root, not the current file
const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../../game.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Optimizations for high concurrency
        db.configure("busyTimeout", 10000); // Wait up to 10s if DB is locked
        db.run('PRAGMA journal_mode = WAL', (err) => {
            if (err) console.error('Error setting WAL mode:', err.message);
            else console.log('SQLite WAL mode enabled.');
        });
    }
});


// Promise helpers. `run` resolves with the statement context ({ changes, lastID }).
db.runAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err); else resolve(this);
    });
});
db.getAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});
db.allAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
});

// Serializes state-changing operations so that read-modify-write sequences
// (and explicit transactions) from different sockets never interleave.
let queue = Promise.resolve();
db.withLock = (fn) => {
    const result = queue.then(() => fn());
    queue = result.catch(() => {});
    return result;
};

module.exports = db;
