import React, { useState } from 'react';
import { RotateCcw, X, Plus, Coins, ShieldAlert } from 'lucide-react';
import { ChipBadge } from './ChipStack';

export function RebuyModal({ room, onRebuy, onClose }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(room?.players?.[0]?.id || '');
  const [amount, setAmount] = useState(room?.config?.starting_stack || 1000);

  const players = room?.players || [];
  const defaultStack = room?.config?.starting_stack || 1000;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPlayerId || amount <= 0) return;
    onRebuy(selectedPlayerId, Number(amount));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="glass-panel-elevated rounded-3xl max-w-md w-full p-6 border border-white/10 shadow-2xl relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
            <Coins className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white">Rebuy & Add Chips</h2>
          <p className="text-xs text-slate-400">
            Home game chip manager: add chips or rebuy busted players back into the action.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Player */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Select Player</label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-amber-500"
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Current: ${p.chips} &bull; {p.status})
                </option>
              ))}
            </select>
          </div>

          {/* Amount presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Amount to Add</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[defaultStack / 2, defaultStack, defaultStack * 2].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className={`py-2 rounded-xl text-xs font-mono font-bold border transition ${
                    amount === amt
                      ? 'bg-amber-600 border-amber-400 text-white shadow'
                      : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  +${amt}
                </button>
              ))}
            </div>

            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={10}
              step={10}
              className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 transition"
          >
            Confirm Rebuy (+${amount})
          </button>
        </form>
      </div>
    </div>
  );
}
