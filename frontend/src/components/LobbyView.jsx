import React, { useState } from 'react';
import {
  Users,
  Crown,
  Play,
  Settings2,
  Coins,
  Shield,
  Copy,
  Check,
  Smartphone,
  Share2,
  X,
  LogOut,
} from 'lucide-react';
import { ChipBadge } from './ChipStack';

export function LobbyView({
  room,
  playerId,
  isHost,
  onStartGame,
  onUpdateConfig,
  onKickPlayer,
  onLeaveRoom,
}) {
  const [copied, setCopied] = useState(false);

  const startingStack = room?.config?.starting_stack || 1000;
  const smallBlind = room?.config?.small_blind || 10;
  const bigBlind = room?.config?.big_blind || 20;
  const maxPlayers = room?.config?.max_players || 8;

  const handleConfigChange = (key, value) => {
    if (!isHost) return;
    const newConfig = {
      starting_stack: startingStack,
      small_blind: smallBlind,
      big_blind: bigBlind,
      max_players: maxPlayers,
      [key]: Number(value),
    };
    onUpdateConfig(newConfig);
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}?code=${room.join_code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const players = room?.players || [];
  const canStart = players.length >= 2;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Hero Join Code Card */}
      <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden border border-white/10 shadow-2xl">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Game Room Ready
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
          Invite Players with Join Code
        </h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
          Players can open this app on their mobile browsers and enter this 4-character code to join the table.
        </p>

        {/* Huge 4-digit code */}
        <div className="inline-flex items-center justify-center gap-3 bg-slate-950/80 border-2 border-emerald-500/40 rounded-2xl px-6 py-4 shadow-inner mb-6">
          <span className="font-mono text-4xl sm:text-6xl font-black text-amber-400 tracking-[0.25em] pl-2 drop-shadow-md">
            {room?.join_code}
          </span>
          <button
            onClick={copyShareLink}
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition shadow-md"
            title="Copy join link"
          >
            {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={copyShareLink}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-400" />
            {copied ? 'Link Copied to Clipboard!' : 'Copy Mobile Invite Link'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Joined Players Column */}
        <div className="md:col-span-7 glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-white text-base">Joined Players</h2>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/5">
              {players.length} / {maxPlayers} Seated
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {players.map((p, idx) => {
              const isCurrent = p.id === playerId;
              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                    isCurrent
                      ? 'bg-emerald-950/30 border-emerald-500/40 shadow-glow-green/20'
                      : 'bg-slate-900/60 border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center font-black text-slate-200 text-sm shadow">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-sm text-slate-100">
                        <span>{p.name}</span>
                        {p.is_host && (
                          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" title="Host" />
                        )}
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        Seat #{idx + 1}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChipBadge amount={p.chips || startingStack} size="sm" />
                    {isHost && !p.is_host && onKickPlayer && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Remove ${p.name} from the lobby?`)) {
                            onKickPlayer(p.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 transition"
                        title="Remove Player"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {players.length < 2 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs text-center">
              Waiting for at least 1 more player to join before starting...
            </div>
          )}
        </div>

        {/* Game Settings & Host Controls */}
        <div className="md:col-span-5 glass-panel rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Settings2 className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-white text-base">Game Configuration</h2>
          </div>

          {/* Starting Stack */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Starting Chip Stack</span>
              <span className="font-mono font-bold text-emerald-400">${startingStack}</span>
            </div>
            {isHost ? (
              <div className="grid grid-cols-4 gap-1.5">
                {[500, 1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleConfigChange('starting_stack', amt)}
                    className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition ${
                      startingStack === amt
                        ? 'bg-emerald-600 border-emerald-400 text-white shadow'
                        : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="font-mono text-sm font-bold text-slate-200">${startingStack}</div>
            )}
          </div>

          {/* Blinds Structure */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Small / Big Blind</span>
              <span className="font-mono font-bold text-amber-400">
                ${smallBlind} / ${bigBlind}
              </span>
            </div>
            {isHost ? (
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { sb: 5, bb: 10 },
                  { sb: 10, bb: 20 },
                  { sb: 25, bb: 50 },
                  { sb: 50, bb: 100 },
                  { sb: 100, bb: 200 },
                  { sb: 250, bb: 500 },
                ].map(({ sb, bb }) => (
                  <button
                    key={bb}
                    onClick={() => {
                      onUpdateConfig({
                        starting_stack: startingStack,
                        small_blind: sb,
                        big_blind: bb,
                        max_players: maxPlayers,
                      });
                    }}
                    className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition ${
                      smallBlind === sb && bigBlind === bb
                        ? 'bg-amber-600 border-amber-400 text-white shadow'
                        : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    ${sb}/${bb}
                  </button>
                ))}
              </div>
            ) : (
              <div className="font-mono text-sm font-bold text-slate-200">
                ${smallBlind} / ${bigBlind}
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-3 border-t border-white/10">
            {isHost ? (
              <button
                onClick={onStartGame}
                disabled={!canStart}
                className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-xl ${
                  canStart
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-emerald-500/25 active:scale-[0.98]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                {canStart ? 'Deal Blinds & Start Game' : 'Waiting for Players...'}
              </button>
            ) : (
              <div className="text-center py-3 px-4 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-2" />
                <span className="text-xs text-slate-300 font-medium">
                  Waiting for host to start the game...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
