# Spec: Accountable

This is the description of Accountable as it stands today: what it is for, how it behaves and how it is built. It is the authority on the product. Code that this spec doesn't describe is a gap to close, either in the code or here.

The stack is in `docs/TECH_STACK.md`, the look follows the brand skill (`.claude/skills/brand`) and how to run it is in `docs/STATUS.md`. A change to the product starts as its own intent and plan in `docs/changes/<branch name>/`, and updates this spec as part of that change.

## The product

### Problem

A small business keeps track of its customers and sales in spreadsheets, inboxes and people's heads. Nobody can see at a glance which companies we deal with, who our contacts are, what's in the sales pipeline, what happened last with a customer or what needs doing next.

### What Accountable is

Accountable is a business management system: a sales CRM that will grow into a full Business OS, including ERP. Today it is a complete sales CRM for one person, running on their own computer: a private Salesforce that does the everyday CRM essentials really well. It should feel sharp, modern and professional, and be a pleasure to use.

It has five sections:

- **Dashboard**, the landing page: how sales are going at a glance. Revenue and deals won month by month over the last 12 months, the open pipeline and its expected revenue, a sales funnel, recent activity, and follow-ups that are coming up or overdue.
- **Organizations**: the companies we do business with, each with its contacts and deals.
- **Contacts**: the people we deal with, leads, qualified contacts and customers, filterable by status, each with their organization, deals and a timeline.
- **Deals**: the potential sales, with stage, value and close date, each with its details and timeline. A deal still open after its close date stands out.
- **Pipeline**: the deals as cards on a board, one column per stage, Won and Lost included, so a deal is moved or closed by dragging it.

### Four kinds of record

- **Organization**: a company. Name, website, industry and notes. It has many contacts and many deals.
- **Contact**: a person. Name, email, phone, job title, organization, and a status: lead, qualified or customer. A lead is a contact with the lead status; there's no separate list of leads.
- **Deal**: a potential sale. Name, organization, main contact, stage (New, Qualified, Proposal, Negotiation, Won or Lost), value in US dollars, probability of close, and expected or actual close date.
- **Activity**: something that happened, or needs to happen, with a contact or deal. Type (note, call or email), the contact and/or deal it relates to, a description, the date it happened, and optionally a follow-up date and whether that follow-up is done. The system also writes stage-change entries (C3).

### Users

One salesperson, using Accountable on their own computer every day. The rest of the sales team joins later.

### Constraints

- Runs locally with one documented command that works on Mac, Linux and Windows, and needs no internet connection to use once installed.
- Every change is kept: it's still there after a browser refresh and after a restart.
- One documented command resets the data to the sample data.
- Light mode, laid out for a laptop or desktop screen.

### Not in the product yet

Sign-in, user accounts or several users; a record of who did what; access from other computers; dark mode or a phone layout; AI features; email, calendar or phone integrations; currencies other than US dollars; reports beyond the dashboard; tags or custom fields; changing the pipeline stages; importing or exporting data.

## Decisions (C1 to C12)

Rules that settle questions the product description leaves open. The requirements and design below follow them.

