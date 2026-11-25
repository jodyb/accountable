"""The sample data has the counts and mix R34 asks for."""

import re
from collections import Counter
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from accountable import db
from accountable.crm import seed
from accountable.crm.tables import activities, contacts, deals, organizations
from accountable.main import create_app

TODAY = date(2026, 11, 24)


def rows(conn, table):
    return conn.execute(select(table).order_by(table.c.id)).mappings().all()


@pytest.fixture
def seeded(engine):
    with engine.begin() as conn:
        seed.load(conn, TODAY)
    with engine.connect() as conn:
        yield {t.name: rows(conn, t) for t in (organizations, contacts, deals, activities)}


def months_ago(d: date) -> int:
    return (TODAY.year - d.year) * 12 + TODAY.month - d.month


def test_organizations(seeded):
    orgs = seeded["organizations"]
    assert 13 <= len(orgs) <= 17
    assert len({o["industry"] for o in orgs}) >= 6


def test_contacts_cover_every_status(seeded):
    people = seeded["contacts"]
    assert len(people) == 40
    assert set(Counter(c["status"] for c in people)) == {"lead", "qualified", "customer"}


def test_deals_cover_every_stage(seeded):
    ds = seeded["deals"]
    assert len(ds) == 40
    assert set(d["stage"] for d in ds) == {"New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"}


def test_won_and_lost_spread_across_the_past_12_months(seeded):
    closed = [d for d in seeded["deals"] if d["stage"] in ("Won", "Lost")]
    ages = {months_ago(d["close_date"]) for d in closed}
    assert all(0 <= a <= 11 for a in ages)
    assert len(ages) >= 9
    assert all(d["close_date"] <= TODAY for d in closed)
    assert any(months_ago(d["close_date"]) == 0 for d in closed if d["stage"] == "Won")


def test_open_deals_close_in_coming_months_and_a_few_are_late(seeded):
    open_deals = [d for d in seeded["deals"] if d["stage"] not in ("Won", "Lost")]
    late = [d for d in open_deals if d["close_date"] < TODAY]
    assert 3 <= len(late) <= 5
    future = [d for d in open_deals if d["close_date"] >= TODAY]
    assert len({months_ago(d["close_date"]) for d in future}) >= 3


def test_won_deals_main_contacts_are_customers(seeded):
    status = {c["id"]: c["status"] for c in seeded["contacts"]}
    assert all(status[d["contact_id"]] == "customer" for d in seeded["deals"] if d["stage"] == "Won")


def test_positions_are_0_to_n_in_each_column(seeded):
    by_stage: dict[str, list[int]] = {}
    for d in seeded["deals"]:
        by_stage.setdefault(d["stage"], []).append(d["position"])
    assert all(sorted(p) == list(range(len(p))) for p in by_stage.values())


def test_activities(seeded):
    acts = seeded["activities"]
    assert 80 <= len(acts) <= 130
    types = Counter(a["type"] for a in acts)
    assert all(types[t] >= 10 for t in ("note", "call", "email"))
    assert types["stage_change"] > 0
    assert all(a["occurred_on"] <= TODAY for a in acts)
    assert all(a["follow_up_on"] is None for a in acts if a["type"] == "stage_change")


def test_follow_ups_overdue_and_due_this_week(seeded):
    pending = [a for a in seeded["activities"] if a["follow_up_on"] and not a["done"]]
    overdue = [a for a in pending if a["follow_up_on"] < TODAY]
    this_week = [a for a in pending if TODAY <= a["follow_up_on"] <= TODAY + timedelta(days=7)]
    assert len(overdue) >= 3
    assert len(this_week) >= 3
    assert any(a["done"] and a["follow_up_on"] for a in seeded["activities"])


def test_no_placeholder_text(seeded):
    text = " ".join(
        str(v) for table in seeded.values() for row in table for v in row.values() if isinstance(v, str)
    ).lower()
    for word in ("lorem", "ipsum", "foo", "test", "example", "placeholder", "todo", "{", "}"):
        assert not re.search(rf"\b{re.escape(word)}\b", text) if word.isalpha() else word not in text, word


def test_same_output_twice_for_the_same_today(engine):
    def snapshot():
        with engine.begin() as conn:
            seed.reset(conn)
            seed.load(conn, TODAY)
        with engine.connect() as conn:
            return {t.name: [dict(r) for r in rows(conn, t)] for t in (organizations, contacts, deals, activities)}

    assert snapshot() == snapshot()


def test_reset_replaces_existing_data(engine):
    with engine.begin() as conn:
        seed.load(conn, TODAY)
        conn.execute(organizations.insert().values(name="Added by hand"))
        seed.reset(conn)
        seed.load(conn, TODAY)
    with engine.connect() as conn:
        names = [o["name"] for o in rows(conn, organizations)]
    assert "Added by hand" not in names and len(names) == len(seed.ORGANIZATIONS)


def test_dashboard_has_figures_for_every_widget(engine, client):
    with engine.begin() as conn:
        seed.load(conn, TODAY)
    d = client.get(f"/api/dashboard?today={TODAY}").json()
    k = d["kpis"]
    assert k["open_value_cents"] > 0 and k["open_expected_cents"] > 0
    assert k["won_this_month_count"] > 0 and k["win_rate"] is not None
    assert sum(m["won_count"] for m in d["months"]) > 0
    assert all(s["value_cents"] > 0 for s in d["funnel"])
    assert len(d["recent_activity"]) == 10
    assert len(d["follow_ups"]) >= 6


def test_missing_database_is_created_and_seeded_on_start(tmp_path, monkeypatch):
    path = tmp_path / "fresh" / "accountable.db"
    monkeypatch.setenv("ACCOUNTABLE_DB", str(path))
    with TestClient(create_app()) as client:
        assert len(client.get("/api/organizations").json()) == len(seed.ORGANIZATIONS)
    assert path.exists()


def test_existing_database_is_left_alone_on_start(db_file):
    engine = db.make_engine(db_file)
    with engine.begin() as conn:
        conn.execute(organizations.insert().values(name="Only one"))
    engine.dispose()
    with TestClient(create_app()) as client:
        assert [o["name"] for o in client.get("/api/organizations").json()] == ["Only one"]
