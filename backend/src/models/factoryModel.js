const crypto = require('crypto');
const { getNation, updateNation } = require('./helpers');
const { addLog } = require('./logModel');

const MAX_FACTORIES = 30;

const findFactory = (factories, factoryId) => {
    const factory = factories.find(f => f.id === factoryId);
    if (!factory) throw new Error('Factory not found');
    return factory;
};

// builtThisTurn: a complex bought this turn cannot mobilize units until the next turn.
const addFactory = async (gameId, name, territoryName, capacity, { builtThisTurn = false } = {}) => {
    const cap = Number(capacity);
    if (!territoryName || !Number.isInteger(cap) || cap < 1 || cap > 20) throw new Error('Invalid factory');
    const nation = await getNation(gameId, name);
    if (nation.factories.length >= MAX_FACTORIES) throw new Error('Too many factories');
    const factory = { id: crypto.randomBytes(6).toString('hex'), name: territoryName, capacity: cap, damage: 0, repairedThisTurn: 0 };
    if (builtThisTurn) factory.builtThisTurn = true;
    await updateNation(gameId, name, { factories: [...nation.factories, factory] });
    return factory;
};

const removeFactory = async (gameId, name, factoryId) => {
    const nation = await getNation(gameId, name);
    findFactory(nation.factories, factoryId);
    const purchases = { ...nation.purchases };
    delete purchases[`repair_${factoryId}`];
    await updateNation(gameId, name, { factories: nation.factories.filter(f => f.id !== factoryId), purchases });
    return true;
};

// Strategic bombing: damage is capped at twice the territory value.
const applyBombingDamage = async (gameId, name, factoryId, damage) => {
    const nation = await getNation(gameId, name);
    const factory = findFactory(nation.factories, factoryId);
    const before = factory.damage || 0;
    factory.damage = Math.min(before + damage, factory.capacity * 2);
    await updateNation(gameId, name, { factories: nation.factories });
    await addLog(gameId, `💣 Bombing raid on ${name}'s complex in ${factory.name}: +${factory.damage - before} damage (${factory.damage}/${factory.capacity * 2}).`);
    return true;
};

// Game Master override: sets the damage directly, at no cost.
const setFactoryDamage = async (gameId, name, factoryId, damage) => {
    const nation = await getNation(gameId, name);
    const factory = findFactory(nation.factories, factoryId);
    factory.damage = Math.max(0, Math.min(damage, factory.capacity * 2));
    await updateNation(gameId, name, { factories: nation.factories });
    return true;
};

const transferFactory = async (gameId, oldNation, newNation, factoryId) => {
    if (oldNation === newNation) return true;
    const victim = await getNation(gameId, oldNation);
    const conqueror = await getNation(gameId, newNation);

    const factory = findFactory(victim.factories, factoryId);
    const victimFactories = victim.factories.filter(f => f.id !== factoryId);
    const purchases = { ...victim.purchases };
    delete purchases[`repair_${factoryId}`];
    factory.repairedThisTurn = 0;

    const val = factory.capacity;
    await updateNation(gameId, oldNation, { factories: victimFactories, purchases, income: Math.max(0, victim.income - val) });
    await updateNation(gameId, newNation, { factories: [...conqueror.factories, factory], income: conqueror.income + val });
    await addLog(gameId, `${newNation} conquered the factory in ${factory.name} from ${oldNation} (+${val} IPC).`);
    return true;
};

module.exports = {
    addFactory,
    removeFactory,
    applyBombingDamage,
    setFactoryDamage,
    transferFactory
};
