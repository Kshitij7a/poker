import asyncio
import json
import sys
import websockets
import urllib.request

API_BASE = "http://127.0.0.1:8001"
WS_BASE = "ws://127.0.0.1:8001"

def join_bob(room_code: str):
    url = f"{API_BASE}/api/rooms/{room_code}/join"
    req = urllib.request.Request(
        url,
        data=json.dumps({"player_name": "Bob"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(f"BOB_JOINED: player_id={data['player_id']}, room_id={data['room_id']}")
        return data["room_id"], data["player_id"]

async def run_bob_bot(room_id: str, player_id: str, max_turns: int = 10):
    ws_url = f"{WS_BASE}/ws/{room_id}/{player_id}"
    print(f"Connecting Bob to {ws_url}...")
    async with websockets.connect(ws_url) as ws:
        turns = 0
        while turns < max_turns:
            try:
                msg_str = await asyncio.wait_for(ws.recv(), timeout=300.0)
                msg = json.loads(msg_str)
                msg_type = msg.get("type")
                payload = msg.get("payload", {})
                
                if msg_type in ("init_state", "state_update"):
                    room = payload.get("room", {})
                    phase = room.get("phase")
                    seated = sorted(
                        [p for p in room.get("players", []) if p.get("seat", -1) >= 0],
                        key=lambda x: x.get("seat", 0)
                    )
                    curr_idx = room.get("current_turn_index", 0)
                    if curr_idx < len(seated):
                        actor = seated[curr_idx]
                        if actor.get("id") == player_id and phase == "playing":
                            actions = payload.get("available_actions", [])
                            print(f"[Bob Bot] It's Bob's turn! Available: {[a.get('action') for a in actions]}")
                            await asyncio.sleep(1.0)
                            # Pick Check if available, else Call
                            has_check = any(a.get("action") == "check" for a in actions)
                            has_call = any(a.get("action") == "call" for a in actions)
                            if has_check:
                                action_to_send = {"action": "check"}
                            elif has_call:
                                action_to_send = {"action": "call"}
                            else:
                                action_to_send = {"action": "fold"}
                                
                            print(f"[Bob Bot] Sending action: {action_to_send}")
                            await ws.send(json.dumps({
                                "type": "player_action",
                                "payload": action_to_send
                            }))
                            turns += 1
            except asyncio.TimeoutError:
                print("[Bob Bot] Timeout waiting for message")
                break
            except Exception as e:
                print(f"[Bob Bot] Error: {e}")
                break

if __name__ == "__main__":
    code = sys.argv[1] if len(sys.argv) > 1 else "M8L5"
    room_id, player_id = join_bob(code)
    asyncio.run(run_bob_bot(room_id, player_id))
