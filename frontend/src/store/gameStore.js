import { create } from 'zustand';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.DEV ? 'http://localhost:1942' : '';
const socketUrl = import.meta.env.DEV ? 'http://localhost:1942' : window.location.origin;
const lobbySocket = io(`${socketUrl}/lobby`, { autoConnect: true });
const gameSocket = io(`${socketUrl}/game`, { autoConnect: false });

const savedGameId = localStorage.getItem('axis_gameId');
const savedRole = localStorage.getItem('axis_role') || '';
let socketsInitialized = false;

// The Game Master password is kept for this tab only, so the server can
// re-authorize the banker role after a reconnect.
const MASTER_KEY = 'axis_master';
const readMaster = () => {
    try { return sessionStorage.getItem(MASTER_KEY) || ''; } catch { return ''; }
};
const writeMaster = (value) => {
    try {
        if (value) sessionStorage.setItem(MASTER_KEY, value);
        else sessionStorage.removeItem(MASTER_KEY);
    } catch { /* storage unavailable */ }
};

// Emits a game action for the current game. Resolves with the server acknowledgement.
const sendAction = (get, event, payload) => new Promise((resolve) => {
    const { gameId } = get();
    if (!gameId) return resolve({ error: 'No game connected' });
    gameSocket.emit(event, { gameId, ...payload }, (res) => resolve(res || {}));
});

