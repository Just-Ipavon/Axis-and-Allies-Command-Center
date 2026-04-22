import { RotateCcw } from 'lucide-react';

export default function GameSidebar({ role, logs, verifyMasterPassword, resetGame }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="border-2 border-vintage-text bg-vintage-paper p-4 shadow-[4px_4px_0_0_rgba(43,42,38,1)] flex flex-col h-[600px]">
        <h3 className="font-display text-xl border-b-2 border-vintage-text mb-2 pb-1">
          Communication Log
        </h3>
        <div className="flex-1 overflow-y-auto pr-2 space-y-2 text-sm opacity-80">
          {logs.map((log) => (
            <div key={log.id} className="border-b border-vintage-border border-dashed pb-1">
              <span className="opacity-50 text-xs">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>
              <br />
              {log.message}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="italic text-center mt-4">Awaiting transmissions...</div>
          )}
        </div>
      </div>

      {role === 'banker' && (
        <button
          onClick={() => {
            const pwd = prompt('Enter Master Password to authorize complete Server Data Wipe:');
            if (!pwd) return;
            verifyMasterPassword(pwd)
              .then(() => {
                if (
                  window.confirm(
                    'CRITICAL WARNING: This will permanently erase this operation\'s database. Proceed?'
                  )
                ) {
                  resetGame(pwd).catch((e) => alert(e.message));
                }
              })
              .catch((err) => alert('AUTHORIZATION DENIED.'));
          }}
          className="vintage-btn text-red-800 bg-red-100 flex justify-center items-center gap-2 mt-4"
        >
          <RotateCcw size={16} /> Reset Game Data
        </button>
      )}
    </div>
  );
}
