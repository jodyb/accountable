"""Foreign keys are on, and check constraints guard the data."""

from datetime import date

import pytest
from sqlalchemy import insert, select, text
from sqlalchemy.exc import IntegrityError

from accountable.crm.tables import activities, contacts, deals, organizations


def test_foreign_keys_are_on_for_every_connection(engine):
    for _ in range(3):
        with engine.connect() as conn:
            assert conn.execute(text("PRAGMA foreign_keys")).scalar() == 1


def test_foreign_key_to_missing_row_is_rejected(engine):
    with pytest.raises(IntegrityError), engine.begin() as conn:
        conn.execute(insert(contacts).values(name="Ghost", organization_id=999))


DEAL = {"name": "Deal", "stage": "New", "value_cents": 100, "probability": 10}


@pytest.mark.parametrize(
    "table,values",
    [
        (deals, {**DEAL, "value_cents": -1}),
        (deals, {**DEAL, "probability": -1}),
        (deals, {**DEAL, "probability": 101}),
        (deals, {**DEAL, "stage": "Pending"}),
        (contacts, {"name": "X", "status": "prospect"}),
        (
            activities,
            {
                "type": "meeting",
                "description": "x",
                "occurred_on": date(2026, 1, 1),
                "deal_id": None,
            },
        ),
        (activities, {"type": "note", "description": "x", "occurred_on": date(2026, 1, 1)}),
    ],
    ids=[
        "negative value",
        "probability below 0",
        "probability above 100",
        "unknown stage",
        "unknown status",
        "unknown activity type",
        "activity with no contact or deal",
    ],
)
def test_check_constraints_reject_bad_values(engine, table, values):
    if table is activities and values["type"] == "meeting":
        with engine.begin() as conn:
            values = {
                **values,
                "contact_id": conn.execute(insert(contacts).values(name="C")).inserted_primary_key[
                    0
                ],
            }
    with pytest.raises(IntegrityError), engine.begin() as conn:
        conn.execute(insert(table).values(**values))


def test_money_is_stored_as_integer_cents(engine):
    with engine.begin() as conn:
        conn.execute(insert(deals).values(**{**DEAL, "value_cents": 4_850_000}))
        stored = conn.execute(text("SELECT typeof(value_cents), value_cents FROM deals")).one()
    assert tuple(stored) == ("integer", 4_850_000)


def test_status_defaults_to_lead(engine):
    with engine.begin() as conn:
        conn.execute(insert(organizations).values(name="Org"))
        conn.execute(insert(contacts).values(name="Person"))
        assert conn.scalar(select(contacts.c.status)) == "lead"
