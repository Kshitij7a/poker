"""
FastAPI application for the Poker Chip & Betting Management server.
Handles REST endpoints for room creation, joining, history,
and WebSocket endpoint for real-time synchronization.
"""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
import random
import string
import time
from typing import Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .engine import (
    get_available_actions,
    process_action,
    resolve_hand,
    start_hand,
)
from .models import (
    ActionType,
    Player,
    PlayerAction,
    PlayerStatus,
    RoomConfig,
    RoomPhase,
    RoomState,
    WSMessage,
)
from .store import (
    delete_room,
    get_match_history,
    get_room,
    get_room_by_code,
    init_db,
    record_hand,
    save_game_session,
    save_room,
)
from .ws_manager import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database on startup
    await init_db()
    yield


app = FastAPI(
    title="Poker Chip & Pot Manager API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _generate_join_code() -> str:
    """Generate a clean, unambiguous 4-character code (avoiding 0, O, 1, I)."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    for _ in range(50):
        code = "".join(random.choices(alphabet, k=4))
        if not get_room_by_code(code):
            return code
    return "".join(random.choices(alphabet, k=4))


# ── Request / Response models ──────────────────────────────────────────
class CreateRoomRequest(BaseModel):
    host_name: str
    config: Optional[RoomConfig] = None


class CreateRoomResponse(BaseModel):
    room_id: str
    join_code: str
    host_player_id: str
    room: RoomState


class JoinRoomRequest(BaseModel):
    player_name: str
    player_id: Optional[str] = None


class JoinRoomResponse(BaseModel):
    room_id: str
    player_id: str
    room: RoomState


# ── REST Endpoints ─────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/api/rooms", response_model=CreateRoomResponse)
async def create_room(req: CreateRoomRequest):
    name = req.host_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Host name cannot be empty")

    config = req.config or RoomConfig()
    code = _generate_join_code()
    room_id = f"room_{code.lower()}_{int(time.time())}"

    # Host player
    host = Player(
        name=name,
        chips=config.starting_stack,
        is_host=True,
        seat=0,
        status=PlayerStatus.WAITING,
    )

    room = RoomState(
        room_id=room_id,
        join_code=code,
        config=config,
        phase=RoomPhase.LOBBY,
        players=[host],
    )

    save_room(room)
    await save_game_session(room)

    return CreateRoomResponse(
        room_id=room.room_id,
        join_code=room.join_code,
        host_player_id=host.id,
        room=room,
    )


@app.get("/api/rooms/{code}")
async def get_room_info(code: str):
    room = get_room_by_code(code.upper())
    if not room:
        # Also try direct room_id
        room = get_room(code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found with code: " + code)
    return room


@app.post("/api/rooms/{code}/join", response_model=JoinRoomResponse)
async def join_room(code: str, req: JoinRoomRequest):
    name = req.player_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Player name cannot be empty")

    room = get_room_by_code(code.upper())
    if not room:
        room = get_room(code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # 1. Reconnect by player_id if provided
    if req.player_id:
        existing_by_id = room.get_player(req.player_id)
        if existing_by_id:
            existing_by_id.connected = True
            save_room(room)
            await manager.broadcast(
                room.room_id,
                {
                    "type": "player_status",
                    "payload": {
                        "player_id": existing_by_id.id,
                        "connected": True,
                        "event": f"{existing_by_id.name} reconnected",
                    },
                },
            )
            return JoinRoomResponse(
                room_id=room.room_id,
                player_id=existing_by_id.id,
                room=room,
            )

    # 2. Reconnect by matching player name if already in room
    existing_by_name = next((p for p in room.players if p.name.lower() == name.lower()), None)
    if existing_by_name:
        existing_by_name.connected = True
        save_room(room)
        await manager.broadcast(
            room.room_id,
            {
                "type": "player_status",
                "payload": {
                    "player_id": existing_by_name.id,
                    "connected": True,
                    "event": f"{existing_by_name.name} reconnected",
                },
            },
        )
        return JoinRoomResponse(
            room_id=room.room_id,
            player_id=existing_by_name.id,
            room=room,
        )

    if len(room.players) >= room.config.max_players:
        raise HTTPException(status_code=400, detail="Room is full")

    # In-progress game: late joiners wait for next hand
    initial_status = PlayerStatus.WAITING
    player = Player(
        name=name,
        chips=room.config.starting_stack,
        seat=len(room.players),
        status=initial_status,
        is_host=False,
    )
    room.players.append(player)
    save_room(room)

    # Notify via WebSocket
    await manager.broadcast(
        room.room_id,
        {
            "type": "player_joined",
            "payload": {
                "player": player.model_dump(),
                "room": room.model_dump(),
                "message": f"{player.name} joined the room",
            },
        },
    )

    return JoinRoomResponse(
        room_id=room.room_id,
        player_id=player.id,
        room=room,
    )


@app.get("/api/rooms/{room_id}/history")
async def get_history(room_id: str):
    target_room = get_room(room_id) or get_room_by_code(room_id.upper())
    target_id = target_room.room_id if target_room else room_id
    history = await get_match_history(target_id)
    return {"room_id": target_id, "history": history}


# ── Broadcast Helpers ──────────────────────────────────────────────────
async def broadcast_game_state(room: RoomState, event_text: Optional[str] = None):
    """
    Broadcasts the updated game state to all players.
    Also customizes available actions per player.
    """
    save_room(room)
    room_data = room.model_dump()

    # For table / spectators
    table_message = {
        "type": "state_update",
        "payload": {
            "room": room_data,
            "event": event_text,
            "available_actions": [],
        },
    }

    # Iterate over connected clients
    connections = manager.get_connections(room.room_id)
    for pid in list(connections.keys()):
        player_actions = get_available_actions(room, pid) if room.get_player(pid) else []
        msg = {
            "type": "state_update",
            "payload": {
                "room": room_data,
                "event": event_text,
                "available_actions": player_actions,
            },
        }
        await manager.send_to_player(room.room_id, pid, msg)


# ── WebSocket Handler ──────────────────────────────────────────────────
@app.websocket("/ws/{room_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player_id: str):
    room = get_room(room_id)
    if not room:
        # Check if room_id is actually join_code
        room = get_room_by_code(room_id.upper())
        if room:
            room_id = room.room_id
        else:
            await websocket.close(code=4004, reason="Room does not exist")
            return

    await manager.connect(websocket, room_id, player_id)

    # Mark player connected if real player
    player = room.get_player(player_id)
    if player:
        player.connected = True
        save_room(room)

    # Send initial state
    player_actions = get_available_actions(room, player_id) if player else []
    await websocket.send_json({
        "type": "init_state",
        "payload": {
            "room": room.model_dump(),
            "available_actions": player_actions,
            "player_id": player_id,
            "is_spectator": player is None,
        },
    })

    # Broadcast player status update
    if player:
        await manager.broadcast(
            room_id,
            {
                "type": "player_status",
                "payload": {
                    "player_id": player_id,
                    "connected": True,
                    "event": f"{player.name} connected",
                },
            },
            exclude=player_id,
        )

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            payload = data.get("payload", {})

            # Refresh room reference
            room = get_room(room_id)
            if not room:
                break

            # ── PING / PONG ───────────────────────────────────────────
            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "payload": {}})
                continue

            # ── UPDATE CONFIG (Host only, in Lobby) ───────────────────
            elif msg_type == "update_config":
                sender = room.get_player(player_id)
                if not sender or not sender.is_host:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"message": "Only host can update settings"},
                    })
                    continue

                if room.phase != RoomPhase.LOBBY:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"message": "Config can only be changed in lobby"},
                    })
                    continue

                # Apply new settings
                if "starting_stack" in payload:
                    room.config.starting_stack = int(payload["starting_stack"])
                    for p in room.players:
                        p.chips = room.config.starting_stack
                if "small_blind" in payload:
                    room.config.small_blind = int(payload["small_blind"])
                if "big_blind" in payload:
                    room.config.big_blind = int(payload["big_blind"])
                if "max_players" in payload:
                    room.config.max_players = int(payload["max_players"])

                await broadcast_game_state(room, "Room configuration updated")

            # ── KICK PLAYER (Host only, in Lobby) ────────────────────
            elif msg_type == "kick_player":
                sender = room.get_player(player_id)
                if not sender or not sender.is_host:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"message": "Only host can remove players"},
                    })
                    continue

                if room.phase != RoomPhase.LOBBY:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"message": "Can only remove players in lobby"},
                    })
                    continue

                target_id = payload.get("target_player_id")
                target = room.get_player(target_id)
                if target and not target.is_host:
                    room.players = [p for p in room.players if p.id != target_id]
                    for i, p in enumerate(room.players):
                        p.seat = i
                    manager.disconnect(room_id, target_id)
                    await broadcast_game_state(room, f"Host removed {target.name}")

            # ── START GAME (Host only) ────────────────────────────────
            elif msg_type == "start_game":
                sender = room.get_player(player_id)
                if not sender or not sender.is_host:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"message": "Only host can start the game"},
                    })
                    continue

                if len(room.players) < 2:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"message": "Need at least 2 players to start"},
                    })
                    continue

                # Start the hand
                room = start_hand(room)
                await broadcast_game_state(room, f"Hand #{room.hand_number} started! Blinds posted.")

            # ── PLAYER ACTION (Fold, Check, Call, Raise, All-in) ──────
            elif msg_type == "player_action":
                action_str = payload.get("action")
                amount = int(payload.get("amount", 0))

                try:
                    action_type = ActionType(action_str)
                    action = PlayerAction(action=action_type, amount=amount)
                    room, event_desc = process_action(room, player_id, action)

                    # If round finished into SHOWDOWN or single winner
                    if room.phase == RoomPhase.BETWEEN_HANDS:
                        # Auto-won (others folded)
                        active = room.active_players()
                        if active:
                            await record_hand(room, [active[0].name], room.last_pot_awarded)
                    elif room.phase == RoomPhase.HAND_RESOLUTION:
                        event_desc += " — Showdown reached! Host select winners."

                    await broadcast_game_state(room, event_desc)

                except ValueError as e:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"message": str(e)},
                    })

            # ── RESOLVE HAND (Host/Players select winners) ─────────────
            elif msg_type == "resolve_hand":
                sender = room.get_player(player_id)
                winner_ids = payload.get("winner_ids", [])
                pot_winners = payload.get("pot_winners", [])
                if not winner_ids and not pot_winners:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"message": "Please select at least one winner"},
                    })
                    continue

                all_winner_ids = list(winner_ids)
                for pw in pot_winners:
                    all_winner_ids.extend(pw.get("winner_ids", []))
                winner_names = list(set([room.get_player(wid).name for wid in all_winner_ids if room.get_player(wid)]))
                room, event_desc = resolve_hand(room, winner_ids=winner_ids, pot_winners=pot_winners)
                await record_hand(room, winner_names, room.last_pot_awarded)

                await broadcast_game_state(room, f"Hand #{room.hand_number} resolved: {event_desc}")


            # ── NEXT HAND (Host triggers next hand) ───────────────────
            elif msg_type == "next_hand":
                sender = room.get_player(player_id)
                if not sender or not sender.is_host:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"message": "Only host can trigger next hand"},
                    })
                    continue

                room = start_hand(room)
                await broadcast_game_state(room, f"Hand #{room.hand_number} started! Blinds posted.")

            # ── REBUY / CHIP ADJUSTMENT (Host friendly feature) ───────
            elif msg_type == "rebuy":
                sender = room.get_player(player_id)
                if not sender or not sender.is_host:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"message": "Only host can grant rebuys"},
                    })
                    continue

                target_id = payload.get("target_player_id")
                rebuy_amount = int(payload.get("amount", room.config.starting_stack))
                target = room.get_player(target_id)
                if target:
                    target.chips += rebuy_amount
                    if target.status == PlayerStatus.ELIMINATED:
                        target.status = PlayerStatus.WAITING
                    await broadcast_game_state(
                        room, f"Host granted {rebuy_amount} chips to {target.name}"
                    )

            # ── RETURN TO LOBBY / RESET ───────────────────────────────
            elif msg_type == "reset_to_lobby":
                sender = room.get_player(player_id)
                if not sender or not sender.is_host:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"message": "Only host can reset to lobby"},
                    })
                    continue

                room.phase = RoomPhase.LOBBY
                room.hand_number = 0
                room.pot = 0
                room.current_bet = 0
                room.side_pots = []
                for p in room.players:
                    p.chips = room.config.starting_stack
                    p.current_bet = 0
                    p.total_bet_this_hand = 0
                    p.status = PlayerStatus.WAITING
                await broadcast_game_state(room, "Game reset back to Lobby")

    except WebSocketDisconnect:
        manager.disconnect(room_id, player_id)
        room = get_room(room_id)
        if room:
            p = room.get_player(player_id)
            if p:
                p.connected = False
                save_room(room)
                await manager.broadcast(
                    room_id,
                    {
                        "type": "player_status",
                        "payload": {
                            "player_id": player_id,
                            "connected": False,
                            "event": f"{p.name} disconnected",
                        },
                    },
                )
    except Exception as e:
        manager.disconnect(room_id, player_id)
