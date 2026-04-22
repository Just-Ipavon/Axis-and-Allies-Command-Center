const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ensure db path is relative to the backend root, not the current file
const dbPath = path.resolve(__dirname, '../../game.db');

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

module.exports = db;
