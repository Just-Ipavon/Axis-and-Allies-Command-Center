const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const app = express();
app.use(helmet({
  contentSecurityPolicy: false, // Often requires config for React, disabling for now to prevent breaking changes unless configured
}));
app.use(cors());
app.use(express.json({ limit: '50kb' }));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, 
	legacyHeaders: false, 
});

app.use('/api/', apiLimiter);

// Serve static files from the React frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// API to get list of all rooms
app.get('/api/games', async (req, res) => {
    try {
        const games = await db.getGamesList();
        res.json(games);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/games/:id', async (req, res) => {
    try {
        await db.verifyMasterPassword(req.params.id, req.body.password);
        await db.deleteGame(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(403).json({ error: err.message });
    }
});


const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allows any origin, fine for local network / Cloudflare tunnel
        methods: ["GET", "POST"]
    }
});

// Helper to broadcast game state
async function broadcastGameState(gameId) {
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

const truncateString = (str, num) => {
    if (typeof str !== 'string') return '';
    if (str.length <= num) {
      return str;
    }
    return str.slice(0, num);
};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

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

    // Join a game room
    socket.on('joinGame', async (data, callback) => {
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
            console.log(`Game ${gameId} not found, initializing...`);
            await db.createOrResetGame(gameId, password, masterPassword);
        } else {
            if (isCreating) {
                if (typeof callback === 'function') callback({ error: 'Room already exists.' });
                return;
            }
            if (game.password && game.password !== password) {
                if (typeof callback === 'function') callback({ error: 'Invalid password.' });
                return;
            }
        }
        
        if (socket.gameId && socket.gameId !== gameId) {
            await handleLeave(socket.gameId);
        }

        socket.join(gameId);
        socket.gameId = gameId;
        console.log(`Socket ${socket.id} joined game ${gameId}`);
        
        game = await db.getGame(gameId); // re-fetch to get newest info
        const roomSize = io.sockets.adapter.rooms.get(gameId)?.size || 1;
        
        if (roomSize === 1 && game.last_empty_at !== null) {
            let newPlayTime = game.play_time || 0;
            const emptyDur = Date.now() - game.last_empty_at;
            if (emptyDur < 3600000) { // < 1 hour
                newPlayTime += Math.floor(emptyDur / 1000);
            }
            await db.updateGameTime(gameId, newPlayTime, Date.now(), null);
        } else if (roomSize === 1 && game.last_resume_at === null) {
            await db.updateGameTime(gameId, game.play_time || 0, Date.now(), null);
        }

        await broadcastGameState(gameId);
        if (typeof callback === 'function') callback({ success: true });
    });

    // Handle updates to nation's income, bank or player name
    socket.on('updateNation', async ({ gameId, name, income, bank, purchases, playerName, logMessage }) => {
        try {
            await db.updateNationStatus(truncateString(gameId, 50), truncateString(name, 50), income, bank, purchases, truncateString(playerName, 50));
            if (logMessage) {
                await db.addLog(truncateString(gameId, 50), truncateString(logMessage, 200));
            }
            await broadcastGameState(truncateString(gameId, 50));
        } catch (err) {
            console.error('Error updating nation:', err);
        }
    });

    // Resets a game
    socket.on('resetGame', async (data, callback) => {
        try {
            const { gameId, masterPassword } = data;
            const cleanGameId = truncateString(gameId, 50);
            await db.verifyMasterPassword(cleanGameId, truncateString(masterPassword, 50));
            await db.createOrResetGame(cleanGameId, "", truncateString(masterPassword, 50)); 
            await broadcastGameState(cleanGameId);
            if (typeof callback === 'function') callback({ success: true });
        } catch (err) {
            if (typeof callback === 'function') callback({ error: err.message });
        }
    });

    // Advance turn
    socket.on('advanceTurn', async (gameId) => {
        try {
            const cleanGameId = truncateString(gameId, 50);
            await db.advanceTurn(cleanGameId);
            await broadcastGameState(cleanGameId);
        } catch(e) { console.error(e) }
    });

    // Conquer Territory
    socket.on('conquerTerritory', async (data) => {
        try {
            const { gameId, conqueror, victim, value, targetType } = data;
            const cleanGameId = truncateString(gameId, 50);
            await db.conquerTerritory(cleanGameId, truncateString(conqueror, 50), truncateString(victim, 50), value, truncateString(targetType, 50));
            await broadcastGameState(cleanGameId);
        } catch(e) { console.error(e) }
    });

    socket.on('addFactory', async ({ gameId, name, territoryName, capacity }) => {
        try {
            const cleanGameId = truncateString(gameId, 50);
            await db.addFactory(cleanGameId, truncateString(name, 50), truncateString(territoryName, 100), capacity);
            await broadcastGameState(cleanGameId);
        } catch(e) { console.error(e) }
    });
    
    socket.on('removeFactory', async ({ gameId, name, factoryId }) => {
        try {
            const cleanGameId = truncateString(gameId, 50);
            await db.removeFactory(cleanGameId, truncateString(name, 50), truncateString(factoryId, 50));
            await broadcastGameState(cleanGameId);
        } catch(e) { console.error(e) }
    });
    
    socket.on('transferFactory', async ({ gameId, oldNation, newNation, factoryId }) => {
        try {
            const cleanGameId = truncateString(gameId, 50);
            await db.transferFactory(cleanGameId, truncateString(oldNation, 50), truncateString(newNation, 50), truncateString(factoryId, 50));
            await broadcastGameState(cleanGameId);
        } catch(e) { console.error(e) }
    });
    
    socket.on('updateFactoryDamage', async ({ gameId, name, factoryId, damageDelta, isUndo }) => {
        try {
            const cleanGameId = truncateString(gameId, 50);
            await db.updateFactoryDamage(cleanGameId, truncateString(name, 50), truncateString(factoryId, 50), damageDelta, isUndo);
            await broadcastGameState(cleanGameId);
        } catch(e) { console.error(e) }
    });

    socket.on('verifyMasterPassword', async ({ gameId, masterPassword }, callback) => {
        try {
            await db.verifyMasterPassword(truncateString(gameId, 50), truncateString(masterPassword, 50));
            if (typeof callback === 'function') callback({ success: true });
        } catch (err) {
            if (typeof callback === 'function') callback({ error: err.message });
        }
    });

    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);
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
});

// Any other API or unknown route, fallback to React Router/App
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 1942;
server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
