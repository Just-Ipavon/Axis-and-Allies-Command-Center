const db = require('../database/connection');
const initDb = require('../database/init');
const gameModel = require('./gameModel');
const nationModel = require('./nationModel');
const factoryModel = require('./factoryModel');
const techModel = require('./techModel');
const objectiveModel = require('./objectiveModel');
const logModel = require('./logModel');

// Initialize database (server.js waits for this before accepting connections)
const ready = initDb();

module.exports = {
    db,
    ready,
    withLock: db.withLock,
    ...gameModel,
    ...nationModel,
    ...factoryModel,
    ...techModel,
    ...objectiveModel,
    ...logModel
};
