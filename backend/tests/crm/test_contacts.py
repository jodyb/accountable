from tests import factories as f


def test_crud(client):
    org = f.org(client)
    c = f.contact(client, "Maya Okafor", email="maya@northwind.co", phone="(206) 555-0142",
                  job_title="Head of Operations", organization_id=org["id"], status="qualified")
    assert c["organization_name"] == "Atlas Engineering" and c["status"] == "qualified"

    edited = f.ok(client.patch(f"/api/contacts/{c['id']}", json={"status": "customer", "organization_id": None}))
    assert edited["status"] == "customer" and edited["organization_id"] is None and edited["email"] == "maya@northwind.co"

    assert [x["name"] for x in f.ok(client.get("/api/contacts"))] == ["Maya Okafor"]
    f.ok(client.delete(f"/api/contacts/{c['id']}"), 204)
    assert client.get(f"/api/contacts/{c['id']}").status_code == 404


def test_name_required(client):
    response = client.post("/api/contacts", json={"name": " "})
    assert response.status_code == 422
    assert response.json()["errors"] == {"name": "Enter a name."}


def test_status_defaults_to_lead(client):
    assert f.contact(client)["status"] == "lead"


def test_unknown_status_rejected(client):
    assert client.post("/api/contacts", json={"name": "A", "status": "vip"}).status_code == 422


def test_filter_by_status(client):
    f.contact(client, "Lena Lead")
    f.contact(client, "Quinn Qualified", status="qualified")
    f.contact(client, "Cora Customer", status="customer")
    for status, name in [("lead", "Lena Lead"), ("qualified", "Quinn Qualified"), ("customer", "Cora Customer")]:
        assert [c["name"] for c in f.ok(client.get(f"/api/contacts?status={status}"))] == [name]
    assert len(f.ok(client.get("/api/contacts"))) == 3


def test_detail_includes_organization_and_deals(client):
    org = f.org(client)
    c = f.contact(client, organization_id=org["id"])
    d = f.deal(client, contact_id=c["id"])
    detail = f.ok(client.get(f"/api/contacts/{c['id']}"))
    assert detail["organization"]["name"] == "Atlas Engineering"
    assert [x["id"] for x in detail["deals"]] == [d["id"]]


def test_detail_with_no_organization(client):
    c = f.contact(client)
    assert f.ok(client.get(f"/api/contacts/{c['id']}"))["organization"] is None


def test_delete_removes_activities_and_keeps_deals_with_no_main_contact(client):
    c = f.contact(client)
    d = f.deal(client, contact_id=c["id"])
    a = f.activity(client, contact_id=c["id"])
    f.ok(client.delete(f"/api/contacts/{c['id']}"), 204)
    assert client.get(f"/api/activities/{a['id']}").status_code == 404
    assert f.ok(client.get(f"/api/deals/{d['id']}"))["contact_id"] is None


def test_delete_impact_counts(client):
    c = f.contact(client)
    d = f.deal(client, contact_id=c["id"])
    f.deal(client, "Second", contact_id=c["id"])
    for i in range(3):
        f.activity(client, f"Call {i}", contact_id=c["id"])
    f.activity(client, "On the deal only", deal_id=d["id"])
    impact = f.ok(client.get(f"/api/contacts/{c['id']}/delete-impact"))
    assert impact == {"contacts": 0, "deals": 2, "activities": 3}
