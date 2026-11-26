"""Contacts: routes and queries."""

from fastapi import APIRouter, Response
from sqlalchemy import Connection, delete, func, insert, or_, select, update

from accountable.crm import schemas
from accountable.crm.queries import activity_query, contact_query, deal_query, newest_first
from accountable.crm.tables import activities, contacts, deals, organizations
from accountable.db import Conn, insert_id, one_or_404
from accountable.errors import FieldError

router = APIRouter(prefix="/contacts", tags=["contacts"])


def get_contact(conn: Connection, contact_id: int):
    return one_or_404(conn, contact_query().where(contacts.c.id == contact_id), "Contact")


def check_organization(conn: Connection, org_id: int | None) -> None:
    if (
        org_id is not None
        and conn.scalar(select(organizations.c.id).where(organizations.c.id == org_id)) is None
    ):
        raise FieldError("organization_id", "That organization doesn't exist.")


@router.get("", response_model=list[schemas.Contact])
def list_contacts(conn: Conn, status: schemas.Status | None = None):
    stmt = contact_query().order_by(contacts.c.name)
    if status:
        stmt = stmt.where(contacts.c.status == status)
    return conn.execute(stmt).mappings().all()


@router.post("", response_model=schemas.Contact, status_code=201)
def create_contact(body: schemas.ContactIn, conn: Conn):
    check_organization(conn, body.organization_id)
    contact_id = insert_id(conn, insert(contacts).values(**body.model_dump()))
    return get_contact(conn, contact_id)


@router.get("/{contact_id}", response_model=schemas.ContactDetail)
def read_contact(contact_id: int, conn: Conn):
    contact = get_contact(conn, contact_id)
    org = None
    if contact["organization_id"] is not None:
        org = (
            conn.execute(
                select(organizations).where(organizations.c.id == contact["organization_id"])
            )
            .mappings()
            .first()
        )
    contact_deals = (
        conn.execute(
            deal_query()
            .where(deals.c.contact_id == contact_id)
            .order_by(deals.c.close_date, deals.c.name)
        )
        .mappings()
        .all()
    )
    return {**contact, "organization": org, "deals": contact_deals}


@router.patch("/{contact_id}", response_model=schemas.Contact)
def update_contact(contact_id: int, body: schemas.ContactPatch, conn: Conn):
    get_contact(conn, contact_id)
    changes = body.changes()
    if "organization_id" in changes:
        check_organization(conn, changes["organization_id"])
    if changes:
        conn.execute(update(contacts).where(contacts.c.id == contact_id).values(**changes))
    return get_contact(conn, contact_id)


@router.get("/{contact_id}/timeline", response_model=list[schemas.Activity])
def contact_timeline(contact_id: int, conn: Conn):
    """Activities on the contact, and on any deal where they are the main contact."""
    get_contact(conn, contact_id)
    their_deals = select(deals.c.id).where(deals.c.contact_id == contact_id)
    stmt = activity_query().where(
        or_(activities.c.contact_id == contact_id, activities.c.deal_id.in_(their_deals))
    )
    return conn.execute(newest_first(stmt)).mappings().all()


@router.get("/{contact_id}/delete-impact", response_model=schemas.DeleteImpact)
def contact_delete_impact(contact_id: int, conn: Conn):
    get_contact(conn, contact_id)
    n_activities = conn.scalar(select(func.count()).where(activities.c.contact_id == contact_id))
    n_deals = conn.scalar(select(func.count()).where(deals.c.contact_id == contact_id))
    return {"activities": n_activities, "deals": n_deals}


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, conn: Conn):
    """Deletes its activities (CASCADE); its deals stay with no main contact (SET NULL).

    An activity linked to both this contact and a deal goes too, because it was
    logged against this contact.
    """
    get_contact(conn, contact_id)
    conn.execute(delete(contacts).where(contacts.c.id == contact_id))
    return Response(status_code=204)
