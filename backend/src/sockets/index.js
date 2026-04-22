const gameHandlers = require('./gameHandlers');
const nationHandlers = require('./nationHandlers');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // Register handlers
        gameHandlers(io, socket);
        nationHandlers(io, socket);

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};
