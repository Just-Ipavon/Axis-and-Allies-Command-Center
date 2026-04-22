const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const gameRoutes = require('./src/routes/gameRoutes');
const socketInit = require('./src/sockets/index');

const app = express();
app.use(helmet({
  contentSecurityPolicy: false, 
}));
app.set('trust proxy', true); 
app.use(cors());
app.use(express.json({ limit: '50kb' }));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, 
	max: 100, 
	standardHeaders: true, 
	legacyHeaders: false, 
});

// API Routes
app.use('/api/games', apiLimiter, gameRoutes);

// Serve static files from the React frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Initialize Sockets
socketInit(io);

// Any other API or unknown route, fallback to React Router/App
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 1942;
server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
