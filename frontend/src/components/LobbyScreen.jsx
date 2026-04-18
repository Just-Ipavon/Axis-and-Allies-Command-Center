import { useEffect, useState } from 'react';
import { Shield, Clock, Lock, Trash2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { cn } from '../utils/styles';

export default function LobbyScreen() {
  const { setGameId, availableRooms, fetchRooms, connected, deleteRoom } = useGameStore();
  const [newRoomName, setNewRoomName] = useState('');

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if(newRoomName.trim()) {
      const mPwd = prompt('MANDATORY: Enter a Master Password to manage this room (Banker, Delete, Reset):');
      if (!mPwd) return alert('Master Password is required to create a room!');
      const pwd = prompt('Enter an optional Room Password for other players (leave blank for public access):') || '';
      try {
        await setGameId({ gameId: newRoomName.trim(), password: pwd, masterPassword: mPwd, isCreating: true });
      } catch (err) {
        alert(`ERROR: ${err.message}`);
      }
    }
  };

  const handleJoin = async (room) => {
      let pwd = '';
      if (room.hasPassword) {
          pwd = prompt(`Enter password for ${room.id}:`) || '';
      }
      try {
          await setGameId({ gameId: room.id, password: pwd });
      } catch (err) {
          alert(`ERROR: ${err.message}`);
      }
  };

  const handleDelete = async (e, room) => {
      e.stopPropagation();
      const pwd = prompt(`Authorize permanent deletion of ${room.id}. Enter MASTER admin code:`);
      if (pwd === null) return;
      
      try {
          await deleteRoom(room.id, pwd);
      } catch (err) {
          alert(`ACCESS DENIED: ${err.message}`);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-vintage-paper border-4 border-vintage-text shadow-[8px_8px_0_0_rgba(43,42,38,1)] p-8">
        
        <div className="text-center mb-8 border-b-2 border-vintage-text pb-6">
          <Shield className="w-16 h-16 mx-auto mb-4 text-vintage-text" />
          <h1 className="text-4xl font-display uppercase tracking-wider text-vintage-text">
            Axis & Allies
          </h1>
          <h2 className="text-xl font-display tracking-widest text-vintage-text/80 mt-1">
            Command Center
          </h2>
          <div className="mt-2 flex justify-center items-center gap-2 text-sm opacity-70">
            <span className={cn("w-3 h-3 rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]", connected ? "bg-green-500" : "bg-red-500")} />
            {connected ? "Server Online" : "Connecting to HQ..."}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
              <Clock size={16} /> Active Operations
            </h3>
            <div className="bg-black/5 border border-vintage-text/30 h-48 overflow-y-auto p-2 space-y-2 shadow-inner">
              {availableRooms.length === 0 ? (
                <div className="text-center italic opacity-60 mt-8">No active operations found.</div>
              ) : (
                availableRooms.map(room => (
                  <div key={room.id} className="flex gap-1">
                    <button 
                      onClick={() => handleJoin(room)}
                      className="flex-1 text-left px-3 py-2 bg-vintage-bg border border-vintage-text/50 hover:bg-black/10 active:scale-[0.98] transition-all font-bold flex justify-between items-center"
                    >
                      <span className="flex items-center gap-2">
                          {room.id} 
                          {room.hasPassword ? <Lock size={14} className="opacity-70" /> : null}
                      </span>
                      <span className="text-xs opacity-50 uppercase">Join &rarr;</span>
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, room)}
                      className="px-3 py-2 bg-vintage-bg border border-vintage-text/50 hover:bg-red-800 hover:text-white transition-all outline-none"
                      title="Delete Operation"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <button onClick={fetchRooms} className="text-xs uppercase underline mt-2 opacity-70 hover:opacity-100">Refresh List</button>
          </div>

          <div className="pt-4 border-t-2 border-vintage-text/20">
            <h3 className="font-bold uppercase tracking-wide mb-3">Initiate New Operation</h3>
            <form onSubmit={handleCreate} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Operation Code Name" 
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                className="flex-1 bg-vintage-bg border-2 border-vintage-text p-2 outline-none focus:bg-white/50"
                required
              />
              <button type="submit" className="vintage-btn whitespace-nowrap">
                Create
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