1. **Offline fonts.** The brand fonts are self-hosted through `@fontsource` packages, bundled by Vite, so the app works with no internet connection.
2. **Setup.** `npm install` is a one-time step that needs the internet; a `postinstall` script runs `uv sync`. Then `npm run dev` is the one command. `STATUS.md` says this plainly.
3. **Stage-change entries.** A fourth, system-only activity type, `stage_change`, records stage moves in the timeline. Users can't create, edit, pick or delete it; it goes when its deal is deleted, or when the contact it is linked to is deleted. It has no follow-up.
4. **Stage colors.** New Cerulean, Qualified Marigold, Proposal Coral, Negotiation a lighter tint of Sea Green, Won Sea Green, Lost Raspberry, so Won and Lost carry their natural meaning. This knowingly bends the brand's series ordering rule.
5. **The funnel.** The bar for a stage is the total value of deals currently at that stage or any later open stage, plus Won. Lost is excluded. Bars only narrow.
6. **What an activity relates to.** An activity has an optional contact and an optional deal, and at least one is required. Logging from a deal pre-fills the deal and its main contact, so it shows on both timelines. A contact's timeline shows activities linked to the contact directly or through any deal where they are the main contact.
7. **Leaving Won or Lost.** The close date stays as it was (the user can edit it) and the contact stays a customer; nothing is reverted.
8. **"Today" and time zones.** Dates are local calendar dates from the user's computer. The frontend sends its local date with stage changes, deal creation and dashboard requests; the backend falls back to its own clock only when none is sent. Dates are stored as `YYYY-MM-DD`, timestamps in UTC.
9. **Sample data stays current.** The seed generates dates relative to the day it runs, from a fixed random seed, so content is the same every reset.
10. **Hand-set probability.** Any stage change overwrites probability with the stage default; editing probability without changing stage keeps it. No extra field.
11. **Light mode only.** Colors are CSS variables in `tokens.css`, so dark mode is a later swap.
12. **Node version.** `engines` in the root `package.json` is `>=24`; 26 is the target.

## Requirements (R1 to R34)

### General

- R1. `npm run dev` starts backend and frontend; the app opens on the Dashboard at `http://localhost:5173`. No internet needed after install.
- R2. `npm run seed` replaces all data with the sample data. `npm test` runs the type checks, Vitest, pytest and Playwright and fails if any fail.
- R3. All data lives in one SQLite file (`backend/data/accountable.db`, git-ignored). On every start the backend applies any pending Alembic migrations, creating the file if missing, and seeds it if it is new. An existing database is never reseeded on start. Tests use a separate temp database.
- R4. Every change is saved through the API at once; nothing is held only in the browser.
- R5. Money is shown as US dollars with the currency, e.g. `$48,500 USD` in tables and `$1.2M USD` in compact chart labels. Numbers use JetBrains Mono.
- R6. Light mode only, laid out for screens 1280px wide and up, with no sideways scrolling at that width.
- R7. No errors in the browser console during normal use, and no requests to other hosts.

### Tables (Organizations, Contacts, Deals)

- R8. Each table has a search box (matches any visible text column, case-insensitive), sortable columns (click a heading: ascending, descending, off), a "New" button, and Edit and Delete on each row. Clicking a row opens the record's page. Columns:
  - Organizations: name, industry, website, contacts, open deals, open value. Sorted by name.
  - Contacts: name, job title, organization, phone, status. Sorted by name.
  - Deals: name, organization, main contact, stage, value, probability, expected revenue, close date. Sorted by close date.
- R9. Add and Edit use a side panel form. Required fields are marked; Save stays disabled and the field shows a message until they are filled. Errors from the server show against their fields.
- R10. Delete opens a confirmation dialog naming the record and stating the effect on linked records:
  - Organization: "Its N contacts and M deals will be kept, with no organization."
  - Contact: "Its N activities will be deleted. Its M deals will be kept, with no main contact."
  - Deal: "Its N activities will be deleted."
- R11. Contacts table has a status filter: All, Lead, Qualified, Customer.
- R12. A deal not Won or Lost with a close date before today is late: its close date shows in Raspberry with a "Late" tag, in tables and on pipeline cards.

### Required fields and limits

- Organization: name. Contact: name (status defaults to lead). Deal: name, stage and value. Activity: type, description, date, and a contact or a deal. Everything else is optional.
- Text is trimmed; blank optional text is stored as empty (null).
- A deal's value is a whole number of cents from 0 to $1 trillion; probability is a whole number from 0 to 100. A larger value is a field error, in the form and from the API.
- Links must point at records that exist; otherwise the API answers with a field error.

### Record pages

