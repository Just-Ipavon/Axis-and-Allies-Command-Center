import { create } from 'zustand';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.DEV ? 'http://localhost:1942' : '';
const socketUrl = import.meta.env.DEV ? 'http://localhost:1942' : window.location.origin;
const lobbySocket = io(`${socketUrl}/lobby`, { autoConnect: true });
const gameSocket = io(`${socketUrl}/game`, { autoConnect: false });

const savedGameId = localStorage.getItem('axis_gameId');
const savedRole = localStorage.getItem('axis_role') || '';

export const useGameStore = create((set, get) => ({
    gameId: savedGameId || null, 
    gameData: null,
    nations: [],
    logs: [],
    availableRooms: [],
    role: savedRole,
    connected: false,

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
        // Lobby listeners
        lobbySocket.on('connect', () => {
            console.log('Connected to lobby namespace');
            set({ connected: true });
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
                gameSocket.emit('joinGame', { gameId, password: pwd }, (res) => {
                    if (res && res.error) {
                        localStorage.removeItem('axis_gameId');
                        set({ gameId: null });
                        gameSocket.disconnect();
                        console.error("Auto-rejoin failed:", res.error);
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
                currentTurn: data.currentTurn
            });
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
                localStorage.removeItem('axis_gameId');
                localStorage.removeItem('axis_password');
                localStorage.removeItem('axis_role');
                set({ gameId: null, role: '' });
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
                        set({ role: '' });
                    }
                    localStorage.setItem('axis_gameId', payload.gameId);
                    if (payload.password) localStorage.setItem('axis_password', payload.password);
                    set({ gameId: payload.gameId });
                    resolve(true);
                }
            });
        });
    },

    updateNationBank: (name, income, bank, purchases, playerName, logMessage = null) => {
        const { gameId } = get();
        if(!gameId) return;
        gameSocket.emit('updateNation', { gameId, name, income, bank, purchases, playerName, logMessage });
    },

    conquerTerritory: (conqueror, victim, value, targetType) => {
        const { gameId } = get();
        if(!gameId) return;
        gameSocket.emit('conquerTerritory', { gameId, conqueror, victim, value, targetType });
    },

    advanceTurn: () => {
        const { gameId } = get();
        if(!gameId) return;
        gameSocket.emit('advanceTurn', gameId);
    },

    collectIncome: (name, logMessage) => {
        const { gameId } = get();
        if(!gameId) return;
        gameSocket.emit('collectIncome', { gameId, name, logMessage });
    },

    addFactory: (name, territoryName, capacity) => {
        const { gameId } = get();
        if(!gameId) return;
        gameSocket.emit('addFactory', { gameId, name, territoryName, capacity });
    },
    
    removeFactory: (name, factoryId) => {
        const { gameId } = get();
        if(!gameId) return;
        gameSocket.emit('removeFactory', { gameId, name, factoryId });
    },
    
    updateFactoryDamage: (name, factoryId, damageDelta, isUndo = false, isFree = false) => {
        const { gameId } = get();
        if(!gameId) return;
        gameSocket.emit('updateFactoryDamage', { gameId, name, factoryId, damageDelta, isUndo, isFree });
    },
    
    undoTurn: () => {
        const { gameId } = get();
        if(!gameId) return;
        gameSocket.emit('undoTurn', gameId);
    },

    lockPurchases: (name, logMessage) => {
        const { gameId } = get();
        if(!gameId) return;
        gameSocket.emit('lockPurchases', { gameId, name, logMessage });
    },

    unlockPurchases: (name) => {
        const { gameId } = get();
        if(!gameId) return;
        gameSocket.emit('unlockPurchases', { gameId, name });
    },

    transferFactory: (oldNation, newNation, factoryId) => {
        const { gameId } = get();
        if(!gameId) return;
        gameSocket.emit('transferFactory', { gameId, oldNation, newNation, factoryId });
    },

    verifyMasterPassword: (masterPassword) => {
        return new Promise((resolve, reject) => {
            const { gameId } = get();
            if(!gameId) return reject(new Error('No game connected'));
            gameSocket.emit('verifyMasterPassword', { gameId, masterPassword }, (res) => {
                if (res && res.error) reject(new Error(res.error));
                else resolve(true);
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
