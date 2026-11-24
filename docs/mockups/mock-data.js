// Shared sample data and helpers for the Accountable mockups.
// "Today" is fixed so every mockup shows the same figures.
const TODAY = "2026-11-24";

const STAGES = [
  { key: "New", prob: 10, color: "var(--cerulean)", ink: "#fff" },
  { key: "Qualified", prob: 25, color: "var(--marigold)", ink: "var(--midnight)" },
  { key: "Proposal", prob: 50, color: "var(--coral)", ink: "var(--midnight)" },
  { key: "Negotiation", prob: 75, color: "var(--seagreen-tint)", ink: "var(--midnight)" },
  { key: "Won", prob: 100, color: "var(--seagreen)", ink: "var(--midnight)" },
  { key: "Lost", prob: 0, color: "var(--raspberry)", ink: "#fff" },
];
const OPEN_STAGES = ["New", "Qualified", "Proposal", "Negotiation"];

const DEALS = [
  { name: "Fleet telematics pilot", org: "Northwind Logistics", contact: "Maya Okafor", stage: "New", value: 18000, close: "2027-01-30" },
  { name: "Clinic scheduling upgrade", org: "Harbor Health", contact: "Daniel Reyes", stage: "New", value: 24500, close: "2027-02-15" },
  { name: "Annual support renewal", org: "Cedar & Pine Legal", contact: "Priya Nair", stage: "New", value: 9600, close: "2027-01-10" },
  { name: "Warehouse scanners", org: "Brightline Retail", contact: "Tom Becker", stage: "Qualified", value: 42000, close: "2026-12-20" },
  { name: "Data migration", org: "Atlas Engineering", contact: "Sofia Lindqvist", stage: "Qualified", value: 31000, close: "2027-01-22" },
  { name: "POS rollout phase 2", org: "Juniper Foods", contact: "Marcus Hale", stage: "Qualified", value: 27500, close: "2026-11-15" },
  { name: "Staff training package", org: "Summit Credit Union", contact: "Grace Kim", stage: "Qualified", value: 12000, close: "2026-12-12" },
  { name: "ERP integration", org: "Kestrel Manufacturing", contact: "Owen Fraser", stage: "Proposal", value: 86000, close: "2026-12-18" },
  { name: "Patient portal", org: "Harbor Health", contact: "Daniel Reyes", stage: "Proposal", value: 54000, close: "2027-01-08" },
  { name: "Store analytics", org: "Brightline Retail", contact: "Tom Becker", stage: "Proposal", value: 38500, close: "2026-11-02" },
  { name: "Multi-site licence", org: "Atlas Engineering", contact: "Sofia Lindqvist", stage: "Negotiation", value: 120000, close: "2026-12-05" },
  { name: "Cold chain monitoring", org: "Juniper Foods", contact: "Marcus Hale", stage: "Negotiation", value: 46000, close: "2026-12-01", prob: 80 },
  { name: "Branch network refresh", org: "Summit Credit Union", contact: "Grace Kim", stage: "Won", value: 64000, close: "2026-11-18" },
  { name: "Route optimisation", org: "Northwind Logistics", contact: "Maya Okafor", stage: "Won", value: 33000, close: "2026-11-06" },
  { name: "Document vault", org: "Cedar & Pine Legal", contact: "Priya Nair", stage: "Won", value: 15000, close: "2026-10-29" },
  { name: "Kiosk hardware", org: "Brightline Retail", contact: "Tom Becker", stage: "Lost", value: 22000, close: "2026-11-12" },
  { name: "Lab system integration", org: "Harbor Health", contact: "Daniel Reyes", stage: "Lost", value: 40000, close: "2026-10-21" },
].map((d) => ({ ...d, prob: d.prob ?? STAGES.find((s) => s.key === d.stage).prob }));

// Last 12 months, Dec 2025 to Nov 2026 (Nov is the month in progress).
const MONTHS = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
const WON_REVENUE = [48000, 62500, 39000, 71000, 84500, 58000, 96000, 77500, 102000, 88000, 115500, 97000];
const WON_COUNT = [3, 4, 2, 4, 5, 3, 6, 4, 6, 5, 7, 2];
const LOST_COUNT_12M = 19;

