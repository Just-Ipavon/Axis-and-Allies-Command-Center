const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const models = require('./src/models');

const gameRoutes = require('./src/routes/gameRoutes');
const socketInit = require('./src/sockets/index');

const app = express();
app.use(helmet({
  contentSecurityPolicy: false, 
}));
// Number of reverse proxies in front of the app (trusting all of them lets clients spoof their IP).
app.set('trust proxy', parseInt(process.env.TRUST_PROXY_HOPS || '1', 10));

// The production frontend is served from this same origin; cross-origin access is
// only granted to the configured origins (default: the Vite dev server).
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map(o => o.trim()).filter(Boolean);
const corsOptions = { origin: allowedOrigins, methods: ['GET', 'POST', 'DELETE'] };
app.use(cors(corsOptions));
app.use(express.json({ limit: '50kb' }));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, 
	max: 100, 
	standardHeaders: true, 
	legacyHeaders: false, 
});

// API Routes
app.use('/api/games', (req, res, next) => {
    req.io = io;
    next();
}, apiLimiter, gameRoutes);

// Serve static files from the React frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: corsOptions,
    maxHttpBufferSize: 50 * 1024
});

// Initialize Sockets
socketInit(io);

// Any other API or unknown route, fallback to React Router/App
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Last line of defense: log unexpected errors instead of taking every game down.
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
process.on('uncaughtException', (err) => console.error('Uncaught exception:', err));

const PORT = process.env.PORT || 1942;
models.ready.then(() => {
    server.listen(PORT, () => {
        console.log(`Backend server running on port ${PORT}`);
    });
});
