"""Sample data: 15 organizations, 40 contacts, 40 deals and about 100 activities.

Dates are relative to 'today' and the random choices use a fixed seed, so the
same day always gives the same data and the charts never age out.

Usage: uv run python -m accountable.crm.seed --reset [--today YYYY-MM-DD]
"""

import argparse
import random
from datetime import date, datetime, time, timedelta
from pathlib import Path

from sqlalchemy import Connection, delete, insert

from accountable import config, db, migrate
from accountable.crm import stages
from accountable.crm.tables import activities, contacts, deals, organizations

RANDOM_SEED = 20261124

# name, industry, website, notes
ORGANIZATIONS = [
    (
        "Atlas Engineering",
        "Engineering",
        "atlas-eng.com",
        "Civil and structural engineering firm with five offices in the Pacific Northwest. Renewing all site licences in Q1.",
    ),
    (
        "Bluewater Marine",
        "Logistics",
        "bluewatermarine.com",
        "Coastal freight operator with 40 vessels out of Norfolk.",
    ),
    (
        "Brightline Retail",
        "Retail",
        "brightline.shop",
        "Twenty-two stores across the Midwest. The store systems team is small and stretched.",
    ),
    (
        "Cedar & Pine Legal",
        "Legal services",
        "cedarpine.law",
        "Mid-sized law firm. Very careful about where client documents are stored.",
    ),
    (
        "Fernhill Architects",
        "Architecture",
        "fernhill.design",
        "Design studio of about 60 people in Austin.",
    ),
    (
        "Harbor Health",
        "Healthcare",
        "harborhealth.org",
        "Nine clinics in Oregon. Procurement goes through a committee that meets monthly.",
    ),
    (
        "Juniper Foods",
        "Food and beverage",
        "juniperfoods.com",
        "Regional food distributor with three cold-storage warehouses.",
    ),
    (
        "Kestrel Manufacturing",
        "Manufacturing",
        "kestrelmfg.com",
        "Precision parts for aerospace. Two plants in Ohio.",
    ),
    (
        "Northwind Logistics",
        "Logistics",
        "northwind.co",
        "Last-mile delivery for retailers around Seattle. Long-standing customer.",
    ),
    (
        "Orchard Lane Schools",
        "Education",
        "orchardlane.edu",
        "Private school group with four campuses. Budget year starts in July.",
    ),
    (
        "Pioneer Solar",
        "Energy",
        "pioneersolar.io",
        "Residential solar installer growing fast in Arizona.",
    ),
    (
        "Summit Credit Union",
        "Financial services",
        "summitcu.org",
        "Member-owned credit union with 14 branches in Colorado.",
    ),
    (
        "Lakeside Hotels",
        "Hospitality",
        "lakesidehotels.com",
        "Six boutique hotels around the Great Lakes.",
    ),
    (
        "Granite Peak Construction",
        "Construction",
        "granitepeakbuild.com",
        "Commercial builder. Project managers work mostly from site.",
    ),
    (
        "Meridian Dental Group",
        "Healthcare",
        "meridiandental.com",
        "Twelve dental practices sharing one back office.",
    ),
]

