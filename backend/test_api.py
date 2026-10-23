"""
Integration tests for the FastAPI Poker backend endpoints.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    res_api = client.get("/api/health")
    assert res_api.status_code == 200
    assert res_api.json()["status"] == "ok"


def test_invalid_requests():
    # 1. Empty host name -> 400
    res = client.post("/api/rooms", json={"host_name": "   "})
    assert res.status_code == 400

    # 2. Non-existent room lookup -> 404
    res = client.get("/api/rooms/ZZZZ")
    assert res.status_code == 404

    # 3. Join non-existent room -> 404
    res = client.post("/api/rooms/ZZZZ/join", json={"player_name": "Alice"})
    assert res.status_code == 404

    # 4. Join with empty player name -> 400
    # First create a room
    room_res = client.post("/api/rooms", json={"host_name": "Host"})
    assert room_res.status_code == 200
    code = room_res.json()["join_code"]

    res = client.post(f"/api/rooms/{code}/join", json={"player_name": "  "})
    assert res.status_code == 400


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

    # 5. History check using join_code and room_id
    res = client.get(f"/api/rooms/{code}/history")
    assert res.status_code == 200
    assert "history" in res.json()

    res2 = client.get(f"/api/rooms/{data['room_id']}/history")
    assert res2.status_code == 200
    assert "history" in res2.json()

    print("ALL API INTEGRATION TESTS PASSED!")


if __name__ == "__main__":
    test_health()
    test_invalid_requests()
    test_create_and_join_room()

