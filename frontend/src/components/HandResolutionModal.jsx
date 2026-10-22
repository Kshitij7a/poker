import React, { useState } from 'react';
import { Trophy, Check, Users, Sparkles, X, Flame } from 'lucide-react';
import { triggerConfetti } from '../utils/confetti';
import { playWinSound } from '../utils/audio';

export function HandResolutionModal({
  room,
  onResolveHand,
  onClose,
}) {
  const activePlayers = room
    ? room.players.filter((p) => p.status !== 'folded' && p.status !== 'eliminated')
    : [];

  const sidePots = room?.side_pots?.length > 0 ? room.side_pots : [
    { amount: room?.pot || 0, eligible_player_ids: activePlayers.map((p) => p.id) }
  ];

  // State: winner selected per pot index: { [potIndex]: [winnerId1, ...] }
  const [potSelections, setPotSelections] = useState(() => {
    const initial = {};
    sidePots.forEach((_, idx) => {
      initial[idx] = [];
    });
    return initial;
  });

  const toggleWinnerForPot = (potIndex, playerId) => {
    setPotSelections((prev) => {
      const current = prev[potIndex] || [];
      const exists = current.includes(playerId);
      let updated;
      if (exists) {
        updated = current.filter((id) => id !== playerId);
      } else {
        // Toggle selection (allows multi-select for split pots)
        updated = [...current, playerId];
      }
      return { ...prev, [potIndex]: updated };
    });
  };

  // Quick 1-click shortcut: Single player won all eligible pots
  const selectOverallWinner = (playerId) => {
    setPotSelections((prev) => {
      const updated = { ...prev };
      sidePots.forEach((pot, idx) => {
        if (pot.eligible_player_ids.includes(playerId)) {
          updated[idx] = [playerId];
        } else if (!updated[idx] || updated[idx].length === 0) {
          // If player was not eligible in this side pot, pick first eligible player as default
          if (pot.eligible_player_ids.length > 0) {
            updated[idx] = [pot.eligible_player_ids[0]];
          }
        }
      });
      return updated;
    });
  };

  const handleConfirm = () => {
    // Check if every pot has at least 1 winner selected
    const potWinnersPayload = [];
    const allWinnerIds = [];

    for (let i = 0; i < sidePots.length; i++) {
      const winners = potSelections[i] || [];
      if (winners.length === 0) {
        alert(`Please select a winner for Pot #${i + 1}`);
        return;
      }
      potWinnersPayload.push({
        pot_index: i,
        winner_ids: winners,
      });
      allWinnerIds.push(...winners);
    }

    // Trigger celebration effects!
    playWinSound();
    triggerConfetti();

    onResolveHand({
      winner_ids: Array.from(new Set(allWinnerIds)),
      pot_winners: potWinnersPayload,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="glass-panel-elevated rounded-3xl max-w-lg w-full p-6 border border-amber-500/40 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-glow-gold">
            <Trophy className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Hand #{room?.hand_number} Resolution
          </h2>
          <p className="text-xs text-slate-400">
            Select who won the showdown based on the physical cards dealt at the table.
          </p>
        </div>

        {/* Total Pot to distribute */}
        <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 text-center">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
            Total Pot to Distribute
          </span>
          <div className="font-mono text-3xl font-black text-amber-400">
            ${(room?.pot || 0).toLocaleString()}
          </div>
        </div>

        {/* Quick 1-Click Winner Shortcuts */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            1-Click Clean Sweep (Player won whole hand):
          </span>
          <div className="flex flex-wrap gap-2">
            {activePlayers.map((p) => (
              <button
                key={p.id}
                onClick={() => selectOverallWinner(p.id)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-950/40 border border-white/10 hover:border-emerald-500/40 text-xs font-bold text-slate-200 hover:text-emerald-300 transition shadow"
              >
                🏆 {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Pot breakdown & Winner Selection */}
        <div className="space-y-4">
          {sidePots.map((pot, potIdx) => {
            const potLabel = sidePots.length === 1 ? 'Main Pot' : `Pot #${potIdx + 1} (${potIdx === 0 ? 'Main Pot' : 'Side Pot'})`;
            const eligiblePlayers = activePlayers.filter((p) => pot.eligible_player_ids.includes(p.id));
            const selectedWinners = potSelections[potIdx] || [];

            return (
              <div
                key={potIdx}
                className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-bold text-sm text-white">{potLabel}</span>
                  <span className="font-mono font-black text-amber-400 text-base">
                    ${pot.amount.toLocaleString()}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400">
                  Select winner(s) for this pot (choose multiple to split):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {eligiblePlayers.map((p) => {
                    const isSelected = selectedWinners.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleWinnerForPot(potIdx, p.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-glow-green/30'
                            : 'bg-slate-950/60 border-white/5 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <span className="font-bold text-xs truncate mr-2">{p.name}</span>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'border-slate-600 bg-slate-800'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <button
          onClick={handleConfirm}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-glow-gold transition active:scale-[0.98]"
        >
          Confirm & Distribute Chips
        </button>
      </div>
    </div>
  );
}