- R13. Organization page: details, its contacts table, its deals table, and Edit/Delete.
- R14. Contact page: details, a link to the organization, their deals, and a timeline.
- R15. Deal page: a stage tracker across the top, details (with organization and main contact links and the date of the last activity), and a timeline.
- R16. Timelines list activities newest first by date, with type icon, description, date, the linked deal (on a contact page) or contact (on a deal page), and follow-up state (upcoming, overdue or done). Each entry except stage changes has Edit and Delete. A "Log activity" button opens the activity form.

### Activities and follow-ups

- R17. Activity form: type (note, call, email), contact and/or deal, description, date (defaults to today), optional follow-up date, and a "Follow-up done" checkbox that is only available with a follow-up date. Picking a deal fills in its main contact when no contact is chosen yet. An activity saved without a follow-up date is saved as not done, so a follow-up added later starts open.
- R18. An activity with a follow-up date and not done is a follow-up task. On the dashboard it is overdue if the date is before today, otherwise upcoming. Ticking it done removes it from the dashboard.
- R19. A stage change writes a `stage_change` activity on the deal (and its main contact at that moment), description "Moved from {old} to {new}", date today.

### Deals and stages

- R20. Stages and default probabilities: New 10, Qualified 25, Proposal 50, Negotiation 75, Won 100, Lost 0.
- R21. On any stage change (from the board or the edit form): probability becomes the new stage's default, even if another was sent; a stage change entry is written; moving to Won or Lost sets the close date to today; moving to Won sets the main contact's status to Customer. A stage change from the edit form puts the deal at the top of its new column.
- R22. A new deal defaults to stage New and that stage's probability, unless created from a pipeline column, which sets that stage. A given probability is kept. A new deal goes to the top of its column. A deal created already Won or Lost is closed: its close date is today unless one is given, and Won makes its main contact a customer. No stage-change entry is written, because the stage didn't change.

### Pipeline

- R23. Six columns in stage order. Each card shows name, organization, value, close date, probability, and a Late tag when late. A search box filters the cards by deal, organization or contact name; dragging is off while searching.
- R24. Drag a card to another column to change stage (R21 applies) or within a column to reorder. The drop position is kept and survives refresh.
- R25. The board header shows open total value and open expected revenue (New to Negotiation). Each column header shows its count, total value and expected revenue. Figures update immediately on drop (optimistic update, rolled back with a message if the save fails).
- R26. Each column has a "+" button that opens the deal form with that stage set; the new card goes to the top of the column. A "New deal" button above the board adds at New.

### Dashboard

- R27. KPI tiles: open pipeline value (with the number of open deals), expected revenue, won this month (value and count), win rate over 12 months (won / (won + lost), "None yet" with no closed deals).
- R28. Line chart: revenue won per month, last 12 months including the current one, empty months as zero.
- R29. Bar chart: deals won per month, same 12 months.
- R30. Funnel of value by stage (C5), with deal count and value per stage, in stage colors.
- R31. Recent activity: latest 10 activities across all records, including stage changes, each linking to its deal or contact.
- R32. Follow-ups: overdue first (Raspberry), then upcoming by date, each with a done checkbox and a link to its record.
- R33. Figures are computed by the backend from live data, so they match the tables and reflect changes on the next load.
- The header shows today's date, a one-line summary (open deals and their value, follow-ups overdue), and "Log activity" and "New deal" buttons.

### Sample data

- R34. About 15 organizations across at least 6 industries; 40 contacts covering all three statuses; 40 deals covering all six stages, with Won and Lost spread over the past 12 months, open deals closing in the coming months, and 3 to 5 late; about 100 activities across all user types, with at least 3 follow-ups overdue and 3 due in the next week. Realistic names and descriptions, no placeholder text.

### Security

Accountable has no sign-in yet, so it protects the data by being reachable only from the user's own browser on this computer:

- Neither the backend nor the Vite dev server sends CORS headers. The app's pages and `/api` (through Vite's proxy) share one origin, so no other page, including other local pages, gets permission to read or change the data.
- The backend answers only requests addressed to `localhost` or `127.0.0.1` and refuses any other host name, against DNS rebinding.
- `POST /api/test/reseed`, which the end-to-end tests use to reset their database, exists only when `ACCOUNTABLE_TEST=1`.
- Tests refuse to run against the real database file.

