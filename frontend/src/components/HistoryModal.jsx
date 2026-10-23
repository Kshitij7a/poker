import React, { useEffect, useState } from 'react';
import { History, X, Trophy, Clock, Coins } from 'lucide-react';
import { getApiBase } from '../utils/api';

export function HistoryModal({ roomId, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/rooms/${roomId}/history`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [roomId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="glass-panel-elevated rounded-3xl max-w-lg w-full p-6 border border-white/10 shadow-2xl relative space-y-5 max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
            <History className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white">Match History Log</h2>
          <p className="text-xs text-slate-400">
            Persistent ledger of hands, pots won, and winner payouts stored in SQLite.
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 italic bg-slate-900/40 rounded-2xl border border-white/5">
            No completed hands recorded yet in this session.
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((item) => {
              const dateStr = item.timestamp
                ? new Date(item.timestamp * 1000).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '';

              return (
                <div
                  key={item.id}
                  className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-emerald-500/30 transition"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        Hand #{item.hand_number}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{dateStr}</span>
                    </div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>{item.winner_names}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">
                      Pot Awarded
                    </span>
                    <span className="font-mono text-base font-black text-emerald-400">
                      ${item.pot_amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
