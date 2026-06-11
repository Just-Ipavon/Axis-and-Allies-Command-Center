const db = require('../database/connection');
const initDb = require('../database/init');
const gameModel = require('./gameModel');
const nationModel = require('./nationModel');
const factoryModel = require('./factoryModel');
const techModel = require('./techModel');
const objectiveModel = require('./objectiveModel');
const logModel = require('./logModel');

// Initialize database
initDb();

module.exports = {
    db,
    ...gameModel,
    ...nationModel,
    ...factoryModel,
    ...techModel,
    ...objectiveModel,
    ...logModel
};
