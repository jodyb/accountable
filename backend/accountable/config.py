"""Settings, read from the environment."""

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB = BACKEND_DIR / "data" / "accountable.db"
ALEMBIC_INI = BACKEND_DIR / "alembic.ini"


def db_path() -> Path:
    """The SQLite file. Tests point ACCOUNTABLE_DB at a temp file."""
    return Path(os.environ.get("ACCOUNTABLE_DB", DEFAULT_DB)).resolve()


def db_url(path: Path | None = None) -> str:
    return f"sqlite:///{path or db_path()}"


def test_mode() -> bool:
    """Enables the e2e reseed route. Only Playwright sets this."""
    return os.environ.get("ACCOUNTABLE_TEST") == "1"
