import pytest
from app.models import (
    RoomState, RoomConfig, Player, PlayerStatus, RoomPhase,
    BettingRound, ActionType, PlayerAction, SidePot
)
from app.engine import (
    start_hand, process_action, resolve_hand, _calculate_side_pots,
    get_available_actions
)

def test_three_player_full_hand():
    p1 = Player(id="p1", name="Alice", chips=1000, seat=0, is_host=True)
    p2 = Player(id="p2", name="Bob", chips=1000, seat=1)
    p3 = Player(id="p3", name="Charlie", chips=1000, seat=2)

    room = RoomState(
        room_id="r1",
        join_code="TEST",
        config=RoomConfig(starting_stack=1000, small_blind=10, big_blind=20),
        players=[p1, p2, p3],
    )

    # Hand 1: Dealer = p1 (index 0), SB = p2 (index 1), BB = p3 (index 2)
    room = start_hand(room)
    assert room.dealer_index == 0
    assert room.small_blind_index == 1
    assert room.big_blind_index == 2
    # Pre-flop action starts after BB: index 0 (Dealer Alice)
    assert room.current_turn_index == 0
    assert room.pot == 30
    assert p2.chips == 990
    assert p3.chips == 980

    # Alice raises to 60
    room, event = process_action(room, "p1", PlayerAction(action=ActionType.RAISE, amount=60))
    assert room.current_bet == 60
    assert p1.chips == 940
    assert room.pot == 90

    # Next is Bob (SB)
    assert room.current_turn_index == 1
    # Bob calls (already put 10, needs 50 more)
    room, event = process_action(room, "p2", PlayerAction(action=ActionType.CALL))
    assert p2.chips == 940
    assert p2.current_bet == 60
    assert room.pot == 140

    # Next is Charlie (BB)
    assert room.current_turn_index == 2
    # Charlie calls (already put 20, needs 40 more)
    room, event = process_action(room, "p3", PlayerAction(action=ActionType.CALL))
    assert p3.chips == 940
    assert p3.total_bet_this_hand == 60
    assert room.pot == 180

    # Round should have moved to FLOP!
    assert room.betting_round == BettingRound.FLOP
    assert room.current_bet == 0
    assert p1.current_bet == 0
    assert p2.current_bet == 0
    assert p3.current_bet == 0

    # Post-flop: first active player after dealer (index 0) is index 1 (Bob)
    assert room.current_turn_index == 1
    # Bob checks
    room, event = process_action(room, "p2", PlayerAction(action=ActionType.CHECK))
    assert room.current_turn_index == 2

    # Charlie checks
    room, event = process_action(room, "p3", PlayerAction(action=ActionType.CHECK))
    assert room.current_turn_index == 0

    # Alice bets 80 (raise to 80)
    room, event = process_action(room, "p1", PlayerAction(action=ActionType.RAISE, amount=80))
    assert room.current_bet == 80
    assert room.pot == 260

    # Bob folds
    assert room.current_turn_index == 1
    room, event = process_action(room, "p2", PlayerAction(action=ActionType.FOLD))
    assert p2.status == PlayerStatus.FOLDED

    # Charlie calls 80
    assert room.current_turn_index == 2
    room, event = process_action(room, "p3", PlayerAction(action=ActionType.CALL))
    assert p3.chips == 860
    assert room.pot == 340

    # Should move to TURN!
    assert room.betting_round == BettingRound.TURN
    # Post-flop first active after dealer (index 0): Bob is folded, so Charlie (index 2) acts!
    assert room.current_turn_index == 2

    # Charlie checks
    room, event = process_action(room, "p3", PlayerAction(action=ActionType.CHECK))
    # Alice checks
    room, event = process_action(room, "p1", PlayerAction(action=ActionType.CHECK))

    # Should move to RIVER!
    assert room.betting_round == BettingRound.RIVER
    assert room.current_turn_index == 2

    # Charlie checks
    room, event = process_action(room, "p3", PlayerAction(action=ActionType.CHECK))
    # Alice checks
    room, event = process_action(room, "p1", PlayerAction(action=ActionType.CHECK))

    # Should move to SHOWDOWN!
    assert room.betting_round == BettingRound.SHOWDOWN
    assert room.phase == RoomPhase.HAND_RESOLUTION
    assert room.pot == 340

    # Resolve hand: Alice wins
    room, event = resolve_hand(room, winner_ids=["p1"])
    assert p1.chips == 940 - 80 + 340 # 1200
    assert p2.chips == 940
    assert p3.chips == 860
    assert p1.chips + p2.chips + p3.chips == 3000
    assert room.pot == 0
    assert room.phase == RoomPhase.BETWEEN_HANDS

    # Start Hand 2: Dealer rotates to index 1 (Bob)
    room = start_hand(room)
    assert room.dealer_index == 1
    assert room.small_blind_index == 2 # Charlie
    assert room.big_blind_index == 0   # Alice


def test_all_in_uncalled_bet():
    # 2 players: Alice has 100, Bob has 500
    p1 = Player(id="p1", name="Alice", chips=100, seat=0, is_host=True)
    p2 = Player(id="p2", name="Bob", chips=500, seat=1)
    room = RoomState(
        room_id="r1",
        join_code="TEST",
        config=RoomConfig(starting_stack=500, small_blind=10, big_blind=20),
        players=[p1, p2],
    )
    room = start_hand(room)
    # Dealer p1 is SB (10), p2 is BB (20)
    # Preflop: p1 is turn
    # p1 goes all-in for remaining 90 chips (total bet = 100)
    room, event = process_action(room, "p1", PlayerAction(action=ActionType.ALL_IN))
    assert p1.chips == 0
    assert p1.current_bet == 100
    assert p1.status == PlayerStatus.ALL_IN

    # p2 goes all-in for 480 remaining chips (total bet = 500)
    room, event = process_action(room, "p2", PlayerAction(action=ActionType.ALL_IN))
    # Bob gets 400 uncalled chips refunded immediately!
    assert p2.chips == 400
    assert p2.status == PlayerStatus.ACTIVE
    assert p2.total_bet_this_hand == 100

    # Both all-in / completed round, moves to showdown
    assert room.betting_round == BettingRound.SHOWDOWN
    assert room.phase == RoomPhase.HAND_RESOLUTION
    # Only 1 clean contested pot:
    assert len(room.side_pots) == 1
    assert room.side_pots[0].amount == 200
    assert set(room.side_pots[0].eligible_player_ids) == {"p1", "p2"}
    assert room.pot == 200

    # If Alice wins showdown:
    room, event = resolve_hand(room, winner_ids=["p1"])
    assert p1.chips == 200
    assert p2.chips == 400
    assert p1.status == PlayerStatus.ACTIVE
    assert p2.status == PlayerStatus.ACTIVE

