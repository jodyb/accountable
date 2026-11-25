"""Selects that return records with their linked names, used by several CRM modules."""

from sqlalchemy import Select, select

from accountable.crm.tables import activities, contacts, deals, organizations


def contact_query() -> Select:
    return select(contacts, organizations.c.name.label("organization_name")).select_from(
        contacts.outerjoin(organizations, contacts.c.organization_id == organizations.c.id)
    )


def deal_query() -> Select:
    return select(
        deals,
        organizations.c.name.label("organization_name"),
        contacts.c.name.label("contact_name"),
    ).select_from(
        deals.outerjoin(organizations, deals.c.organization_id == organizations.c.id).outerjoin(
            contacts, deals.c.contact_id == contacts.c.id
        )
    )


def activity_query() -> Select:
    return select(
        activities,
        contacts.c.name.label("contact_name"),
        deals.c.name.label("deal_name"),
    ).select_from(
        activities.outerjoin(contacts, activities.c.contact_id == contacts.c.id).outerjoin(
            deals, activities.c.deal_id == deals.c.id
        )
    )


def newest_first(stmt: Select) -> Select:
    return stmt.order_by(
        activities.c.occurred_on.desc(), activities.c.created_at.desc(), activities.c.id.desc()
    )
