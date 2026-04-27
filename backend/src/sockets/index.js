const lobbyHandlers = require('./lobbyHandlers');
const gameHandlers = require('./gameHandlers');
const nationHandlers = require('./nationHandlers');

module.exports = (io) => {
    // Lobby Namespace
    const lobbyNamespace = io.of('/lobby');
    lobbyNamespace.on('connection', (socket) => {
        lobbyHandlers(lobbyNamespace, socket);
    });

    // Game Namespace
    const gameNamespace = io.of('/game');
    gameNamespace.on('connection', (socket) => {
        console.log('User connected to game namespace:', socket.id);
        
        // Register handlers for game namespace
        // Pass lobbyNamespace so gameHandlers can notify the lobby when rooms are created/reset
        gameHandlers(gameNamespace, socket, lobbyNamespace);
        nationHandlers(gameNamespace, socket);

        socket.on('disconnect', () => {
            console.log('User disconnected from game namespace:', socket.id);
        });
    });
};
