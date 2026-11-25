import pytest

from tests import factories as f


def test_required_fields(client):
    c = f.contact(client)
    response = client.post("/api/activities", json={"contact_id": c["id"]})
    assert response.status_code == 422
    assert {"type", "description", "occurred_on"} <= set(response.json()["errors"])
    blank = client.post("/api/activities", json={"type": "note", "description": "  ", "occurred_on": f.TODAY, "contact_id": c["id"]})
    assert blank.json()["errors"] == {"description": "Enter a description."}


def test_contact_or_deal_required(client):
    response = client.post("/api/activities", json={"type": "note", "description": "x", "occurred_on": f.TODAY})
    assert response.status_code == 422
    assert response.json()["errors"] == {"contact_id": "Choose a contact or a deal."}


def test_cannot_unlink_both_on_edit(client):
    a = f.activity(client, contact_id=f.contact(client)["id"])
    response = client.patch(f"/api/activities/{a['id']}", json={"contact_id": None})
    assert response.status_code == 422


@pytest.mark.parametrize("kind", ["note", "call", "email"])
def test_each_user_type_can_be_created(client, kind):
    assert f.activity(client, type=kind, contact_id=f.contact(client)["id"])["type"] == kind


def test_stage_change_cannot_be_created(client):
    d = f.deal(client)
    response = client.post("/api/activities", json={"type": "stage_change", "description": "Moved", "occurred_on": f.TODAY, "deal_id": d["id"]})
    assert response.status_code == 422


def test_stage_change_cannot_be_edited_or_deleted_and_has_no_follow_up(client):
    d = f.deal(client)
    f.move(client, d["id"], "Qualified")
    entry = f.ok(client.get(f"/api/deals/{d['id']}/timeline"))[0]
    assert entry["type"] == "stage_change" and entry["follow_up_on"] is None
    assert client.patch(f"/api/activities/{entry['id']}", json={"follow_up_on": "2026-12-01"}).status_code == 422
    assert client.patch(f"/api/activities/{entry['id']}", json={"description": "Edited"}).status_code == 422
    assert client.delete(f"/api/activities/{entry['id']}").status_code == 422
    # A user activity can't be turned into one either.
    a = f.activity(client, deal_id=d["id"])
    assert client.patch(f"/api/activities/{a['id']}", json={"type": "stage_change"}).status_code == 422


def test_stage_changes_go_when_the_deal_is_deleted(client):
    d = f.deal(client)
    f.move(client, d["id"], "Qualified")
    entry_id = f.ok(client.get(f"/api/deals/{d['id']}/timeline"))[0]["id"]
    f.ok(client.delete(f"/api/deals/{d['id']}"), 204)
    assert client.get(f"/api/activities/{entry_id}").status_code == 404


def test_timelines_are_newest_first(client):
    c = f.contact(client)
    d = f.deal(client, contact_id=c["id"])
    for day, text in [("2026-11-01", "Oldest"), ("2026-11-20", "Newest"), ("2026-11-10", "Middle")]:
        f.activity(client, text, deal_id=d["id"], contact_id=c["id"], occurred_on=day)
    for path in (f"/api/deals/{d['id']}/timeline", f"/api/contacts/{c['id']}/timeline"):
        assert [a["description"] for a in f.ok(client.get(path))] == ["Newest", "Middle", "Oldest"]


def test_contact_timeline_includes_activities_on_their_deals(client):
    c = f.contact(client)
    d = f.deal(client, contact_id=c["id"])
    f.activity(client, "Direct", contact_id=c["id"], occurred_on="2026-11-02")
    f.activity(client, "On their deal", deal_id=d["id"], occurred_on="2026-11-01")
    other = f.deal(client, "Someone else's")
    f.activity(client, "Elsewhere", deal_id=other["id"])
    descriptions = [a["description"] for a in f.ok(client.get(f"/api/contacts/{c['id']}/timeline"))]
    assert descriptions == ["Direct", "On their deal"]


def test_follow_up_date_and_done_can_be_set_and_changed(client):
    a = f.activity(client, contact_id=f.contact(client)["id"], follow_up_on="2026-12-01")
    assert (a["follow_up_on"], a["done"]) == ("2026-12-01", False)
    a = f.ok(client.patch(f"/api/activities/{a['id']}", json={"follow_up_on": "2026-12-05", "done": True}))
    assert (a["follow_up_on"], a["done"]) == ("2026-12-05", True)
    a = f.ok(client.patch(f"/api/activities/{a['id']}", json={"done": False, "follow_up_on": None}))
    assert (a["follow_up_on"], a["done"]) == (None, False)


def test_edit_and_delete(client):
    c = f.contact(client)
    a = f.activity(client, "Typo", contact_id=c["id"])
    a = f.ok(client.patch(f"/api/activities/{a['id']}", json={"description": "Fixed", "type": "email"}))
    assert (a["description"], a["type"], a["contact_name"]) == ("Fixed", "email", "Sofia Lindqvist")
    f.ok(client.delete(f"/api/activities/{a['id']}"), 204)
    assert f.ok(client.get(f"/api/contacts/{c['id']}/timeline")) == []
