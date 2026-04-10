import { create } from 'zustand';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.DEV ? 'http://localhost:1942' : '';
const socket = io(import.meta.env.DEV ? 'http://localhost:1942' : '/');

const savedGameId = localStorage.getItem('axis_gameId');
const savedRole = localStorage.getItem('axis_role') || 'banker';

export const useGameStore = create((set, get) => ({
    gameId: savedGameId || null, 
    gameData: null,
    nations: [],
    logs: [],
    availableRooms: [],
    role: savedRole,
    connected: false,

    setRole: (role) => {
        localStorage.setItem('axis_role', role);
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
        socket.on('connect', () => {
            set({ connected: true });
            
            // Auto-rejoin if session exists (handles F5 reload or Phone Standby wake-up)
            const { gameId } = get();
            if (gameId) {
                const pwd = localStorage.getItem('axis_password') || '';
                socket.emit('joinGame', { gameId, password: pwd }, (res) => {
                    if (res && res.error) {
                        localStorage.removeItem('axis_gameId');
                        set({ gameId: null });
                        console.error("Auto-rejoin failed:", res.error);
                    }
                });
            }
        });
        
        socket.on('disconnect', () => {
            set({ connected: false });
        });

        socket.on('gameState', (data) => {
            set({ 
                gameData: data.game, 
                nations: data.nations, 
                logs: data.logs,
                currentTurn: data.currentTurn
            });
        });
    },

    setGameId: (joinData) => {
        return new Promise((resolve, reject) => {
            if (!joinData) {
                localStorage.removeItem('axis_gameId');
                localStorage.removeItem('axis_password');
                set({ gameId: null });
                return resolve(true);
            }
            const payload = typeof joinData === 'string' ? { gameId: joinData } : joinData;
            socket.emit('joinGame', payload, (res) => {
                if (res && res.error) {
                    reject(new Error(res.error));
                } else {
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
        socket.emit('updateNation', { gameId, name, income, bank, purchases, playerName, logMessage });
    },

    conquerTerritory: (conqueror, victim, value, targetType) => {
        const { gameId } = get();
        if(!gameId) return;
        socket.emit('conquerTerritory', { gameId, conqueror, victim, value, targetType });
    },

    advanceTurn: () => {
        const { gameId } = get();
        if(!gameId) return;
        socket.emit('advanceTurn', gameId);
    },

    addFactory: (name, territoryName, capacity) => {
        const { gameId } = get();
        if(!gameId) return;
        socket.emit('addFactory', { gameId, name, territoryName, capacity });
    },
    
    removeFactory: (name, factoryId) => {
        const { gameId } = get();
        if(!gameId) return;
        socket.emit('removeFactory', { gameId, name, factoryId });
    },
    
    updateFactoryDamage: (name, factoryId, damageDelta, isUndo = false) => {
        const { gameId } = get();
        if(!gameId) return;
        socket.emit('updateFactoryDamage', { gameId, name, factoryId, damageDelta, isUndo });
    },
    
    transferFactory: (oldNation, newNation, factoryId) => {
        const { gameId } = get();
        if(!gameId) return;
        socket.emit('transferFactory', { gameId, oldNation, newNation, factoryId });
    },

    verifyMasterPassword: (masterPassword) => {
        return new Promise((resolve, reject) => {
            const { gameId } = get();
            if(!gameId) return reject(new Error('No game connected'));
            socket.emit('verifyMasterPassword', { gameId, masterPassword }, (res) => {
                if (res && res.error) reject(new Error(res.error));
                else resolve(true);
            });
        });
    },

    resetGame: (masterPassword) => {
        return new Promise((resolve, reject) => {
            const { gameId } = get();
            if(!gameId) return reject();
            socket.emit('resetGame', { gameId, masterPassword }, (res) => {
                if (res && res.error) reject(new Error(res.error));
                else resolve(true);
            });
        });
    }
}));