## Design (D1 to D9)

### D1. Repo layout

```
package.json              root scripts, npm workspace "frontend"
pyproject.toml, uv.lock   installs backend/accountable as the `accountable` package
playwright.config.ts
backend/
  alembic.ini
  migrations/             Alembic environment and versions
  accountable/
    main.py               builds the FastAPI app, host check, applies migrations on start, mounts each area's router
    config.py             settings; database path from ACCOUNTABLE_DB; allowed host names
    db.py                 engine, shared metadata, connection dependency
    errors.py             422 field messages and 404s
    migrate.py            runs Alembic from code
    openapi.py            writes the OpenAPI schema used to generate frontend types
    crm/                  first business area; later areas (invoicing, inventory) sit beside it
      tables.py           organizations, contacts, deals, activities (SQLAlchemy Core)
      schemas.py          Pydantic models
      stages.py           stage rules as plain functions
      queries.py          record selects with linked names, shared by several modules
      organizations.py    router and queries
      contacts.py
      deals.py            includes stage changes and card positions
      activities.py
      pipeline.py         the board and the move route
      dashboard.py
      seed.py             sample data generator
  tests/                  test_db, test_api, test_migrations; crm/ mirrors accountable/crm
  data/                   SQLite file (git-ignored)
frontend/
  src/
    app/                  router, layout, sidebar built from one nav list, providers
    ui/                   shared pieces: DataTable, SidePanel, DeleteDialog, Badge, Field, Toast
    lib/                  API client, generated API types, format, dates, table helpers
    theme/                CSS variables, fonts
    features/             organizations, contacts, deals, activities, pipeline, dashboard;
                          each holds its pages, forms, query hooks and tests
  vite.config.ts          proxies /api to the backend; CORS off
e2e/                      Playwright specs and helpers
docs/                     this spec, STATUS, TECH_STACK, review policy, mockups, changes/
```

Structure rules:

- Code is grouped by business area, then by resource. A resource module holds its routes and queries together and is split only when it grows big enough to need it.
- A new business area is a new package beside `crm/` in the backend and new folders in `features/` in the frontend, plus one line in the sidebar's nav list.
- Code moves to `ui/` or `lib/` (frontend) or `crm/queries.py` (backend) only once two or more modules use it.
- The `db.py` connection dependency is the one place sign-in will later attach the current user.
- No base classes, generic CRUD factories, repository or service layers for their own sake, or dependency injection containers.

### D2. Scripts

- `dev`: `concurrently` runs `uv run uvicorn accountable.main:app --port 8000 --reload` and `npm run dev -w frontend`. The backend applies pending migrations as it starts.
- `seed`: `uv run python -m accountable.crm.seed --reset`: migrates the database (creating it if missing), then empties its tables and loads the sample data in one transaction. The file is kept, so a running dev server keeps working. Record ids start again from 1.
- `types`: `uv run python -m accountable.openapi` writes the OpenAPI schema, then `openapi-typescript` turns it into `frontend/src/lib/api-types.ts`. `types:check` fails if that file is out of date.
- `test`: the API type check, TypeScript checks (app and e2e), Vitest, pytest, then Playwright; it stops and exits non-zero at the first failure. Playwright's `webServer` starts its own servers on ports 8100 and 5174 with `ACCOUNTABLE_DB` pointing at a temp file, and reseeds before each test.
- `postinstall`: `uv sync`.
- A new migration is made with `uv run alembic -c backend/alembic.ini revision --autogenerate -m "<change>"`, reviewed, and committed with the code that needs it. `STATUS.md` documents this.
- Scripts use only npm, Node and uv commands, no shell-specific syntax.

### D3. Data model (SQLite via SQLAlchemy Core)

