import { create } from 'zustand';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.DEV ? 'http://localhost:1942' : '';
const socket = io(import.meta.env.DEV ? 'http://localhost:1942' : '/');

export const useGameStore = create((set, get) => ({
    gameId: null, // Start with NO default room, force lobby
    gameData: null,
    nations: [],
    logs: [],
    availableRooms: [],
    role: 'banker',
    connected: false,

    setRole: (role) => set({ role }),
    
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
            if (get().gameId) {
                socket.emit('joinGame', get().gameId);
            }
        });

        socket.on('disconnect', () => {
            set({ connected: false });
        });

        socket.on('gameState', (data) => {
            set({
                gameData: data.game,
                nations: data.nations,
                logs: data.logs
            });
        });
    },

    setGameId: (joinData) => {
        return new Promise((resolve, reject) => {
            if (!joinData) {
                set({ gameId: null });
                return resolve(true);
            }
            const payload = typeof joinData === 'string' ? { gameId: joinData } : joinData;
            socket.emit('joinGame', payload, (res) => {
                if (res && res.error) {
                    reject(new Error(res.error));
                } else {
                    set({ gameId: payload.gameId });
                    resolve(true);
                }
            });
        });
    },

    updateNationBank: (name, income, bank, purchases, playerName, logMessage = null) => {
        socket.emit('updateNation', {
            gameId: get().gameId,
            name,
            income,
            bank,
            purchases,
            playerName,
            logMessage
        });
    },

    resetGame: () => {
        socket.emit('resetGame', get().gameId);
    }
}));
