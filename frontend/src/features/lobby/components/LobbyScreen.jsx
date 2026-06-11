import { useEffect, useState } from 'react';
import { Shield, Clock, Lock, Unlock, Trash2, X, PlusCircle, RefreshCw } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { cn } from '../../../utils/styles';

export default function LobbyScreen() {
  const { setGameId, availableRooms, fetchRooms, connected, deleteRoom } = useGameStore();
  const [directJoinId, setDirectJoinId] = useState('');
  
  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalRoomName, setModalRoomName] = useState('');
  const [modalMasterPwd, setModalMasterPwd] = useState('');
  const [modalUserPwd, setModalUserPwd] = useState('');
  const [modalEdition, setModalEdition] = useState('1942');
  const [modalScenario, setModalScenario] = useState('1941'); // '1941' or '1942' for anniversary

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (modalRoomName.trim() && modalMasterPwd.trim()) {
      try {
        const generatedId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const gameVersion = modalEdition === 'anniversary' ? `anniversary_${modalScenario}` : '1942';
        await setGameId({ 
          gameId: generatedId, 
          roomName: modalRoomName.trim(), 
          password: modalUserPwd, 
          masterPassword: modalMasterPwd, 
          isCreating: true,
          gameVersion: gameVersion
        });
        setIsCreateModalOpen(false);
        // Reset states
        setModalRoomName('');
        setModalMasterPwd('');
        setModalUserPwd('');
        setModalEdition('1942');
        setModalScenario('1941');
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
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl bg-vintage-paper border-4 border-vintage-text shadow-[12px_12px_0_0_rgba(43,42,38,1)] p-6 md:p-10 flex flex-col gap-8 animate-in fade-in duration-300">
        
        {/* Main Header */}
        <div className="text-center md:text-left border-b-4 border-vintage-text pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-col md:flex-row text-center md:text-left">
            <Shield className="w-16 h-16 text-vintage-text" />
            <div>
              <h1 className="text-4xl md:text-5xl font-display uppercase tracking-wider text-vintage-text">
                Axis & Allies
              </h1>
              <h2 className="text-xl font-display tracking-widest text-vintage-text/80 mt-1">
                Command Center & Tactical HQ
              </h2>
            </div>
          </div>
          <div className="flex justify-center md:justify-end items-center gap-2 text-sm bg-black/5 border border-vintage-text/30 px-4 py-2 font-mono">
            <span className={cn("w-3 h-3 rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]", connected ? "bg-green-500" : "bg-red-500")} />
            <span className="font-bold">{connected ? "HQ SECURE LINK ESTABLISHED" : "LINK OFFLINE: RETRYING..."}</span>
          </div>
        </div>

        {/* Two Column Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          
          {/* Left Panel: HQ Actions */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-black/5 border border-vintage-text/40 p-5 space-y-6 shadow-sm">
              <h3 className="font-bold uppercase tracking-wide border-b-2 border-vintage-text/30 pb-2 text-sm">
                Command Operations
              </h3>

              <div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="vintage-btn w-full flex items-center justify-center gap-2 text-md py-3 shadow-[6px_6px_0_0_rgba(43,42,38,1)] hover:bg-vintage-bg/50"
                >
                    <PlusCircle size={18} /> INITIATE NEW OPERATION
                </button>
                <p className="text-[10px] mt-2 opacity-65 italic text-center">Setup a new battle theater with custom settings.</p>
              </div>

              <div className="pt-4 border-t border-vintage-text/20">
                <h4 className="font-bold uppercase text-xs mb-2 tracking-wider">Direct Access Code</h4>
                <form onSubmit={handleDirectJoin} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter 6-char code" 
                    value={directJoinId}
                    onChange={e => setDirectJoinId(e.target.value.toUpperCase())}
                    className="flex-1 bg-vintage-bg border-2 border-vintage-text p-2 text-sm outline-none focus:bg-white/50 uppercase placeholder:normal-case font-mono font-bold"
                    required
                  />
                  <button type="submit" className="vintage-btn text-xs uppercase tracking-wider py-2">
                    Connect
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Panel: Operations Briefing Room */}
          <div className="md:col-span-3 space-y-4">
            <div className="flex justify-between items-center border-b-2 border-vintage-text/30 pb-2">
              <h3 className="font-bold uppercase tracking-wide flex items-center gap-2 text-sm">
                <Clock size={16} /> Active Theaters / Operations Room
              </h3>
              <button 
                onClick={fetchRooms} 
                className="text-xs uppercase font-bold text-vintage-accent hover:underline flex items-center gap-1 transition-all"
                title="Reload Operations List"
              >
                <RefreshCw size={12} className="animate-spin-hover" /> Refresh List
              </button>
            </div>

            <div className="bg-black/5 border border-vintage-text/30 min-h-[350px] max-h-[500px] overflow-y-auto p-4 space-y-4 shadow-inner">
              {availableRooms.length === 0 ? (
                <div className="text-center italic opacity-60 py-16 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 border-2 border-dashed border-vintage-text/40 rounded-full flex items-center justify-center text-xl font-bold">?</div>
                  <span>No active operations registered.</span>
                  <span className="text-xs">Initiate a new operation on the left panel.</span>
                </div>
              ) : (
                availableRooms.map(room => (
                  <div 
                    key={room.id} 
                    className="bg-vintage-bg border-2 border-vintage-text/50 p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-vintage-accent transition-colors relative"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg uppercase tracking-tight text-vintage-text">
                          {room.room_name || `Operation ${room.id}`}
                        </span>
                        {room.hasPassword ? (
                          <span className="text-vintage-accent" title="Security Clearance Required">
                            <Lock size={14} />
                          </span>
                        ) : (
                          <span className="text-green-800 opacity-60" title="Open Operation">
                            <Unlock size={14} />
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 items-center text-xs text-vintage-text/60 font-mono flex-wrap">
                        <span>CODE: <span className="font-bold bg-black/10 px-1 py-0.5 rounded text-vintage-text">{room.id}</span></span>
                        <span>•</span>
                        <span className="font-bold text-vintage-accent uppercase tracking-tighter">
                          {room.game_version === 'anniversary_1941' ? 'Anniversary (1941)' : 
                           room.game_version === 'anniversary_1942' ? 'Anniversary (1942)' : 
                           '1942 Second Ed.'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button 
                        onClick={() => handleJoin(room)}
                        className="px-4 py-2 bg-vintage-accent hover:bg-red-950 text-white font-bold text-xs uppercase tracking-wider active:scale-[0.98] transition-all flex items-center gap-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] border border-black"
                      >
                        Join Battle &rarr;
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, room)}
                        className="p-2 border border-vintage-text/40 hover:bg-red-800 hover:text-white hover:border-black active:scale-[0.98] transition-all text-vintage-text/70 bg-vintage-bg"
                        title="Decommission Operation"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
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

                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Game Edition</label>
                        <select 
                            value={modalEdition}
                            onChange={e => setModalEdition(e.target.value)}
                            className="w-full bg-vintage-bg border-2 border-vintage-text p-3 outline-none focus:bg-white/50 font-bold"
                        >
                            <option value="1942">Axis & Allies 1942 (Second Edition)</option>
                            <option value="anniversary">Axis & Allies Anniversary Edition</option>
                        </select>
                    </div>

                    {modalEdition === 'anniversary' && (
                        <div className="animate-in slide-in-from-top-2 duration-200">
                            <label className="block text-xs font-bold uppercase mb-1">Scenario Selection</label>
                            <select 
                                value={modalScenario}
                                onChange={e => setModalScenario(e.target.value)}
                                className="w-full bg-vintage-bg border-2 border-vintage-text p-3 outline-none focus:bg-white/50 font-bold"
                            >
                                <option value="1941">1941 Setup (Early War)</option>
                                <option value="1942">1942 Setup (Axis Peak)</option>
                            </select>
                        </div>
                    )}

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
