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
                last_empty_at INTEGER,
                game_version TEXT DEFAULT '1942',
                china_territories TEXT DEFAULT '[]',
                china_reinforcements_placed INTEGER DEFAULT 0
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
                research_tokens INTEGER DEFAULT 0,
                tech TEXT DEFAULT '[]',
                active_objectives TEXT DEFAULT '[]',
                capital_captured INTEGER DEFAULT 0,
                tokens_rolled INTEGER DEFAULT 0,
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
            const runMigration = (query) => {
                db.run(query, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error(`[Migration Warning] Failed to execute query: "${query}". Error: ${err.message}`);
                    }
                });
            };

            runMigration("ALTER TABLE nations ADD COLUMN player_name TEXT");
            runMigration("ALTER TABLE nations ADD COLUMN factories TEXT");
            runMigration("ALTER TABLE nations ADD COLUMN purchases_locked INTEGER DEFAULT 0");
            runMigration("ALTER TABLE nations ADD COLUMN last_purchases TEXT");
            runMigration("ALTER TABLE nations ADD COLUMN research_tokens INTEGER DEFAULT 0");
            runMigration("ALTER TABLE nations ADD COLUMN tech TEXT DEFAULT '[]'");
            runMigration("ALTER TABLE nations ADD COLUMN active_objectives TEXT DEFAULT '[]'");
            runMigration("ALTER TABLE nations ADD COLUMN capital_captured INTEGER DEFAULT 0");
            runMigration("ALTER TABLE nations ADD COLUMN tokens_rolled INTEGER DEFAULT 0");
            runMigration("ALTER TABLE games ADD COLUMN password TEXT");
            runMigration("ALTER TABLE games ADD COLUMN master_password TEXT");
            runMigration("ALTER TABLE games ADD COLUMN play_time INTEGER DEFAULT 0");
            runMigration("ALTER TABLE games ADD COLUMN last_resume_at INTEGER");
            runMigration("ALTER TABLE games ADD COLUMN last_empty_at INTEGER");
            runMigration("ALTER TABLE games ADD COLUMN room_name TEXT");
            runMigration("ALTER TABLE games ADD COLUMN game_version TEXT DEFAULT '1942'");
            runMigration("ALTER TABLE games ADD COLUMN china_territories TEXT DEFAULT '[]'");
            runMigration("ALTER TABLE games ADD COLUMN china_reinforcements_placed INTEGER DEFAULT 0");

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
