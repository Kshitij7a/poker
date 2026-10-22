import React, { useState } from 'react';
import {
  Spade,
  Copy,
  Check,
  Tv,
  Smartphone,
  Volume2,
  VolumeX,
  History,
  RotateCcw,
  Sparkles,
  QrCode,
  Users,
  LogOut,
} from 'lucide-react';

export function Header({
  room,
  currentView,
  onViewChange,
  isHost,
  soundEnabled,
  onToggleSound,
  onOpenHistory,
  onOpenRebuy,
  onOpenEndHand,
  onLeaveRoom,
  connected,
}) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const copyCode = () => {
    if (!room?.join_code) return;
    navigator.clipboard.writeText(room.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrUrl = room?.join_code
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        window.location.origin + '?code=' + room.join_code
      )}`
    : null;

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black">
            <Spade className="w-5 h-5 fill-current" />
          </div>
          <div className="hidden xs:block">
            <span className="font-black text-sm tracking-wider bg-gradient-to-r from-emerald-400 via-teal-200 to-amber-300 bg-clip-text text-transparent">
              POKERSTACK
            </span>
            <div className="text-[10px] text-slate-400 -mt-1 font-mono">DIGITAL CHIPS</div>
          </div>
        </div>

        {/* Room Join Code & Status */}
        {room && (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900/80 border border-white/10 rounded-full pl-3 pr-1 py-1 shadow-inner">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono mr-1.5">
                CODE
              </span>
              <span className="font-mono font-black text-amber-400 tracking-widest text-sm sm:text-base mr-2">
                {room.join_code}
              </span>
              <button
                onClick={copyCode}
                title="Copy Join Code"
                className="p-1 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setShowQr(true)}
                title="Show QR Code for phones"
                className="p-1 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition"
              >
                <QrCode className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Connection indicator */}
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                connected ? 'bg-emerald-500 shadow-glow-green' : 'bg-red-500 animate-ping'
              }`}
              title={connected ? 'Connected (Live)' : 'Reconnecting...'}
            />
          </div>
        )}

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* View toggle (Player vs Table) */}
          <div className="flex bg-slate-900/90 border border-white/10 p-0.5 rounded-lg">
            <button
              onClick={() => onViewChange('player')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                currentView === 'player'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Switch to Mobile Player View"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Player</span>
            </button>
            <button
              onClick={() => onViewChange('table')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                currentView === 'table'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Switch to Shared Table View"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="p-2 rounded-lg bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* History */}
          {room && (
            <button
              onClick={onOpenHistory}
              className="p-2 rounded-lg bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Match History & Logs"
            >
              <History className="w-4 h-4 text-amber-400" />
            </button>
          )}

          {/* Host Rebuy Action */}
          {isHost && room && room.phase !== 'lobby' && (
            <button
              onClick={onOpenRebuy}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition flex items-center gap-1"
              title="Add chips or rebuy eliminated players"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Rebuy</span>
            </button>
          )}

          {/* Leave Room Action */}
          {room && onLeaveRoom && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to exit to the main menu?')) {
                  onLeaveRoom();
                }
              }}
              className="p-2 rounded-lg bg-slate-900/80 border border-rose-500/20 text-rose-400 hover:text-white hover:bg-rose-950/40 transition"
              title="Leave Room"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* QR Code Modal */}
      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel-elevated rounded-2xl p-6 max-w-sm w-full text-center relative border border-white/20">
            <h3 className="text-lg font-bold text-white mb-2">Scan to Join Room</h3>
            <p className="text-xs text-slate-400 mb-4">
              Point your phone camera here to open the digital chip stack immediately!
            </p>
            <div className="bg-white p-4 rounded-xl inline-block mx-auto mb-4 shadow-xl">
              <img src={qrUrl} alt="Room QR Code" className="w-48 h-48 mx-auto" />
            </div>
            <div className="font-mono text-2xl font-black text-amber-400 tracking-widest mb-2">
              {room?.join_code}
            </div>
            {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
              <p className="text-[11px] text-amber-300/80 bg-amber-950/40 border border-amber-500/20 rounded-xl p-2.5 mb-4 text-left">
                💡 <strong>Tip for Phones:</strong> When playing with friends on local Wi-Fi, open this page in your browser using your computer's local network IP (e.g. <code>http://192.168.x.x:5173</code>) so scanned phones connect immediately!
              </p>
            )}
            <button
              onClick={() => setShowQr(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-sm text-slate-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
