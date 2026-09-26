const { getObjective } = require('../config/gameConfig');
const { getNation, updateNation } = require('./helpers');

const toggleNationalObjective = async (gameId, name, objectiveId, isActive) => {
    if (!getObjective(name, objectiveId)) throw new Error('Unknown objective');
    const nation = await getNation(gameId, name);
    const others = nation.active_objectives.filter(o => o !== objectiveId);
    await updateNation(gameId, name, { active_objectives: isActive ? [...others, objectiveId] : others });
    return true;
};

module.exports = {
    toggleNationalObjective
};
