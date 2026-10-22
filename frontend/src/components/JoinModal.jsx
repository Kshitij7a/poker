import React, { useState, useEffect } from 'react';
import { Spade, PlusCircle, LogIn, Tv, Users, Coins, Sparkles } from 'lucide-react';

export function JoinModal({ onCreateRoom, onJoinRoom, onSpectateRoom }) {
  const [activeTab, setActiveTab] = useState('join'); // 'join' | 'create' | 'spectate'

  // Join form state
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');

  // Host form state
  const [hostName, setHostName] = useState('');
  const [startingStack, setStartingStack] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(10);
  const [bigBlind, setBigBlind] = useState(20);
  const [maxPlayers, setMaxPlayers] = useState(8);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check URL query parameters for ?code=ABCD
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setJoinCode(code.toUpperCase());
      setActiveTab('join');
    }
  }, []);

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!joinCode || !playerName) {
      setError('Please enter both join code and your name');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onJoinRoom(joinCode.trim().toUpperCase(), playerName.trim());
    } catch (err) {
      setError(err.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!hostName) {
      setError('Please enter host name');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onCreateRoom({
        host_name: hostName.trim(),
        config: {
          starting_stack: startingStack,
          small_blind: smallBlind,
          big_blind: bigBlind,
          max_players: maxPlayers,
        },
      });
    } catch (err) {
      setError(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleSpectateSubmit = async (e) => {
    e.preventDefault();
    if (!joinCode) {
      setError('Please enter room code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSpectateRoom(joinCode.trim().toUpperCase());
    } catch (err) {
      setError(err.message || 'Failed to load table');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="glass-panel-elevated rounded-3xl max-w-md w-full p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop decoration */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 border border-emerald-400/40 flex items-center justify-center mx-auto text-white shadow-glow-green">
            <Spade className="w-8 h-8 fill-current" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            POKERSTACK
          </h1>
          <p className="text-xs text-slate-400">
            Real-Time Digital Chips & Pot Engine for Physical Poker Games
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 bg-slate-900/90 border border-white/10 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('join'); setError(''); }}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'join'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Join
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('create'); setError(''); }}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'create'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Host
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('spectate'); setError(''); }}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'spectate'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            TV Table
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* ── TAB 1: JOIN GAME ───────────────────────────────────── */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                4-Character Room Code
              </label>
              <input
                type="text"
                placeholder="e.g. 7K9A"
                maxLength={4}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-4 py-3 text-center font-mono text-2xl font-black text-amber-400 tracking-[0.25em] focus:outline-none focus:border-emerald-500 uppercase placeholder:text-slate-600"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Your Player Name
              </label>
              <input
                type="text"
                placeholder="e.g. Alice or Maverick"
                maxLength={18}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white font-semibold focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-glow-green transition active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Entering Table...' : 'Join Poker Table'}
            </button>
          </form>
        )}

        {/* ── TAB 2: HOST NEW GAME ───────────────────────────────── */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Host Player Name
              </label>
              <input
                type="text"
                placeholder="e.g. Daniel"
                maxLength={18}
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white font-semibold focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex justify-between">
                <span>Starting Chip Stack</span>
                <span className="font-mono text-emerald-400 font-bold">${startingStack}</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[500, 1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setStartingStack(amt)}
                    className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition ${
                      startingStack === amt
                        ? 'bg-emerald-600 border-emerald-400 text-white shadow'
                        : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex justify-between">
                <span>Blinds (Small / Big)</span>
                <span className="font-mono text-amber-400 font-bold">${smallBlind}/${bigBlind}</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { sb: 5, bb: 10 },
                  { sb: 10, bb: 20 },
                  { sb: 25, bb: 50 },
                ].map(({ sb, bb }) => (
                  <button
                    key={bb}
                    type="button"
                    onClick={() => { setSmallBlind(sb); setBigBlind(bb); }}
                    className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition ${
                      smallBlind === sb && bigBlind === bb
                        ? 'bg-amber-600 border-amber-400 text-white shadow'
                        : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    ${sb}/${bb}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-glow-green transition active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Creating Room...' : 'Create Room & Get Join Code'}
            </button>
          </form>
        )}

        {/* ── TAB 3: SPECTATE / TABLE TV ─────────────────────────── */}
        {activeTab === 'spectate' && (
          <form onSubmit={handleSpectateSubmit} className="space-y-4">
            <p className="text-xs text-slate-400">
              Open the full tabletop dashboard on a tablet, TV, or laptop placed at the poker table without joining as a player.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                4-Character Room Code
              </label>
              <input
                type="text"
                placeholder="e.g. 7K9A"
                maxLength={4}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-4 py-3 text-center font-mono text-2xl font-black text-amber-400 tracking-[0.25em] focus:outline-none focus:border-emerald-500 uppercase placeholder:text-slate-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-white/10 font-bold text-xs uppercase tracking-wider transition"
            >
              {loading ? 'Connecting...' : 'Launch Table TV Display'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
