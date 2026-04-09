const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

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
        if (req.body.password !== '562656') {
            return res.status(403).json({ error: 'Invalid admin code' });
        }
        await db.deleteGame(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
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
            nations: nations.map(n => ({ ...n, purchases: JSON.parse(n.purchases || '{}') })),
            logs: logs.reverse()
        });
    } catch (err) {
        console.error('Error broadcasting state:', err);
    }
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a game room
    socket.on('joinGame', async (data, callback) => {
        if (!data) return;
        const gameId = typeof data === 'string' ? data : data.gameId;
        const password = data.password || "";
        const isCreating = data.isCreating || false;

        if (!gameId) return;

        let game = await db.getGame(gameId);
        
        if (!game) {
            console.log(`Game ${gameId} not found, initializing...`);
            await db.createOrResetGame(gameId, password);
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

        socket.join(gameId);
        console.log(`Socket ${socket.id} joined game ${gameId}`);
        await broadcastGameState(gameId);
        if (typeof callback === 'function') callback({ success: true });
    });

    // Handle updates to nation's income, bank or player name
    socket.on('updateNation', async ({ gameId, name, income, bank, purchases, playerName, logMessage }) => {
        try {
            await db.updateNationStatus(gameId, name, income, bank, purchases, playerName);
            if (logMessage) {
                await db.addLog(gameId, logMessage);
            }
            await broadcastGameState(gameId);
        } catch (err) {
            console.error('Error updating nation:', err);
        }
    });

    // Resets a game
    socket.on('resetGame', async (gameId) => {
        await db.createOrResetGame(gameId, ""); // Wipe out, keep no password here or we need password? Just reset state
        await broadcastGameState(gameId);
    });

    // Advance turn
    socket.on('advanceTurn', async (gameId) => {
        try {
            await db.advanceTurn(gameId);
            await broadcastGameState(gameId);
        } catch(e) { console.error(e) }
    });

    // Conquer Territory
    socket.on('conquerTerritory', async (data) => {
        try {
            const { gameId, conqueror, victim, value, targetType } = data;
            await db.conquerTerritory(gameId, conqueror, victim, value, targetType);
            await broadcastGameState(gameId);
        } catch(e) { console.error(e) }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
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
