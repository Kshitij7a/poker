"""
Pydantic models and enums for poker game state.
"""
from __future__ import annotations

import enum
import time
import uuid
from typing import Optional

from pydantic import BaseModel, Field


# ── Enums ──────────────────────────────────────────────────────────────
class PlayerStatus(str, enum.Enum):
    WAITING = "waiting"
    ACTIVE = "active"
    FOLDED = "folded"
    ALL_IN = "all_in"
    ELIMINATED = "eliminated"


class BettingRound(str, enum.Enum):
    PRE_FLOP = "pre_flop"
    FLOP = "flop"
    TURN = "turn"
    RIVER = "river"
    SHOWDOWN = "showdown"


class ActionType(str, enum.Enum):
    FOLD = "fold"
    CHECK = "check"
    CALL = "call"
    RAISE = "raise"
    ALL_IN = "all_in"


class RoomPhase(str, enum.Enum):
    LOBBY = "lobby"
    PLAYING = "playing"
    HAND_RESOLUTION = "hand_resolution"
    BETWEEN_HANDS = "between_hands"
    FINISHED = "finished"


# ── Player ─────────────────────────────────────────────────────────────
class Player(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    name: str
    chips: int = 0
    current_bet: int = 0          # bet in the CURRENT betting round
    total_bet_this_hand: int = 0  # total bet across all rounds in this hand
    status: PlayerStatus = PlayerStatus.WAITING
    seat: int = -1
    is_host: bool = False
    connected: bool = True


# ── Side-pot ───────────────────────────────────────────────────────────
class SidePot(BaseModel):
    amount: int = 0
    eligible_player_ids: list[str] = Field(default_factory=list)


# ── Room / Game state ──────────────────────────────────────────────────
class RoomConfig(BaseModel):
    max_players: int = 8
    starting_stack: int = 1000
    small_blind: int = 10
    big_blind: int = 20


class RoomState(BaseModel):
    room_id: str
    join_code: str
    config: RoomConfig = Field(default_factory=RoomConfig)
    phase: RoomPhase = RoomPhase.LOBBY
    players: list[Player] = Field(default_factory=list)

    # positional indices (into players list of *active* seat order)
    dealer_index: int = 0
    small_blind_index: int = 0
    big_blind_index: int = 0
    current_turn_index: int = 0   # index into active_order

    betting_round: BettingRound = BettingRound.PRE_FLOP
    pot: int = 0
    side_pots: list[SidePot] = Field(default_factory=list)
    current_bet: int = 0           # highest bet on the table this round
    min_raise: int = 0             # minimum raise increment

    hand_number: int = 0
    last_pot_awarded: int = 0
    created_at: float = Field(default_factory=time.time)

    # track who has acted this round to know when round is complete
    players_acted_this_round: list[str] = Field(default_factory=list)
    last_raiser_id: Optional[str] = None

    # ── helpers ─────────────────────────────────────────────────────
    def get_player(self, player_id: str) -> Optional[Player]:
        for p in self.players:
            if p.id == player_id:
                return p
        return None

    def active_players(self) -> list[Player]:
        """Players still in the hand (not folded / eliminated)."""
        return [
            p for p in self.players
            if p.status in (PlayerStatus.ACTIVE, PlayerStatus.ALL_IN)
        ]

    def actionable_players(self) -> list[Player]:
        """Players that can still take actions (not folded, not all-in, not eliminated)."""
        return [
            p for p in self.players
            if p.status == PlayerStatus.ACTIVE
        ]

    def seated_players(self) -> list[Player]:
        """All players with assigned seats, sorted by seat number."""
        return sorted(
            [p for p in self.players if p.seat >= 0],
            key=lambda p: p.seat,
        )


# ── WebSocket event payloads ───────────────────────────────────────────
class WSMessage(BaseModel):
    type: str
    payload: dict = Field(default_factory=dict)


class PlayerAction(BaseModel):
    action: ActionType
    amount: int = 0  # only for RAISE
