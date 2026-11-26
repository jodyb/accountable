from tests import factories as f


def test_crud(client):
    org = f.org(
        client,
        "Atlas Engineering",
        website="atlas-eng.com",
        industry="Engineering",
        notes="Five offices",
    )
    assert org["name"] == "Atlas Engineering" and org["website"] == "atlas-eng.com"

    got = f.ok(client.get(f"/api/organizations/{org['id']}"))
    assert got["industry"] == "Engineering" and got["contacts"] == [] and got["deals"] == []

    edited = f.ok(
        client.patch(
            f"/api/organizations/{org['id']}", json={"name": "Atlas Engineering Ltd", "notes": None}
        )
    )
    assert (
        edited["name"] == "Atlas Engineering Ltd"
        and edited["notes"] is None
        and edited["website"] == "atlas-eng.com"
    )

    rows = f.ok(client.get("/api/organizations"))
    assert [r["name"] for r in rows] == ["Atlas Engineering Ltd"]

    f.ok(client.delete(f"/api/organizations/{org['id']}"), 204)
    assert client.get(f"/api/organizations/{org['id']}").status_code == 404


def test_name_required(client):
    for body in ({}, {"name": ""}, {"name": "   "}):
        response = client.post("/api/organizations", json=body)
        assert response.status_code == 422
        assert "name" in response.json()["errors"]


def test_list_rows_count_contacts_and_open_deals(client):
    org = f.org(client)
    f.contact(client, organization_id=org["id"])
    f.deal(client, "Open", organization_id=org["id"], value_cents=500_00)
    f.deal(client, "Won one", organization_id=org["id"], stage="Won", value_cents=900_00)
    row = f.ok(client.get("/api/organizations"))[0]
    assert (row["contact_count"], row["open_deal_count"], row["open_value_cents"]) == (1, 1, 500_00)


def test_detail_includes_contacts_and_deals(client):
    org = f.org(client)
    c = f.contact(client, "Sofia Lindqvist", organization_id=org["id"])
    d = f.deal(client, organization_id=org["id"], contact_id=c["id"])
    detail = f.ok(client.get(f"/api/organizations/{org['id']}"))
    assert [x["id"] for x in detail["contacts"]] == [c["id"]]
    assert [x["id"] for x in detail["deals"]] == [d["id"]]
    assert detail["deals"][0]["contact_name"] == "Sofia Lindqvist"


def test_delete_keeps_contacts_and_deals_with_no_organization(client):
    org = f.org(client)
    c = f.contact(client, organization_id=org["id"])
    d = f.deal(client, organization_id=org["id"])
    f.ok(client.delete(f"/api/organizations/{org['id']}"), 204)
    assert f.ok(client.get(f"/api/contacts/{c['id']}"))["organization_id"] is None
    assert f.ok(client.get(f"/api/deals/{d['id']}"))["organization_id"] is None


def test_delete_impact_counts(client):
    org = f.org(client)
    for name in ("A", "B"):
        f.contact(client, name, organization_id=org["id"])
    for name in ("X", "Y", "Z"):
        f.deal(client, name, organization_id=org["id"])
    impact = f.ok(client.get(f"/api/organizations/{org['id']}/delete-impact"))
    assert impact == {"contacts": 2, "deals": 3, "activities": 0}
