"""
Simulation script: Join a second player to the active room, start game, and test WebSocket synchronization.
"""
import asyncio
import json
import websockets
import urllib.request

ROOM_CODE = "ZAUU"
API_URL = f"http://127.0.0.1:8000/api/rooms/{ROOM_CODE}/join"

def join_second_player():
    req = urllib.request.Request(
        API_URL,
        data=json.dumps({"player_name": "Phil Ivey"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print("PLAYER 2 JOINED:", data["player_id"], "Room ID:", data["room_id"])
        return data["room_id"], data["player_id"]

async def listen_ws(room_id, player_id):
    ws_url = f"ws://127.0.0.1:8000/ws/{room_id}/{player_id}"
    async with websockets.connect(ws_url) as ws:
        msg = await ws.recv()
        print("WS RECEIVED INIT:", msg[:120])

if __name__ == "__main__":
    room_id, player_id = join_second_player()
    asyncio.run(listen_ws(room_id, player_id))
    print("SECOND PLAYER TEST COMPLETE!")