export const useGameStore = create((set, get) => ({
    gameId: savedGameId || null, 
    gameData: null,
    nations: [],
    logs: [],
    availableRooms: [],
    role: savedRole,
    connected: false,
    lobbyConnected: false,
    serverTimeOffset: 0,

    setRole: (role) => {
        if (role) {
            localStorage.setItem('axis_role', role);
        } else {
            localStorage.removeItem('axis_role');
        }
        set({ role });
    },
    
    fetchRooms: async () => {
        try {
            const res = await fetch(`${API_BASE}/api/games`);
            const data = await res.json();
            set({ availableRooms: data });
        } catch (err) {
            console.error('Failed to fetch rooms', err);
        }
    },

    deleteRoom: async (roomId, password = '') => {
        try {
            const res = await fetch(`${API_BASE}/api/games/${roomId}`, { 
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            get().fetchRooms(); // refresh the list
            return true;
        } catch (err) {
            console.error('Failed to delete room', err);
            throw err;
        }
    },
    
    initSocket: () => {
        // React StrictMode runs effects twice in development: register listeners only once.
        if (socketsInitialized) return;
        socketsInitialized = true;

        // Lobby listeners
        lobbySocket.on('connect', () => {
            set({ lobbyConnected: true });
        });

        lobbySocket.on('disconnect', () => {
            set({ lobbyConnected: false });
        });

        lobbySocket.on('roomsUpdated', () => {
            get().fetchRooms();
        });

        // Game listeners
        gameSocket.on('connect', () => {
            console.log('Connected to game namespace');
            set({ connected: true });
            
            const { gameId } = get();
            if (gameId) {
                const pwd = localStorage.getItem('axis_password') || '';
                gameSocket.emit('joinGame', { gameId, password: pwd, masterPassword: readMaster() }, (res) => {
                    if (res && res.error) {
                        localStorage.removeItem('axis_gameId');
                        set({ gameId: null, gameData: null, nations: [], logs: [] });
                        gameSocket.disconnect();
                        console.error("Auto-rejoin failed:", res.error);
                        return;
                    }
                    // The banker role is only kept if the server re-authorized it.
                    if (get().role === 'banker' && !(res && res.isBanker)) {
                        writeMaster('');
                        get().setRole('');
                    }
                });
            }
        });
        
        gameSocket.on('disconnect', () => {
            set({ connected: false });
        });

        gameSocket.on('gameState', (data) => {
            set({ 
                gameData: data.game, 
                nations: data.nations, 
                logs: data.logs,
                currentTurn: data.currentTurn,
                serverTimeOffset: data.serverTime ? data.serverTime - Date.now() : 0
            });
        });

        gameSocket.on('actionError', ({ message }) => {
            alert(`Action rejected: ${message}`);
        });

        // Connect lobby by default
        lobbySocket.connect();
        
        // If we have a saved gameId, connect to game socket too
        if (savedGameId) {
            gameSocket.connect();
        }
    },

    setGameId: (joinData) => {
        return new Promise((resolve, reject) => {
            if (!joinData) {
                const { gameId } = get();
                if (gameId) gameSocket.emit('leaveGame', gameId);
                localStorage.removeItem('axis_gameId');
                localStorage.removeItem('axis_password');
                localStorage.removeItem('axis_role');
                writeMaster('');
                set({ gameId: null, role: '', gameData: null, nations: [], logs: [], currentTurn: null });
                return resolve(true);
            }
            const payload = typeof joinData === 'string' ? { gameId: joinData } : joinData;
            
            // Ensure we are connected to game namespace before joining
            if (!gameSocket.connected) {
                gameSocket.connect();
            }

            gameSocket.emit('joinGame', payload, (res) => {
                if (res && res.error) {
                    reject(new Error(res.error));
                } else {
                    const prevGameId = localStorage.getItem('axis_gameId');
                    if (prevGameId && prevGameId !== payload.gameId) {
                        localStorage.removeItem('axis_role');
                        writeMaster('');
                        set({ role: '' });
                    }
                    if (payload.isCreating && res.isBanker) writeMaster(payload.masterPassword);
                    localStorage.setItem('axis_gameId', payload.gameId);
                    if (payload.password) localStorage.setItem('axis_password', payload.password);
                    set({ gameId: payload.gameId });
                    resolve(true);
                }
            });
        });
    },

    // Nation actions send intents; the server validates them, computes the result
    // and broadcasts the new state. Rejections arrive as 'actionError'.
    setPlayerName: (name, playerName) => sendAction(get, 'setPlayerName', { name, playerName }),
    adjustPurchase: (name, unit, delta, factory = {}) => sendAction(get, 'adjustPurchase', { name, unit, delta, ...factory }),
    adjustRepair: (name, factoryId, delta) => sendAction(get, 'adjustRepair', { name, factoryId, delta }),
    adminSetEconomy: (name, income, bank) => sendAction(get, 'adminSetEconomy', { name, income, bank }),
    conquerTerritory: (conqueror, victim, value, targetType, liberatedFor = null) =>
        sendAction(get, 'conquerTerritory', { conqueror, victim, value, targetType, liberatedFor }),
    collectIncome: (name) => sendAction(get, 'collectIncome', { name }),
    advanceTurn: () => sendAction(get, 'advanceTurn', {}),
    undoTurn: () => sendAction(get, 'undoTurn', {}),
    lockPurchases: (name) => sendAction(get, 'lockPurchases', { name }),
    unlockPurchases: (name) => sendAction(get, 'unlockPurchases', { name }),
    addFactory: (name, territoryName, capacity) => sendAction(get, 'addFactory', { name, territoryName, capacity }),
    removeFactory: (name, factoryId) => sendAction(get, 'removeFactory', { name, factoryId }),
    transferFactory: (oldNation, newNation, factoryId) => sendAction(get, 'transferFactory', { oldNation, newNation, factoryId }),
    bombFactory: (name, factoryId, damage) => sendAction(get, 'bombFactory', { name, factoryId, damage }),
    setFactoryDamage: (name, factoryId, damage) => sendAction(get, 'setFactoryDamage', { name, factoryId, damage }),
    toggleCapitalStatus: (name, isCaptured) => sendAction(get, 'toggleCapitalStatus', { name, isCaptured }),
    buyTechToken: (name) => sendAction(get, 'buyTechToken', { name }),
    refundTechToken: (name) => sendAction(get, 'refundTechToken', { name }),
    rollForTech: (name, chartId) => sendAction(get, 'rollForTech', { name, chartId }),
    toggleNationalObjective: (name, objectiveId, isActive) => sendAction(get, 'toggleNationalObjective', { name, objectiveId, isActive }),
    toggleTechnology: (name, techName, isActive) => sendAction(get, 'toggleTechnology', { name, techName, isActive }),
    updateChinaTerritories: (territories) => sendAction(get, 'updateChinaTerritories', { territories }),
    mobilizeChinaInfantry: (placements) => sendAction(get, 'mobilizeChinaInfantry', { placements }),

    verifyMasterPassword: (masterPassword) => {
        return new Promise((resolve, reject) => {
            const { gameId } = get();
            if(!gameId) return reject(new Error('No game connected'));
            gameSocket.emit('verifyMasterPassword', { gameId, masterPassword }, (res) => {
                if (res && res.error) return reject(new Error(res.error));
                writeMaster(masterPassword);
                resolve(true);
            });
        });
    },

    resetGame: (masterPassword) => {
        return new Promise((resolve, reject) => {
            const { gameId } = get();
            if(!gameId) return reject();
            gameSocket.emit('resetGame', { gameId, masterPassword }, (res) => {
                if (res && res.error) reject(new Error(res.error));
                else resolve(true);
            });
        });
    }
}));
