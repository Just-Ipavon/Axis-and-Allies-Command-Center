const db = require('../models');

const truncateString = (str, num) => {
    if (typeof str !== 'string') return '';
    if (str.length <= num) {
      return str;
    }
    return str.slice(0, num);
};

async function broadcastGameState(io, gameId) {
    try {
        const game = await db.getGame(gameId);
        const nations = await db.getNations(gameId);
        const logs = await db.getLogs(gameId);

        if (!game) return;

        // Parse China territories for the game
        let parsedChinaTerritories = [];
        try {
            parsedChinaTerritories = JSON.parse(game.china_territories || '[]');
        } catch(e) {}

        io.to(gameId).emit('gameState', {
            game: {
                ...game,
                china_territories: parsedChinaTerritories
            },
            currentTurn: game.current_turn,
            nations: nations.map(n => ({ 
                ...n, 
                purchases: JSON.parse(n.purchases || '{}'),
                factories: JSON.parse(n.factories || '[]'),
                tech: JSON.parse(n.tech || '[]'),
                active_objectives: JSON.parse(n.active_objectives || '[]')
            })),
            logs: logs.reverse()
        });
    } catch (err) {
        console.error('Error broadcasting state:', err);
    }
}

module.exports = {
    truncateString,
    broadcastGameState
};
