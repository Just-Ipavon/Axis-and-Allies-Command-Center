const { RULES, ALL_TECHS } = require('../config/gameConfig');
const { getNation, updateNation } = require('./helpers');
const { addLog } = require('./logModel');

const TOKEN_COST = RULES.researchTokenCost;

const buyTechToken = async (gameId, name) => {
    const nation = await getNation(gameId, name);
    if (nation.bank < TOKEN_COST) throw new Error('Not enough IPCs to buy a Research Token');
    const tokens = (nation.research_tokens || 0) + 1;
    await updateNation(gameId, name, { bank: nation.bank - TOKEN_COST, research_tokens: tokens });
    await addLog(gameId, `${name} purchased a Research Token for ${TOKEN_COST} IPCs (Total Tokens: ${tokens}).`);
    return true;
};

// Only tokens that have not been rolled yet can be refunded.
const refundTechToken = async (gameId, name) => {
    const nation = await getNation(gameId, name);
    const tokens = nation.research_tokens || 0;
    if (tokens - (nation.tokens_rolled || 0) <= 0) throw new Error('No unrolled tokens to refund');
    await updateNation(gameId, name, { bank: nation.bank + TOKEN_COST, research_tokens: tokens - 1 });
    await addLog(gameId, `${name} refunded a Research Token (Total Tokens: ${tokens - 1}).`);
    return true;
};

// Each unrolled token rolls one die; a 6 is a breakthrough. On success all tokens are spent,
// on failure they are kept for the next turn.
const rollForTech = async (gameId, name, chartId) => {
    const chart = RULES.techCharts[chartId];
    if (!chart) throw new Error('Invalid research chart');
    const nation = await getNation(gameId, name);
    const tokens = nation.research_tokens || 0;
    const unrolled = tokens - (nation.tokens_rolled || 0);
    if (unrolled <= 0) throw new Error('No unrolled Research Tokens available to roll in this turn!');

    const available = chart.filter(t => !nation.tech.includes(t));
    if (available.length === 0) throw new Error(`All technologies on Chart ${chartId} have already been unlocked!`);

    const rolls = Array.from({ length: unrolled }, () => Math.floor(Math.random() * 6) + 1);
    if (rolls.includes(6)) {
        const tech = available[Math.floor(Math.random() * available.length)];
        await updateNation(gameId, name, { research_tokens: 0, tokens_rolled: 0, tech: [...nation.tech, tech] });
        await addLog(gameId, `🔬 ${name} achieved a Technology Breakthrough on Chart ${chartId}! Rolled: [${rolls.join(', ')}] - SUCCESS! Unlocked: ${tech}.`);
    } else {
        await updateNation(gameId, name, { tokens_rolled: tokens });
        await addLog(gameId, `🔬 ${name} rolled for technology on Chart ${chartId}. Rolled: [${rolls.join(', ')}] - FAILURE. (Tokens retained).`);
    }
    return true;
};

const toggleTechnology = async (gameId, name, techName, isActive) => {
    if (!ALL_TECHS.includes(techName)) throw new Error('Unknown technology');
    const nation = await getNation(gameId, name);
    const others = nation.tech.filter(t => t !== techName);
    await updateNation(gameId, name, { tech: isActive ? [...others, techName] : others });
    await addLog(gameId, `🔬 Technology ${techName} has been ${isActive ? 'DEVELOPED' : 'REMOVED'} for ${name}.`);
    return true;
};

module.exports = {
    buyTechToken,
    refundTechToken,
    rollForTech,
    toggleTechnology
};
