const db = require('../models');
const { truncateString, assertNations, onGameEvent } = require('./utils');
const { ALL_TECHS, getObjective } = require('../config/gameConfig');

const nationName = (value) => truncateString(value, 50);

module.exports = (io, socket) => {
    const on = (event, handler, options) => onGameEvent(io, socket, event, handler, options);
    const isBanker = (gameId) => socket.bankerFor === gameId;

    on('setPlayerName', async ({ name, playerName }, gameId) => {
        const cleanName = nationName(name);
        await assertNations(gameId, cleanName);
        await db.setPlayerName(gameId, cleanName, truncateString(playerName, 50));
    });

    // Cart intents: the server computes costs, capacity and the new bank.
    on('adjustPurchase', async ({ name, unit, delta, territoryName, capacity }, gameId) => {
        const cleanName = nationName(name);
        await assertNations(gameId, cleanName);
        await db.adjustPurchase(gameId, cleanName, truncateString(unit, 40), delta,
            { territoryName: truncateString(territoryName, 100).trim(), capacity }, isBanker(gameId));
    });

    on('adjustRepair', async ({ name, factoryId, delta }, gameId) => {
        const cleanName = nationName(name);
        await assertNations(gameId, cleanName);
        await db.adjustRepair(gameId, cleanName, truncateString(factoryId, 50), delta, isBanker(gameId));
    });

    on('adminSetEconomy', async ({ name, income, bank }, gameId) => {
        const cleanName = nationName(name);
        await assertNations(gameId, cleanName);
        await db.adminSetEconomy(gameId, cleanName, income, bank);
    }, { bankerOnly: true });

    // The income log is built server-side from the amount actually collected.
    on('collectIncome', async ({ name }, gameId) => {
        const cleanName = nationName(name);
        await assertNations(gameId, cleanName);
        await db.collectIncome(gameId, cleanName);
    });

    on('conquerTerritory', async ({ conqueror, victim, value, targetType, liberatedFor }, gameId) => {
        const cleanConqueror = nationName(conqueror);
        const cleanVictim = nationName(victim);
        const cleanLiberatedFor = liberatedFor ? nationName(liberatedFor) : null;
        await assertNations(gameId, cleanConqueror, cleanVictim, ...(cleanLiberatedFor ? [cleanLiberatedFor] : []));
        await db.conquerTerritory(gameId, cleanConqueror, cleanVictim, value, targetType === 'capital' ? 'capital' : 'income', cleanLiberatedFor);
    });

    on('addFactory', async ({ name, territoryName, capacity }, gameId) => {
        const cleanName = nationName(name);
        const cleanTerritory = truncateString(territoryName, 100).trim();
        const cap = Number(capacity);
        if (!cleanTerritory || !Number.isInteger(cap) || cap < 1 || cap > 20) throw new Error('Invalid factory data');
        await assertNations(gameId, cleanName);
        await db.addFactory(gameId, cleanName, cleanTerritory, cap);
    });

    on('removeFactory', async ({ name, factoryId }, gameId) => {
        const cleanName = nationName(name);
        await assertNations(gameId, cleanName);
        await db.removeFactory(gameId, cleanName, truncateString(factoryId, 50));
    });

    on('transferFactory', async ({ oldNation, newNation, factoryId }, gameId) => {
        const cleanOld = nationName(oldNation);
        const cleanNew = nationName(newNation);
        await assertNations(gameId, cleanOld, cleanNew);
        await db.transferFactory(gameId, cleanOld, cleanNew, truncateString(factoryId, 50));
    });

    on('bombFactory', async ({ name, factoryId, damage }, gameId) => {
        const cleanName = nationName(name);
        const points = Number(damage);
        if (!Number.isInteger(points) || points < 1 || points > 40) throw new Error('Invalid damage value');
        await assertNations(gameId, cleanName);
        await db.applyBombingDamage(gameId, cleanName, truncateString(factoryId, 50), points);
    });

    on('setFactoryDamage', async ({ name, factoryId, damage }, gameId) => {
        const cleanName = nationName(name);
        const points = Number(damage);
        if (!Number.isInteger(points) || points < 0 || points > 40) throw new Error('Invalid damage value');
        await assertNations(gameId, cleanName);
        await db.setFactoryDamage(gameId, cleanName, truncateString(factoryId, 50), points);
    }, { bankerOnly: true });

    on('lockPurchases', async ({ name }, gameId) => {
        const cleanName = nationName(name);
        await assertNations(gameId, cleanName);
        await db.lockPurchases(gameId, cleanName);
    });

    on('unlockPurchases', async ({ name }, gameId) => {
        const cleanName = nationName(name);
        await assertNations(gameId, cleanName);
        await db.unlockPurchases(gameId, cleanName);
    }, { bankerOnly: true });

    on('toggleCapitalStatus', async ({ name, isCaptured }, gameId) => {
        const cleanName = nationName(name);
        // Liberating is a normal game action; forcing a capture is an admin override.
        if (isCaptured && !isBanker(gameId)) throw new Error('Banker authorization required');
        await assertNations(gameId, cleanName);
        await db.toggleCapitalStatus(gameId, cleanName, !!isCaptured);
    });

    on('buyTechToken', async ({ name }, gameId) => {
        const cleanName = nationName(name);
        await assertNations(gameId, cleanName);
        await db.buyTechToken(gameId, cleanName);
    });

    on('refundTechToken', async ({ name }, gameId) => {
        const cleanName = nationName(name);
        await assertNations(gameId, cleanName);
        await db.refundTechToken(gameId, cleanName);
    });

    on('rollForTech', async ({ name, chartId }, gameId) => {
        const cleanName = nationName(name);
        const chart = Number(chartId);
        if (chart !== 1 && chart !== 2) throw new Error('Invalid research chart');
        await assertNations(gameId, cleanName);
        await db.rollForTech(gameId, cleanName, chart);
    });

    on('toggleNationalObjective', async ({ name, objectiveId, isActive }, gameId) => {
        const cleanName = nationName(name);
        const cleanObjective = truncateString(objectiveId, 100);
        if (!getObjective(cleanName, cleanObjective)) throw new Error('Unknown objective');
        await assertNations(gameId, cleanName);
        await db.toggleNationalObjective(gameId, cleanName, cleanObjective, !!isActive);
    });

    on('toggleTechnology', async ({ name, techName, isActive }, gameId) => {
        const cleanName = nationName(name);
        const cleanTech = truncateString(techName, 100);
        if (!ALL_TECHS.includes(cleanTech)) throw new Error('Unknown technology');
        await assertNations(gameId, cleanName);
        await db.toggleTechnology(gameId, cleanName, cleanTech, !!isActive);
    });

    on('updateChinaTerritories', async ({ territories }, gameId) => {
        await db.updateChinaTerritories(gameId, territories);
    });

    on('mobilizeChinaInfantry', async ({ placements }, gameId) => {
        await db.mobilizeChinaInfantry(gameId, placements);
    });
};
