const db = require('../database/connection');
const initDb = require('../database/init');
const gameModel = require('./gameModel');
const nationModel = require('./nationModel');
const logModel = require('./logModel');

// Initialize database
initDb();

module.exports = {
    db,
    ...gameModel,
    ...nationModel,
    ...logModel
};
