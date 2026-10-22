"""
Core poker betting engine — state machine that drives game logic.
"""
from __future__ import annotations

import copy
from typing import Optional

from .models import (
    ActionType,
    BettingRound,
    Player,
    PlayerAction,
    PlayerStatus,
    RoomPhase,
    RoomState,
    SidePot,
)


ROUND_ORDER = [
    BettingRound.PRE_FLOP,
    BettingRound.FLOP,
    BettingRound.TURN,
    BettingRound.RIVER,
    BettingRound.SHOWDOWN,
]


def _next_active_seat(room: RoomState, from_index: int, skip_all_in: bool = True) -> int:
    """Return the next index in seated_players that is still active."""
    seated = room.seated_players()
    n = len(seated)
    if n == 0:
        return from_index
    for i in range(1, n + 1):
        idx = (from_index + i) % n
        p = seated[idx]
        if skip_all_in:
            if p.status == PlayerStatus.ACTIVE:
                return idx
        else:
            if p.status in (PlayerStatus.ACTIVE, PlayerStatus.ALL_IN):
                return idx
    return from_index


def start_hand(room: RoomState) -> RoomState:
    """Begin a new hand: post blinds, set positions, deal to active players."""
    room.hand_number += 1
    room.phase = RoomPhase.PLAYING
    room.betting_round = BettingRound.PRE_FLOP
    room.pot = 0
    room.side_pots = []
    room.current_bet = 0
    room.min_raise = room.config.big_blind
    room.players_acted_this_round = []
    room.last_raiser_id = None

    # Reset players for new hand
    seated = room.seated_players()
    for p in seated:
        if p.chips > 0:
            p.status = PlayerStatus.ACTIVE
        else:
            p.status = PlayerStatus.ELIMINATED
        p.current_bet = 0
        p.total_bet_this_hand = 0

    active_seats = [p for p in seated if p.status == PlayerStatus.ACTIVE]
    if len(active_seats) < 2:
        room.phase = RoomPhase.FINISHED
        return room

    n = len(seated)

    # Rotate dealer
    if room.hand_number > 1:
        room.dealer_index = _next_active_seat(room, room.dealer_index, skip_all_in=False)
    elif seated[room.dealer_index].status != PlayerStatus.ACTIVE:
        room.dealer_index = _next_active_seat(room, room.dealer_index, skip_all_in=False)

    # Set blinds positions
    if len(active_seats) == 2:
        # heads-up: dealer = SB, other = BB
        room.small_blind_index = room.dealer_index
        room.big_blind_index = _next_active_seat(room, room.dealer_index, skip_all_in=False)
    else:
        room.small_blind_index = _next_active_seat(room, room.dealer_index, skip_all_in=False)
        room.big_blind_index = _next_active_seat(room, room.small_blind_index, skip_all_in=False)

    # Post blinds
    sb_player = seated[room.small_blind_index]
    bb_player = seated[room.big_blind_index]

    sb_amount = min(room.config.small_blind, sb_player.chips)
    bb_amount = min(room.config.big_blind, bb_player.chips)

    sb_player.chips -= sb_amount
    sb_player.current_bet = sb_amount
    sb_player.total_bet_this_hand = sb_amount
    if sb_player.chips == 0:
        sb_player.status = PlayerStatus.ALL_IN

    bb_player.chips -= bb_amount
    bb_player.current_bet = bb_amount
    bb_player.total_bet_this_hand = bb_amount
    if bb_player.chips == 0:
        bb_player.status = PlayerStatus.ALL_IN

    room.current_bet = bb_amount
    room.pot = sb_amount + bb_amount

    # First to act pre-flop: player after BB
    room.current_turn_index = _next_active_seat(room, room.big_blind_index)

    return room


