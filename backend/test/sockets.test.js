// End-to-end tests: starts the real server on a free port with a temporary database
// and drives it with socket.io clients.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { io } = require('socket.io-client');

let server;
let baseUrl;
const clients = [];

const freePort = () => new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, () => {
        const { port } = srv.address();
        srv.close(() => resolve(port));
    });
});

const connect = () => new Promise((resolve, reject) => {
    const socket = io(`${baseUrl}/game`, { transports: ['websocket'], forceNew: true });
    socket.state = null;
    socket.on('gameState', (data) => { socket.state = data; });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
    clients.push(socket);
});

const send = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, (res) => resolve(res || {})));
const nation = (socket, name) => socket.state.nations.find(n => n.name === name);
const waitForState = async (socket) => {
    for (let i = 0; i < 50 && !socket.state; i++) await new Promise(r => setTimeout(r, 20));
};

let roomCounter = 0;
// Creates a room; returns the banker socket and the room id.
const createRoom = async (version = 'anniversary_1941', password = 'pw') => {
    const banker = await connect();
    const gameId = `T${++roomCounter}`;
    const res = await send(banker, 'joinGame', { gameId, roomName: `Room ${gameId}`, password, masterPassword: 'mp', isCreating: true, gameVersion: version });
    assert.equal(res.success, true);
    assert.equal(res.isBanker, true);
    await waitForState(banker);
    return { banker, gameId };
};

const joinAsPlayer = async (gameId, password = 'pw') => {
    const player = await connect();
    const res = await send(player, 'joinGame', { gameId, password });
    assert.equal(res.success, true);
    await waitForState(player);
    return player;
};

