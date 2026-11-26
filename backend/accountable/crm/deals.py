"""Deals: routes and queries, stage changes, and card positions.

The move route lives in pipeline.py because it answers with the board; the
position logic it uses is here.
"""

from datetime import date

from fastapi import APIRouter, Response
from sqlalchemy import Connection, delete, func, insert, select, update

from accountable.crm import schemas, stages
from accountable.crm.contacts import check_organization, get_contact
from accountable.crm.queries import activity_query, deal_query, newest_first
from accountable.crm.tables import activities, contacts, deals, organizations
from accountable.db import Conn, insert_id, one_or_404
from accountable.errors import FieldError

router = APIRouter(prefix="/deals", tags=["deals"])


def get_deal(conn: Connection, deal_id: int):
    return one_or_404(conn, deal_query().where(deals.c.id == deal_id), "Deal")


def check_contact(conn: Connection, contact_id: int | None) -> None:
    if (
        contact_id is not None
        and conn.scalar(select(contacts.c.id).where(contacts.c.id == contact_id)) is None
    ):
        raise FieldError("contact_id", "That contact doesn't exist.")


def check_deal(conn: Connection, deal_id: int | None) -> None:
    if deal_id is not None and conn.scalar(select(deals.c.id).where(deals.c.id == deal_id)) is None:
        raise FieldError("deal_id", "That deal doesn't exist.")


# ---- Positions ----


def column_ids(conn: Connection, stage: str, exclude: int | None = None) -> list[int]:
    stmt = select(deals.c.id).where(deals.c.stage == stage).order_by(deals.c.position, deals.c.id)
    if exclude is not None:
        stmt = stmt.where(deals.c.id != exclude)
    return list(conn.scalars(stmt))


def write_positions(conn: Connection, ids: list[int]) -> None:
    """Number a column 0..n in the given order."""
    for position, deal_id in enumerate(ids):
        conn.execute(update(deals).where(deals.c.id == deal_id).values(position=position))


def place(conn: Connection, deal_id: int, stage: str, index: int) -> None:
    ids = column_ids(conn, stage, exclude=deal_id)
    ids.insert(min(index, len(ids)), deal_id)
    write_positions(conn, ids)


# ---- Stage changes ----


def change_stage(conn: Connection, deal, new_stage: str, today: date) -> None:
    """Apply R21: probability, close date, timeline entry, and customer on Won."""
    conn.execute(
        update(deals)
        .where(deals.c.id == deal["id"])
        .values(**stages.stage_change_updates(new_stage, today))
    )
    conn.execute(
        insert(activities).values(
            type="stage_change",
            deal_id=deal["id"],
            contact_id=deal["contact_id"],
            description=stages.stage_change_message(deal["stage"], new_stage),
            occurred_on=today,
        )
    )
    if stages.makes_customer(new_stage) and deal["contact_id"] is not None:
        conn.execute(
            update(contacts).where(contacts.c.id == deal["contact_id"]).values(status="customer")
        )


def move_deal(conn: Connection, deal_id: int, stage: str, index: int, today: date) -> None:
    deal = get_deal(conn, deal_id)
    old_stage = deal["stage"]
    if stage != old_stage:
        change_stage(conn, deal, stage, today)
    place(conn, deal_id, stage, index)
    if stage != old_stage:
        write_positions(conn, column_ids(conn, old_stage))


# ---- Routes ----


@router.get("", response_model=list[schemas.Deal])
def list_deals(conn: Conn):
    return conn.execute(deal_query().order_by(deals.c.close_date, deals.c.name)).mappings().all()


@router.post("", response_model=schemas.Deal, status_code=201)
def create_deal(body: schemas.DealIn, conn: Conn):
    """A new deal takes its stage's probability unless one is given, and goes to the top of its column.

    A deal created already Won or Lost is closed: it gets today's close date unless
    one is given, and Won makes its main contact a customer, as a move would. No
    stage-change entry is written, because the stage didn't change.
    """
    check_organization(conn, body.organization_id)
    check_contact(conn, body.contact_id)
    values = body.model_dump(exclude={"today"})
    if values["probability"] is None:
        values["probability"] = stages.DEFAULT_PROBABILITY[body.stage]
    if body.stage in ("Won", "Lost") and values["close_date"] is None:
        values["close_date"] = body.today or date.today()
    deal_id = insert_id(conn, insert(deals).values(**values, position=0))
    if stages.makes_customer(body.stage) and body.contact_id is not None:
        conn.execute(
            update(contacts).where(contacts.c.id == body.contact_id).values(status="customer")
        )
    place(conn, deal_id, body.stage, 0)
    return get_deal(conn, deal_id)


@router.get("/{deal_id}", response_model=schemas.DealDetail)
def read_deal(deal_id: int, conn: Conn):
    deal = get_deal(conn, deal_id)
    org = None
    if deal["organization_id"] is not None:
        org = (
            conn.execute(select(organizations).where(organizations.c.id == deal["organization_id"]))
            .mappings()
            .first()
        )
    contact = None
    if deal["contact_id"] is not None:
        contact = get_contact(conn, deal["contact_id"])
    last = conn.scalar(
        select(func.max(activities.c.occurred_on)).where(activities.c.deal_id == deal_id)
    )
    return {**deal, "organization": org, "contact": contact, "last_activity_on": last}


@router.patch("/{deal_id}", response_model=schemas.Deal)
def update_deal(deal_id: int, body: schemas.DealPatch, conn: Conn):
    """A stage change here follows the same rules as a move on the board.

    The deal goes to the top of its new column, and the probability becomes the
    new stage's default even if one was sent.
    """
    deal = get_deal(conn, deal_id)
    changes = body.changes(exclude={"today"})
    if "organization_id" in changes:
        check_organization(conn, changes["organization_id"])
    if "contact_id" in changes:
        check_contact(conn, changes["contact_id"])

    new_stage = changes.pop("stage", deal["stage"])
    stage_changed = new_stage != deal["stage"]
    if stage_changed:
        changes.pop("probability", None)
        if "close_date" in changes and new_stage in ("Won", "Lost"):
            changes.pop("close_date")
    if changes:
        conn.execute(update(deals).where(deals.c.id == deal_id).values(**changes))
    if stage_changed:
        # Re-read so the timeline entry and customer rule use the new main contact.
        change_stage(conn, get_deal(conn, deal_id), new_stage, body.today or date.today())
        place(conn, deal_id, new_stage, 0)
        write_positions(conn, column_ids(conn, deal["stage"]))
    return get_deal(conn, deal_id)


@router.get("/{deal_id}/timeline", response_model=list[schemas.Activity])
def deal_timeline(deal_id: int, conn: Conn):
    get_deal(conn, deal_id)
    return (
        conn.execute(newest_first(activity_query().where(activities.c.deal_id == deal_id)))
        .mappings()
        .all()
    )


@router.get("/{deal_id}/delete-impact", response_model=schemas.DeleteImpact)
def deal_delete_impact(deal_id: int, conn: Conn):
    get_deal(conn, deal_id)
    return {"activities": conn.scalar(select(func.count()).where(activities.c.deal_id == deal_id))}


@router.delete("/{deal_id}", status_code=204)
def delete_deal(deal_id: int, conn: Conn):
    """Deletes its activities, stage changes included (CASCADE)."""
    deal = get_deal(conn, deal_id)
    conn.execute(delete(deals).where(deals.c.id == deal_id))
    write_positions(conn, column_ids(conn, deal["stage"]))
    return Response(status_code=204)
