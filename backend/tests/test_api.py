"""Behaviour shared by every route: 404s, 422s, timestamps and date format."""

import re
import time

import pytest

from tests import factories as f

MISSING = [
    ("get", "/api/organizations/999"),
    ("patch", "/api/organizations/999"),
    ("delete", "/api/organizations/999"),
    ("get", "/api/organizations/999/delete-impact"),
    ("get", "/api/contacts/999"),
    ("patch", "/api/contacts/999"),
    ("delete", "/api/contacts/999"),
    ("get", "/api/contacts/999/delete-impact"),
    ("get", "/api/contacts/999/timeline"),
    ("get", "/api/deals/999"),
    ("patch", "/api/deals/999"),
    ("delete", "/api/deals/999"),
    ("get", "/api/deals/999/delete-impact"),
    ("get", "/api/deals/999/timeline"),
    ("post", "/api/deals/999/move"),
    ("get", "/api/activities/999"),
    ("patch", "/api/activities/999"),
    ("delete", "/api/activities/999"),
]


@pytest.mark.parametrize("method,path", MISSING)
def test_missing_record_is_404(client, method, path):
    body = {"stage": "New", "index": 0, "today": f.TODAY} if path.endswith("/move") else {}
    kwargs = {"json": body} if method in ("post", "patch") else {}
    response = getattr(client, method)(path, **kwargs)
    assert response.status_code == 404
    assert response.json()["detail"].endswith("not found")


def test_a_huge_value_is_a_field_error_not_a_crash(client):
    response = client.post("/api/deals", json={"name": "Huge", "value_cents": 10**20})
    assert response.status_code == 422
    assert response.json()["errors"] == {"value_cents": "Must be at most 100000000000000."}
    assert client.post("/api/deals", json={"name": "Max", "value_cents": 10**14}).status_code == 201


def test_other_local_pages_are_not_allowed_to_call_the_api(client):
    """The browser reaches the API through Vite's proxy, so no origin needs CORS."""
    origin = {"Origin": "http://localhost:3000"}
    assert (
        "access-control-allow-origin"
        not in client.get("/api/organizations", headers=origin).headers
    )
    preflight = client.options(
        "/api/organizations", headers={**origin, "Access-Control-Request-Method": "POST"}
    )
    assert "access-control-allow-origin" not in preflight.headers


@pytest.mark.parametrize("host", ["localhost", "127.0.0.1", "localhost:8000", "127.0.0.1:5173"])
def test_local_host_names_are_answered(client, host):
    assert client.get("/api/health", headers={"Host": host}).status_code == 200


@pytest.mark.parametrize(
    "host", ["attacker.example", "attacker.example:8000", "localhost.attacker.example"]
)
def test_other_host_names_are_refused_against_dns_rebinding(client, host):
    assert client.get("/api/organizations", headers={"Host": host}).status_code == 400


def test_invalid_input_is_422_with_a_message_per_field(client):
    response = client.post("/api/deals", json={"name": "", "stage": "Pending", "value_cents": -5})
    assert response.status_code == 422
    errors = response.json()["errors"]
    assert set(errors) == {"name", "stage", "value_cents"}
    assert errors["name"] == "Enter a deal name."
    assert all(isinstance(m, str) and m for m in errors.values())


def test_missing_required_field_is_422(client):
    response = client.post("/api/deals", json={"name": "No value"})
    assert response.status_code == 422
    assert response.json()["errors"] == {"value_cents": "Required."}


def test_patch_cannot_clear_a_required_field(client):
    org = f.org(client)
    response = client.patch(f"/api/organizations/{org['id']}", json={"name": None})
    assert response.status_code == 422
    assert response.json()["errors"] == {"name": "Required."}


def test_unknown_link_is_422(client):
    response = client.post("/api/contacts", json={"name": "A", "organization_id": 999})
    assert response.status_code == 422
    assert "organization_id" in response.json()["errors"]


def test_created_at_set_and_updated_at_changes_on_edit(client):
    org = f.org(client)
    assert org["created_at"] and org["updated_at"]
    assert org["created_at"].endswith("Z")
    time.sleep(0.01)
    edited = f.ok(client.patch(f"/api/organizations/{org['id']}", json={"industry": "Engineering"}))
    assert edited["created_at"] == org["created_at"]
    assert edited["updated_at"] > org["updated_at"]


def test_dates_are_returned_as_yyyy_mm_dd(client):
    deal = f.deal(client, close_date="2027-01-08")
    assert deal["close_date"] == "2027-01-08"
    act = f.activity(client, deal_id=deal["id"], follow_up_on="2026-12-01")
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", act["occurred_on"])
    assert act["follow_up_on"] == "2026-12-01"


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}