test.before(async () => {
    const port = await freePort();
    baseUrl = `http://localhost:${port}`;
    const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aa-test-'));
    server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
        env: { ...process.env, PORT: String(port), DB_PATH: path.join(dbDir, 'test.db'), PEPPER_SECRET: 'test-pepper' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.output = '';
    server.stdout.on('data', d => { server.output += d; });
    server.stderr.on('data', d => { server.output += d; });
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Server did not start:\n${server.output}`)), 10000);
        server.stdout.on('data', () => {
            if (server.output.includes('Backend server running')) { clearTimeout(timer); resolve(); }
        });
    });
});

test.after(() => {
    clients.forEach(c => c.disconnect());
    if (server) server.kill();
    assert.doesNotMatch(server.output, /Uncaught exception|Unhandled rejection/);
});

test('game state never contains password hashes', async () => {
    const { banker } = await createRoom();
    assert.ok(!('password' in banker.state.game));
    assert.ok(!('master_password' in banker.state.game));
});

test('malformed payloads do not crash the server', async () => {
    const { banker, gameId } = await createRoom();
    banker.emit('adjustPurchase');
    banker.emit('rollForTech', { gameId, name: 'Germany', chartId: 3 });
    banker.emit('bombFactory', { gameId, name: 'Nope', factoryId: 'x', damage: 1 });
    banker.emit('verifyMasterPassword');
    banker.emit('resetGame');
    const res = await send(banker, 'setPlayerName', { gameId, name: 'Germany', playerName: 'Alice' });
    assert.equal(res.success, true);
});

test('only joined sockets can act, only the banker can use banker actions', async () => {
    const { gameId } = await createRoom();
    const outsider = await connect();
    assert.ok((await send(outsider, 'adjustPurchase', { gameId, name: 'Germany', unit: 'Tank', delta: 1 })).error);
    assert.ok((await send(outsider, 'joinGame', { gameId, password: 'wrong' })).error);

    const player = await joinAsPlayer(gameId);
    assert.ok((await send(player, 'undoTurn', { gameId })).error);
    assert.ok((await send(player, 'adminSetEconomy', { gameId, name: 'Germany', income: 0, bank: 999 })).error);
    assert.ok((await send(player, 'toggleCapitalStatus', { gameId, name: 'Germany', isCaptured: true })).error);
});

test('purchases are priced and capacity-checked by the server', async () => {
    const { banker, gameId } = await createRoom('1942');
    // 1942: USSR starts with 24 IPC and 14 production capacity.
    assert.equal((await send(banker, 'adjustPurchase', { gameId, name: 'USSR', unit: 'Tank', delta: 2 })).success, true);
    assert.equal(nation(banker, 'USSR').bank, 12);
    assert.ok((await send(banker, 'adjustPurchase', { gameId, name: 'USSR', unit: 'Battleship', delta: 1 })).error, 'not enough IPC');
    assert.ok((await send(banker, 'adjustPurchase', { gameId, name: 'USSR', unit: 'Death Star', delta: 1 })).error);
    assert.equal((await send(banker, 'adjustPurchase', { gameId, name: 'USSR', unit: 'Tank', delta: -1 })).success, true);
    assert.equal(nation(banker, 'USSR').bank, 18);
    assert.deepEqual(nation(banker, 'USSR').purchases, { Tank: 1 });
});

test('a new Industrial Complex adds no capacity this turn and is removed with the cart entry', async () => {
    const { banker, gameId } = await createRoom('1942');
    const before = nation(banker, 'USSR').factories.length;
    const res = await send(banker, 'adjustPurchase', { gameId, name: 'USSR', unit: 'Industrial Complex', delta: 1, territoryName: 'Kazakh', capacity: 2 });
    assert.equal(res.success, true);
    const factories = nation(banker, 'USSR').factories;
    assert.equal(factories.length, before + 1);
    assert.equal(factories[factories.length - 1].builtThisTurn, true);
    await send(banker, 'adjustPurchase', { gameId, name: 'USSR', unit: 'Industrial Complex', delta: -1 });
    assert.equal(nation(banker, 'USSR').factories.length, before);
    assert.equal(nation(banker, 'USSR').bank, 24);
});

test('collect income: once per turn, only for the current nation, cart must be confirmed', async () => {
    const { banker, gameId } = await createRoom();
    const player = await joinAsPlayer(gameId);
    assert.ok((await send(player, 'collectIncome', { gameId, name: 'USA' })).error, 'out of turn');

    await send(banker, 'adjustPurchase', { gameId, name: 'Germany', unit: 'Infantry', delta: 1 });
    assert.ok((await send(banker, 'collectIncome', { gameId, name: 'Germany' })).error, 'unconfirmed cart');
    assert.equal((await send(banker, 'lockPurchases', { gameId, name: 'Germany' })).success, true);

    const results = await Promise.all([
        send(banker, 'collectIncome', { gameId, name: 'Germany' }),
        send(player, 'collectIncome', { gameId, name: 'Germany' }),
    ]);
    assert.equal(results.filter(r => r.success).length, 1);
    await waitForState(banker);
    assert.equal(nation(banker, 'Germany').bank, 31 - 3 + 31);
    assert.equal(banker.state.currentTurn, 'USSR');
});

test('undo reverts exactly what was collected and restores the cart', async () => {
    const { banker, gameId } = await createRoom();
    assert.ok((await send(banker, 'undoTurn', { gameId })).error, 'nothing to undo at game start');

    await send(banker, 'collectIncome', { gameId, name: 'Germany' });
    assert.equal(nation(banker, 'Germany').bank, 62);
    assert.equal((await send(banker, 'undoTurn', { gameId })).success, true);
    assert.equal(nation(banker, 'Germany').bank, 31);
    assert.equal(banker.state.currentTurn, 'Germany');

    await send(banker, 'toggleCapitalStatus', { gameId, name: 'Germany', isCaptured: true });
    await send(banker, 'collectIncome', { gameId, name: 'Germany' });
    await send(banker, 'undoTurn', { gameId });
    assert.equal(nation(banker, 'Germany').bank, 31, 'skipped income reverts nothing');
});

test('repairs are queued, applied on confirm and reverted on unlock', async () => {
    const { banker, gameId } = await createRoom('1942');
    const factory = nation(banker, 'USSR').factories[0];
    await send(banker, 'bombFactory', { gameId, name: 'USSR', factoryId: factory.id, damage: 4 });
    const damaged = () => nation(banker, 'USSR').factories.find(f => f.id === factory.id).damage;
    assert.equal(damaged(), 4);

    assert.equal((await send(banker, 'adjustRepair', { gameId, name: 'USSR', factoryId: factory.id, delta: 3 })).success, true);
    assert.equal(nation(banker, 'USSR').bank, 21);
    assert.ok((await send(banker, 'adjustRepair', { gameId, name: 'USSR', factoryId: factory.id, delta: 5 })).error, 'more than the damage');

    await send(banker, 'lockPurchases', { gameId, name: 'USSR' });
    assert.equal(damaged(), 1);
    await send(banker, 'unlockPurchases', { gameId, name: 'USSR' });
    assert.equal(damaged(), 4);
});

test('research: rolled tokens cannot be refunded, invalid charts rejected', async () => {
    const { banker, gameId } = await createRoom();
    await send(banker, 'buyTechToken', { gameId, name: 'Germany' });
    assert.equal(nation(banker, 'Germany').bank, 26);
    assert.ok((await send(banker, 'rollForTech', { gameId, name: 'Germany', chartId: 3 })).error);
    await send(banker, 'rollForTech', { gameId, name: 'Germany', chartId: 1 });
    if (nation(banker, 'Germany').research_tokens > 0) {
        assert.ok((await send(banker, 'refundTechToken', { gameId, name: 'Germany' })).error);
    }
});

test('China reinforcements only during the USA turn', async () => {
    const { banker, gameId } = await createRoom();
    assert.ok((await send(banker, 'mobilizeChinaInfantry', { gameId, placements: { Sinkiang: 1 } })).error);
});

test('liberated territory stays with the liberator while the owner capital is captured', async () => {
    const { banker, gameId } = await createRoom();
    await send(banker, 'toggleCapitalStatus', { gameId, name: 'USSR', isCaptured: true });
    await send(banker, 'conquerTerritory', { gameId, conqueror: 'UK', victim: 'Germany', value: 2, targetType: 'income', liberatedFor: 'USSR' });
    assert.equal(nation(banker, 'UK').income, 45);
    assert.equal(nation(banker, 'USSR').income, 30);
});

test('reset keeps the room password', async () => {
    const { banker, gameId } = await createRoom();
    assert.equal((await send(banker, 'resetGame', { gameId, masterPassword: 'mp' })).success, true);
    const other = await connect();
    assert.ok((await send(other, 'joinGame', { gameId, password: '' })).error);
});

test('logs are returned in insertion order', async () => {
    const { banker, gameId } = await createRoom();
    for (let i = 0; i < 3; i++) await send(banker, 'buyTechToken', { gameId, name: 'Germany' });
    const messages = banker.state.logs.map(l => l.message).filter(m => m.includes('Research Token'));
    assert.deepEqual(messages.map(m => m.match(/Total Tokens: (\d+)/)[1]), ['1', '2', '3']);
});
