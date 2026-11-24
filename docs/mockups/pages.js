// Shared renderer for the table, record and form screens of every mockup direction.
// Each direction supplies shell(active) and pageHeader({...}) in its own x-shell.js.

Object.assign(ICON, {
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>',
  sortable: '<svg viewBox="0 0 24 24"><path d="m7 15 5 5 5-5M7 9l5-5 5 5"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  chevd: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  alert: '<svg viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></svg>',
});

const ORGS = [
  { name: "Atlas Engineering", industry: "Engineering", web: "atlas-eng.com" },
  { name: "Bluewater Marine", industry: "Logistics", web: "bluewatermarine.com" },
  { name: "Brightline Retail", industry: "Retail", web: "brightline.shop" },
  { name: "Cedar & Pine Legal", industry: "Legal services", web: "cedarpine.law" },
  { name: "Fernhill Architects", industry: "Architecture", web: "fernhill.design" },
  { name: "Harbor Health", industry: "Healthcare", web: "harborhealth.org" },
  { name: "Juniper Foods", industry: "Food and beverage", web: "juniperfoods.com" },
  { name: "Kestrel Manufacturing", industry: "Manufacturing", web: "kestrelmfg.com" },
  { name: "Northwind Logistics", industry: "Logistics", web: "northwind.co" },
  { name: "Orchard Lane Schools", industry: "Education", web: "orchardlane.edu" },
  { name: "Pioneer Solar", industry: "Energy", web: "pioneersolar.io" },
  { name: "Summit Credit Union", industry: "Financial services", web: "summitcu.org" },
];

const CONTACTS = [
  ["Aisha Rahman", "Office Manager", "Fernhill Architects", "lead", "(512) 555-0172"],
  ["Ben Carter", "Founder", "Pioneer Solar", "lead", "(480) 555-0158"],
  ["Chloe Dubois", "Finance Director", "Northwind Logistics", "customer", "(206) 555-0177"],
  ["Daniel Reyes", "IT Director", "Harbor Health", "qualified", "(503) 555-0118"],
  ["Emily Zhang", "Independent consultant", null, "lead", "(646) 555-0114"],
  ["Grace Kim", "VP Member Services", "Summit Credit Union", "customer", "(720) 555-0150"],
  ["Hannah Brooks", "Procurement Manager", "Orchard Lane Schools", "lead", "(608) 555-0129"],
  ["James Whitfield", "Office Manager", "Atlas Engineering", "lead", "(425) 555-0191"],
  ["Leo Martins", "Fleet Manager", "Bluewater Marine", "lead", "(757) 555-0145"],
  ["Marcus Hale", "Operations Manager", "Juniper Foods", "qualified", "(619) 555-0124"],
  ["Maya Okafor", "Head of Operations", "Northwind Logistics", "customer", "(206) 555-0142"],
  ["Owen Fraser", "Chief Information Officer", "Kestrel Manufacturing", "qualified", "(614) 555-0187"],
  ["Priya Nair", "Managing Partner", "Cedar & Pine Legal", "customer", "(415) 555-0163"],
  ["Ravi Patel", "Plant Manager", "Kestrel Manufacturing", "lead", "(614) 555-0103"],
  ["Sofia Lindqvist", "Chief Technology Officer", "Atlas Engineering", "qualified", "(425) 555-0136"],
  ["Tom Becker", "Store Systems Lead", "Brightline Retail", "qualified", "(312) 555-0109"],
].map(([name, title, org, status, phone]) => {
  const o = ORGS.find((x) => x.name === org);
  const [f, ...l] = name.toLowerCase().split(" ");
  return { name, title, org, status, phone, email: o ? `${f}.${l.join("")}@${o.web}` : "emily.zhang@fastmail.com" };
});

