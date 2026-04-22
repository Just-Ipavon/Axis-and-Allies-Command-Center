const db = require('../models');
const { truncateString, broadcastGameState } = require('./utils');

module.exports = (io, socket) => {
    const handleLeave = async (gameId) => {
        if (!gameId) return;
        socket.leave(gameId);
        const room = io.sockets.adapter.rooms.get(gameId);
        if (!room || room.size === 0) {
            let game = await db.getGame(gameId);
            if (game && game.last_resume_at) {
                let sessionTime = Math.floor((Date.now() - game.last_resume_at) / 1000);
                await db.updateGameTime(gameId, (game.play_time || 0) + sessionTime, null, Date.now());
            }
        }
    };

    socket.on('leaveGame', async (gameId) => {
        await handleLeave(truncateString(gameId, 50));
        socket.gameId = null;
    });

    socket.on('joinGame', async (data, callback) => {
        try {
            if (!data) return;
            let gameId = typeof data === 'string' ? data : data.gameId;
            gameId = truncateString(gameId, 50);
            let password = data.password || "";
            password = truncateString(password, 50);
            const isCreating = data.isCreating || false;

            let masterPassword = data.masterPassword || "";
            masterPassword = truncateString(masterPassword, 50);

            if (!gameId) return;

            let game = await db.getGame(gameId);
            
            if (!game) {
                if (!isCreating) {
                    if (typeof callback === 'function') callback({ error: 'Room not found.' });
                    return;
                }
                
                const roomName = data.roomName || 'Unknown Operation';
                const existingByName = await db.getGameByRoomName(roomName);
                if (existingByName) {
                    if (typeof callback === 'function') callback({ error: 'A room with this name already exists.' });
                    return;
                }

                await db.createOrResetGame(gameId, password, masterPassword, roomName);
            } else {
                if (isCreating) {
                    if (typeof callback === 'function') callback({ error: 'Room already exists.' });
                    return;
                }
                try {
                    await db.verifyRoomPassword(gameId, password);
                } catch (err) {
                    if (typeof callback === 'function') callback({ error: 'Invalid password.' });
                    return;
                }
            }
            
            if (socket.gameId && socket.gameId !== gameId) {
                await handleLeave(socket.gameId);
            }

            socket.join(gameId);
            socket.gameId = gameId;
            
            game = await db.getGame(gameId);
            if (!game) {
                if (typeof callback === 'function') callback({ error: 'Server synchronization error. Please try again.' });
                return;
            }

            const roomSize = io.sockets.adapter.rooms.get(gameId)?.size || 1;
            
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
            if (typeof callback === 'function') callback({ success: true });
        } catch (err) {
            console.error('CRITICAL: joinGame error:', err);
            if (typeof callback === 'function') callback({ error: 'Internal Server Error. Please contact command.' });
        }
    });

    socket.on('resetGame', async (data, callback) => {
        try {
            const { gameId, masterPassword } = data;
            const cleanGameId = truncateString(gameId, 50);
            await db.verifyMasterPassword(cleanGameId, truncateString(masterPassword, 50));
            const game = await db.getGame(cleanGameId);
            await db.createOrResetGame(cleanGameId, "", truncateString(masterPassword, 50), game ? game.room_name : 'Unknown Operation'); 
            await broadcastGameState(io, cleanGameId);
            if (typeof callback === 'function') callback({ success: true });
        } catch (err) {
            if (typeof callback === 'function') callback({ error: err.message });
        }
    });

    socket.on('advanceTurn', async (gameId) => {
        try {
            const cleanGameId = truncateString(gameId, 50);
            await db.advanceTurn(cleanGameId);
            await broadcastGameState(io, cleanGameId);
        } catch (e) {
            console.error('advanceTurn error:', e);
        }
    });

    socket.on('undoTurn', async (gameId) => {
        try {
            const cleanGameId = truncateString(gameId, 50);
            await db.undoTurn(cleanGameId);
            await broadcastGameState(io, cleanGameId);
        } catch (e) {
            console.error('undoTurn error:', e);
        }
    });

    socket.on('verifyMasterPassword', async ({ gameId, masterPassword }, callback) => {
        try {
            await db.verifyMasterPassword(truncateString(gameId, 50), truncateString(masterPassword, 50));
            if (typeof callback === 'function') callback({ success: true });
        } catch (err) {
            if (typeof callback === 'function') callback({ error: err.message });
        }
    });

    // Cleanup on disconnect
    socket.on('disconnect', async () => {
        if (socket.gameId) {
            const room = io.sockets.adapter.rooms.get(socket.gameId);
            if (!room || room.size === 0) {
                let game = await db.getGame(socket.gameId);
                if (game && game.last_resume_at) {
                    let sessionTime = Math.floor((Date.now() - game.last_resume_at) / 1000);
                    await db.updateGameTime(socket.gameId, (game.play_time || 0) + sessionTime, null, Date.now());
                }
            }
        }
    });
};
