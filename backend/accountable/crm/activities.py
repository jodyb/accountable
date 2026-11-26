"""Activities: notes, calls and emails, with optional follow-ups.

Stage changes are activities too, but only the system writes them: they can't
be created, edited or deleted here, and they go when their deal is deleted.
"""

from fastapi import APIRouter, Response
from sqlalchemy import Connection, delete, insert, update

from accountable.crm import schemas
from accountable.crm.deals import check_contact, check_deal
from accountable.crm.queries import activity_query
from accountable.crm.tables import activities
from accountable.db import Conn, insert_id, one_or_404
from accountable.errors import FieldError

router = APIRouter(prefix="/activities", tags=["activities"])


def get_activity(conn: Connection, activity_id: int):
    return one_or_404(conn, activity_query().where(activities.c.id == activity_id), "Activity")


def check_links(conn: Connection, contact_id: int | None, deal_id: int | None) -> None:
    if contact_id is None and deal_id is None:
        raise FieldError("contact_id", "Choose a contact or a deal.")
    check_contact(conn, contact_id)
    check_deal(conn, deal_id)


def refuse_stage_change(activity) -> None:
    if activity["type"] == "stage_change":
        raise FieldError("type", "Stage changes are written by the system and can't be changed.")


@router.get("/{activity_id}", response_model=schemas.Activity)
def read_activity(activity_id: int, conn: Conn):
    return get_activity(conn, activity_id)


@router.post("", response_model=schemas.Activity, status_code=201)
def create_activity(body: schemas.ActivityIn, conn: Conn):
    check_links(conn, body.contact_id, body.deal_id)
    activity_id = insert_id(conn, insert(activities).values(**body.model_dump()))
    return get_activity(conn, activity_id)


@router.patch("/{activity_id}", response_model=schemas.Activity)
def update_activity(activity_id: int, body: schemas.ActivityPatch, conn: Conn):
    activity = get_activity(conn, activity_id)
    refuse_stage_change(activity)
    changes = body.changes()
    if "contact_id" in changes or "deal_id" in changes:
        check_links(
            conn,
            changes.get("contact_id", activity["contact_id"]),
            changes.get("deal_id", activity["deal_id"]),
        )
    if changes:
        conn.execute(update(activities).where(activities.c.id == activity_id).values(**changes))
    return get_activity(conn, activity_id)


@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: int, conn: Conn):
    refuse_stage_change(get_activity(conn, activity_id))
    conn.execute(delete(activities).where(activities.c.id == activity_id))
    return Response(status_code=204)
