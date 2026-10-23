"""
In-memory room store + SQLite persistence for match history.
"""
from __future__ import annotations

import aiosqlite
import json
import os
import time
from typing import Optional

from .models import RoomState, RoomConfig

DB_PATH = os.getenv("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "..", "poker.db"))

# ── In-memory store ───────────────────────────────────────────────────
_rooms: dict[str, RoomState] = {}       # room_id -> RoomState
_join_codes: dict[str, str] = {}        # join_code -> room_id


def get_room(room_id: str) -> Optional[RoomState]:
    return _rooms.get(room_id)


def get_room_by_code(code: str) -> Optional[RoomState]:
    room_id = _join_codes.get(code.upper())
    if room_id:
        return _rooms.get(room_id)
    return None


def save_room(room: RoomState):
    _rooms[room.room_id] = room
    _join_codes[room.join_code] = room.room_id


def delete_room(room_id: str):
    room = _rooms.pop(room_id, None)
    if room:
        _join_codes.pop(room.join_code, None)


def list_rooms() -> list[RoomState]:
    return list(_rooms.values())


# ── SQLite persistence for match history ──────────────────────────────
async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS match_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id TEXT NOT NULL,
                hand_number INTEGER NOT NULL,
                winner_names TEXT NOT NULL,
                pot_amount INTEGER NOT NULL,
                players_snapshot TEXT NOT NULL,
                timestamp REAL NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS game_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id TEXT NOT NULL,
                join_code TEXT NOT NULL,
                config TEXT NOT NULL,
                players TEXT NOT NULL,
                total_hands INTEGER DEFAULT 0,
                created_at REAL NOT NULL,
                ended_at REAL
            )
        """)
        await db.commit()


_db_initialized = False

async def _ensure_db():
    global _db_initialized
    if not _db_initialized:
        await init_db()
        _db_initialized = True

async def record_hand(room: RoomState, winner_names: list[str], pot_amount: int):
    await _ensure_db()
    async with aiosqlite.connect(DB_PATH) as db:
        players_snapshot = json.dumps([
            {"name": p.name, "chips": p.chips, "status": p.status.value}
            for p in room.players
        ])
        await db.execute(
            """INSERT INTO match_history
               (room_id, hand_number, winner_names, pot_amount, players_snapshot, timestamp)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                room.room_id,
                room.hand_number,
                ", ".join(winner_names),
                pot_amount,
                players_snapshot,
                time.time(),
            ),
        )
        await db.commit()


async def save_game_session(room: RoomState):
    await _ensure_db()
    async with aiosqlite.connect(DB_PATH) as db:

        config_json = room.config.model_dump_json()
        players_json = json.dumps([
            {"name": p.name, "chips": p.chips}
            for p in room.players
        ])
        await db.execute(
            """INSERT INTO game_sessions
               (room_id, join_code, config, players, total_hands, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (room.room_id, room.join_code, config_json, players_json, room.hand_number, room.created_at),
        )
        await db.commit()


async def get_match_history(room_id: str) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM match_history WHERE room_id = ? ORDER BY hand_number",
            (room_id,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
