"""Stage rules as plain functions. Deals and the pipeline use these."""

from datetime import date
from typing import Literal

Stage = Literal["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]

STAGES: tuple[Stage, ...] = ("New", "Qualified", "Proposal", "Negotiation", "Won", "Lost")
OPEN_STAGES: tuple[Stage, ...] = ("New", "Qualified", "Proposal", "Negotiation")
FUNNEL_STAGES: tuple[Stage, ...] = ("New", "Qualified", "Proposal", "Negotiation", "Won")

DEFAULT_PROBABILITY: dict[str, int] = {
    "New": 10,
    "Qualified": 25,
    "Proposal": 50,
    "Negotiation": 75,
    "Won": 100,
    "Lost": 0,
}


def is_open(stage: str) -> bool:
    return stage in OPEN_STAGES


def is_late(stage: str, close_date: date | None, today: date) -> bool:
    """An open deal whose close date has passed."""
    return is_open(stage) and close_date is not None and close_date < today


def expected_cents(value_cents: int, probability: int) -> float:
    """Value times probability. Not rounded: the frontend rounds once, at display."""
    return value_cents * probability / 100


def stage_change_message(old: str, new: str) -> str:
    return f"Moved from {old} to {new}"


def stage_change_updates(new_stage: str, today: date) -> dict:
    """Column updates for a deal moving to new_stage (the caller checks it changed).

    Probability always takes the new stage's default, so a hand-set probability
    lasts until the next stage change. Won and Lost set the close date to today.
    Leaving Won or Lost reverts nothing.
    """
    updates: dict = {"stage": new_stage, "probability": DEFAULT_PROBABILITY[new_stage]}
    if new_stage in ("Won", "Lost"):
        updates["close_date"] = today
    return updates


def makes_customer(new_stage: str) -> bool:
    return new_stage == "Won"