| Table | Columns |
|---|---|
| organizations | id, name (req), website, industry, notes, created_at, updated_at |
| contacts | id, name (req), email, phone, job_title, organization_id (FK, SET NULL), status (`lead`/`qualified`/`customer`, default `lead`), created_at, updated_at |
| deals | id, name (req), organization_id (FK, SET NULL), contact_id (FK, SET NULL), stage (req), value_cents (req, int >= 0), probability (int 0-100), close_date (date), position (int), created_at, updated_at |
| activities | id, type (`note`/`call`/`email`/`stage_change`), contact_id (FK, CASCADE), deal_id (FK, CASCADE), description (req), occurred_on (date, req), follow_up_on (date), done (bool), created_at |

- Tables are defined once, in `crm/tables.py`, on the shared metadata from `db.py`, with named constraints. Every schema change is an Alembic migration in `backend/migrations/`; autogenerate reads that metadata, and a test fails if the two drift apart. Migrations use batch mode so column changes work on SQLite, and plain SQLAlchemy operations so they carry over to Postgres when the app moves to Supabase.
- Money is stored in integer cents, sent to the frontend as cents and formatted there.
- Foreign keys are enforced (`PRAGMA foreign_keys=ON` on each connection). Check constraints cover status, stage, activity type, value, probability, and that an activity has a contact or a deal.
- `position` orders cards within a stage. Every move, stage change, new deal or delete rewrites positions for the affected column(s) as 0..n in one transaction.
- Expected revenue is computed (value x probability / 100), never stored, and rounded once, at display.
- Each request runs in one transaction.

### D4. API (JSON under `/api`)

- `GET /health`.
- `GET/POST /organizations`, `GET/PATCH/DELETE /organizations/{id}`. The list includes each organization's contact count, open deal count and open value. `GET` on one includes its contacts and deals. `GET /organizations/{id}/delete-impact` returns linked counts for the dialog. Same pattern for contacts and deals: a contact includes its organization and deals; a deal includes its organization, main contact and last activity date.
- `GET /contacts?status=lead`.
- `GET /contacts/{id}/timeline`, `GET /deals/{id}/timeline`.
- `GET /activities/{id}`, `POST /activities`, `PATCH/DELETE /activities/{id}`. `stage_change` is rejected on create, edit and delete.
- `POST /deals` takes an optional `today` (used when created Won or Lost); `PATCH /deals/{id}` takes an optional `today` (used if the stage changes). PATCH changes only the fields sent and refuses null for a required field.
- `POST /deals/{id}/move` with `{stage, index, today}`: applies R21 if the stage changed, then places the deal at `index` in that column. Returns the updated board.
- `GET /pipeline`: deals grouped by stage in position order, with column and board totals.
- `GET /dashboard?today=YYYY-MM-DD`: KPIs (including late and 12-month won and lost counts), monthly series, funnel, recent activity, follow-ups.
- Errors: 422 with `{detail, errors: {field: message}}` for validation; 404 for missing records; 400 for a host name other than `localhost` or `127.0.0.1`.

Search, sort and filter run in the browser (the data is small), so list endpoints return everything. After any change, the frontend reloads every view it has cached, since records link to each other.

### D5. Libraries

Backend: FastAPI, Uvicorn, SQLAlchemy Core, Alembic, Pydantic; pytest and httpx for tests.

| Frontend need | Library |
|---|---|
| API types | openapi-typescript, generated from the backend's OpenAPI schema |
| Routing | React Router |
| Server state, optimistic updates | TanStack Query |
| Tables (sort, filter) | TanStack Table |
| Forms and validation | React Hook Form + Zod |
| Charts | Recharts (line and bar); the funnel is plain bars, to match mockup A |
| Drag and drop | dnd-kit (core + sortable) |
| Dialogs, side panels, toasts | Radix UI primitives |
| Icons | Lucide |
| Dates | date-fns |
| Fonts | @fontsource Instrument Sans, Instrument Serif, JetBrains Mono |

### D6. Visual layout and color