# name, job title, organization (None for independents), status, area code
CONTACTS = [
    ("Sofia Lindqvist", "Chief Technology Officer", "Atlas Engineering", "qualified", "425"),
    ("James Whitfield", "Office Manager", "Atlas Engineering", "lead", "425"),
    ("Nina Kowalski", "Head of Finance", "Atlas Engineering", "qualified", "425"),
    ("Leo Martins", "Fleet Manager", "Bluewater Marine", "lead", "757"),
    ("Grace Adeyemi", "Operations Director", "Bluewater Marine", "customer", "757"),
    ("Tom Becker", "Store Systems Lead", "Brightline Retail", "qualified", "312"),
    ("Rachel Stein", "Head of Retail Operations", "Brightline Retail", "lead", "312"),
    ("Megan Foster", "Finance Director", "Brightline Retail", "customer", "312"),
    ("Priya Nair", "Managing Partner", "Cedar & Pine Legal", "customer", "415"),
    ("Andrew Coll", "IT Manager", "Cedar & Pine Legal", "customer", "415"),
    ("Aisha Rahman", "Office Manager", "Fernhill Architects", "lead", "512"),
    ("Mateo Alvarez", "Studio Director", "Fernhill Architects", "qualified", "512"),
    ("Daniel Reyes", "IT Director", "Harbor Health", "qualified", "503"),
    ("Linda Osei", "Chief Operating Officer", "Harbor Health", "lead", "503"),
    ("Kevin Tran", "Procurement Lead", "Harbor Health", "lead", "503"),
    ("Marcus Hale", "Operations Manager", "Juniper Foods", "qualified", "619"),
    ("Elena Petrova", "Warehouse Manager", "Juniper Foods", "customer", "619"),
    ("Owen Fraser", "Chief Information Officer", "Kestrel Manufacturing", "qualified", "614"),
    ("Ravi Patel", "Plant Manager", "Kestrel Manufacturing", "lead", "614"),
    ("Hiroshi Tanaka", "Quality Manager", "Kestrel Manufacturing", "customer", "614"),
    ("Maya Okafor", "Head of Operations", "Northwind Logistics", "customer", "206"),
    ("Chloe Dubois", "Finance Director", "Northwind Logistics", "customer", "206"),
    ("Tyler Brooks", "Dispatch Supervisor", "Northwind Logistics", "lead", "206"),
    ("Hannah Brooks", "Procurement Manager", "Orchard Lane Schools", "lead", "608"),
    ("Samuel Wright", "Head of IT", "Orchard Lane Schools", "qualified", "608"),
    ("Ben Carter", "Founder", "Pioneer Solar", "lead", "480"),
    ("Laura Jensen", "Operations Manager", "Pioneer Solar", "lead", "480"),
    ("Grace Kim", "VP Member Services", "Summit Credit Union", "customer", "720"),
    ("David Mensah", "Head of Branch Operations", "Summit Credit Union", "qualified", "720"),
    ("Jason Reid", "IT Manager", "Summit Credit Union", "lead", "720"),
    ("Olivia Bennett", "General Manager", "Lakeside Hotels", "qualified", "216"),
    ("Peter Novak", "Revenue Manager", "Lakeside Hotels", "lead", "216"),
    ("Isabel Cruz", "Events Manager", "Lakeside Hotels", "customer", "216"),
    ("Carlos Mendoza", "Project Director", "Granite Peak Construction", "lead", "303"),
    ("Fiona Gallagher", "Finance Manager", "Granite Peak Construction", "qualified", "303"),
    ("Sarah Lin", "Practice Operations Manager", "Meridian Dental Group", "customer", "818"),
    ("Michael O'Brien", "Head of IT", "Meridian Dental Group", "lead", "818"),
    ("Emily Zhang", "Independent consultant", None, "lead", "646"),
    ("Jacob Turner", "Freelance project manager", None, "lead", "617"),
    ("Amara Diallo", "Procurement consultant", None, "qualified", "404"),
]

