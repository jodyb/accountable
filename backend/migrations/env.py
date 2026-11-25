"""Alembic environment. Reads the shared metadata and ACCOUNTABLE_DB."""

from logging.config import fileConfig

from alembic import context

import accountable.crm.tables  # noqa: F401  registers the CRM tables on the metadata
from accountable.db import make_engine, metadata

cfg = context.config
if cfg.config_file_name and not cfg.attributes.get("engine"):
    fileConfig(cfg.config_file_name, disable_existing_loggers=False)


def run() -> None:
    engine = cfg.attributes.get("engine") or make_engine()
    with engine.begin() as conn:
        context.configure(
            connection=conn,
            target_metadata=metadata,
            render_as_batch=True,  # SQLite needs batch mode to alter columns
            compare_type=True,
        )
        context.run_migrations()


if context.is_offline_mode():
    raise SystemExit("Offline migrations are not supported.")
run()
