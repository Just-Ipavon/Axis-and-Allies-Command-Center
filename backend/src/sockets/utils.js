const db = require('../models');

const truncateString = (str, num) => {
    if (typeof str !== 'string') return '';
    if (str.length <= num) {
      return str;
    }
    return str.slice(0, num);
};

const safeParse = (value, fallback) => {
    try { return JSON.parse(value) ?? fallback; } catch (e) { return fallback; }
};

// Only these game columns are sent to clients (never the password hashes).
const PUBLIC_GAME_FIELDS = ['id', 'room_name', 'current_turn', 'play_time', 'last_resume_at', 'game_version', 'china_reinforcements_placed'];

async function broadcastGameState(io, gameId) {
    try {
        const game = await db.getGame(gameId);
        if (!game) return;
        const nations = await db.getNations(gameId);
        const logs = await db.getLogs(gameId);

        const publicGame = {};
        PUBLIC_GAME_FIELDS.forEach(field => { publicGame[field] = game[field]; });
        publicGame.china_territories = safeParse(game.china_territories || '[]', []);

        io.to(gameId).emit('gameState', {
            game: publicGame,
            currentTurn: game.current_turn,
            serverTime: Date.now(),
            nations: nations.map(n => ({
                ...n,
                purchases: safeParse(n.purchases || '{}', {}),
                factories: safeParse(n.factories || '[]', []),
                tech: safeParse(n.tech || '[]', []),
                active_objectives: safeParse(n.active_objectives || '[]', [])
            })),
            logs: logs.reverse()
        });
    } catch (err) {
        console.error('Error broadcasting state:', err);
    }
}

// Throws unless every given name is a nation of this game.
async function assertNations(gameId, ...names) {
    const nations = await db.getNations(gameId);
    const valid = new Set(nations.map(n => n.name));
    names.forEach(name => {
        if (!valid.has(name)) throw new Error('Unknown nation');
    });
}

/**
 * Registers a state-changing game event.
 * - The payload is validated defensively (a missing payload never crashes the server).
 * - The socket must have joined the game it is acting on.
 * - bankerOnly events require a master password verified on this socket.
 * - Mutations run one at a time (db.withLock) and the new state is broadcast.
 * Errors are reported to the caller via the ack callback and an 'actionError' event.
 */
function onGameEvent(io, socket, event, handler, { bankerOnly = false } = {}) {
    socket.on(event, (data, callback) => {
        const reply = typeof callback === 'function' ? callback : () => {};
        const payload = data && typeof data === 'object' ? data : { gameId: data };
        const gameId = truncateString(payload.gameId, 50);

        db.withLock(async () => {
            if (!gameId || socket.gameId !== gameId) throw new Error('You have not joined this game');
            if (bankerOnly && socket.bankerFor !== gameId) throw new Error('Banker authorization required');
            await handler(payload, gameId);
        })
            .then(async () => {
                await broadcastGameState(io, gameId);
                reply({ success: true });
            })
            .catch(err => {
                console.error(`${event} error:`, err.message);
                reply({ error: err.message });
                socket.emit('actionError', { event, message: err.message });
            });
    });
}

module.exports = {
    truncateString,
    broadcastGameState,
    assertNations,
    onGameEvent
};