const ACTIVITIES = [
  { type: "stage", text: "Moved from Negotiation to Won", rec: "Branch network refresh", when: "Nov 18" },
  { type: "call", text: "Walked Owen through the ERP integration scope", rec: "Owen Fraser", when: "Nov 23" },
  { type: "email", text: "Sent revised quote with three-year pricing", rec: "Multi-site licence", when: "Nov 23" },
  { type: "stage", text: "Moved from Qualified to Proposal", rec: "Patient portal", when: "Nov 21" },
  { type: "note", text: "Budget approved for Q1, waiting on procurement", rec: "Sofia Lindqvist", when: "Nov 20" },
  { type: "call", text: "Intro call, interested in a pilot for 20 vans", rec: "Maya Okafor", when: "Nov 19" },
  { type: "stage", text: "Moved from Proposal to Lost", rec: "Kiosk hardware", when: "Nov 12" },
  { type: "email", text: "Shared case study from Summit Credit Union", rec: "Tom Becker", when: "Nov 11" },
];

const FOLLOW_UPS = [
  { text: "Chase signed order form", rec: "Cold chain monitoring", due: "Nov 19", overdue: true },
  { text: "Send POS phase 2 timeline", rec: "Marcus Hale", due: "Nov 21", overdue: true },
  { text: "Confirm store analytics decision date", rec: "Store analytics", due: "Nov 22", overdue: true },
  { text: "Book onsite demo", rec: "Owen Fraser", due: "Nov 25", overdue: false },
  { text: "Check renewal terms with legal", rec: "Priya Nair", due: "Nov 27", overdue: false },
  { text: "Follow up on pilot scope", rec: "Maya Okafor", due: "Dec 1", overdue: false },
];

// ---- Helpers ----
const money = (n) => "$" + Math.round(n).toLocaleString("en-US") + " USD";
const moneyShort = (n) =>
  n >= 1e6 ? "$" + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M USD"
  : n >= 1e3 ? "$" + Math.round(n / 1e3) + "K USD"
  : "$" + n + " USD";
const shortDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const isLate = (d) => OPEN_STAGES.includes(d.stage) && d.close < TODAY;
const expected = (d) => (d.value * d.prob) / 100;
const stageOf = (k) => STAGES.find((s) => s.key === k);
const dealsIn = (k) => DEALS.filter((d) => d.stage === k);
const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);

const openDeals = DEALS.filter((d) => OPEN_STAGES.includes(d.stage));
const KPI = {
  openValue: sum(openDeals, (d) => d.value),
  openExpected: sum(openDeals, expected),
  openCount: openDeals.length,
  wonThisMonth: WON_REVENUE[11],
  wonThisMonthCount: WON_COUNT[11],
  wonYear: WON_REVENUE.reduce((a, b) => a + b, 0),
  winRate: Math.round((100 * WON_COUNT.reduce((a, b) => a + b, 0)) /
    (WON_COUNT.reduce((a, b) => a + b, 0) + LOST_COUNT_12M)),
  lateCount: DEALS.filter(isLate).length,
};

// Funnel: value that has reached each stage = deals at that stage or later (Lost excluded).
const FUNNEL = ["New", "Qualified", "Proposal", "Negotiation", "Won"].map((k, i, all) => ({
  ...stageOf(k),
  value: sum(DEALS.filter((d) => all.indexOf(d.stage) >= i), (d) => d.value),
  count: DEALS.filter((d) => all.indexOf(d.stage) >= i).length,
}));

// Small inline icons (Lucide-style strokes).
const ICON = {
  call: '<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  email: '<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>',
  stage: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  dash: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  org: '<svg viewBox="0 0 24 24"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18zM6 12H4a2 2 0 0 0-2 2v8h4M18 9h2a2 2 0 0 1 2 2v11h-4M10 6h4M10 10h4M10 14h4M10 18h4"/></svg>',
  contact: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
  deal: '<svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  board: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="4" height="15" rx="1"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
};

const NAV = [
  ["Dashboard", "dash"], ["Organizations", "org"], ["Contacts", "contact"], ["Deals", "deal"], ["Pipeline", "board"],
];
