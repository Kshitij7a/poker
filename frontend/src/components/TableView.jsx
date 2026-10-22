import React from 'react';
import {
  Coins,
  Crown,
  Play,
  RotateCcw,
  Trophy,
  History,
  QrCode,
  Flame,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ChipBadge, DealerButton } from './ChipStack';

export function TableView({
  room,
  isHost,
  onOpenEndHand,
  onNextHand,
  onOpenRebuy,
  onOpenHistory,
  lastEvent,
}) {
  const seated = room
    ? [...room.players].filter((p) => p.seat >= 0).sort((a, b) => a.seat - b.seat)
    : [];

  const currentActor = seated[room?.current_turn_index];

  // Calculate coordinates for N players evenly distributed along an ellipse
  const numPlayers = seated.length;
  const getSeatStyle = (index) => {
    if (numPlayers === 0) return {};
    // Angle in radians (start from bottom center - Math.PI / 2)
    const angle = (2 * Math.PI * index) / numPlayers + Math.PI / 2;
    // Radius percentages inside table container
    const rx = 40; // horizontal radius %
    const ry = 36; // vertical radius %
    const x = 50 + rx * Math.cos(angle);
    const y = 50 + ry * Math.sin(angle);
    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)',
    };
  };

  const streetLabel = {
    pre_flop: 'PRE-FLOP',
    flop: 'FLOP',
    turn: 'TURN',
    river: 'RIVER',
    showdown: 'SHOWDOWN',
  }[room?.betting_round] || 'IN PLAY';

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
      {/* Table Control Bar */}
      <div className="glass-panel rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 border border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Hand #{room?.hand_number || 1}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black">
              {streetLabel}
            </span>
          </div>

          {lastEvent && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-white/5 text-xs text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>{lastEvent}</span>
            </div>
          )}
        </div>

        {/* Host action buttons */}
        <div className="flex items-center gap-2">
          {room?.phase === 'hand_resolution' && (
            <button
              onClick={onOpenEndHand}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
            >
              <Trophy className="w-4 h-4 fill-current" />
              Resolve Hand
            </button>
          )}

          {room?.phase === 'playing' && isHost && (
            <button
              onClick={onOpenEndHand}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition border border-white/10"
              title="End hand early and award pot"
            >
              End Hand
            </button>
          )}

          {room?.phase === 'between_hands' && isHost && (
            <button
              onClick={onNextHand}
              className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
            >
              <Play className="w-4 h-4 fill-current" />
              Next Hand
            </button>
          )}

          <button
            onClick={onOpenRebuy}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-white/10"
          >
            Rebuys
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* FELT POKER TABLE (CASINO OVAL CONTAINER) */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[640px] felt-rail rounded-[60px] sm:rounded-[120px] p-3 sm:p-5 shadow-2xl overflow-hidden select-none">
        {/* Deep Green Casino Felt Inner Table */}
        <div className="relative w-full h-full felt-gradient rounded-[50px] sm:rounded-[100px] border-4 border-emerald-900/60 shadow-table-inner flex items-center justify-center">
          {/* Subtle table watermark / logo */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <span className="font-mono font-black text-6xl sm:text-9xl tracking-[0.3em] text-white">
              POKER
            </span>
          </div>

          {/* ── Table Center Pot & Street Display ──────────────────── */}
          <div className="z-10 text-center glass-panel-elevated rounded-3xl px-6 py-4 border border-emerald-500/30 shadow-2xl max-w-xs sm:max-w-sm">
            <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-300/80 mb-0.5">
              CURRENT POT
            </div>
            <div className="font-mono text-3xl sm:text-5xl font-black text-amber-400 tracking-tight drop-shadow-lg">
              ${(room?.pot || 0).toLocaleString()}
            </div>

            {/* Side pots list if any */}
            {room?.side_pots?.length > 1 && (
              <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap justify-center gap-1.5 text-[10px] font-mono">
                {room.side_pots.map((sp, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-full bg-slate-900/90 text-amber-300 border border-amber-500/30"
                  >
                    Pot #{idx + 1}: ${sp.amount}
                  </span>
                ))}
              </div>
            )}

            {/* Current Bet to call */}
            {room?.current_bet > 0 && (
              <div className="mt-2 text-xs font-mono text-slate-300 flex items-center justify-center gap-1">
                <span>To Call:</span>
                <span className="font-bold text-white">${room.current_bet}</span>
              </div>
            )}

            {/* Active turn notification */}
            {currentActor && room?.phase === 'playing' && (
              <div className="mt-2.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{currentActor.name}'s turn</span>
              </div>
            )}
          </div>

          {/* ── Seated Player Nodes along the Ellipse ───────────────── */}
          {seated.map((p, idx) => {
            const isTurn = p.id === currentActor?.id && room?.phase === 'playing';
            const isFolded = p.status === 'folded';
            const isAllIn = p.status === 'all_in';

            let role = null;
            if (idx === room?.dealer_index) role = 'D';
            else if (idx === room?.small_blind_index) role = 'SB';
            else if (idx === room?.big_blind_index) role = 'BB';

            return (
              <div
                key={p.id}
                style={getSeatStyle(idx)}
                className={`absolute z-20 transition-all duration-300 ${
                  isFolded || p.status === 'eliminated' ? 'opacity-40 scale-90' : 'opacity-100 scale-100'
                }`}
              >
                {/* Seated Player Pill */}
                <div
                  className={`glass-panel-elevated rounded-2xl p-2 sm:p-2.5 min-w-[110px] sm:min-w-[140px] text-center border relative transition-all ${
                    isTurn
                      ? 'border-emerald-400 shadow-glow-green turn-spotlight scale-105'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Dealer / Blind Button attached to player node */}
                  {role && (
                    <div className="absolute -top-2 -left-2 z-30">
                      <DealerButton role={role} />
                    </div>
                  )}

                  {/* Player Avatar & Name */}
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <div className="w-5 h-5 rounded-full bg-slate-800 border border-white/20 text-[10px] font-black text-slate-200 flex items-center justify-center">
                      {p.name.slice(0, 1)}
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-white truncate max-w-[80px] sm:max-w-[100px]">
                      {p.name}
                    </span>
                    {!p.connected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Offline" />
                    )}
                  </div>

                  {/* Player Chip Count */}
                  <div className="font-mono text-xs sm:text-sm font-black text-emerald-400">
                    ${p.chips.toLocaleString()}
                  </div>

                  {/* Status tag if All-in, Folded, or Busted */}
                  {isAllIn && (
                    <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 border border-amber-500/40">
                      ALL-IN
                    </span>
                  )}
                  {isFolded && (
                    <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-950/40 text-rose-400">
                      FOLDED
                    </span>
                  )}
                  {p.status === 'eliminated' && (
                    <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-slate-500 border border-slate-700">
                      BUSTED
                    </span>
                  )}
                </div>

                {/* Bet Chips in front of player towards table center */}
                {p.current_bet > 0 && (
                  <div className="mt-1 text-center animate-chip-drop">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-950/90 border border-amber-400/50 text-amber-300 shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      ${p.current_bet}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Activity Ticker */}
      <div className="glass-panel rounded-2xl p-4 border border-white/5 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold border-b border-white/5 pb-2">
          <span>Table Live Activity Log</span>
          <span className="font-mono text-[10px]">{seated.length} Active Players</span>
        </div>
        <div className="text-xs text-slate-300 font-mono">
          {lastEvent ? (
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">&gt;</span>
              <span>{lastEvent}</span>
            </div>
          ) : (
            <span className="text-slate-500 italic">No actions recorded yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}
