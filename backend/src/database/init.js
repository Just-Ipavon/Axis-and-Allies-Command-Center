const db = require('./connection');

const initDb = () => {
    return new Promise((resolve) => {
        db.serialize(() => {
            // Games table
            db.run(`CREATE TABLE IF NOT EXISTS games (
                id TEXT PRIMARY KEY,
                room_name TEXT,
                current_turn TEXT,
                password TEXT,
                master_password TEXT,
                play_time INTEGER DEFAULT 0,
                last_resume_at INTEGER,
                last_empty_at INTEGER
            )`);

            // Nations table
            db.run(`CREATE TABLE IF NOT EXISTS nations (
                game_id TEXT,
                name TEXT,
                income INTEGER,
                bank INTEGER,
                purchases TEXT,
                player_name TEXT,
                factories TEXT,
                PRIMARY KEY (game_id, name)
            )`);

            // Logs table
            db.run(`CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                message TEXT
            )`);
            
            // Migrations / Upgrades
            db.run("ALTER TABLE nations ADD COLUMN player_name TEXT", (err) => {});
            db.run("ALTER TABLE nations ADD COLUMN factories TEXT", (err) => {});
            db.run("ALTER TABLE nations ADD COLUMN purchases_locked INTEGER DEFAULT 0", (err) => {});
            db.run("ALTER TABLE nations ADD COLUMN last_purchases TEXT", (err) => {});
            db.run("ALTER TABLE games ADD COLUMN password TEXT", (err) => {});
            db.run("ALTER TABLE games ADD COLUMN master_password TEXT", (err) => {});
            db.run("ALTER TABLE games ADD COLUMN play_time INTEGER DEFAULT 0", (err) => {});
            db.run("ALTER TABLE games ADD COLUMN last_resume_at INTEGER", (err) => {});
            db.run("ALTER TABLE games ADD COLUMN last_empty_at INTEGER", (err) => {});
            db.run("ALTER TABLE games ADD COLUMN room_name TEXT", (err) => {});

            // Cleanup ghost sessions
            db.run("DELETE FROM games WHERE trim(id) = '' OR id IS NULL");
            db.run("DELETE FROM nations WHERE trim(game_id) = '' OR game_id IS NULL");
            db.run("DELETE FROM logs WHERE trim(game_id) = '' OR game_id IS NULL");

            console.log('Database tables initialized and cleaned.');
            resolve();
        });
    });
};

module.exports = initDb;
