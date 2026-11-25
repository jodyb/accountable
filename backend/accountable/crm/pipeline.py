"""The pipeline board, and moving a card on it."""

from fastapi import APIRouter, Depends
from sqlalchemy import Connection

from accountable.crm import schemas, stages
from accountable.crm.deals import move_deal
from accountable.crm.queries import deal_query
from accountable.crm.tables import deals
from accountable.db import get_conn

router = APIRouter(tags=["pipeline"])


def build_board(conn: Connection) -> dict:
    rows = conn.execute(deal_query().order_by(deals.c.position, deals.c.id)).mappings().all()
    columns = []
    for stage in stages.STAGES:
        cards = [r for r in rows if r["stage"] == stage]
        columns.append(
            {
                "stage": stage,
                "count": len(cards),
                "value_cents": sum(c["value_cents"] for c in cards),
                "expected_cents": sum(stages.expected_cents(c["value_cents"], c["probability"]) for c in cards),
                "deals": cards,
            }
        )
    open_columns = [c for c in columns if stages.is_open(c["stage"])]
    return {
        "columns": columns,
        "open_value_cents": sum(c["value_cents"] for c in open_columns),
        "open_expected_cents": sum(c["expected_cents"] for c in open_columns),
    }


@router.get("/pipeline", response_model=schemas.Board)
def read_pipeline(conn: Connection = Depends(get_conn)):
    return build_board(conn)


@router.post("/deals/{deal_id}/move", response_model=schemas.Board, tags=["deals"])
def move(deal_id: int, body: schemas.MoveIn, conn: Connection = Depends(get_conn)):
    """Change stage (if different) and place the card at index in that column."""
    move_deal(conn, deal_id, body.stage, body.index, body.today)
    return build_board(conn)
