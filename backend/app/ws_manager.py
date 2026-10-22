"""
WebSocket connection manager — tracks connected clients per room.
"""
from __future__ import annotations

import json
from typing import Optional

from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections grouped by room."""

    def __init__(self):
        # room_id -> {player_id -> WebSocket}
        self._rooms: dict[str, dict[str, WebSocket]] = {}

    async def connect(self, ws: WebSocket, room_id: str, player_id: str):
        await ws.accept()
        if room_id not in self._rooms:
            self._rooms[room_id] = {}
        self._rooms[room_id][player_id] = ws

    def disconnect(self, room_id: str, player_id: str):
        if room_id in self._rooms:
            self._rooms[room_id].pop(player_id, None)
            if not self._rooms[room_id]:
                del self._rooms[room_id]

    async def send_to_player(self, room_id: str, player_id: str, message: dict):
        ws = self._rooms.get(room_id, {}).get(player_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(room_id, player_id)

    async def broadcast(self, room_id: str, message: dict, exclude: Optional[str] = None):
        """Send a message to all players in a room."""
        room = self._rooms.get(room_id, {})
        disconnected = []
        for pid, ws in room.items():
            if pid == exclude:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(pid)
        for pid in disconnected:
            self.disconnect(room_id, pid)

    def get_connections(self, room_id: str) -> dict[str, WebSocket]:
        return self._rooms.get(room_id, {})


manager = ConnectionManager()
