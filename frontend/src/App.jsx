import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, RotateCcw, LogOut, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { Header } from './components/Header';
import { LobbyView } from './components/LobbyView';
import { PlayerView } from './components/PlayerView';
import { TableView } from './components/TableView';
import { JoinModal } from './components/JoinModal';
import { HandResolutionModal } from './components/HandResolutionModal';
import { RebuyModal } from './components/RebuyModal';
import { HistoryModal } from './components/HistoryModal';
import { playTurnSound, playChipSound, playWinSound } from './utils/audio';
import { triggerConfetti } from './utils/confetti';
import { ChipBadge } from './components/ChipStack';
import { getApiBase, getWsBase } from './utils/api';

export default function App() {
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState(() => localStorage.getItem('poker_player_id') || '');
  const [availableActions, setAvailableActions] = useState([]);
  const [currentView, setCurrentView] = useState('player'); // 'player' | 'table'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastEvent, setLastEvent] = useState('');
  const [connected, setConnected] = useState(false);

  // Modals
  const [showEndHandModal, setShowEndHandModal] = useState(false);
  const [showRebuyModal, setShowRebuyModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const isHost = Boolean(room?.players?.find((p) => p.id === playerId)?.is_host);

  // ── WebSocket Connection Setup ─────────────────────────────────────
  const connectWebSocket = useCallback((roomId, pid) => {
    if (!roomId || !pid) return;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const socketUrl = `${getWsBase()}/ws/${roomId}/${pid}`;

    // Prevent duplicate connections to the same endpoint
    if (
      wsRef.current &&
      wsRef.current.url === socketUrl &&
      (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (wsRef.current) {
      wsRef.current.onclose = null; // Suppress close handler on intentional switch
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(socketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type, payload } = data;

        if (type === 'init_state') {
          setRoom(payload.room);
          setAvailableActions(payload.available_actions || []);
          if (payload.is_spectator) {
            setCurrentView('table');
          }
        } else if (type === 'state_update') {
          const newRoom = payload.room;
          setRoom(newRoom);
          setAvailableActions(payload.available_actions || []);

          if (payload.event) {
            setLastEvent(payload.event);
          }

          // Sound cues on turn change
          const seated = newRoom ? [...newRoom.players].filter((p) => p.seat >= 0).sort((a, b) => a.seat - b.seat) : [];
          const currentActor = seated[newRoom?.current_turn_index];
          if (currentActor?.id === pid && newRoom?.phase === 'playing') {
            if (soundEnabled) {
              playTurnSound();
            }
          }

          // Celebration when match finishes
          if (newRoom?.phase === 'finished') {
            if (soundEnabled) {
              playWinSound();
            }
            triggerConfetti();
          }

          // Auto open showdown resolution modal if host and showdown phase
          if (newRoom?.phase === 'hand_resolution' && isHost) {
            setShowEndHandModal(true);
          }
          if (newRoom?.phase === 'between_hands' || newRoom?.phase === 'finished') {
            setShowEndHandModal(false);
          }
        } else if (type === 'player_joined') {
          setRoom(payload.room);
          setLastEvent(payload.message || 'New player joined');
          if (soundEnabled) {
            playChipSound();
          }
        } else if (type === 'error') {
          alert(payload.message || 'Error occurred');
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Auto reconnect after 3 seconds only if room was not intentionally left or cleared
      const currentRoomId = localStorage.getItem('poker_room_id');
      const currentPlayerId = localStorage.getItem('poker_player_id');
      if (currentRoomId && currentPlayerId && currentRoomId === roomId) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket(currentRoomId, currentPlayerId);
        }, 3000);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }, [isHost, soundEnabled]);

  // Keep WebSocket heartbeat ping every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Auto-restore session from localStorage on initial load
  useEffect(() => {
    const savedRoomId = localStorage.getItem('poker_room_id');
    const savedPlayerId = localStorage.getItem('poker_player_id');
    if (savedRoomId && savedPlayerId) {
      fetch(`${getApiBase()}/api/rooms/${savedRoomId}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Room not found or expired');
        })
        .then((roomData) => {
          setRoom(roomData);
          setPlayerId(savedPlayerId);
          connectWebSocket(roomData.room_id, savedPlayerId);
        })
        .catch(() => {
          // Room expired or deleted
          localStorage.removeItem('poker_room_id');
          localStorage.removeItem('poker_player_id');
        });
    }
  }, [connectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  // ── Send WS Message Helper ──────────────────────────────────────────
  const sendWs = (type, payload = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket not open. Unable to send:', type);
    }
  };

  // ── REST Room Handlers ──────────────────────────────────────────────
  const handleCreateRoom = async (params) => {
    const res = await fetch(`${getApiBase()}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Could not create room');
    }
    const data = await res.json();
    setRoom(data.room);
    setPlayerId(data.host_player_id);
    localStorage.setItem('poker_player_id', data.host_player_id);
    localStorage.setItem('poker_room_id', data.room_id);
    connectWebSocket(data.room_id, data.host_player_id);
  };

  const handleJoinRoom = async (code, name) => {
    const savedId = localStorage.getItem('poker_player_id') || undefined;
    const res = await fetch(`${getApiBase()}/api/rooms/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_name: name, player_id: savedId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Could not join room');
    }
    const data = await res.json();
    setRoom(data.room);
    setPlayerId(data.player_id);
    localStorage.setItem('poker_player_id', data.player_id);
    localStorage.setItem('poker_room_id', data.room_id);
    connectWebSocket(data.room_id, data.player_id);
  };

  const handleSpectateRoom = async (code) => {
    const res = await fetch(`${getApiBase()}/api/rooms/${code}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Room not found');
    }
    const data = await res.json();
    const spectatorId = `spectator_${Math.random().toString(36).substring(2, 8)}`;
    setRoom(data);
    setPlayerId(spectatorId);
    setCurrentView('table');
    connectWebSocket(data.room_id, spectatorId);
  };

  const handleLeaveRoom = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    localStorage.removeItem('poker_room_id');
    localStorage.removeItem('poker_player_id');
    setRoom(null);
    setPlayerId('');
    setAvailableActions([]);
    setCurrentView('player');
    setConnected(false);
  };

  // ── Game Action Handlers ────────────────────────────────────────────
  const handlePlayerAction = (action, amount = 0) => {
    sendWs('player_action', { action, amount });
  };

  const handleStartGame = () => {
    sendWs('start_game');
  };

  const handleUpdateConfig = (config) => {
    sendWs('update_config', config);
  };

  const handleKickPlayer = (targetPlayerId) => {
    sendWs('kick_player', { target_player_id: targetPlayerId });
  };

  const handleResolveHand = (resolveData) => {
    sendWs('resolve_hand', resolveData);
    setShowEndHandModal(false);
  };

  const handleNextHand = () => {
    sendWs('next_hand');
  };

  const handleRebuy = (targetPlayerId, amount) => {
    sendWs('rebuy', { target_player_id: targetPlayerId, amount });
  };

  const handleResetToLobby = () => {
    sendWs('reset_to_lobby');
  };

  // Find tournament champion if finished
  const champion = room?.phase === 'finished'
    ? room.players.find((p) => p.chips > 0) || room.players[0]
    : null;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col selection:bg-emerald-500/30">
      {/* Header Bar */}
      <Header
        room={room}
        currentView={currentView}
        onViewChange={setCurrentView}
        isHost={isHost}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenHistory={() => setShowHistoryModal(true)}
        onOpenRebuy={() => setShowRebuyModal(true)}
        onOpenEndHand={() => setShowEndHandModal(true)}
        onLeaveRoom={handleLeaveRoom}
        connected={connected}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {!room ? (
          // Landing View (Create / Join / Spectate)
          <JoinModal
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onSpectateRoom={handleSpectateRoom}
          />
        ) : room.phase === 'finished' ? (
          // Tournament Champion / Match Complete Screen
          <div className="max-w-xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
            <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 text-center space-y-6 border border-amber-500/50 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center mx-auto text-amber-400 shadow-glow-gold">
                <Trophy className="w-10 h-10 fill-amber-400" />
              </div>

              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 block mb-1">
                  TOURNAMENT COMPLETE &bull; HAND #{room.hand_number}
                </span>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {champion?.name || 'Player'} is the Champion!
                </h1>
                <p className="text-sm text-slate-300 mt-2">
                  All opposing chips have been captured.
                </p>
              </div>

              {/* Champion Stack */}
              <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Total Chips Won
                </span>
                <div className="font-mono text-4xl font-black text-emerald-400 drop-shadow">
                  ${(champion?.chips || 0).toLocaleString()}
                </div>
              </div>

              {/* Final Standings */}
              <div className="space-y-2 text-left">
                <span className="text-xs font-bold text-slate-400">Final Table Standings:</span>
                <div className="space-y-1.5">
                  {[...room.players]
                    .sort((a, b) => b.chips - a.chips)
                    .map((p, idx) => (
                      <div
                        key={p.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                          idx === 0
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-slate-900/60 border-white/5 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 font-mono text-slate-500">#{idx + 1}</span>
                          <span>{p.name} {p.id === playerId ? '(You)' : ''}</span>
                        </div>
                        <ChipBadge amount={p.chips} size="sm" />
                      </div>
                    ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {isHost && (
                  <button
                    onClick={handleResetToLobby}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset & Start New Game in Lobby
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowHistoryModal(true)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
                  >
                    View Match Ledger
                  </button>
                  <button
                    onClick={handleLeaveRoom}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-rose-400 border border-rose-500/20 transition flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Leave Table
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : room.phase === 'lobby' ? (
          // Lobby View before game deal
          <LobbyView
            room={room}
            playerId={playerId}
            isHost={isHost}
            onStartGame={handleStartGame}
            onUpdateConfig={handleUpdateConfig}
            onKickPlayer={handleKickPlayer}
            onLeaveRoom={handleLeaveRoom}
          />
        ) : currentView === 'player' ? (
          // Mobile Player View
          <PlayerView
            room={room}
            playerId={playerId}
            availableActions={availableActions}
            onAction={handlePlayerAction}
            onOpenEndHand={() => setShowEndHandModal(true)}
            onNextHand={handleNextHand}
            onResetToLobby={handleResetToLobby}
            isHost={isHost}
          />
        ) : (
          // Tablet / Desktop Shared Table View
          <TableView
            room={room}
            isHost={isHost}
            onOpenEndHand={() => setShowEndHandModal(true)}
            onNextHand={handleNextHand}
            onOpenRebuy={() => setShowRebuyModal(true)}
            onOpenHistory={() => setShowHistoryModal(true)}
            onResetToLobby={handleResetToLobby}
            lastEvent={lastEvent}
          />
        )}
      </main>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {showEndHandModal && room && (
        <HandResolutionModal
          room={room}
          onResolveHand={handleResolveHand}
          onClose={() => setShowEndHandModal(false)}
        />
      )}

      {showRebuyModal && room && (
        <RebuyModal
          room={room}
          onRebuy={handleRebuy}
          onClose={() => setShowRebuyModal(false)}
        />
      )}

      {showHistoryModal && room && (
        <HistoryModal
          roomId={room.room_id}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
}
