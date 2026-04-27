module.exports = (lobbyIo, socket) => {
    console.log('User joined lobby namespace:', socket.id);

    socket.on('disconnect', () => {
        console.log('User left lobby namespace:', socket.id);
    });
};