// Timelines, newest first.
const TL_MAYA = [
  { type: "call", text: "Intro call, interested in a pilot for 20 vans", date: "2026-11-19", rec: "Fleet telematics pilot", fu: { due: "2026-12-01", state: "up" } },
  { type: "stage", text: "Moved from <b>Negotiation</b> to <b>Won</b>", date: "2026-11-06", rec: "Route optimisation" },
  { type: "email", text: "Sent final contract for route optimisation", date: "2026-11-02", rec: "Route optimisation", fu: { due: "2026-11-05", state: "done" } },
  { type: "stage", text: "Moved from <b>Proposal</b> to <b>Negotiation</b>", date: "2026-10-20", rec: "Route optimisation" },
  { type: "note", text: "Wants routing live before the holiday peak. Chloe signs off anything over $25,000 USD.", date: "2026-10-14", rec: "Route optimisation" },
  { type: "call", text: "Demo of the route planner with the dispatch team", date: "2026-09-30", rec: "Route optimisation" },
];
const TL_DEAL = [
  { type: "email", text: "Sent revised quote with three-year pricing", date: "2026-11-23", rec: "Sofia Lindqvist", fu: { due: "2026-11-28", state: "up" } },
  { type: "note", text: "Budget approved for Q1, waiting on procurement", date: "2026-11-20", rec: "Sofia Lindqvist" },
  { type: "call", text: "Pricing call with Sofia and the procurement team", date: "2026-11-12", rec: "Sofia Lindqvist", fu: { due: "2026-11-18", state: "over" } },
  { type: "stage", text: "Moved from <b>Proposal</b> to <b>Negotiation</b>", date: "2026-11-10", rec: "" },
  { type: "email", text: "Proposal sent for five sites", date: "2026-10-22", rec: "Sofia Lindqvist" },
  { type: "stage", text: "Moved from <b>Qualified</b> to <b>Proposal</b>", date: "2026-10-21", rec: "" },
  { type: "call", text: "Discovery call. Five offices still on old licences.", date: "2026-10-08", rec: "James Whitfield", fu: { due: "2026-10-15", state: "done" } },
];

// ---- Small building blocks ----
const longDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const ini = (s) => s.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("");
const STATUS = { lead: ["Lead", "var(--cerulean)", "#fff"], qualified: ["Qualified", "var(--marigold)", "var(--midnight)"], customer: ["Customer", "var(--seagreen)", "var(--midnight)"] };
const bStatus = (s) => `<span class="badge" style="background:${STATUS[s][1]};color:${STATUS[s][2]}">${STATUS[s][0]}</span>`;
const bStage = (k) => { const s = stageOf(k); return `<span class="badge" style="background:${s.color};color:${s.ink}">${k}</span>`; };
const acts = `<div class="acts"><button title="Edit">${ICON.edit}</button><button class="del" title="Delete">${ICON.trash}</button></div>`;
const lnk = (t) => (t ? `<a class="link">${t}</a>` : `<span class="none">None</span>`);
const avatar = (t, c = "var(--soft)") => `<span class="avt" style="background:${c}">${ini(t)}</span>`;
const btn = (label, icon, cls = "") => `<button class="btn ${cls}">${icon ? `<span class="ic">${ICON[icon]}</span>` : ""}${label}</button>`;
const closeCell = (d) => isLate(d) ? `<span class="num late-d">${longDate(d.close)}</span> <span class="late-tag">Late</span>` : `<span class="num">${longDate(d.close)}</span>`;

