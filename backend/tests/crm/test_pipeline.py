from tests import factories as f


def test_six_columns_in_stage_order_with_cards_in_position_order(client):
    f.deal(client, "Second")
    f.deal(client, "First")
    board = f.ok(client.get("/api/pipeline"))
    assert [c["stage"] for c in board["columns"]] == ["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]
    assert f.column(board, "New") == ["First", "Second"]


def test_column_count_total_and_expected_revenue(client):
    f.deal(client, "A", stage="Proposal", value_cents=10_000_00)
    f.deal(client, "B", stage="Proposal", value_cents=5_000_01)
    f.deal(client, "C", stage="Proposal", value_cents=2_000_00, probability=40)
    col = next(c for c in f.ok(client.get("/api/pipeline"))["columns"] if c["stage"] == "Proposal")
    assert col["count"] == 3
    assert col["value_cents"] == 17_000_01
    assert col["expected_cents"] == 10_000_00 * 0.5 + 5_000_01 * 0.5 + 2_000_00 * 0.4


def test_board_totals_cover_open_stages_only(client):
    for stage, value in [("New", 100), ("Qualified", 200), ("Proposal", 300), ("Negotiation", 400), ("Won", 5000), ("Lost", 7000)]:
        f.deal(client, stage, stage=stage, value_cents=value)
    board = f.ok(client.get("/api/pipeline"))
    assert board["open_value_cents"] == 1000
    assert board["open_expected_cents"] == 100 * 0.1 + 200 * 0.25 + 300 * 0.5 + 400 * 0.75


def test_empty_board(client):
    board = f.ok(client.get("/api/pipeline"))
    assert all(c["count"] == 0 and c["deals"] == [] for c in board["columns"])
    assert board["open_value_cents"] == 0