# name, organization, main contact, stage, value in dollars
DEALS = [
    ("Fleet telematics pilot", "Northwind Logistics", "Maya Okafor", "New", 18000),
    ("Clinic scheduling upgrade", "Harbor Health", "Daniel Reyes", "New", 24500),
    ("Annual support renewal", "Cedar & Pine Legal", "Priya Nair", "New", 9600),
    ("Guest Wi-Fi upgrade", "Lakeside Hotels", "Peter Novak", "New", 14200),
    ("Site tablet rollout", "Granite Peak Construction", "Carlos Mendoza", "New", 21000),
    ("Installer scheduling app", "Pioneer Solar", "Ben Carter", "New", 16500),
    ("Warehouse scanners", "Brightline Retail", "Tom Becker", "Qualified", 42000),
    ("Data migration", "Atlas Engineering", "Sofia Lindqvist", "Qualified", 31000),
    ("POS rollout phase 2", "Juniper Foods", "Marcus Hale", "Qualified", 27500),
    ("Staff training package", "Summit Credit Union", "Grace Kim", "Qualified", 12000),
    ("Campus network refresh", "Orchard Lane Schools", "Samuel Wright", "Qualified", 58000),
    ("Booking system integration", "Lakeside Hotels", "Olivia Bennett", "Qualified", 23000),
    ("ERP integration", "Kestrel Manufacturing", "Owen Fraser", "Proposal", 86000),
    ("Patient portal", "Harbor Health", "Daniel Reyes", "Proposal", 54000),
    ("Store analytics", "Brightline Retail", "Tom Becker", "Proposal", 38500),
    ("Shared back-office platform", "Meridian Dental Group", "Sarah Lin", "Proposal", 47000),
    ("Project cost tracking", "Granite Peak Construction", "Fiona Gallagher", "Proposal", 29500),
    ("Multi-site licence", "Atlas Engineering", "Sofia Lindqvist", "Negotiation", 120000),
    ("Cold chain monitoring", "Juniper Foods", "Marcus Hale", "Negotiation", 46000),
    ("Branch kiosk software", "Summit Credit Union", "David Mensah", "Negotiation", 39000),
    ("Design workstation leasing", "Fernhill Architects", "Mateo Alvarez", "Negotiation", 33500),
    ("Branch network refresh", "Summit Credit Union", "Grace Kim", "Won", 64000),
    ("Route optimisation", "Northwind Logistics", "Maya Okafor", "Won", 33000),
    ("Document vault", "Cedar & Pine Legal", "Priya Nair", "Won", 15000),
    ("Dispatch dashboard", "Northwind Logistics", "Chloe Dubois", "Won", 22500),
    ("Quality inspection tablets", "Kestrel Manufacturing", "Hiroshi Tanaka", "Won", 41000),
    ("Cold storage sensors", "Juniper Foods", "Elena Petrova", "Won", 36000),
    ("Vessel tracking", "Bluewater Marine", "Grace Adeyemi", "Won", 52000),
    ("Imaging archive", "Meridian Dental Group", "Sarah Lin", "Won", 44500),
    ("E-discovery tools", "Cedar & Pine Legal", "Andrew Coll", "Won", 19500),
    ("Member app refresh", "Summit Credit Union", "Grace Kim", "Won", 71000),
    ("Event booking portal", "Lakeside Hotels", "Isabel Cruz", "Won", 26000),
    ("Payroll integration", "Brightline Retail", "Megan Foster", "Won", 18500),
    ("Maintenance contract", "Northwind Logistics", "Chloe Dubois", "Won", 12000),
    ("Kiosk hardware", "Brightline Retail", "Rachel Stein", "Lost", 22000),
    ("Lab system integration", "Harbor Health", "Linda Osei", "Lost", 40000),
    ("Fleet fuel cards", "Bluewater Marine", "Leo Martins", "Lost", 15500),
    ("Plant floor sensors", "Kestrel Manufacturing", "Ravi Patel", "Lost", 63000),
    ("Classroom devices", "Orchard Lane Schools", "Hannah Brooks", "Lost", 34000),
    ("Solar monitoring portal", "Pioneer Solar", "Laura Jensen", "Lost", 27000),
]

# Months before this one in which each Won and Lost deal closed, in DEALS order.
WON_MONTHS_AGO = [0, 0, 1, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11]
LOST_MONTHS_AGO = [0, 2, 4, 6, 8, 9]
# Open deals running late, and how many days ago they should have closed.
LATE_DAYS = {
    "Store analytics": 22,
    "POS rollout phase 2": 9,
    "Annual support renewal": 4,
    "Design workstation leasing": 15,
}
# A probability set by hand, not the stage default.
HAND_SET_PROBABILITY = {"Cold chain monitoring": 80, "Patient portal": 40}

CALLS = [
    "Discovery call with {first} to map out the current setup",
    "Pricing call with {first} and the finance team",
    "Walked {first} through the {deal} scope",
    "Check-in call. {first} is comparing us with two other vendors",
    "Call with {first} about rollout timing",
    "Demo of the {deal} plan for {first} and the team",
]
EMAILS = [
    "Sent the proposal for the {deal}",
    "Sent a revised quote with three-year pricing",
    "Shared a case study from a similar {industry} customer",
    "Emailed {first} the implementation timeline",
    "Sent the contract for signature",
    "Answered {first}'s questions from the demo",
]
NOTES = [
    "{first} wants this live before the end of the quarter",
    "Budget approved, waiting on procurement",
    "{first} needs board sign-off for anything over $25,000 USD",
    "A competitor quoted 15% lower, without support",
    "Decision pushed back two weeks while {first} is travelling",
    "Keen on a pilot at one site first",
]
LEAD_NOTES = [
    ("call", "Intro call with {first}. Interested, but no budget until next year"),
    ("email", "Sent {first} our overview and pricing sheet"),
    ("note", "Met {first} at the regional trade show"),
]


