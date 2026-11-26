"""Engine, shared metadata and the connection dependency."""

from collections.abc import Iterator
from pathlib import Path
from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy import Connection, Engine, Insert, MetaData, create_engine, event

from accountable import config

# Named constraints so Alembic batch mode can find them on SQLite.
metadata = MetaData(
    naming_convention={
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }
)


def _enable_foreign_keys(dbapi_conn, _record) -> None:
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA foreign_keys=ON")
    cur.close()


def make_engine(path: Path | None = None) -> Engine:
    path = path or config.db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(config.db_url(path), connect_args={"check_same_thread": False})
    event.listen(engine, "connect", _enable_foreign_keys)
    return engine


_engine: Engine | None = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = make_engine()
    return _engine


def set_engine(engine: Engine | None) -> None:
    global _engine
    _engine = engine


def one_or_404(conn: Connection, stmt, what: str):
    """Run a select for one row, or answer 404 naming the record type."""
    row = conn.execute(stmt).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail=f"{what} not found")
    return row


def insert_id(conn: Connection, stmt: Insert) -> int:
    """Run an insert and return the new row's id."""
    key = conn.execute(stmt).inserted_primary_key
    if key is None:
        raise RuntimeError("insert returned no primary key")
    return key[0]


def get_conn() -> Iterator[Connection]:
    """One transaction per request. Sign-in will attach the current user here later."""
    with get_engine().begin() as conn:
        yield conn


# The request's connection, for route parameters.
Conn = Annotated[Connection, Depends(get_conn)]
