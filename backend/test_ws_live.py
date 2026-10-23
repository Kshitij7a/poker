"""
Live WebSocket synchronization test against running server on 127.0.0.1:8001.
"""
import asyncio
import json
import httpx
import websockets

async def main():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8001") as client:
        # Create room
        res = await client.post("/api/rooms", json={"host_name": "AliceHost"})
        assert res.status_code == 200
        data = res.json()
        room_id = data["room_id"]
        code = data["join_code"]
        host_id = data["host_player_id"]
        print(f"Created room: {room_id} ({code})")

        # Join Bob
        res = await client.post(f"/api/rooms/{code}/join", json={"player_name": "BobGuest"})
        assert res.status_code == 200
        bob_id = res.json()["player_id"]
        print(f"Bob joined: {bob_id}")

    # Connect Alice & Bob via WebSocket simultaneously
    alice_ws_url = f"ws://127.0.0.1:8001/ws/{room_id}/{host_id}"
    bob_ws_url = f"ws://127.0.0.1:8001/ws/{room_id}/{bob_id}"

    async with websockets.connect(alice_ws_url) as alice_ws, websockets.connect(bob_ws_url) as bob_ws:
        # Receive init_state on both
        msg1 = json.loads(await alice_ws.recv())
        assert msg1["type"] == "init_state"
        print("Alice received init_state")

        msg2 = json.loads(await bob_ws.recv())
        assert msg2["type"] == "init_state"
        print("Bob received init_state")

        # Alice starts game
        await alice_ws.send(json.dumps({"type": "start_game"}))
        print("Alice sent start_game")

        # Receive messages until state_update is received on both
        async def wait_for_state_update(ws):
            while True:
                msg = json.loads(await ws.recv())
                if msg["type"] == "state_update":
                    return msg

        update_alice = await wait_for_state_update(alice_ws)
        assert update_alice["payload"]["room"]["phase"] == "playing"
        print("Alice verified game started in playing phase")

        update_bob = await wait_for_state_update(bob_ws)
        assert update_bob["payload"]["room"]["phase"] == "playing"
        print("Bob verified game started in playing phase")

        # Bob attempts an illegal action (e.g. invalid action type or starting game when not host)
        await bob_ws.send(json.dumps({"type": "start_game"}))
        # Verify no crash
        await asyncio.sleep(0.5)

        # Alice sends ping
        await alice_ws.send(json.dumps({"type": "ping"}))
        pong = json.loads(await alice_ws.recv())
        assert pong["type"] == "pong"
        print("Alice received pong")

        print("ALL LIVE WEBSOCKET MULTIPLAYER TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(main())