def get_available_actions(room: RoomState, player_id: str) -> list[dict]:
    """Return list of available actions for the given player."""
    player = room.get_player(player_id)
    if not player or player.status != PlayerStatus.ACTIVE:
        return []

    seated = room.seated_players()
    if not seated:
        return []

    current_player = seated[room.current_turn_index]
    if current_player.id != player_id:
        return []

    actions = []
    to_call = room.current_bet - player.current_bet

    # Fold — always available
    actions.append({"action": "fold"})

    if to_call == 0:
        # Check
        actions.append({"action": "check"})
    else:
        # Call
        call_amount = min(to_call, player.chips)
        actions.append({"action": "call", "amount": call_amount})

    # Raise
    min_raise_to = room.current_bet + room.min_raise
    if player.chips + player.current_bet > room.current_bet:
        if player.chips + player.current_bet >= min_raise_to:
            actions.append({
                "action": "raise",
                "min_amount": min_raise_to,
                "max_amount": player.chips + player.current_bet,
            })

    # All-in — always available if they have chips
    if player.chips > 0:
        actions.append({"action": "all_in", "amount": player.chips})

    return actions


def process_action(room: RoomState, player_id: str, action: PlayerAction) -> tuple[RoomState, str]:
    """
    Process a player action and return (updated_room, event_description).
    Raises ValueError on illegal moves.
    """
    player = room.get_player(player_id)
    if not player:
        raise ValueError("Player not found")
    if player.status != PlayerStatus.ACTIVE:
        raise ValueError("Player cannot act")

    seated = room.seated_players()
    current_player = seated[room.current_turn_index]
    if current_player.id != player_id:
        raise ValueError("Not your turn")

    to_call = room.current_bet - player.current_bet
    event = ""

    if action.action == ActionType.FOLD:
        player.status = PlayerStatus.FOLDED
        event = f"{player.name} folds"

    elif action.action == ActionType.CHECK:
        if to_call > 0:
            raise ValueError("Cannot check — must call or raise")
        event = f"{player.name} checks"

    elif action.action == ActionType.CALL:
        call_amount = min(to_call, player.chips)
        player.chips -= call_amount
        player.current_bet += call_amount
        player.total_bet_this_hand += call_amount
        room.pot += call_amount
        if player.chips == 0:
            player.status = PlayerStatus.ALL_IN
        event = f"{player.name} calls {call_amount}"

    elif action.action == ActionType.RAISE:
        raise_to = action.amount
        if raise_to < room.current_bet + room.min_raise:
            # Allow if it's an all-in
            if raise_to != player.chips + player.current_bet:
                raise ValueError(
                    f"Raise must be at least {room.current_bet + room.min_raise}"
                )
        raise_increment = raise_to - room.current_bet
        actual_put_in = raise_to - player.current_bet
        if actual_put_in > player.chips:
            raise ValueError("Not enough chips")
        player.chips -= actual_put_in
        player.current_bet = raise_to
        player.total_bet_this_hand += actual_put_in
        room.pot += actual_put_in
        room.min_raise = max(room.min_raise, raise_increment)
        room.current_bet = raise_to
        room.last_raiser_id = player_id
        # Reset acted list — everyone needs to act again
        room.players_acted_this_round = [player_id]
        if player.chips == 0:
            player.status = PlayerStatus.ALL_IN
        event = f"{player.name} raises to {raise_to}"

    elif action.action == ActionType.ALL_IN:
        all_in_amount = player.chips
        player.current_bet += all_in_amount
        player.total_bet_this_hand += all_in_amount
        room.pot += all_in_amount
        player.chips = 0
        player.status = PlayerStatus.ALL_IN
        if player.current_bet > room.current_bet:
            raise_increment = player.current_bet - room.current_bet
            room.min_raise = max(room.min_raise, raise_increment)
            room.current_bet = player.current_bet
            room.last_raiser_id = player_id
            room.players_acted_this_round = [player_id]
        event = f"{player.name} goes ALL-IN for {all_in_amount}"

    # Mark player as having acted
    if player_id not in room.players_acted_this_round:
        room.players_acted_this_round.append(player_id)

    # Check if hand should end (only 1 non-folded player)
    active = room.active_players()
    if len(active) == 1:
        # Last player standing — auto-win
        winner = active[0]
        room.last_pot_awarded = room.pot
        winner.chips += room.pot
        room.pot = 0
        room.phase = RoomPhase.BETWEEN_HANDS
        event += f" — {winner.name} wins the pot of ${room.last_pot_awarded}!"
        return room, event

    # Advance turn or round
    _advance_game(room)

    return room, event


