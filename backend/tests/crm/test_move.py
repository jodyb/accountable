"""POST /deals/{id}/move: order within and between columns."""

import pytest

from tests import factories as f


@pytest.fixture
def board(client):
    """New: A B C D (top to bottom), Qualified: P Q R."""
    ids = {}
    for name in "DCBA":
        ids[name] = f.deal(client, name)["id"]
    for name in "RQP":
        ids[name] = f.deal(client, name, stage="Qualified")["id"]
    return ids


def positions(board_json, stage):
    col = next(c for c in board_json["columns"] if c["stage"] == stage)
    return [d["position"] for d in col["deals"]]


def test_response_is_the_updated_board(client, board):
    response = f.move(client, board["A"], "New", 2)
    assert {c["stage"] for c in response["columns"]} == {
        "New",
        "Qualified",
        "Proposal",
        "Negotiation",
        "Won",
        "Lost",
    }
    assert response == f.ok(client.get("/api/pipeline"))


@pytest.mark.parametrize(
    "name,index,expected",
    [
        ("D", 0, "DABC"),  # bottom to top
        ("A", 3, "BCDA"),  # top to bottom
        ("A", 1, "BACD"),  # down one
        ("D", 2, "ABDC"),  # into the middle
        ("B", 1, "ABCD"),  # same place
        ("A", 99, "BCDA"),  # past the end goes last
    ],
)
def test_within_a_column(client, board, name, index, expected):
    result = f.move(client, board[name], "New", index)
    assert "".join(f.column(result, "New")) == expected
    assert positions(result, "New") == [0, 1, 2, 3]


@pytest.mark.parametrize("index,expected", [(0, "BPQR"), (1, "PBQR"), (2, "PQBR"), (3, "PQRB")])
def test_between_columns(client, board, index, expected):
    result = f.move(client, board["B"], "Qualified", index)
    assert "".join(f.column(result, "Qualified")) == expected
    assert "".join(f.column(result, "New")) == "ACD"
    assert positions(result, "Qualified") == [0, 1, 2, 3]
    assert positions(result, "New") == [0, 1, 2]


def test_into_an_empty_column(client, board):
    result = f.move(client, board["C"], "Proposal", 5)
    assert f.column(result, "Proposal") == ["C"]
    assert positions(result, "Proposal") == [0]


def test_order_survives_a_fresh_read(client, board):
    f.move(client, board["D"], "New", 1)
    f.move(client, board["P"], "New", 4)
    fresh = f.ok(client.get("/api/pipeline"))
    assert "".join(f.column(fresh, "New")) == "ADBCP"
    assert "".join(f.column(fresh, "Qualified")) == "QR"


def test_unknown_stage_is_rejected_and_changes_nothing(client, board):
    before = f.ok(client.get("/api/pipeline"))
    response = client.post(
        f"/api/deals/{board['A']}/move", json={"stage": "Pending", "index": 0, "today": f.TODAY}
    )
    assert response.status_code == 422
    assert f.ok(client.get("/api/pipeline")) == before


def test_negative_index_is_rejected(client, board):
    response = client.post(
        f"/api/deals/{board['A']}/move", json={"stage": "New", "index": -1, "today": f.TODAY}
    )
    assert response.status_code == 422
