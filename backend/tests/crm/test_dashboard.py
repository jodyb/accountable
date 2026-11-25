"""Dashboard figures against a small fixed dataset and a given today."""

import pytest

from tests import factories as f

TODAY = "2026-11-24"


def dash(client, today=TODAY):
    return f.ok(client.get(f"/api/dashboard?today={today}"))


def closed(client, name, stage, value, close_date):
    d = f.deal(client, name, value_cents=value, stage="Negotiation")
    f.move(client, d["id"], stage, 0, today=close_date)
    return d


@pytest.fixture
def data(client):
    c = f.contact(client, "Maya Okafor")
    f.deal(client, "Open new", value_cents=10_000_00)                         # 10% -> 1,000
    f.deal(client, "Open proposal", stage="Proposal", value_cents=20_000_00)  # 50% -> 10,000
    f.deal(client, "Open late", stage="Negotiation", value_cents=4_000_00, close_date="2026-11-01")  # 75% -> 3,000
    closed(client, "Won this month A", "Won", 30_000_00, "2026-11-03")
    closed(client, "Won this month B", "Won", 5_000_00, "2026-11-24")
    closed(client, "Won in June", "Won", 12_000_00, "2026-06-15")
    closed(client, "Won 11 months ago", "Won", 1_000_00, "2025-12-01")
    closed(client, "Won 12 months ago", "Won", 99_000_00, "2025-11-30")  # outside the window
    closed(client, "Lost in March", "Lost", 8_000_00, "2026-03-10")
    closed(client, "Lost long ago", "Lost", 8_000_00, "2024-01-10")       # outside the window
    return {"contact": c}


def test_kpis(client, data):
    k = dash(client)["kpis"]
    assert k["open_value_cents"] == 34_000_00
    assert k["open_expected_cents"] == 14_000_00
    assert k["open_count"] == 3
    assert (k["won_this_month_cents"], k["won_this_month_count"]) == (35_000_00, 2)
    assert (k["won_12m_count"], k["lost_12m_count"]) == (4, 1)
    assert k["win_rate"] == 80  # 4 / (4 + 1)
    assert k["late_count"] == 1


def test_win_rate_is_null_with_no_closed_deals(client):
    assert dash(client)["kpis"]["win_rate"] is None


def test_twelve_months_ending_with_the_current_month(client, data):
    months = dash(client)["months"]
    assert [m["month"] for m in months] == [
        "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05",
        "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11",
    ]
    by = {m["month"]: m for m in months}
    assert (by["2026-11"]["revenue_cents"], by["2026-11"]["won_count"]) == (35_000_00, 2)
    assert (by["2026-06"]["revenue_cents"], by["2026-06"]["won_count"]) == (12_000_00, 1)
    assert (by["2025-12"]["revenue_cents"], by["2025-12"]["won_count"]) == (1_000_00, 1)
    assert (by["2026-02"]["revenue_cents"], by["2026-02"]["won_count"]) == (0, 0)


def test_months_wrap_across_the_year(client):
    assert [m["month"] for m in dash(client, "2027-01-05")["months"]][-2:] == ["2026-12", "2027-01"]


def test_funnel_is_cumulative_and_excludes_lost(client, data):
    funnel = {s["stage"]: s for s in dash(client)["funnel"]}
    assert list(funnel) == ["New", "Qualified", "Proposal", "Negotiation", "Won"]
    won_total = 30_000_00 + 5_000_00 + 12_000_00 + 1_000_00 + 99_000_00
    assert funnel["Won"] == {"stage": "Won", "count": 5, "value_cents": won_total}
    assert funnel["Negotiation"]["value_cents"] == won_total + 4_000_00
    assert funnel["Proposal"]["value_cents"] == won_total + 4_000_00 + 20_000_00
    assert funnel["Qualified"]["value_cents"] == funnel["Proposal"]["value_cents"]
    assert funnel["New"]["value_cents"] == funnel["Qualified"]["value_cents"] + 10_000_00
    assert funnel["New"]["count"] == 8
    values = [s["value_cents"] for s in funnel.values()]
    assert values == sorted(values, reverse=True)


def test_recent_activity_is_the_latest_ten_including_stage_changes(client, data):
    c = data["contact"]
    for day in range(1, 13):
        f.activity(client, f"Call {day}", contact_id=c["id"], occurred_on=f"2026-10-{day:02d}")
    recent = dash(client)["recent_activity"]
    assert len(recent) == 10
    assert recent[0]["type"] == "stage_change" and recent[0]["description"] == "Moved from Negotiation to Won"
    assert recent[0]["deal_name"] == "Won this month B"
    dates = [a["occurred_on"] for a in recent]
    assert dates == sorted(dates, reverse=True)
    assert any(a["contact_name"] == "Maya Okafor" for a in recent)


def test_follow_ups_overdue_first_then_upcoming_done_excluded(client, data):
    c = data["contact"]["id"]
    for text, due, done in [
        ("Upcoming later", "2026-12-10", False),
        ("Overdue older", "2026-11-10", False),
        ("Due today", TODAY, False),
        ("Overdue recent", "2026-11-23", False),
        ("Done already", "2026-11-20", True),
    ]:
        f.activity(client, text, contact_id=c, follow_up_on=due, done=done, occurred_on="2026-11-01")
    follow_ups = dash(client)["follow_ups"]
    assert [x["description"] for x in follow_ups] == ["Overdue older", "Overdue recent", "Due today", "Upcoming later"]
    assert [x["overdue"] for x in follow_ups] == [True, True, False, False]


def test_marking_a_deal_won_changes_the_next_response(client, data):
    before = dash(client)
    open_new = next(d for d in f.ok(client.get("/api/deals")) if d["name"] == "Open new")
    f.move(client, open_new["id"], "Won", 0, today=TODAY)
    after = dash(client)
    assert after["kpis"]["won_this_month_count"] == before["kpis"]["won_this_month_count"] + 1
    assert after["kpis"]["won_this_month_cents"] == before["kpis"]["won_this_month_cents"] + 10_000_00
    assert after["months"][-1]["revenue_cents"] == before["months"][-1]["revenue_cents"] + 10_000_00
    assert after["funnel"][-1]["count"] == before["funnel"][-1]["count"] + 1
    assert after["kpis"]["open_count"] == before["kpis"]["open_count"] - 1
    assert after["recent_activity"][0]["description"] == "Moved from New to Won"


def test_adding_a_follow_up_or_marking_it_done_changes_the_next_response(client, data):
    a = f.activity(client, "Book onsite demo", contact_id=data["contact"]["id"], follow_up_on="2026-11-26")
    assert [x["description"] for x in dash(client)["follow_ups"]] == ["Book onsite demo"]
    f.ok(client.patch(f"/api/activities/{a['id']}", json={"done": True}))
    assert dash(client)["follow_ups"] == []
