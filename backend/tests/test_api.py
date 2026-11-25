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
