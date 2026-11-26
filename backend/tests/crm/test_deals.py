from tests import factories as f


def test_crud(client):
    org = f.org(client)
    c = f.contact(client)
    d = f.deal(
        client,
        "ERP integration",
        value_cents=8_600_000,
        organization_id=org["id"],
        contact_id=c["id"],
        close_date="2026-12-18",
    )
    assert d["organization_name"] == "Atlas Engineering" and d["contact_name"] == "Sofia Lindqvist"

    edited = f.ok(
        client.patch(f"/api/deals/{d['id']}", json={"value_cents": 9_000_000, "close_date": None})
    )
    assert (
        edited["value_cents"] == 9_000_000
        and edited["close_date"] is None
        and edited["name"] == "ERP integration"
    )

    assert [x["name"] for x in f.ok(client.get("/api/deals"))] == ["ERP integration"]
    f.ok(client.delete(f"/api/deals/{d['id']}"), 204)
    assert client.get(f"/api/deals/{d['id']}").status_code == 404


def test_name_stage_and_value_required(client):
    errors = client.post("/api/deals", json={"name": "", "value_cents": None}).json()["errors"]
    assert {"name", "value_cents"} <= set(errors)
    response = client.patch(f"/api/deals/{f.deal(client)['id']}", json={"stage": None})
    assert response.json()["errors"] == {"stage": "Required."}


def test_value_sent_and_returned_in_cents(client):
    d = f.deal(client, value_cents=4_850_050)
    assert d["value_cents"] == 4_850_050
    assert (
        client.post("/api/deals", json={"name": "Half cent", "value_cents": 10.5}).status_code
        == 422
    )


def test_new_deal_defaults_to_new_at_10_percent(client):
    d = f.deal(client)
    assert (d["stage"], d["probability"]) == ("New", 10)


def test_deal_created_at_another_stage_takes_its_probability_and_tops_the_column(client):
    first = f.deal(client, "Older", stage="Proposal")
    second = f.deal(client, "Newer", stage="Proposal")
    assert (second["stage"], second["probability"]) == ("Proposal", 50)
    board = f.ok(client.get("/api/pipeline"))
    assert f.column(board, "Proposal") == ["Newer", "Older"]
    assert f.ok(client.get(f"/api/deals/{first['id']}"))["position"] == 1


def test_deal_created_won_closes_today_and_makes_the_contact_a_customer(client):
    c = f.contact(client)
    d = f.deal(client, stage="Won", contact_id=c["id"], today=f.TODAY)
    assert (d["probability"], d["close_date"]) == (100, f.TODAY)
    assert f.ok(client.get(f"/api/contacts/{c['id']}"))["status"] == "customer"
    kpis = f.ok(client.get(f"/api/dashboard?today={f.TODAY}"))["kpis"]
    assert (kpis["won_this_month_count"], kpis["won_12m_count"]) == (1, 1)
    assert f.ok(client.get(f"/api/deals/{d['id']}/timeline")) == []  # no stage change happened


def test_deal_created_lost_closes_today_and_leaves_the_contact(client):
    c = f.contact(client)
    d = f.deal(client, stage="Lost", contact_id=c["id"], today=f.TODAY)
    assert (d["probability"], d["close_date"]) == (0, f.TODAY)
    assert f.ok(client.get(f"/api/contacts/{c['id']}"))["status"] == "lead"
    assert f.ok(client.get(f"/api/dashboard?today={f.TODAY}"))["kpis"]["lost_12m_count"] == 1


def test_deal_created_closed_keeps_a_given_close_date(client):
    d = f.deal(client, stage="Won", close_date="2026-09-03", today=f.TODAY)
    assert d["close_date"] == "2026-09-03"


def test_open_deal_created_without_close_date_has_none(client):
    assert f.deal(client, stage="Proposal", today=f.TODAY)["close_date"] is None


def test_given_probability_is_kept_on_create(client):
    assert f.deal(client, probability=35)["probability"] == 35


def test_detail_includes_organization_and_main_contact(client):
    org = f.org(client)
    c = f.contact(client, organization_id=org["id"])
    d = f.deal(client, organization_id=org["id"], contact_id=c["id"])
    f.activity(client, deal_id=d["id"], occurred_on="2026-11-20")
    detail = f.ok(client.get(f"/api/deals/{d['id']}"))
    assert detail["organization"]["id"] == org["id"]
    assert (
        detail["contact"]["id"] == c["id"]
        and detail["contact"]["organization_name"] == "Atlas Engineering"
    )
    assert detail["last_activity_on"] == "2026-11-20"


def test_delete_removes_its_activities(client):
    d = f.deal(client)
    a = f.activity(client, deal_id=d["id"])
    f.move(client, d["id"], "Qualified")
    f.ok(client.delete(f"/api/deals/{d['id']}"), 204)
    assert client.get(f"/api/activities/{a['id']}").status_code == 404


def test_delete_impact_counts(client):
    d = f.deal(client)
    f.activity(client, deal_id=d["id"])
    f.activity(client, "Second", deal_id=d["id"])
    assert f.ok(client.get(f"/api/deals/{d['id']}/delete-impact")) == {
        "contacts": 0,
        "deals": 0,
        "activities": 2,
    }


def test_delete_closes_the_gap_in_its_column(client):
    _, b, _ = (f.deal(client, n) for n in "ABC")
    f.ok(client.delete(f"/api/deals/{b['id']}"), 204)
    positions = [
        d["position"]
        for d in next(
            col for col in f.ok(client.get("/api/pipeline"))["columns"] if col["stage"] == "New"
        )["deals"]
    ]
    assert positions == [0, 1]