def _advance_game(room: RoomState):
    """Advance to next player or next betting round."""
    actionable = room.actionable_players()

    if len(actionable) == 0:
        # Everyone is all-in or folded — go to showdown
        _go_to_showdown(room)
        return

    # Check if the round is complete:
    # All actionable players have acted AND all current bets match
    all_acted = all(
        p.id in room.players_acted_this_round
        for p in actionable
    )
    all_bets_equal = all(
        p.current_bet == room.current_bet
        for p in actionable
    )

    if all_acted and all_bets_equal:
        _next_betting_round(room)
    else:
        room.current_turn_index = _next_active_seat(room, room.current_turn_index)


def _next_betting_round(room: RoomState):
    """Move to the next betting round or showdown."""
    current_idx = ROUND_ORDER.index(room.betting_round)

    if current_idx >= len(ROUND_ORDER) - 2:  # River -> Showdown
        _go_to_showdown(room)
        return

    room.betting_round = ROUND_ORDER[current_idx + 1]
    room.current_bet = 0
    room.min_raise = room.config.big_blind
    room.players_acted_this_round = []
    room.last_raiser_id = None

    # Reset current bets for the new round
    for p in room.players:
        p.current_bet = 0

    # First to act post-flop: first active player after dealer
    room.current_turn_index = _next_active_seat(room, room.dealer_index)

    # If only 0-1 actionable players, skip to showdown
    if len(room.actionable_players()) <= 1:
        active = room.active_players()
        if len(active) > 1:
            _go_to_showdown(room)


def _go_to_showdown(room: RoomState):
    """Move game to hand resolution (showdown)."""
    room.betting_round = BettingRound.SHOWDOWN
    room.phase = RoomPhase.HAND_RESOLUTION
    _calculate_side_pots(room)


def _calculate_side_pots(room: RoomState):
    """Calculate main pot and side pots based on all-in players."""
    active = room.active_players()
    if not active:
        return

    # Get all unique bet levels from all-in players
    all_in_players = [p for p in active if p.status == PlayerStatus.ALL_IN]
    bet_levels = sorted(set(p.total_bet_this_hand for p in all_in_players))

    if not all_in_players:
        # No side pots needed — single main pot
        room.side_pots = [
            SidePot(
                amount=room.pot,
                eligible_player_ids=[p.id for p in active],
            )
        ]
        return

    # Add the maximum bet level
    max_bet = max(p.total_bet_this_hand for p in active)
    if max_bet not in bet_levels:
        bet_levels.append(max_bet)

    pots: list[SidePot] = []
    prev_level = 0

    for level in bet_levels:
        pot_amount = 0
        eligible = []
        for p in room.players:
            if p.status == PlayerStatus.FOLDED or p.status == PlayerStatus.ELIMINATED:
                contribution = min(p.total_bet_this_hand, level) - min(p.total_bet_this_hand, prev_level)
            else:
                contribution = min(p.total_bet_this_hand, level) - min(p.total_bet_this_hand, prev_level)
                if p.total_bet_this_hand >= level:
                    eligible.append(p.id)
                elif p.total_bet_this_hand > prev_level:
                    eligible.append(p.id)
            pot_amount += contribution

        if pot_amount > 0:
            # Eligible = active players who bet at least this level
            elig = [p.id for p in active if p.total_bet_this_hand >= level]
            if not elig:
                elig = [p.id for p in active if p.total_bet_this_hand > prev_level]
            pots.append(SidePot(amount=pot_amount, eligible_player_ids=elig))
        prev_level = level

    # Filter out or refund uncalled excess bets where only 1 player contributed
    contested_pots: list[SidePot] = []
    for pot in pots:
        if len(pot.eligible_player_ids) == 1:
            # Uncalled excess bet — refund immediately to the sole player
            sole_player = room.get_player(pot.eligible_player_ids[0])
            if sole_player:
                sole_player.chips += pot.amount
                sole_player.total_bet_this_hand -= pot.amount
                room.pot -= pot.amount
                if sole_player.status == PlayerStatus.ALL_IN and sole_player.chips > 0:
                    sole_player.status = PlayerStatus.ACTIVE
        elif len(pot.eligible_player_ids) > 1 and pot.amount > 0:
            contested_pots.append(pot)

    room.side_pots = contested_pots if contested_pots else [
        SidePot(amount=room.pot, eligible_player_ids=[p.id for p in active])
    ]


