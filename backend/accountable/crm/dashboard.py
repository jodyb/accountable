"""Dashboard figures, computed from live data for the browser's 'today'."""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import Connection, select

from accountable.crm import schemas, stages
from accountable.crm.queries import activity_query, newest_first
from accountable.crm.tables import activities, deals
from accountable.db import get_conn

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

RECENT_LIMIT = 10


def month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def last_12_months(today: date) -> list[str]:
    """Month keys, oldest first, ending with today's month."""
    keys = []
    year, month = today.year, today.month
    for _ in range(12):
        keys.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    return keys[::-1]


def build_dashboard(conn: Connection, today: date) -> dict:
    all_deals = conn.execute(select(deals)).mappings().all()
    months = last_12_months(today)
    in_window = set(months)

    open_deals = [d for d in all_deals if stages.is_open(d["stage"])]
    closed_12m = [
        d for d in all_deals
        if d["stage"] in ("Won", "Lost") and d["close_date"] and month_key(d["close_date"]) in in_window
    ]
    won_12m = [d for d in closed_12m if d["stage"] == "Won"]
    lost_12m = [d for d in closed_12m if d["stage"] == "Lost"]
    won_this_month = [d for d in won_12m if month_key(d["close_date"]) == months[-1]]

    series = {m: {"month": m, "revenue_cents": 0, "won_count": 0} for m in months}
    for d in won_12m:
        bucket = series[month_key(d["close_date"])]
        bucket["revenue_cents"] += d["value_cents"]
        bucket["won_count"] += 1

    funnel = []
    for i, stage in enumerate(stages.FUNNEL_STAGES):
        reached = [d for d in all_deals if d["stage"] in stages.FUNNEL_STAGES[i:]]
        funnel.append({"stage": stage, "count": len(reached), "value_cents": sum(d["value_cents"] for d in reached)})

    closed = len(won_12m) + len(lost_12m)
    kpis = {
        "open_value_cents": sum(d["value_cents"] for d in open_deals),
        "open_expected_cents": sum(stages.expected_cents(d["value_cents"], d["probability"]) for d in open_deals),
        "open_count": len(open_deals),
        "won_this_month_cents": sum(d["value_cents"] for d in won_this_month),
        "won_this_month_count": len(won_this_month),
        "win_rate": round(100 * len(won_12m) / closed) if closed else None,
        "won_12m_count": len(won_12m),
        "lost_12m_count": len(lost_12m),
        "late_count": sum(1 for d in open_deals if stages.is_late(d["stage"], d["close_date"], today)),
    }

    recent = conn.execute(newest_first(activity_query()).limit(RECENT_LIMIT)).mappings().all()
    follow_ups = conn.execute(
        activity_query()
        .where(activities.c.follow_up_on.is_not(None), activities.c.done.is_(False))
        .order_by(activities.c.follow_up_on, activities.c.id)
    ).mappings().all()

    return {
        "today": today,
        "kpis": kpis,
        "months": list(series.values()),
        "funnel": funnel,
        "recent_activity": recent,
        "follow_ups": [{**f, "overdue": f["follow_up_on"] < today} for f in follow_ups],
    }


@router.get("", response_model=schemas.Dashboard)
def read_dashboard(today: date | None = None, conn: Connection = Depends(get_conn)):
    return build_dashboard(conn, today or date.today())
