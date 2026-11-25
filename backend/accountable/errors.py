"""Error responses: 422 with one message per field, 404 for missing records."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

MESSAGES = {
    "missing": "Required.",
    "string_too_short": "Required.",
    "literal_error": "Choose one of the listed options.",
    "int_parsing": "Enter a whole number.",
    "int_from_float": "Enter a whole number.",
    "date_from_datetime_parsing": "Enter a date as YYYY-MM-DD.",
    "date_parsing": "Enter a date as YYYY-MM-DD.",
    "greater_than_equal": "Can't be negative.",
    "less_than_equal": "Too large.",
    "extra_forbidden": "Not a field of this record.",
}


class FieldError(Exception):
    """A rule the schema can't check alone, such as a link to a missing record."""

    def __init__(self, field: str, message: str):
        self.errors = {field: message}


def _response(errors: dict[str, str]) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": "Check the highlighted fields.", "errors": errors})


def _field_name(loc: tuple) -> str:
    parts = [str(p) for p in loc if p not in ("body", "query", "path")]
    return ".".join(parts) or "body"


def _message(err: dict) -> str:
    if err["type"] == "value_error":
        return str(err["msg"]).removeprefix("Value error, ")
    if err["type"] in ("less_than_equal", "greater_than_equal") and err.get("ctx"):
        limit = err["ctx"].get("le", err["ctx"].get("ge"))
        word = "at most" if err["type"] == "less_than_equal" else "at least"
        return f"Must be {word} {limit}."
    return MESSAGES.get(err["type"], err["msg"])


def install(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def _validation(_req: Request, exc: RequestValidationError) -> JSONResponse:
        errors: dict[str, str] = {}
        for err in exc.errors():
            errors.setdefault(_field_name(err["loc"]), _message(err))
        return _response(errors)

    @app.exception_handler(FieldError)
    async def _field(_req: Request, exc: FieldError) -> JSONResponse:
        return _response(exc.errors)
