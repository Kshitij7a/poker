"""
Unit tests for the poker betting engine and side pot calculation.
"""
import pytest
from app.models import (
    RoomState, RoomConfig, Player, PlayerStatus, RoomPhase,
    BettingRound, ActionType, PlayerAction, SidePot
)
from app.engine import start_hand, process_action, resolve_hand, _calculate_side_pots


def test_game_flow_two_players():
    # Setup 2 players
    p1 = Player(id="p1", name="Alice", chips=1000, seat=0, is_host=True)
    p2 = Player(id="p2", name="Bob", chips=1000, seat=1)
    room = RoomState(
        room_id="r1",
        join_code="TEST",
        config=RoomConfig(starting_stack=1000, small_blind=10, big_blind=20),
        players=[p1, p2],
    )

    # Hand 1: Heads-up. Dealer = p1 (SB), p2 = BB.
    room = start_hand(room)
    assert room.hand_number == 1
    assert room.pot == 30  # SB (10) + BB (20)
    assert p1.chips == 990
    assert p2.chips == 980
    assert room.current_bet == 20
    # In heads-up, Dealer (SB) acts first pre-flop!
    assert room.current_turn_index == room.small_blind_index

    # p1 calls 10 more (matches BB 20)
    room, event = process_action(room, p1.id, PlayerAction(action=ActionType.CALL))
    assert p1.chips == 980
    assert p1.current_bet == 20
    assert room.pot == 40
    # Now it's Bob (BB)'s turn
    assert room.current_turn_index == room.big_blind_index

    # Bob checks (since he already posted 20)
    room, event = process_action(room, p2.id, PlayerAction(action=ActionType.CHECK))
    # Round should advance to FLOP!
    assert room.betting_round == BettingRound.FLOP
    assert room.current_bet == 0
    assert p1.current_bet == 0
    assert p2.current_bet == 0
    assert room.pot == 40

    # Post-flop: BB (p2) or first active after dealer acts first
    # In heads up, p2 acts first post flop
    current_actor = room.seated_players()[room.current_turn_index]
    room, event = process_action(room, current_actor.id, PlayerAction(action=ActionType.CHECK))

    # Next player checks too
    current_actor2 = room.seated_players()[room.current_turn_index]
    room, event = process_action(room, current_actor2.id, PlayerAction(action=ActionType.CHECK))
    assert room.betting_round == BettingRound.TURN


def test_side_pot_calculation():
    # 3 players with different stacks:
    # Alice has 100, Bob has 300, Charlie has 500
    p1 = Player(id="p1", name="Alice", chips=0, total_bet_this_hand=100, status=PlayerStatus.ALL_IN, seat=0)
    p2 = Player(id="p2", name="Bob", chips=0, total_bet_this_hand=300, status=PlayerStatus.ALL_IN, seat=1)
    p3 = Player(id="p3", name="Charlie", chips=200, total_bet_this_hand=300, status=PlayerStatus.ACTIVE, seat=2)

    room = RoomState(
        room_id="r1",
        join_code="TEST",
        players=[p1, p2, p3],
        pot=700, # 100 + 300 + 300
    )

    _calculate_side_pots(room)

    # Side pot 1: 100 from Alice, 100 from Bob, 100 from Charlie = 300. Eligible: Alice, Bob, Charlie.
    # Side pot 2: 200 from Bob, 200 from Charlie = 400. Eligible: Bob, Charlie.
    assert len(room.side_pots) == 2
    assert room.side_pots[0].amount == 300
    assert set(room.side_pots[0].eligible_player_ids) == {"p1", "p2", "p3"}

    assert room.side_pots[1].amount == 400
    assert set(room.side_pots[1].eligible_player_ids) == {"p2", "p3"}

    # Resolve: suppose Alice had the best hand, and Bob had second best hand
    # Hand resolution winner selection: Alice (for main), Bob (for side pot)
    # If Alice is chosen as winner:
    room, event = resolve_hand(room, ["p1", "p2"])
    # Alice gets 300 (from pot 1), Bob gets 400 (from pot 2)
    assert p1.chips == 300
    assert p2.chips == 400
    assert p3.chips == 200  # unspent
    assert room.pot == 0


def test_fold_auto_win():
    p1 = Player(id="p1", name="Alice", chips=1000, seat=0)
    p2 = Player(id="p2", name="Bob", chips=1000, seat=1)
    p3 = Player(id="p3", name="Charlie", chips=1000, seat=2)

    room = RoomState(
        room_id="r1",
        join_code="TEST",
        config=RoomConfig(starting_stack=1000, small_blind=10, big_blind=20),
        players=[p1, p2, p3],
    )
    room = start_hand(room)
    assert room.pot == 30

    # Current turn folds
    actor1 = room.seated_players()[room.current_turn_index]
    room, event = process_action(room, actor1.id, PlayerAction(action=ActionType.FOLD))

    # Next actor folds
    actor2 = room.seated_players()[room.current_turn_index]
    room, event = process_action(room, actor2.id, PlayerAction(action=ActionType.FOLD))

    # Hand should end immediately and remaining player wins the 30 chips
    assert room.phase == RoomPhase.BETWEEN_HANDS
    survivor = [p for p in room.players if p.status == PlayerStatus.ACTIVE][0]
    # Starting stack was 1000. Blinds were posted. Survivor has won the pot.
    assert survivor.chips >= 1000


if __name__ == "__main__":
    test_game_flow_two_players()
    test_side_pot_calculation()
    test_fold_auto_win()
    print("ALL POKER ENGINE TESTS PASSED!")
