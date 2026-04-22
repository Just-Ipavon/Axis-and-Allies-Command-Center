const db = require('../../db');

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

        io.to(gameId).emit('gameState', {
            game,
            currentTurn: game.current_turn,
            nations: nations.map(n => ({ 
                ...n, 
                purchases: JSON.parse(n.purchases || '{}'),
                factories: JSON.parse(n.factories || '[]')
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