def months_ago(today: date, n: int) -> tuple[int, int]:
    month = today.month - n
    year = today.year
    while month <= 0:
        month += 12
        year -= 1
    return year, month


def day_in_month(rng: random.Random, today: date, n: int) -> date:
    """A random day n months before today's month, never after today."""
    year, month = months_ago(today, n)
    last = today.day if n == 0 else 28
    return date(year, month, rng.randint(1, last))


def stamp(d: date) -> datetime:
    return datetime.combine(d, time(9, 0))


def email_for(name: str, website: str | None) -> str:
    first, *rest = name.lower().replace("'", "").split()
    return f"{first}.{''.join(rest)}@{website or 'fastmail.com'}"


def reset(conn: Connection) -> None:
    for table in (activities, deals, contacts, organizations):
        conn.execute(delete(table))


def load(conn: Connection, today: date) -> None:
    rng = random.Random(RANDOM_SEED)

    org_ids: dict[str, int] = {}
    websites: dict[str, str] = {}
    industries: dict[str, str] = {}
    for name, industry, website, notes in ORGANIZATIONS:
        created = today - timedelta(days=rng.randint(200, 400))
        org_ids[name] = db.insert_id(
            conn,
            insert(organizations).values(
                name=name,
                industry=industry,
                website=website,
                notes=notes,
                created_at=stamp(created),
                updated_at=stamp(created),
            ),
        )
        websites[name], industries[name] = website, industry

    contact_ids: dict[str, int] = {}
    for i, (name, title, org, status, area) in enumerate(CONTACTS):
        created = today - timedelta(days=rng.randint(30, 360))
        contact_ids[name] = db.insert_id(
            conn,
            insert(contacts).values(
                name=name,
                job_title=title,
                organization_id=org_ids.get(org) if org else None,
                status=status,
                email=email_for(name, websites.get(org) if org else None),
                phone=f"({area}) 555-{100 + i * 7:04d}",
                created_at=stamp(created),
                updated_at=stamp(created),
            ),
        )

    won_months = iter(WON_MONTHS_AGO)
    lost_months = iter(LOST_MONTHS_AGO)
    positions: dict[str, int] = dict.fromkeys(stages.STAGES, 0)
    deal_rows = []
    for name, org, contact, stage, dollars in DEALS:
        if stage == "Won":
            close = day_in_month(rng, today, next(won_months))
        elif stage == "Lost":
            close = day_in_month(rng, today, next(lost_months))
        elif name in LATE_DAYS:
            close = today - timedelta(days=LATE_DAYS[name])
        else:
            close = today + timedelta(days=rng.randint(10, 150))
        created = min(close, today) - timedelta(days=rng.randint(30, 90))
        probability = HAND_SET_PROBABILITY.get(name, stages.DEFAULT_PROBABILITY[stage])
        deal_id = db.insert_id(
            conn,
            insert(deals).values(
                name=name,
                organization_id=org_ids[org],
                contact_id=contact_ids[contact],
                stage=stage,
                value_cents=dollars * 100,
                probability=probability,
                close_date=close,
                position=positions[stage],
                created_at=stamp(created),
                updated_at=stamp(created),
            ),
        )
        positions[stage] += 1
        deal_rows.append(
            {
                "id": deal_id,
                "name": name,
                "org": org,
                "contact": contact,
                "stage": stage,
                "close": close,
                "created": created,
            }
        )

    _load_activities(conn, rng, today, deal_rows, contact_ids, industries)


