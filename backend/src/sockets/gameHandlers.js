const db = require('../models');
const { truncateString, broadcastGameState, onGameEvent } = require('./utils');

module.exports = (io, socket, lobbyIo) => {
    const reply = (callback, data) => {
        if (typeof callback === 'function') callback(data);
    };

    // Pauses the play-time clock when the last player leaves the room.
    const pauseClockIfEmpty = async (gameId) => {
        const room = io.adapter.rooms.get(gameId);
        if (room && room.size > 0) return;
        const game = await db.getGame(gameId);
        if (game && game.last_resume_at) {
            const sessionTime = Math.floor((Date.now() - game.last_resume_at) / 1000);
            await db.updateGameTime(gameId, (game.play_time || 0) + sessionTime, null, Date.now());
        }
    };

    const handleLeave = async (gameId) => {
        if (!gameId) return;
        socket.leave(gameId);
        socket.gameId = null;
        socket.bankerFor = null;
        await pauseClockIfEmpty(gameId);
    };

    socket.on('leaveGame', async (gameId) => {
        try {
            const cleanGameId = truncateString(gameId, 50);
            if (cleanGameId && cleanGameId === socket.gameId) await handleLeave(cleanGameId);
        } catch (err) {
            console.error('leaveGame error:', err);
        }
    });

    socket.on('joinGame', async (data, callback) => {
        try {
            if (!data) return;
            const payload = typeof data === 'string' ? { gameId: data } : data;
            const gameId = truncateString(payload.gameId, 50).trim();
            const password = truncateString(payload.password, 50);
            const masterPassword = truncateString(payload.masterPassword, 50);
            const isCreating = !!payload.isCreating;

            if (!gameId) return;

            const joinResult = await db.withLock(async () => {
                const existing = await db.getGame(gameId);
                if (!existing) {
                    if (!isCreating) return { error: 'Room not found.' };
                    if (!masterPassword) return { error: 'A master password is required to create a room.' };

                    const roomName = truncateString(payload.roomName, 60).trim() || 'Unknown Operation';
                    const gameVersion = truncateString(payload.gameVersion, 30) || '1942';
                    if (await db.getGameByRoomName(roomName)) return { error: 'A room with this name already exists.' };

                    await db.createOrResetGame(gameId, password, masterPassword, roomName, gameVersion);
                    if (lobbyIo) lobbyIo.emit('roomsUpdated');
                    return { isBanker: !!masterPassword };
                }

                if (isCreating) return { error: 'Room already exists.' };
                try {
                    await db.verifyRoomPassword(gameId, password);
                } catch (err) {
                    return { error: 'Invalid password.' };
                }

                // Optional: re-authorize the Game Master (e.g. after a reconnect).
                let isBanker = false;
                if (masterPassword) {
                    isBanker = await db.verifyMasterPassword(gameId, masterPassword).catch(() => false);
                }
                return { isBanker };
            });

            if (joinResult.error) return reply(callback, { error: joinResult.error });

            if (socket.gameId && socket.gameId !== gameId) {
                await handleLeave(socket.gameId);
            }

            socket.join(gameId);
            socket.gameId = gameId;
            socket.bankerFor = joinResult.isBanker ? gameId : null;

            const game = await db.getGame(gameId);
            if (!game) return reply(callback, { error: 'Server synchronization error. Please try again.' });

            const roomSize = io.adapter.rooms.get(gameId)?.size || 1;
            if (roomSize === 1 && game.last_empty_at !== null) {
                let newPlayTime = game.play_time || 0;
                const emptyDur = Date.now() - game.last_empty_at;
                if (emptyDur < 3600000) {
                    newPlayTime += Math.floor(emptyDur / 1000);
                }
                await db.updateGameTime(gameId, newPlayTime, Date.now(), null);
            } else if (roomSize === 1 && game.last_resume_at === null) {
                await db.updateGameTime(gameId, game.play_time || 0, Date.now(), null);
            }

            await broadcastGameState(io, gameId);
            reply(callback, { success: true, isBanker: !!joinResult.isBanker });
        } catch (err) {
            console.error('CRITICAL: joinGame error:', err);
            reply(callback, { error: 'Internal Server Error. Please contact command.' });
        }
    });

    socket.on('verifyMasterPassword', async (data, callback) => {
        try {
            const { gameId, masterPassword } = data || {};
            const cleanGameId = truncateString(gameId, 50);
            if (!cleanGameId || cleanGameId !== socket.gameId) throw new Error('You have not joined this game');
            await db.verifyMasterPassword(cleanGameId, truncateString(masterPassword, 50));
            socket.bankerFor = cleanGameId;
            reply(callback, { success: true });
        } catch (err) {
            reply(callback, { error: err.message });
        }
    });

    socket.on('resetGame', async (data, callback) => {
        try {
            const { gameId, masterPassword } = data || {};
            const cleanGameId = truncateString(gameId, 50);
            if (!cleanGameId || cleanGameId !== socket.gameId) throw new Error('You have not joined this game');
            await db.verifyMasterPassword(cleanGameId, truncateString(masterPassword, 50));
            socket.bankerFor = cleanGameId;
            // Keeps the room password, master password, name and edition.
            await db.withLock(() => db.resetGameState(cleanGameId));
            if (lobbyIo) lobbyIo.emit('roomsUpdated');
            await broadcastGameState(io, cleanGameId);
            reply(callback, { success: true });
        } catch (err) {
            reply(callback, { error: err.message });
        }
    });

    onGameEvent(io, socket, 'advanceTurn', (payload, gameId) => db.advanceTurn(gameId), { bankerOnly: true });
    onGameEvent(io, socket, 'undoTurn', (payload, gameId) => db.undoTurn(gameId), { bankerOnly: true });

    socket.on('disconnect', async () => {
        try {
            if (socket.gameId) await pauseClockIfEmpty(socket.gameId);
        } catch (err) {
            console.error('disconnect cleanup error:', err);
        }
    });
};
