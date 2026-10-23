"""
Verification script for poker backend API endpoints locally and on Render.
"""
import sys
import httpx

def test_endpoints(base_url: str):
    print(f"\n========================================================")
    print(f"TESTING ENDPOINTS ON: {base_url}")
    print(f"========================================================")
    
    with httpx.Client(base_url=base_url, timeout=20.0) as client:
        # 1. Health check
        res = client.get("/health")
        print(f"GET /health: {res.status_code} -> {res.json()}")
        assert res.status_code == 200, f"Health check failed on {base_url}"

        # API health check (if deployed with latest or local)
        res_api = client.get("/api/health")
        print(f"GET /api/health: {res_api.status_code}")
        # Note: on deployed Render, /api/health will be active once new code is pushed and deployed

        # 2. Invalid room creation (empty name)
        res = client.post("/api/rooms", json={"host_name": "  "})
        print(f"POST /api/rooms (empty name): {res.status_code} -> {res.json()}")
        assert res.status_code == 400

        # 3. Valid room creation
        res = client.post("/api/rooms", json={
            "host_name": "HostPlayer",
            "config": {
                "max_players": 6,
                "starting_stack": 1500,
                "small_blind": 10,
                "big_blind": 20
            }
        })
        print(f"POST /api/rooms (valid): {res.status_code}")
        assert res.status_code == 200
        room_data = res.json()
        room_id = room_data["room_id"]
        code = room_data["join_code"]
        host_id = room_data["host_player_id"]
        print(f"Created room: id={room_id}, code={code}, host_id={host_id}")
        assert len(code) == 4
        assert room_data["room"]["players"][0]["name"] == "HostPlayer"

        # 4. Lookup room by code
        res = client.get(f"/api/rooms/{code}")
        print(f"GET /api/rooms/{code}: {res.status_code} -> join_code={res.json()['join_code']}")
        assert res.status_code == 200
        assert res.json()["join_code"] == code

        # 5. Lookup invalid room code
        res = client.get("/api/rooms/ZZZZ")
        print(f"GET /api/rooms/ZZZZ: {res.status_code} -> {res.json()}")
        assert res.status_code == 404

        # 6. Join room (invalid empty name)
        res = client.post(f"/api/rooms/{code}/join", json={"player_name": "  "})
        print(f"POST /api/rooms/{code}/join (empty name): {res.status_code} -> {res.json()}")
        assert res.status_code == 400

        # 7. Join room (valid player)
        res = client.post(f"/api/rooms/{code}/join", json={"player_name": "PlayerTwo"})
        print(f"POST /api/rooms/{code}/join: {res.status_code}")
        assert res.status_code == 200
        join_res = res.json()
        p2_id = join_res["player_id"]
        print(f"PlayerTwo joined: player_id={p2_id}, total_players={len(join_res['room']['players'])}")
        assert len(join_res["room"]["players"]) == 2

        # 8. Reconnect existing player
        res = client.post(f"/api/rooms/{code}/join", json={"player_name": "PlayerTwo", "player_id": p2_id})
        print(f"POST /api/rooms/{code}/join (reconnect): {res.status_code}")
        assert res.status_code == 200
        assert res.json()["player_id"] == p2_id
        assert len(res.json()["room"]["players"]) == 2

        # 9. Match history
        res = client.get(f"/api/rooms/{code}/history")
        print(f"GET /api/rooms/{code}/history: {res.status_code} -> {res.json()}")
        assert res.status_code == 200
        assert "history" in res.json()

        res = client.get(f"/api/rooms/{room_id}/history")
        print(f"GET /api/rooms/{room_id}/history: {res.status_code} -> {res.json()}")
        assert res.status_code == 200
        assert "history" in res.json()

    print(f"ALL TESTS PASSED ON {base_url}!")

if __name__ == "__main__":
    local_url = "http://127.0.0.1:8001"
    target = sys.argv[1] if len(sys.argv) > 1 else local_url
    test_endpoints(target)
