"""The four CRM tables. Every change here needs a new Alembic migration."""

from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    false,
)

from accountable.db import metadata

STATUSES = ("lead", "qualified", "customer")
STAGES = ("New", "Qualified", "Proposal", "Negotiation", "Won", "Lost")
ACTIVITY_TYPES = ("note", "call", "email", "stage_change")


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _in(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


def _timestamps() -> list[Column]:
    return [
        Column("created_at", DateTime, nullable=False, default=utcnow),
        Column("updated_at", DateTime, nullable=False, default=utcnow, onupdate=utcnow),
    ]


organizations = Table(
    "organizations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    Column("website", String(300)),
    Column("industry", String(100)),
    Column("notes", Text),
    *_timestamps(),
)

contacts = Table(
    "contacts",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    Column("email", String(300)),
    Column("phone", String(50)),
    Column("job_title", String(200)),
    Column("organization_id", Integer, ForeignKey("organizations.id", ondelete="SET NULL"), index=True),
    Column("status", String(20), nullable=False, default="lead", server_default="lead"),
    *_timestamps(),
    CheckConstraint(_in("status", STATUSES), name="status"),
)

deals = Table(
    "deals",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    Column("organization_id", Integer, ForeignKey("organizations.id", ondelete="SET NULL"), index=True),
    Column("contact_id", Integer, ForeignKey("contacts.id", ondelete="SET NULL"), index=True),
    Column("stage", String(20), nullable=False),
    Column("value_cents", Integer, nullable=False),
    Column("probability", Integer, nullable=False),
    Column("close_date", Date),
    Column("position", Integer, nullable=False, default=0, server_default="0"),
    *_timestamps(),
    CheckConstraint(_in("stage", STAGES), name="stage"),
    CheckConstraint("value_cents >= 0", name="value_cents"),
    CheckConstraint("probability >= 0 AND probability <= 100", name="probability"),
    Index("ix_deals_stage_position", "stage", "position"),
)

activities = Table(
    "activities",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("type", String(20), nullable=False),
    Column("contact_id", Integer, ForeignKey("contacts.id", ondelete="CASCADE"), index=True),
    Column("deal_id", Integer, ForeignKey("deals.id", ondelete="CASCADE"), index=True),
    Column("description", Text, nullable=False),
    Column("occurred_on", Date, nullable=False, index=True),
    Column("follow_up_on", Date),
    Column("done", Boolean, nullable=False, default=False, server_default=false()),
    Column("created_at", DateTime, nullable=False, default=utcnow),
    CheckConstraint(_in("type", ACTIVITY_TYPES), name="type"),
    CheckConstraint("contact_id IS NOT NULL OR deal_id IS NOT NULL", name="contact_or_deal"),
)