function table(cols, rows, { sortable = true } = {}) {
  const th = (c) => `<th class="${c.cls || ""} ${c.sort ? "sorted" : ""}">${c.h}${
    sortable && c.h ? `<span class="sa ${c.sort ? "" : "dim"}">${c.sort ? ICON.up : ICON.sortable}</span>` : ""}</th>`;
  return `<table class="tbl"><thead><tr>${cols.map(th).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((v, i) => `<td class="${cols[i].cls || ""}">${v}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
const tools = (ph, extra = "") => `<div class="tools"><div class="sbox"><span class="ic">${ICON.search}</span>${ph}</div>${extra}</div>`;

function timeline(items, showRec) {
  const label = { call: "Call", email: "Email", note: "Note", stage: "Stage change" };
  return `<ul class="tline">${items.map((a) => {
    const fu = a.fu ? `<span class="chip ${a.fu.state}">${
      a.fu.state === "done" ? ICON.check + "Follow-up done" : a.fu.state === "over" ? "Follow-up overdue, " + shortDate(a.fu.due) : "Follow-up " + shortDate(a.fu.due)}</span>` : "";
    return `<li class="${a.type}">
      <span class="fi ${a.type}">${ICON[a.type]}</span>
      <div><div class="tx">${a.text}</div>
        <div class="tm">${label[a.type]} · <span class="num">${longDate(a.date)}</span>${showRec && a.rec ? ` · <a class="link">${a.rec}</a>` : ""}</div>
        ${fu}</div>
      ${a.type === "stage" ? "<span></span>" : acts}
    </li>`; }).join("")}</ul>`;
}

// ---- Pages ----
const PAGES = {
  organizations() {
    const rows = ORGS.map((o) => {
      const cs = CONTACTS.filter((c) => c.org === o.name);
      const od = DEALS.filter((d) => d.org === o.name && OPEN_STAGES.includes(d.stage));
      return [`<div class="namecell">${avatar(o.name)}<b>${o.name}</b></div>`, o.industry, `<a class="link">${o.web}</a>`,
        `<span class="num">${cs.length}</span>`, `<span class="num">${od.length}</span>`,
        `<span class="num">${money(sum(od, (d) => d.value))}</span>`, acts];
    });
    return pageHeader({ title: "Organizations", sub: `${ORGS.length} companies`, line: `${ORGS.length} companies across ${new Set(ORGS.map((o) => o.industry)).size} industries.`,
      actions: btn("New organization", "plus") }) +
      tools("Search organizations", `<span class="count">Showing ${ORGS.length} of ${ORGS.length}</span>`) +
      `<div class="panel flush">${table([{ h: "Name", sort: 1 }, { h: "Industry" }, { h: "Website" }, { h: "Contacts", cls: "r" }, { h: "Open deals", cls: "r" }, { h: "Open value", cls: "r" }, { h: "", cls: "a" }], rows)}</div>`;
  },

  contacts() {
    const n = (s) => CONTACTS.filter((c) => c.status === s).length;
    const seg = `<div class="seg"><a class="on">All<span class="c">${CONTACTS.length}</span></a><a>Lead<span class="c">${n("lead")}</span></a><a>Qualified<span class="c">${n("qualified")}</span></a><a>Customer<span class="c">${n("customer")}</span></a></div>`;
    const rows = CONTACTS.map((c) => [`<div class="namecell">${avatar(c.name)}<div><b>${c.name}</b><div class="mute">${c.email}</div></div></div>`,
      c.title, lnk(c.org), `<span class="num">${c.phone}</span>`, bStatus(c.status), acts]);
    return pageHeader({ title: "Contacts", sub: `${CONTACTS.length} people`, line: `${CONTACTS.length} people, ${n("lead")} of them leads.`, actions: btn("New contact", "plus") }) +
      tools("Search contacts", seg) +
      `<div class="panel flush">${table([{ h: "Name", sort: 1 }, { h: "Job title" }, { h: "Organization" }, { h: "Phone" }, { h: "Status" }, { h: "", cls: "a" }], rows)}</div>`;
  },

  deals() {
    const ds = [...DEALS].sort((a, b) => a.close.localeCompare(b.close));
    const rows = ds.map((d) => [`<b>${d.name}</b>`, lnk(d.org), lnk(d.contact), bStage(d.stage),
      `<span class="num">${money(d.value)}</span>`, `<span class="num">${d.prob}%</span>`, `<span class="num">${money(expected(d))}</span>`, closeCell(d), acts]);
    return pageHeader({ title: "Deals", sub: `${DEALS.length} deals, ${KPI.openCount} open`, line: `${KPI.openCount} open deals worth ${money(KPI.openValue)}.`, actions: btn("New deal", "plus") }) +
      tools("Search deals", `<span class="count">${KPI.lateCount} late</span>`) +
      `<div class="panel flush">${table([{ h: "Deal" }, { h: "Organization" }, { h: "Main contact" }, { h: "Stage" }, { h: "Value", cls: "r" }, { h: "Prob.", cls: "r" }, { h: "Expected", cls: "r" }, { h: "Close date", sort: 1 }, { h: "", cls: "a" }], rows)}</div>`;
  },

  organization() {
    const o = ORGS[0];
    const cs = CONTACTS.filter((c) => c.org === o.name);
    const ds = DEALS.filter((d) => d.org === o.name);
    const od = ds.filter((d) => OPEN_STAGES.includes(d.stage));
    return pageHeader({ crumb: "Organizations", title: o.name, sub: `${o.industry} · ${o.web}`, line: o.name,
      actions: btn("Edit", "edit", "ghost") + btn("Delete", "trash", "ghost danger-t") }) +
      `<div class="detail">
        <div class="stack">
          <div class="panel dhead">
            <div class="prof">${avatar(o.name, "var(--marigold)")}<div><h2>${o.name}</h2><div class="mute">${o.industry}</div></div></div>
            <dl class="kv"><dt>Website</dt><dd><a class="link">${o.web}</a></dd><dt>Industry</dt><dd>${o.industry}</dd>
              <dt>Notes</dt><dd>Civil and structural engineering firm with five offices in the Pacific Northwest. Renewing all site licences in Q1.</dd></dl>
          </div>
          <div class="stats">
            <div class="panel stat-t"><div class="lbl">Contacts</div><div class="v num">${cs.length}</div></div>
            <div class="panel stat-t"><div class="lbl">Open deals</div><div class="v num">${od.length}</div></div>
            <div class="panel stat-t wide"><div class="lbl">Open value</div><div class="v num">${money(sum(od, (d) => d.value))}</div></div>
          </div>
        </div>
        <div class="stack">
          <div class="panel flush"><div class="ph pad"><h2>Contacts</h2>${btn("Add contact", "plus", "ghost sm")}</div>
            ${table([{ h: "Name" }, { h: "Job title" }, { h: "Email" }, { h: "Status" }], cs.map((c) => [`<div class="namecell">${avatar(c.name)}<a class="link">${c.name}</a></div>`, c.title, c.email, bStatus(c.status)]), { sortable: false })}</div>
          <div class="panel flush"><div class="ph pad"><h2>Deals</h2>${btn("New deal", "plus", "ghost sm")}</div>
            ${table([{ h: "Deal" }, { h: "Stage" }, { h: "Value", cls: "r" }, { h: "Close date" }], ds.map((d) => [`<a class="link">${d.name}</a>`, bStage(d.stage), `<span class="num">${money(d.value)}</span>`, closeCell(d)]), { sortable: false })}</div>
        </div>
      </div>`;
  },

  contact() {
    const c = CONTACTS.find((x) => x.name === "Maya Okafor");
    const ds = DEALS.filter((d) => d.contact === c.name);
    return pageHeader({ crumb: "Contacts", title: c.name, sub: `${c.title} at ${c.org}`, line: c.name,
      actions: btn("Log activity", "note") + btn("Edit", "edit", "ghost") + btn("Delete", "trash", "ghost danger-t") }) +
      `<div class="detail">
        <div class="stack">
          <div class="panel dhead">
            <div class="prof">${avatar(c.name, "var(--seagreen)")}<div><h2>${c.name}</h2><div class="mute">${c.title}</div></div></div>
            <dl class="kv"><dt>Status</dt><dd>${bStatus(c.status)}</dd><dt>Organization</dt><dd><a class="link">${c.org}</a></dd>
              <dt>Email</dt><dd><a class="link">${c.email}</a></dd><dt>Phone</dt><dd class="num">${c.phone}</dd><dt>Added</dt><dd class="num">Sep 4, 2026</dd></dl>
          </div>
          <div class="panel"><div class="ph"><h2>Deals</h2><span class="hint">${ds.length}</span></div>
            <ul class="mini-list">${ds.map((d) => `<li><div><a class="link">${d.name}</a><div class="mute num">${money(d.value)}</div></div>${bStage(d.stage)}</li>`).join("")}</ul></div>
        </div>
        <div class="panel"><div class="ph"><h2>Timeline</h2><span class="hint">Newest first</span></div>${timeline(TL_MAYA, true)}</div>
      </div>`;
  },

  deal() {
    const d = DEALS.find((x) => x.name === "Multi-site licence");
    const order = ["New", "Qualified", "Proposal", "Negotiation"];
    const cur = order.indexOf(d.stage);
    const track = order.map((k, i) => { const s = stageOf(k);
      const st = i < cur ? `background:color-mix(in srgb, ${s.color} 35%, white);color:var(--midnight)` : i === cur ? `background:${s.color};color:${s.ink}` : "";
      return `<div class="st" style="${st}">${i < cur ? ICON.check : ""}${k}</div>`; }).join("") +
      `<span class="tsep"></span><div class="st end">Won</div><div class="st end">Lost</div>`;
    return pageHeader({ crumb: "Deals", title: d.name, sub: `${d.org} · ${d.contact}`, line: d.name,
      actions: btn("Log activity", "note") + btn("Edit", "edit", "ghost") + btn("Delete", "trash", "ghost danger-t") }) +
      `<div class="panel dhead deal-top">
        <div class="track">${track}</div>
        <div class="facts">
          <div><div class="lbl">Value</div><div class="v num">${money(d.value)}</div></div>
          <div><div class="lbl">Probability</div><div class="v num">${d.prob}%</div></div>
          <div><div class="lbl">Expected revenue</div><div class="v num">${money(expected(d))}</div></div>
          <div><div class="lbl">Expected close</div><div class="v num">${longDate(d.close)}</div></div>
        </div>
      </div>
      <div class="detail rev">
        <div class="panel"><div class="ph"><h2>Timeline</h2><span class="hint">Newest first</span></div>${timeline(TL_DEAL, false)}</div>
        <div class="panel"><div class="ph"><h2>Details</h2></div>
          <dl class="kv"><dt>Organization</dt><dd><a class="link">${d.org}</a></dd><dt>Main contact</dt><dd><a class="link">${d.contact}</a></dd>
            <dt>Stage</dt><dd>${bStage(d.stage)}</dd><dt>Created</dt><dd class="num">Oct 8, 2026</dd><dt>Last activity</dt><dd class="num">Nov 23, 2026</dd></dl></div>
      </div>`;
  },
};

const OVERLAYS = {
  contactForm: () => `<div class="scrim"></div><aside class="sheet">
    <div class="sh-h"><h2>New contact</h2><button class="x">${ICON.x}</button></div>
    <div class="field"><label>Name <span class="req">*</span></label><div class="in bad"></div><span class="err">Enter a name to save this contact.</span></div>
    <div class="field"><label>Email</label><div class="in">hannah.brooks@orchardlane.edu</div></div>
    <div class="field"><label>Phone</label><div class="in num">(608) 555-0129</div></div>
    <div class="field"><label>Job title</label><div class="in placeholder">For example, Operations Manager</div></div>
    <div class="field"><label>Organization</label><div class="in sel">Orchard Lane Schools<span class="ic">${ICON.chevd}</span></div></div>
    <div class="field"><label>Status</label><div class="seg in-seg"><a class="on">Lead</a><a>Qualified</a><a>Customer</a></div></div>
    <div class="foot">${btn("Cancel", "", "ghost")}${btn("Save contact", "", "off")}</div>
  </aside>`,
  deleteOrg: () => {
    const org = "Brightline Retail";
    const nc = CONTACTS.filter((c) => c.org === org).length, nd = DEALS.filter((d) => d.org === org).length;
    const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
    return `<div class="scrim"></div><div class="dialog">
    <span class="dl-ic">${ICON.alert}</span>
    <h2>Delete ${org}?</h2>
    <p>Its ${plural(nc, "contact")} and ${plural(nd, "deal")} will be kept, with no organization. This can't be undone.</p>
    <div class="foot">${btn("Cancel", "", "ghost")}${btn("Delete organization", "", "danger")}</div>
  </div>`;
  },
};

function renderPage(name, overlay) {
  document.getElementById("page").innerHTML = PAGES[name]();
  if (overlay) document.body.insertAdjacentHTML("beforeend", OVERLAYS[overlay]());
}
