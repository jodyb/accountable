"""Migrations build the schema in crm/tables.py, run both ways, and run on start."""

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from fastapi.testclient import TestClient
from sqlalchemy import inspect, insert, select

from accountable import db, migrate
from accountable.crm.tables import organizations
from accountable.main import create_app
from tests.factories import LOCAL

CRM_TABLES = {"organizations", "contacts", "deals", "activities"}


def revisions(engine) -> list[str]:
    script = ScriptDirectory.from_config(migrate.alembic_config(engine))
    return [r.revision for r in reversed(list(script.walk_revisions()))]


def test_upgrade_builds_tables_constraints_and_indexes(tmp_path):
    engine = db.make_engine(tmp_path / "m.db")
    migrate.upgrade(engine)
    insp = inspect(engine)
    assert CRM_TABLES <= set(insp.get_table_names())

    checks = {t: {c["name"] for c in insp.get_check_constraints(t)} for t in CRM_TABLES}
    assert checks["contacts"] == {"ck_contacts_status"}
    assert checks["deals"] == {"ck_deals_stage", "ck_deals_value_cents", "ck_deals_probability"}
    assert checks["activities"] == {"ck_activities_type", "ck_activities_contact_or_deal"}

    deal_indexes = {i["name"] for i in insp.get_indexes("deals")}
    assert {"ix_deals_stage_position", "ix_deals_contact_id", "ix_deals_organization_id"} <= deal_indexes
    fks = {(fk["referred_table"], fk["options"].get("ondelete")) for fk in insp.get_foreign_keys("activities")}
    assert fks == {("contacts", "CASCADE"), ("deals", "CASCADE")}


def test_autogenerate_finds_no_difference(tmp_path):
    engine = db.make_engine(tmp_path / "m.db")
    migrate.upgrade(engine)
    with engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn, opts={"compare_type": True}), db.metadata)
    assert diff == []


def test_every_migration_downgrades_and_upgrades_again(tmp_path):
    engine = db.make_engine(tmp_path / "m.db")
    migrate.upgrade(engine)
    for rev in reversed(revisions(engine)):
        migrate.downgrade(engine, "-1")
        assert rev not in _current(engine)
    assert not CRM_TABLES & set(inspect(engine).get_table_names())
    migrate.upgrade(engine)
    assert CRM_TABLES <= set(inspect(engine).get_table_names())


def _current(engine) -> set[str]:
    with engine.connect() as conn:
        return set(MigrationContext.configure(conn).get_current_heads())


def test_start_upgrades_an_out_of_date_database_and_keeps_its_data(db_file):
    """Migrate to the revision before head, add data, then start the app.

    With a single revision the "previous" one is base, so the data goes in after
    the start-up upgrade instead; once a second migration exists this test
    upgrades across it with data already present.
    """
    engine = db.make_engine(db_file)
    revs = revisions(engine)
    previous = revs[-2] if len(revs) > 1 else "base"
    migrate.downgrade(engine, previous)
    if previous != "base":
        with engine.begin() as conn:
            conn.execute(insert(organizations).values(name="Kept Ltd"))
    engine.dispose()

    with TestClient(create_app(), base_url=LOCAL) as client:  # runs the start-up migration
        if previous == "base":
            client.post("/api/organizations", json={"name": "Kept Ltd"})
    with TestClient(create_app(), base_url=LOCAL) as client:  # a second start leaves data alone
        names = [o["name"] for o in client.get("/api/organizations").json()]
    assert names == ["Kept Ltd"]

    engine = db.make_engine(db_file)
    assert _current(engine) == {revs[-1]}
    with engine.connect() as conn:
        assert conn.scalar(select(organizations.c.name)) == "Kept Ltd"


def test_start_migrates_an_empty_existing_file_without_seeding(tmp_path, monkeypatch):
    path = tmp_path / "empty.db"
    path.touch()
    monkeypatch.setenv("ACCOUNTABLE_DB", str(path))
    with TestClient(create_app(), base_url=LOCAL) as client:
        assert client.get("/api/organizations").json() == []
    assert CRM_TABLES <= set(inspect(db.make_engine(path)).get_table_names())
