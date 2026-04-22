const db = require('./src/database/connection');
const initDb = require('./src/database/init');
const gameModel = require('./src/models/gameModel');
const nationModel = require('./src/models/nationModel');
const logModel = require('./src/models/logModel');

// Initialize database
initDb();

module.exports = {
    db,
    ...gameModel,
    ...nationModel,
    ...logModel
};