The look is direction **A (Ledger)** in `docs/mockups/`. The `a-*.html` files and their screenshots are the visual reference for every screen. Directions B and C are kept for reference only. Where this spec states a rule, the spec wins; on look, the mockup wins.

- **Layout.** Left sidebar (Midnight `#073B4C` background, Sea Mist text) with the wordmark "Accountable" and the five sections; active item marked with a Sea Green pill. Content area on page background `#F0F4F5`. White panels, 12px radius, no borders, a soft shadow for lift. No one-edge borders or top rule lines.
- **Type.** Instrument Sans for everything; page titles 28px semibold. Instrument Serif italic for the one-line summary on the dashboard. JetBrains Mono for money, percentages, dates in tables and IDs.
- **Color use.** Primary buttons Sea Green with Midnight text. Links and info badges Cerulean. Late and overdue Raspberry with white text. Sea Green and Marigold text on white is darkened (e.g. `#048A67`, `#B07D00`) to meet contrast. Colors come only from the CSS variables in `tokens.css`.
- **Status badges.** Lead Cerulean, Qualified Marigold, Customer Sea Green.
- **Stage colors.** As in C4. Used on pipeline column headers, card stage chips, funnel bars, the deal page's stage tracker and table stage badges.

### D7. Dashboard and pipeline visuals

- **Dashboard.** Row of four KPI tiles; then line chart (revenue won, Sea Green line with a light area fill) and bar chart (deals won, Cerulean bars, current month lighter) side by side; then the funnel full width as horizontal bars in stage colors, with deal count and value per stage; then recent activity and follow-ups side by side, overdue follow-ups first in Raspberry. Charts and funnel have tooltips with full currency values. Gradients only in the line chart's area fill.
- **Pipeline.** Six equal columns on a pale grey board. Each column has a white header with a stage-color swatch, the count, total value and expected revenue. Cards are white. Late cards get a Raspberry close date and a Late tag. Won and Lost cards are slightly muted. Board totals sit top right.
- **Dragging.** A dragged card tilts and lifts. Other cards stay in place while dragging: in the card's own column a gap opens where it will land; in another column a Sea Green line marks the drop spot, and the card's old place fades.

### D8. Tables, record pages, forms and dialogs

- **Tables.** Sortable column headings with an arrow, initials avatars, sticky header, row hover in a light tint of the page background, Edit and Delete as icon buttons at row end. Empty states say what to do: "No deals yet. Add one with New deal."
- **Record pages.** An About panel on the left and linked records and the timeline on the right; a stage tracker across the top of the deal page.
- **Forms and dialogs.** Add and Edit open a side panel from the right; Delete opens a centred dialog with a Raspberry button, as in `a-contact-new` and `a-organization-delete`.

### D9. Tone and messages

Short labels ("New deal", "Log activity", "Mark done"), no exclamation marks, plain messages ("Deal moved to Won. Close date set to 24 Nov 2026.", "Couldn't move {deal}. It has been put back.").

## Testing

`npm test` runs every automated check (D2). Passing tests are necessary but not enough: a change is also checked by a person in a real browser with the console open.

- **Type checks:** the generated API types match the backend, and the frontend and e2e code type-check.
- **pytest:** stage rules (probability, close date, contact to customer, timeline entry), deals created Won or Lost, delete cascades and nulling, required-field validation and limits, move/reorder positions, dashboard figures against a small fixed dataset and a given `today`, seed mix and reset (including under a running app), migrations matching the table definitions, foreign keys and check constraints, no CORS headers and the host check.
- **Vitest:** money and date formatting, late-deal check, client-side search and sort helpers, form validation schemas, the activity form, the delete dialog's messages, and optimistic board moves.
- **Playwright (installed Chrome):** one spec per area (smoke, layout, organizations, contacts, deals, pipeline, activities, dashboard, persistence, security). Each test starts from freshly seeded data with a pinned date and fails on any console error or request to another host. The security spec checks that Vite gives another local origin no CORS permission.
