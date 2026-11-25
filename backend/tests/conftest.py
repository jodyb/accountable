"""Each test gets its own migrated temp database and a test client on it."""

import os
import shutil
import tempfile
from pathlib import Path

# Before anything imports the app: never let a test touch the real database.
os.environ["ACCOUNTABLE_DB"] = str(Path(tempfile.mkdtemp(prefix="accountable-tests-")) / "unused.db")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from accountable import db, migrate  # noqa: E402
from accountable.main import create_app  # noqa: E402
from tests.factories import LOCAL  # noqa: E402


@pytest.fixture(scope="session")
def template_db(tmp_path_factory) -> Path:
    """Migrated once, copied for each test."""
    path = tmp_path_factory.mktemp("template") / "template.db"
    engine = db.make_engine(path)
    migrate.upgrade(engine)
    engine.dispose()
    return path


@pytest.fixture
def db_file(template_db, tmp_path, monkeypatch) -> Path:
    path = tmp_path / "test.db"
    shutil.copy(template_db, path)
    monkeypatch.setenv("ACCOUNTABLE_DB", str(path))
    return path


@pytest.fixture
def engine(db_file):
    eng = db.make_engine(db_file)
    db.set_engine(eng)
    yield eng
    eng.dispose()
    db.set_engine(None)


@pytest.fixture
def client(engine) -> TestClient:
    """No lifespan: the database is already migrated and empty."""
    return TestClient(create_app(), base_url=LOCAL)
