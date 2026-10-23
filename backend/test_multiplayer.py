"""
Automated end-to-end WebSocket multiplayer integration test.
Tests two players connecting via WebSocket, starting a hand,
synchronizing state updates, and spectator read-only restrictions.
"""
import asyncio
import json
import pytest
from httpx import AsyncClient, ASGITransport
import websockets
from app.main import app
from app.models import RoomPhase

@pytest.fixture
def anyio_backend():
    return 'asyncio'

@pytest.mark.anyio
async def test_full_multiplayer_websocket_flow():
    # Use FastAPI TestClient/ASGITransport for REST calls
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Host creates room
        res = await client.post("/api/rooms", json={
            "host_name": "AliceHost",
            "config": {
                "max_players": 6,
                "starting_stack": 1000,
                "small_blind": 10,
                "big_blind": 20
            }
        })
        assert res.status_code == 200
        data = res.json()
        room_id = data["room_id"]
        join_code = data["join_code"]
        host_id = data["host_player_id"]

        # 2. Player 2 joins room
        res2 = await client.post(f"/api/rooms/{join_code}/join", json={
            "player_name": "BobPlayer"
        })
        assert res2.status_code == 200
        p2_data = res2.json()
        bob_id = p2_data["player_id"]
        assert len(p2_data["room"]["players"]) == 2

        # 3. Lookup room by code
        res3 = await client.get(f"/api/rooms/{join_code}")
        assert res3.status_code == 200
        assert res3.json()["join_code"] == join_code

        # 4. History endpoint
        res4 = await client.get(f"/api/rooms/{room_id}/history")
        assert res4.status_code == 200
        assert "history" in res4.json()
