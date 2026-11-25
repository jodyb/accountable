"""Builds the FastAPI app. On start it applies pending migrations and seeds a new database."""

from contextlib import asynccontextmanager
from datetime import date

from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy import Connection

from accountable import config, crm, db, errors, migrate
from accountable.crm import schemas, seed


def start_database() -> None:
    """Create and migrate the database file, seeding it only if it is new."""
    is_new = not config.db_path().exists()
    engine = db.make_engine()
    migrate.upgrade(engine)
    if is_new:
        with engine.begin() as conn:
            seed.load(conn, date.today())
    db.set_engine(engine)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    start_database()
    yield
    db.get_engine().dispose()
    db.set_engine(None)


def test_router() -> APIRouter:
    """Only mounted when ACCOUNTABLE_TEST=1, for Playwright to reset its own database."""
    router = APIRouter(prefix="/test", tags=["test"], include_in_schema=False)

    @router.post("/reseed", status_code=204)
    def reseed(body: schemas.ReseedIn, conn: Connection = Depends(db.get_conn)):
        seed.reset(conn)
        seed.load(conn, body.today)

    return router


def create_app() -> FastAPI:
    # No CORS here, and none in Vite (vite.config.ts), so other pages on this
    # computer can't read or change the data through either port.
    app = FastAPI(title="Accountable", version="0.1.0", lifespan=lifespan)
    # Only local host names, so a website using DNS rebinding can't reach the API.
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=list(config.ALLOWED_HOSTS))
    errors.install(app)

    api = APIRouter(prefix="/api")

    @api.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    api.include_router(crm.router)
    if config.test_mode():
        api.include_router(test_router())
    app.include_router(api)
    return app


app = create_app()
