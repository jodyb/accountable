"""R19 to R21 and concerns 7, 8 and 10, through both PATCH and move."""

from datetime import date

import pytest

from accountable.crm import stages
from tests import factories as f

DEFAULTS = {"New": 10, "Qualified": 25, "Proposal": 50, "Negotiation": 75, "Won": 100, "Lost": 0}
CLIENT_TODAY = "2026-11-24"  # deliberately not the server's date


def patch_stage(client, deal_id, stage, today=CLIENT_TODAY, **extra):
    return f.ok(
        client.patch(f"/api/deals/{deal_id}", json={"stage": stage, "today": today, **extra})
    )


def move_stage(client, deal_id, stage, today=CLIENT_TODAY):
    f.move(client, deal_id, stage, 0, today)
    return f.ok(client.get(f"/api/deals/{deal_id}"))


CHANGERS = {"patch": patch_stage, "move": move_stage}


def test_default_probabilities():
    assert stages.DEFAULT_PROBABILITY == DEFAULTS


def test_is_late_only_for_open_stage_with_past_close_date():
    today = date(2026, 11, 24)
    assert stages.is_late("Proposal", date(2026, 11, 23), today)
    assert not stages.is_late("Proposal", date(2026, 11, 24), today)
    assert not stages.is_late("Proposal", None, today)
    assert not stages.is_late("Won", date(2026, 1, 1), today)
    assert not stages.is_late("Lost", date(2026, 1, 1), today)


@pytest.mark.parametrize("how", CHANGERS)
@pytest.mark.parametrize("stage", ["Qualified", "Proposal", "Negotiation", "Won", "Lost"])
def test_changing_stage_sets_the_default_probability(client, how, stage):
    d = f.deal(client)
    assert CHANGERS[how](client, d["id"], stage)["probability"] == DEFAULTS[stage]


@pytest.mark.parametrize("how", CHANGERS)
def test_hand_set_probability_kept_until_stage_changes(client, how):
    d = f.deal(client, stage="Proposal")
    edited = f.ok(
        client.patch(f"/api/deals/{d['id']}", json={"probability": 65, "name": "Renamed"})
    )
    assert edited["probability"] == 65
    edited = f.ok(
        client.patch(f"/api/deals/{d['id']}", json={"stage": "Proposal", "probability": 65})
    )
    assert edited["probability"] == 65
    assert CHANGERS[how](client, d["id"], "Negotiation")["probability"] == 75


def test_probability_sent_with_a_stage_change_is_replaced(client):
    d = f.deal(client)
    assert patch_stage(client, d["id"], "Proposal", probability=90)["probability"] == 50


@pytest.mark.parametrize("how", CHANGERS)
@pytest.mark.parametrize("stage", ["Won", "Lost"])
def test_won_or_lost_sets_close_date_to_the_clients_today(client, how, stage):
    d = f.deal(client, close_date="2027-03-01")
    changed = CHANGERS[how](client, d["id"], stage, today="2026-11-24")
    assert changed["close_date"] == "2026-11-24"


def test_client_today_wins_over_server_clock(client):
    d = f.deal(client)
    assert patch_stage(client, d["id"], "Won", today="2031-01-02")["close_date"] == "2031-01-02"


@pytest.mark.parametrize("how", CHANGERS)
def test_won_makes_the_main_contact_a_customer(client, how):
    c = f.contact(client, status="qualified")
    d = f.deal(client, contact_id=c["id"])
    CHANGERS[how](client, d["id"], "Won")
    assert f.ok(client.get(f"/api/contacts/{c['id']}"))["status"] == "customer"


def test_lost_does_not_change_the_contact(client):
    c = f.contact(client, status="qualified")
    d = f.deal(client, contact_id=c["id"])
    move_stage(client, d["id"], "Lost")
    assert f.ok(client.get(f"/api/contacts/{c['id']}"))["status"] == "qualified"


@pytest.mark.parametrize("how", CHANGERS)
def test_won_with_no_main_contact_still_saves(client, how):
    d = f.deal(client)
    assert CHANGERS[how](client, d["id"], "Won")["stage"] == "Won"


@pytest.mark.parametrize("how", CHANGERS)
def test_each_change_writes_one_stage_change_entry(client, how):
    c = f.contact(client)
    d = f.deal(client, contact_id=c["id"], stage="Proposal")
    CHANGERS[how](client, d["id"], "Negotiation")
    timeline = f.ok(client.get(f"/api/deals/{d['id']}/timeline"))
    entries = [a for a in timeline if a["type"] == "stage_change"]
    assert len(entries) == 1
    entry = entries[0]
    assert entry["description"] == "Moved from Proposal to Negotiation"
    assert (entry["deal_id"], entry["contact_id"]) == (d["id"], c["id"])
    assert entry["occurred_on"] == CLIENT_TODAY
    assert entry["follow_up_on"] is None
    assert entry in f.ok(client.get(f"/api/contacts/{c['id']}/timeline"))


def test_no_entry_when_stage_does_not_change(client):
    d = f.deal(client, stage="Proposal")
    f.move(client, d["id"], "Proposal", 0)
    patch_stage(client, d["id"], "Proposal")
    assert f.ok(client.get(f"/api/deals/{d['id']}/timeline")) == []


def test_moving_out_of_won_keeps_close_date_and_customer_status(client):
    c = f.contact(client)
    d = f.deal(client, contact_id=c["id"])
    move_stage(client, d["id"], "Won", today="2026-11-20")
    back = move_stage(client, d["id"], "Negotiation", today="2026-11-24")
    assert back["close_date"] == "2026-11-20"
    assert back["probability"] == 75
    assert f.ok(client.get(f"/api/contacts/{c['id']}"))["status"] == "customer"


def test_patch_stage_change_moves_deal_to_top_of_new_column(client):
    f.deal(client, "Already here", stage="Proposal")
    d = f.deal(client, "Mover")
    patch_stage(client, d["id"], "Proposal")
    assert f.column(f.ok(client.get("/api/pipeline")), "Proposal") == ["Mover", "Already here"]