def resolve_hand(
    room: RoomState,
    winner_ids: Optional[list[str]] = None,
    pot_winners: Optional[list[dict]] = None,
) -> tuple[RoomState, str]:
    """
    Resolve the hand by distributing pots to winners.
    Supports either:
      - pot_winners: [{"pot_index": 0, "winner_ids": ["p1"]}, ...]
      - winner_ids: ranked or single list of winners
    """
    if not room.side_pots:
        room.side_pots = [
            SidePot(
                amount=room.pot,
                eligible_player_ids=[p.id for p in room.active_players()],
            )
        ]

    events = []

    if pot_winners:
        # User specified winners explicitly per pot
        for entry in pot_winners:
            idx = entry.get("pot_index", 0)
            wids = entry.get("winner_ids", [])
            if 0 <= idx < len(room.side_pots):
                pot = room.side_pots[idx]
                eligible = [w for w in wids if w in pot.eligible_player_ids]
                if not eligible:
                    eligible = pot.eligible_player_ids
                if eligible:
                    share = pot.amount // len(eligible)
                    rem = pot.amount % len(eligible)
                    for i, wid in enumerate(eligible):
                        p = room.get_player(wid)
                        if p:
                            amt = share + (1 if i < rem else 0)
                            p.chips += amt
                            events.append(f"{p.name} won {amt} from Pot #{idx + 1}")
    else:
        # winner_ids given (ranked order of strength)
        winner_ids = winner_ids or []
        for idx, pot in enumerate(room.side_pots):
            # Pick highest ranking eligible winner
            pot_chosen_winners = []
            for wid in winner_ids:
                if wid in pot.eligible_player_ids:
                    pot_chosen_winners.append(wid)
                    break  # Highest ranked takes the pot (unless chopped)

            if not pot_chosen_winners:
                pot_chosen_winners = [
                    w for w in winner_ids if w in pot.eligible_player_ids
                ] or pot.eligible_player_ids

            if pot_chosen_winners:
                share = pot.amount // len(pot_chosen_winners)
                rem = pot.amount % len(pot_chosen_winners)
                for i, wid in enumerate(pot_chosen_winners):
                    p = room.get_player(wid)
                    if p:
                        amt = share + (1 if i < rem else 0)
                        p.chips += amt
                        events.append(f"{p.name} won {amt} from Pot #{idx + 1}")

    total_awarded = sum(pot.amount for pot in room.side_pots) if room.side_pots else room.pot
    room.last_pot_awarded = total_awarded

    room.pot = 0
    room.side_pots = []
    room.phase = RoomPhase.BETWEEN_HANDS

    # Update player statuses: anyone with 0 chips is eliminated, active players restored
    for p in room.players:
        if p.chips == 0:
            p.status = PlayerStatus.ELIMINATED
        elif p.status in (PlayerStatus.ALL_IN, PlayerStatus.ACTIVE):
            p.status = PlayerStatus.ACTIVE

    # Check if tournament / match is finished (only 1 player with chips)
    active_survivors = [p for p in room.players if p.chips > 0]
    if len(active_survivors) <= 1:
        room.phase = RoomPhase.FINISHED
        if active_survivors:
            events.append(f"🏆 {active_survivors[0].name} has won the tournament with all chips!")

    return room, " | ".join(events)

