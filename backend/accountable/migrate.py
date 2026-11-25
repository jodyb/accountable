"""Apply Alembic migrations from code (on start, in seed and in tests)."""

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine

from accountable import config


def alembic_config(engine: Engine) -> Config:
    cfg = Config(str(config.ALEMBIC_INI))
    cfg.set_main_option("script_location", str(config.BACKEND_DIR / "migrations"))
    cfg.attributes["engine"] = engine
    return cfg


def upgrade(engine: Engine, revision: str = "head") -> None:
    command.upgrade(alembic_config(engine), revision)


def downgrade(engine: Engine, revision: str) -> None:
    command.downgrade(alembic_config(engine), revision)
