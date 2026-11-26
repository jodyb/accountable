"""CRM tables: organizations, contacts, deals and activities.

Revision ID: 0001
Revises:
Create Date: 2026-11-24 11:14:42.548003

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("website", sa.String(length=300), nullable=True),
        sa.Column("industry", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_organizations")),
    )
    op.create_table(
        "contacts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=300), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("job_title", sa.String(length=200), nullable=True),
        sa.Column("organization_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="lead", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "status IN ('lead', 'qualified', 'customer')", name=op.f("ck_contacts_status")
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_contacts_organization_id_organizations"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_contacts")),
    )
    with op.batch_alter_table("contacts", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_contacts_organization_id"), ["organization_id"], unique=False
        )

    op.create_table(
        "deals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=True),
        sa.Column("contact_id", sa.Integer(), nullable=True),
        sa.Column("stage", sa.String(length=20), nullable=False),
        sa.Column("value_cents", sa.Integer(), nullable=False),
        sa.Column("probability", sa.Integer(), nullable=False),
        sa.Column("close_date", sa.Date(), nullable=True),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "stage IN ('New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost')",
            name=op.f("ck_deals_stage"),
        ),
        sa.CheckConstraint(
            "probability >= 0 AND probability <= 100", name=op.f("ck_deals_probability")
        ),
        sa.CheckConstraint("value_cents >= 0", name=op.f("ck_deals_value_cents")),
        sa.ForeignKeyConstraint(
            ["contact_id"],
            ["contacts.id"],
            name=op.f("fk_deals_contact_id_contacts"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_deals_organization_id_organizations"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_deals")),
    )
    with op.batch_alter_table("deals", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_deals_contact_id"), ["contact_id"], unique=False)
        batch_op.create_index(
            batch_op.f("ix_deals_organization_id"), ["organization_id"], unique=False
        )
        batch_op.create_index("ix_deals_stage_position", ["stage", "position"], unique=False)

    op.create_table(
        "activities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("contact_id", sa.Integer(), nullable=True),
        sa.Column("deal_id", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("occurred_on", sa.Date(), nullable=False),
        sa.Column("follow_up_on", sa.Date(), nullable=True),
        sa.Column("done", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "type IN ('note', 'call', 'email', 'stage_change')", name=op.f("ck_activities_type")
        ),
        sa.CheckConstraint(
            "contact_id IS NOT NULL OR deal_id IS NOT NULL",
            name=op.f("ck_activities_contact_or_deal"),
        ),
        sa.ForeignKeyConstraint(
            ["contact_id"],
            ["contacts.id"],
            name=op.f("fk_activities_contact_id_contacts"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["deal_id"], ["deals.id"], name=op.f("fk_activities_deal_id_deals"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_activities")),
    )
    with op.batch_alter_table("activities", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_activities_contact_id"), ["contact_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_activities_deal_id"), ["deal_id"], unique=False)
        batch_op.create_index(
            batch_op.f("ix_activities_occurred_on"), ["occurred_on"], unique=False
        )


def downgrade() -> None:
    """Downgrade schema."""

    with op.batch_alter_table("activities", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_activities_occurred_on"))
        batch_op.drop_index(batch_op.f("ix_activities_deal_id"))
        batch_op.drop_index(batch_op.f("ix_activities_contact_id"))

    op.drop_table("activities")
    with op.batch_alter_table("deals", schema=None) as batch_op:
        batch_op.drop_index("ix_deals_stage_position")
        batch_op.drop_index(batch_op.f("ix_deals_organization_id"))
        batch_op.drop_index(batch_op.f("ix_deals_contact_id"))

    op.drop_table("deals")
    with op.batch_alter_table("contacts", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_contacts_organization_id"))

    op.drop_table("contacts")
    op.drop_table("organizations")
