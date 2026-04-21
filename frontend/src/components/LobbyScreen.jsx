import { useEffect, useState } from 'react';
import { Shield, Clock, Lock, Trash2, X, PlusCircle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { cn } from '../utils/styles';

export default function LobbyScreen() {
  const { setGameId, availableRooms, fetchRooms, connected, deleteRoom } = useGameStore();
  const [directJoinId, setDirectJoinId] = useState('');
  
  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalRoomName, setModalRoomName] = useState('');
  const [modalMasterPwd, setModalMasterPwd] = useState('');
  const [modalUserPwd, setModalUserPwd] = useState('');

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (modalRoomName.trim() && modalMasterPwd.trim()) {
      try {
        const generatedId = Math.random().toString(36).substring(2, 8).toUpperCase();
        await setGameId({ 
          gameId: generatedId, 
          roomName: modalRoomName.trim(), 
          password: modalUserPwd, 
          masterPassword: modalMasterPwd, 
          isCreating: true 
        });
        setIsCreateModalOpen(false);
      } catch (err) {
        alert(`ERROR: ${err.message}`);
      }
    }
  };

  const handleDirectJoin = async (e) => {
      e.preventDefault();
      if (!directJoinId.trim()) return;
      const cleanId = directJoinId.trim().toUpperCase();
      try {
          await setGameId({ gameId: cleanId, password: '' });
      } catch (err) {
          if (err.message === 'Invalid Room Password' || err.message === 'Invalid password.') {
              const pwd = prompt(`Operation #${cleanId} protected. Enter Password:`);
              if (pwd === null) return;
              try {
                  await setGameId({ gameId: cleanId, password: pwd });
              } catch (e2) {
                  alert(`Access Denied: ${e2.message}`);
              }
          } else {
              alert(`Error: ${err.message}`);
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
                          {room.room_name || room.id}
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
            <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="vintage-btn w-full flex items-center justify-center gap-2 text-lg py-3"
            >
                <PlusCircle size={20} /> INITIATE NEW OPERATION
            </button>
          </div>

          <div className="pt-4 border-t-2 border-vintage-text/20">
            <h3 className="font-bold uppercase tracking-wide mb-3">Direct Connect</h3>
            <form onSubmit={handleDirectJoin} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Enter 6-char Operation ID" 
                value={directJoinId}
                onChange={e => setDirectJoinId(e.target.value.toUpperCase())}
                className="flex-1 bg-vintage-bg border-2 border-vintage-text p-2 outline-none focus:bg-white/50 uppercase placeholder:normal-case font-bold"
                required
              />
              <button type="submit" className="vintage-btn whitespace-nowrap">
                Join
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* CREATE ROOM MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-vintage-paper border-4 border-vintage-text shadow-[12px_12px_0_0_rgba(43,42,38,1)] p-6 relative">
                <button 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="absolute top-4 right-4 text-vintage-text/60 hover:text-vintage-text transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="mb-6 border-b-2 border-vintage-text pb-2">
                    <h2 className="text-2xl font-display uppercase tracking-widest flex items-center gap-2">
                        <Shield className="w-6 h-6" /> War Cabinet
                    </h2>
                    <p className="text-xs opacity-70 font-bold uppercase tracking-tighter">Command Setup & Authorization</p>
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Operation Name (Required)</label>
                        <input 
                            type="text" 
                            placeholder="e.g. OPERATION BARBAROSSA" 
                            value={modalRoomName}
                            onChange={e => setModalRoomName(e.target.value)}
                            className="w-full bg-vintage-bg border-2 border-vintage-text p-3 outline-none focus:bg-white/50 font-bold"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="bg-amber-900/5 p-3 border border-dashed border-vintage-text/40">
                        <label className="block text-xs font-bold uppercase mb-1">Master Password (Required)</label>
                        <input 
                            type="password" 
                            placeholder="MANDATORY for Banker access" 
                            value={modalMasterPwd}
                            onChange={e => setModalMasterPwd(e.target.value)}
                            className="w-full bg-vintage-bg border-2 border-vintage-text p-3 outline-none focus:bg-white/50"
                            required
                        />
                        <p className="text-[10px] mt-1 opacity-60 italic">* Use this to reset game, delete room, or use Banker tools.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">User Password (Optional)</label>
                        <input 
                            type="password" 
                            placeholder="Leave blank for public access" 
                            value={modalUserPwd}
                            onChange={e => setModalUserPwd(e.target.value)}
                            className="w-full bg-vintage-bg border-2 border-vintage-text p-3 outline-none focus:bg-white/50"
                        />
                        <p className="text-[10px] mt-1 opacity-60 italic text-right font-bold text-vintage-accent">SECRET CLEARANCE LEVEL</p>
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button 
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="flex-1 px-4 py-3 border-2 border-vintage-text font-bold hover:bg-black/10 transition-all uppercase text-sm"
                        >
                            Abort
                        </button>
                        <button 
                            type="submit" 
                            className="flex-[2] vintage-btn py-3 uppercase tracking-widest"
                        >
                            Initiate Operation
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
