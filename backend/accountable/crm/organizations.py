"""Organizations: routes and queries."""

from fastapi import APIRouter, Response
from sqlalchemy import Connection, delete, func, insert, select, update

from accountable.crm import schemas
from accountable.crm.queries import contact_query, deal_query
from accountable.crm.stages import OPEN_STAGES
from accountable.crm.tables import contacts, deals, organizations
from accountable.db import Conn, insert_id, one_or_404

router = APIRouter(prefix="/organizations", tags=["organizations"])


def get_organization(conn: Connection, org_id: int):
    return one_or_404(
        conn, select(organizations).where(organizations.c.id == org_id), "Organization"
    )


@router.get("", response_model=list[schemas.OrganizationRow])
def list_organizations(conn: Conn):
    contact_count = (
        select(func.count())
        .where(contacts.c.organization_id == organizations.c.id)
        .scalar_subquery()
    )
    open_deals = deals.c.organization_id == organizations.c.id, deals.c.stage.in_(OPEN_STAGES)
    open_count = select(func.count()).where(*open_deals).scalar_subquery()
    open_value = (
        select(func.coalesce(func.sum(deals.c.value_cents), 0)).where(*open_deals).scalar_subquery()
    )
    stmt = select(
        organizations,
        contact_count.label("contact_count"),
        open_count.label("open_deal_count"),
        open_value.label("open_value_cents"),
    ).order_by(organizations.c.name)
    return conn.execute(stmt).mappings().all()


@router.post("", response_model=schemas.Organization, status_code=201)
def create_organization(body: schemas.OrganizationIn, conn: Conn):
    org_id = insert_id(conn, insert(organizations).values(**body.model_dump()))
    return get_organization(conn, org_id)


@router.get("/{org_id}", response_model=schemas.OrganizationDetail)
def read_organization(org_id: int, conn: Conn):
    org = get_organization(conn, org_id)
    org_contacts = (
        conn.execute(
            contact_query().where(contacts.c.organization_id == org_id).order_by(contacts.c.name)
        )
        .mappings()
        .all()
    )
    org_deals = (
        conn.execute(
            deal_query()
            .where(deals.c.organization_id == org_id)
            .order_by(deals.c.close_date, deals.c.name)
        )
        .mappings()
        .all()
    )
    return {**org, "contacts": org_contacts, "deals": org_deals}


@router.patch("/{org_id}", response_model=schemas.Organization)
def update_organization(org_id: int, body: schemas.OrganizationPatch, conn: Conn):
    get_organization(conn, org_id)
    changes = body.changes()
    if changes:
        conn.execute(update(organizations).where(organizations.c.id == org_id).values(**changes))
    return get_organization(conn, org_id)


@router.get("/{org_id}/delete-impact", response_model=schemas.DeleteImpact)
def organization_delete_impact(org_id: int, conn: Conn):
    get_organization(conn, org_id)
    n_contacts = conn.scalar(select(func.count()).where(contacts.c.organization_id == org_id))
    n_deals = conn.scalar(select(func.count()).where(deals.c.organization_id == org_id))
    return {"contacts": n_contacts, "deals": n_deals}


@router.delete("/{org_id}", status_code=204)
def delete_organization(org_id: int, conn: Conn):
    """Its contacts and deals stay, with no organization (foreign keys SET NULL)."""
    get_organization(conn, org_id)
    conn.execute(delete(organizations).where(organizations.c.id == org_id))
    return Response(status_code=204)
