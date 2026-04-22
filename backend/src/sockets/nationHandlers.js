const db = require('../models');
const { truncateString, broadcastGameState } = require('./utils');

module.exports = (io, socket) => {
    socket.on('updateNation', async ({ gameId, name, income, bank, purchases, playerName, logMessage }) => {
        try {
            const cleanGameId = truncateString(gameId, 50);
            await db.updateNationStatus(cleanGameId, truncateString(name, 50), income, bank, purchases, truncateString(playerName, 50));
            if (logMessage) {
                await db.addLog(cleanGameId, truncateString(logMessage, 500));
            }
            await broadcastGameState(io, cleanGameId);
        } catch (e) {
            console.error('updateNation error:', e);
        }
    });

    socket.on('collectIncome', async ({ gameId, name, logMessage }) => {
        try {
            const cleanGameId = truncateString(gameId, 50);
            await db.collectIncome(cleanGameId, truncateString(name, 50), truncateString(logMessage, 500));
            await broadcastGameState(io, cleanGameId);
        } catch (e) {
            console.error('collectIncome error:', e);
        }
    });

    socket.on('conquerTerritory', async (data) => {
        try {
            const { gameId, conqueror, victim, value, targetType } = data;
            const cleanGameId = truncateString(gameId, 50);
            await db.conquerTerritory(cleanGameId, truncateString(conqueror, 50), truncateString(victim, 50), value, truncateString(targetType, 50));
            await broadcastGameState(io, cleanGameId);
        } catch(e) { console.error(e) }
    });

    socket.on('addFactory', async ({ gameId, name, territoryName, capacity }) => {
        try {
            const cleanGameId = truncateString(gameId, 50);
            await db.addFactory(cleanGameId, truncateString(name, 50), truncateString(territoryName, 100), capacity);
            await broadcastGameState(io, cleanGameId);
        } catch(e) { console.error(e) }
    });
    
    socket.on('removeFactory', async ({ gameId, name, factoryId }) => {
        try {
            const cleanGameId = truncateString(gameId, 50);
            await db.removeFactory(cleanGameId, truncateString(name, 50), truncateString(factoryId, 50));
            await broadcastGameState(io, cleanGameId);
        } catch(e) { console.error(e) }
    });
    
    socket.on('transferFactory', async ({ gameId, oldNation, newNation, factoryId }) => {
        try {
            const cleanGameId = truncateString(gameId, 50);
            await db.transferFactory(cleanGameId, truncateString(oldNation, 50), truncateString(newNation, 50), truncateString(factoryId, 50));
            await broadcastGameState(io, cleanGameId);
        } catch(e) { console.error(e) }
    });
    
    socket.on('updateFactoryDamage', async ({ gameId, name, factoryId, damageDelta, isUndo, isFree }) => {
        try {
            const cleanGameId = truncateString(gameId, 50);
            await db.updateFactoryDamage(cleanGameId, truncateString(name, 50), truncateString(factoryId, 50), damageDelta, isUndo, isFree);
            await broadcastGameState(io, cleanGameId);
        } catch(e) { console.error(e) }
    });

    socket.on('lockPurchases', async ({ gameId, name, logMessage }) => {
        try {
            const cleanGameId = truncateString(gameId, 50);
            await db.lockPurchases(cleanGameId, truncateString(name, 50), truncateString(logMessage, 500));
            await broadcastGameState(io, cleanGameId);
        } catch(e) { console.error(e) }
    });

    socket.on('unlockPurchases', async ({ gameId, name }) => {
        try {
            const cleanGameId = truncateString(gameId, 50);
            await db.unlockPurchases(cleanGameId, truncateString(name, 50));
            await broadcastGameState(io, cleanGameId);
        } catch(e) { console.error(e) }
    });
};
