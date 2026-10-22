"""
Integration tests for the FastAPI Poker backend endpoints.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_create_and_join_room():
    # 1. Host creates room
    res = client.post("/api/rooms", json={
        "host_name": "Daniel Negreanu",
        "config": {
            "max_players": 6,
            "starting_stack": 2000,
            "small_blind": 25,
            "big_blind": 50
        }
    })
    assert res.status_code == 200
    data = res.json()
    assert "room_id" in data
    assert len(data["join_code"]) == 4
    code = data["join_code"]
    host_id = data["host_player_id"]
    assert data["room"]["players"][0]["name"] == "Daniel Negreanu"
    assert data["room"]["players"][0]["chips"] == 2000

    # 2. Lookup room by code
    res = client.get(f"/api/rooms/{code}")
    assert res.status_code == 200
    assert res.json()["join_code"] == code

    # 3. Phil Ivey joins using code
    res = client.post(f"/api/rooms/{code}/join", json={
        "player_name": "Phil Ivey"
    })
    assert res.status_code == 200
    join_data = res.json()
    assert len(join_data["room"]["players"]) == 2
    assert join_data["room"]["players"][1]["name"] == "Phil Ivey"
    assert join_data["room"]["players"][1]["chips"] == 2000

    # 4. Phil Ivey reconnects with same name after refresh
    res = client.post(f"/api/rooms/{code}/join", json={
        "player_name": "Phil Ivey"
    })
    assert res.status_code == 200
    reconnect_data = res.json()
    assert reconnect_data["player_id"] == join_data["player_id"]
    assert len(reconnect_data["room"]["players"]) == 2

    # 5. History check using join_code
    res = client.get(f"/api/rooms/{code}/history")
    assert res.status_code == 200
    assert "history" in res.json()

    print("ALL API INTEGRATION TESTS PASSED!")

if __name__ == "__main__":
    test_health()
    test_create_and_join_room()

