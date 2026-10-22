import React, { useState, useEffect } from 'react';
import {
  Coins,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Flame,
  Shield,
  Eye,
  ChevronDown,
  ChevronUp,
  Sliders,
  Users,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { ChipBadge, DealerButton } from './ChipStack';
import {
  playChipSound,
  playCheckSound,
  playFoldSound,
  playAllInSound,
  vibrate,
} from '../utils/audio';

export function PlayerView({
  room,
  playerId,
  availableActions,
  onAction,
  onOpenEndHand,
  onNextHand,
  isHost,
}) {
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [showRaisePanel, setShowRaisePanel] = useState(false);
  const [showTablePeek, setShowTablePeek] = useState(false);

  // Hole cards pocket pad (optional helper for physical poker game)
  const [pocketCard1, setPocketCard1] = useState('');
  const [pocketCard2, setPocketCard2] = useState('');
  const [showCardPicker, setShowCardPicker] = useState(false);

  const me = room?.players?.find((p) => p.id === playerId);
  const seated = room ? [...room.players].filter((p) => p.seat >= 0).sort((a, b) => a.seat - b.seat) : [];
  const currentActor = seated[room?.current_turn_index];
  const isMyTurn = currentActor?.id === playerId && me?.status === 'active';

  // Action capabilities
  const foldAction = availableActions.find((a) => a.action === 'fold');
  const checkAction = availableActions.find((a) => a.action === 'check');
  const callAction = availableActions.find((a) => a.action === 'call');
  const raiseAction = availableActions.find((a) => a.action === 'raise');
  const allInAction = availableActions.find((a) => a.action === 'all_in');

  const minRaise = raiseAction?.min_amount || (room?.current_bet || 0) + (room?.min_raise || 20);
  const maxRaise = raiseAction?.max_amount || ((me?.chips || 0) + (me?.current_bet || 0));

  // Keep raise amount in bounds when turn changes
  useEffect(() => {
    if (minRaise) {
      setRaiseAmount(minRaise);
    }
  }, [minRaise]);

  // Reset pocket cards scratchpad on new hand
  useEffect(() => {
    setPocketCard1('');
    setPocketCard2('');
  }, [room?.hand_number]);

  // Determine role
  let role = null;
  if (room && seated.length > 0) {
    const mySeatIdx = seated.findIndex((p) => p.id === playerId);
    if (mySeatIdx === room.dealer_index) role = 'D';
    else if (mySeatIdx === room.small_blind_index) role = 'SB';
    else if (mySeatIdx === room.big_blind_index) role = 'BB';
  }

  const handleFold = () => {
    playFoldSound();
    onAction('fold');
  };

  const handleCheck = () => {
    playCheckSound();
    onAction('check');
  };

  const handleCall = () => {
    playChipSound();
    onAction('call');
  };

  const handleRaise = () => {
    playChipSound();
    onAction('raise', raiseAmount);
    setShowRaisePanel(false);
  };

  const handleAllIn = () => {
    playAllInSound();
    onAction('all_in');
  };

  // Quick raise helpers
  const setQuickRaise = (type) => {
    const pot = room?.pot || 0;
    const bb = room?.config?.big_blind || 20;
    const curBet = room?.current_bet || 0;

    let target = minRaise;
    if (type === 'min') target = minRaise;
    else if (type === '2.5x') target = Math.min(maxRaise, Math.max(minRaise, Math.floor(curBet * 2.5)));
    else if (type === '3x') target = Math.min(maxRaise, Math.max(minRaise, curBet * 3));
    else if (type === 'half_pot') target = Math.min(maxRaise, Math.max(minRaise, curBet + Math.floor(pot / 2)));
    else if (type === 'pot') target = Math.min(maxRaise, Math.max(minRaise, curBet + pot));
    else if (type === 'max') target = maxRaise;

    setRaiseAmount(target);
  };

  const streetLabel = {
    pre_flop: 'PRE-FLOP',
    flop: 'FLOP',
    turn: 'TURN',
    river: 'RIVER',
    showdown: 'SHOWDOWN',
  }[room?.betting_round] || 'IN PLAY';

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-28">
      {/* Top Street & Pot Banner */}
      <div className="glass-panel rounded-2xl p-4 flex items-center justify-between border border-white/10 shadow-lg">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Hand #{room?.hand_number || 1} &bull; Street
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black tracking-wider">
              {streetLabel}
            </span>
            {room?.side_pots?.length > 1 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {room.side_pots.length} Pots
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Total Pot
          </span>
          <div className="font-mono text-2xl font-black text-amber-400 drop-shadow">
            ${(room?.pot || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Side Pots breakdown if any */}
      {room?.side_pots?.length > 1 && (
        <div className="glass-panel rounded-xl p-3 text-xs space-y-1.5 border border-amber-500/20 bg-amber-950/20">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5" />
            Active Side Pots
          </div>
          <div className="grid grid-cols-2 gap-2">
            {room.side_pots.map((sp, idx) => {
              const isEligible = sp.eligible_player_ids?.includes(playerId);
              return (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border text-[11px] ${
                    isEligible
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                      : 'bg-slate-900/60 border-white/5 text-slate-400'
                  }`}
                >
                  <div className="font-bold">Pot #{idx + 1}: ${sp.amount}</div>
                  <div className="text-[10px] opacity-80">
                    {isEligible ? '✓ You are eligible' : 'Ineligible'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Personal Stack Card */}
      <div
        className={`glass-panel-elevated rounded-3xl p-5 relative overflow-hidden border transition-all ${
          isMyTurn
            ? 'border-emerald-400/80 shadow-glow-green turn-spotlight'
            : 'border-white/10'
        }`}
      >
        {/* Glow backdrop */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 border border-emerald-400/30 flex items-center justify-center font-black text-white text-lg shadow-lg">
              {me?.name?.slice(0, 2).toUpperCase() || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base text-white">{me?.name || 'Player'}</h2>
                <DealerButton role={role} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    me?.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : me?.status === 'all_in'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {me?.status || 'Active'}
                </span>
                <span className="text-xs text-slate-400 font-mono">Seat #{me?.seat != null ? me.seat + 1 : 1}</span>
              </div>
            </div>
          </div>

          {/* Current Bet in front of player */}
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Current Bet
            </span>
            <div className="font-mono text-base font-bold text-slate-200">
              ${(me?.current_bet || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Huge Chip Stack Display */}
        <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 text-center mb-3">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-400 block mb-1">
            Your Digital Chip Stack
          </span>
          <div className="font-mono text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight drop-shadow-md">
            ${(me?.chips || 0).toLocaleString()}
          </div>
        </div>

        {/* Current Turn Notification Banner */}
        {isMyTurn ? (
          <div className="bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border border-emerald-500/40 rounded-xl p-3 text-center animate-pulse">
            <span className="text-xs font-black tracking-widest uppercase text-emerald-300 flex items-center justify-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              IT IS YOUR TURN TO ACT
            </span>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-2.5 text-center text-xs text-slate-400">
            Waiting for <strong className="text-slate-200">{currentActor?.name || 'next player'}</strong> to act...
          </div>
        )}
      </div>

      {/* Pocket Cards Reminder (Quick Hole Cards Scratchpad) */}
      <div className="glass-panel rounded-2xl p-3 border border-white/5">
        <button
          onClick={() => setShowCardPicker(!showCardPicker)}
          className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            Pocket Cards Scratchpad (Optional)
          </span>
          <span className="font-mono text-emerald-400 font-bold">
            {pocketCard1 && pocketCard2 ? `${pocketCard1} ${pocketCard2}` : 'Set Cards'}
          </span>
        </button>

        {showCardPicker && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
            <p className="text-[11px] text-slate-400">
              Type your 2 physical cards for quick reference without peeking at your physical cards repeatedly:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Card 1 (e.g. A♠ or Ah)"
                value={pocketCard1}
                onChange={(e) => setPocketCard1(e.target.value.toUpperCase())}
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                placeholder="Card 2 (e.g. K♦ or Kd)"
                value={pocketCard2}
                onChange={(e) => setPocketCard2(e.target.value.toUpperCase())}
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table Seating Peek (Collapsible list of everyone's chips) */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
        <button
          onClick={() => setShowTablePeek(!showTablePeek)}
          className="w-full p-3 flex items-center justify-between text-xs text-slate-300 font-bold hover:bg-white/5 transition"
        >
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Table Seating & Stacks ({seated.length} Players)
          </span>
          {showTablePeek ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTablePeek && (
          <div className="p-3 pt-0 space-y-1.5 border-t border-white/5">
            {seated.map((p, idx) => {
              const isCurrentTurn = p.id === currentActor?.id;
              let pRole = null;
              if (idx === room?.dealer_index) pRole = 'D';
              else if (idx === room?.small_blind_index) pRole = 'SB';
              else if (idx === room?.big_blind_index) pRole = 'BB';

              return (
                <div
                  key={p.id}
                  className={`p-2 rounded-xl flex items-center justify-between text-xs ${
                    isCurrentTurn
                      ? 'bg-emerald-950/40 border border-emerald-500/30'
                      : 'bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <DealerButton role={pRole} />
                    <span className={`font-semibold ${p.id === playerId ? 'text-emerald-300' : 'text-slate-200'}`}>
                      {p.name} {p.id === playerId ? '(You)' : ''}
                    </span>
                    <span className="text-[10px] text-slate-500">#{p.seat + 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.current_bet > 0 && (
                      <span className="text-[10px] font-mono text-amber-400">
                        Bet: ${p.current_bet}
                      </span>
                    )}
                    <ChipBadge amount={p.chips} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Showdown / Hand Resolution Banner if in Showdown */}
      {room?.phase === 'hand_resolution' && (
        <div className="glass-panel-elevated rounded-2xl p-4 border border-amber-500/40 text-center space-y-3 bg-amber-950/30 shadow-glow-gold/20">
          <div className="text-amber-400 font-extrabold text-sm flex items-center justify-center gap-1.5">
            <Flame className="w-4 h-4 fill-amber-400" />
            SHOWDOWN REACHED
          </div>
          <p className="text-xs text-slate-300">
            Compare physical cards at the table! Host can resolve and award the pot to the winner(s).
          </p>
          <button
            onClick={onOpenEndHand}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition"
          >
            Award Pot to Winner(s)
          </button>
        </div>
      )}

      {/* Hand Ended Banner */}
      {room?.phase === 'between_hands' && (
        <div className="glass-panel-elevated rounded-2xl p-4 border border-emerald-500/30 text-center space-y-3">
          <div className="text-emerald-400 font-extrabold text-sm flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Hand #{room?.hand_number} Complete
          </div>
          <p className="text-xs text-slate-300">
            Pot has been awarded! Rotate physical dealer button to match table.
          </p>
          {isHost ? (
            <button
              onClick={onNextHand}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition"
            >
              Start Next Hand
            </button>
          ) : (
            <div className="text-xs text-slate-400 italic">
              Waiting for host to start Hand #{room?.hand_number + 1}...
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* FIXED BOTTOM TURN-BASED ACTION DOCK */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-3 sm:p-4 bg-slate-950/90 backdrop-blur-xl border-t border-white/10 shadow-2xl">
        <div className="max-w-md mx-auto space-y-2">
          {/* Expandable Raise Drawer */}
          {showRaisePanel && isMyTurn && (
            <div className="glass-panel-elevated rounded-2xl p-3.5 space-y-3 border border-emerald-500/40 animate-fadeIn mb-2 shadow-2xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  Select Raise Amount
                </span>
                <span className="font-mono text-base font-black text-emerald-400">
                  ${raiseAmount.toLocaleString()}
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={minRaise}
                max={maxRaise}
                step={room?.config?.big_blind || 10}
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />

              {/* Quick Multiplier Pills */}
              <div className="grid grid-cols-5 gap-1.5 text-[11px] font-mono font-bold">
                <button
                  onClick={() => setQuickRaise('min')}
                  className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition"
                >
                  Min
                </button>
                <button
                  onClick={() => setQuickRaise('2.5x')}
                  className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition"
                >
                  2.5x
                </button>
                <button
                  onClick={() => setQuickRaise('half_pot')}
                  className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition"
                >
                  ½ Pot
                </button>
                <button
                  onClick={() => setQuickRaise('pot')}
                  className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition"
                >
                  Pot
                </button>
                <button
                  onClick={() => setQuickRaise('max')}
                  className="py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/30 transition"
                >
                  Max
                </button>
              </div>

              {/* Confirm Raise or Cancel */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setShowRaisePanel(false)}
                  className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRaise}
                  className="py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30"
                >
                  Raise to ${raiseAmount}
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="grid grid-cols-4 gap-2">
            {/* FOLD */}
            <button
              onClick={handleFold}
              disabled={!isMyTurn || !foldAction}
              className={`py-3.5 px-2 rounded-2xl font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition ${
                isMyTurn && foldAction
                  ? 'bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/50 text-rose-400 active:scale-95 shadow-md'
                  : 'bg-slate-900/60 border border-white/5 text-slate-600 cursor-not-allowed'
              }`}
            >
              <XCircle className="w-4 h-4" />
              <span>Fold</span>
            </button>

            {/* CHECK or CALL */}
            {checkAction ? (
              <button
                onClick={handleCheck}
                disabled={!isMyTurn}
                className={`py-3.5 px-2 rounded-2xl font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition ${
                  isMyTurn
                    ? 'bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 active:scale-95 shadow-md'
                    : 'bg-slate-900/60 border border-white/5 text-slate-600 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Check</span>
              </button>
            ) : (
              <button
                onClick={handleCall}
                disabled={!isMyTurn || !callAction}
                className={`py-3.5 px-2 rounded-2xl font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition ${
                  isMyTurn && callAction
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 active:scale-95 shadow-lg shadow-emerald-600/30'
                    : 'bg-slate-900/60 border border-white/5 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>Call {callAction ? `$${callAction.amount}` : ''}</span>
              </button>
            )}

            {/* RAISE */}
            <button
              onClick={() => setShowRaisePanel(!showRaisePanel)}
              disabled={!isMyTurn || !raiseAction}
              className={`py-3.5 px-2 rounded-2xl font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition ${
                isMyTurn && raiseAction
                  ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 border border-amber-400 active:scale-95 shadow-lg shadow-amber-600/30'
                  : 'bg-slate-900/60 border border-white/5 text-slate-600 cursor-not-allowed'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Raise</span>
            </button>

            {/* ALL-IN */}
            <button
              onClick={handleAllIn}
              disabled={!isMyTurn || !allInAction}
              className={`py-3.5 px-2 rounded-2xl font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition ${
                isMyTurn && allInAction
                  ? 'bg-gradient-to-br from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white border border-red-400 active:scale-95 shadow-glow-red'
                  : 'bg-slate-900/60 border border-white/5 text-slate-600 cursor-not-allowed'
              }`}
            >
              <Flame className="w-4 h-4 fill-white" />
              <span>All-In</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
