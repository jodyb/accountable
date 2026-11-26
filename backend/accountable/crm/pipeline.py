"""The pipeline board, and moving a card on it."""

from collections.abc import Sequence

from fastapi import APIRouter
from sqlalchemy import Connection, RowMapping

from accountable.crm import schemas, stages
from accountable.crm.deals import move_deal
from accountable.crm.queries import deal_query
from accountable.crm.tables import deals
from accountable.db import Conn

router = APIRouter(tags=["pipeline"])


def value_cents(cards: Sequence[RowMapping]) -> int:
    return sum(c["value_cents"] for c in cards)


def expected_cents(cards: Sequence[RowMapping]) -> float:
    return sum(stages.expected_cents(c["value_cents"], c["probability"]) for c in cards)


def build_board(conn: Connection) -> dict:
    rows = conn.execute(deal_query().order_by(deals.c.position, deals.c.id)).mappings().all()
    columns = []
    for stage in stages.STAGES:
        cards = [r for r in rows if r["stage"] == stage]
        columns.append(
            {
                "stage": stage,
                "count": len(cards),
                "value_cents": value_cents(cards),
                "expected_cents": expected_cents(cards),
                "deals": cards,
            }
        )
    open_deals = [r for r in rows if stages.is_open(r["stage"])]
    return {
        "columns": columns,
        "open_value_cents": value_cents(open_deals),
        "open_expected_cents": expected_cents(open_deals),
    }


@router.get("/pipeline", response_model=schemas.Board)
def read_pipeline(conn: Conn):
    return build_board(conn)


@router.post("/deals/{deal_id}/move", response_model=schemas.Board, tags=["deals"])
def move(deal_id: int, body: schemas.MoveIn, conn: Conn):
    """Change stage (if different) and place the card at index in that column."""
    move_deal(conn, deal_id, body.stage, body.index, body.today)
    return build_board(conn)
