"""Small helpers that create records through the API and return their JSON."""

from fastapi.testclient import TestClient

TODAY = "2026-11-24"


def ok(response, status: int = 200):
    assert response.status_code == status, response.text
    return response.json() if response.content else None


def org(client: TestClient, name: str = "Atlas Engineering", **kw) -> dict:
    return ok(client.post("/api/organizations", json={"name": name, **kw}), 201)


def contact(client: TestClient, name: str = "Sofia Lindqvist", **kw) -> dict:
    return ok(client.post("/api/contacts", json={"name": name, **kw}), 201)


def deal(client: TestClient, name: str = "Multi-site licence", value_cents: int = 1_000_000, **kw) -> dict:
    return ok(client.post("/api/deals", json={"name": name, "value_cents": value_cents, **kw}), 201)


def activity(client: TestClient, description: str = "Intro call", **kw) -> dict:
    body = {"type": "call", "description": description, "occurred_on": TODAY, **kw}
    return ok(client.post("/api/activities", json=body), 201)


def move(client: TestClient, deal_id: int, stage: str, index: int = 0, today: str = TODAY) -> dict:
    return ok(client.post(f"/api/deals/{deal_id}/move", json={"stage": stage, "index": index, "today": today}))


def column(board: dict, stage: str) -> list[str]:
    return [d["name"] for d in next(c for c in board["columns"] if c["stage"] == stage)["deals"]]