def _load_activities(conn, rng, today, deal_rows, contact_ids, industries) -> None:
    pools = {"call": CALLS, "email": EMAILS, "note": NOTES}
    kinds = ["call", "email", "note"]
    rows: list[dict] = []
    k = 0

    for d in deal_rows:
        is_open = stages.is_open(d["stage"])
        last_day = today if is_open else d["close"]
        first_day = max(d["created"], last_day - timedelta(days=75))
        for _ in range(rng.choice([1, 2, 2])):
            kind = kinds[k % 3]
            k += 1
            text = rng.choice(pools[kind]).format(
                first=d["contact"].split()[0],
                deal=d["name"].lower(),
                industry=industries[d["org"]].lower(),
            )
            span = max((last_day - first_day).days, 1)
            rows.append(
                {
                    "type": kind,
                    "contact_id": contact_ids[d["contact"]],
                    "deal_id": d["id"],
                    "description": text,
                    "occurred_on": first_day + timedelta(days=rng.randint(0, span)),
                    "follow_up_on": None,
                    "done": False,
                    "_open": is_open,
                }
            )

    # Leads with no deals yet get a contact-only entry.
    with_deals = {d["contact"] for d in deal_rows}
    for name, *_ in CONTACTS:
        if name not in with_deals:
            kind, text = rng.choice(LEAD_NOTES)
            rows.append(
                {
                    "type": kind,
                    "contact_id": contact_ids[name],
                    "deal_id": None,
                    "description": text.format(first=name.split()[0]),
                    "occurred_on": today - timedelta(days=rng.randint(3, 60)),
                    "follow_up_on": None,
                    "done": False,
                    "_open": False,
                }
            )

    # Follow-ups: some overdue, some due this week, a few later, some already done.
    open_rows = [r for r in rows if r["_open"]]
    rng.shuffle(open_rows)
    plan = [-1, -3, -6, -10, 0, 2, 4, 6, 12, 21]
    for r, offset in zip(open_rows, plan):
        r["follow_up_on"] = today + timedelta(days=offset)
        r["occurred_on"] = min(r["follow_up_on"], today) - timedelta(days=rng.randint(2, 7))
    closed_rows = [r for r in rows if not r["_open"] and r["deal_id"]]
    for r in rng.sample(closed_rows, 6):
        r["follow_up_on"] = r["occurred_on"] + timedelta(days=5)
        r["done"] = True

    # Stage changes, written as the app would have written them.
    for d in deal_rows:
        i = stages.STAGES.index(d["stage"])
        if d["stage"] == "New":
            continue
        if d["stage"] in ("Won", "Lost"):
            old = (
                "Negotiation"
                if d["stage"] == "Won"
                else rng.choice(["Qualified", "Proposal", "Negotiation"])
            )
            when = d["close"]
        else:
            old = stages.STAGES[i - 1]
            when = today - timedelta(days=rng.randint(2, 40))
        rows.append(
            {
                "type": "stage_change",
                "contact_id": contact_ids[d["contact"]],
                "deal_id": d["id"],
                "description": stages.stage_change_message(old, d["stage"]),
                "occurred_on": when,
                "follow_up_on": None,
                "done": False,
                "_open": False,
            }
        )

    rows.sort(key=lambda r: r["occurred_on"])
    for r in rows:
        r.pop("_open")
        conn.execute(insert(activities).values(**r, created_at=stamp(r["occurred_on"])))


def reset_database(path: Path, today: date) -> None:
    """Migrate the file, then replace its data with the sample data in one transaction.

    The file is emptied in place, not deleted, so a dev server that is running
    keeps working and shows the new data.
    """
    engine = db.make_engine(path)
    migrate.upgrade(engine)
    with engine.begin() as conn:
        reset(conn)
        load(conn, today)
    engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset the database to the sample data.")
    parser.add_argument(
        "--reset", action="store_true", help="replace any existing data with the sample data"
    )
    parser.add_argument("--today", type=date.fromisoformat, default=date.today(), help="YYYY-MM-DD")
    args = parser.parse_args()

    path = config.db_path()
    if path.exists() and not args.reset:
        raise SystemExit(f"{path} already exists. Use --reset to replace its data.")
    reset_database(path, args.today)
    print(f"Sample data loaded into {path}")


if __name__ == "__main__":
    main()
