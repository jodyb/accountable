# Spec: the Accountable MVP

Requirements and design for the MVP described in `docs/intent.md`, built on the stack in `docs/TECH_STACK.md`, styled by the brand skill (`.claude/skills/brand`).

## Concerns (resolved)

Each concern was raised in review and its proposed solution, shown in brackets, has been accepted. The rest of the spec follows these decisions.

1. **Offline fonts.** The brand fonts come from Google Fonts, but the app must work with no internet connection. [Self-host them through `@fontsource` packages, bundled by Vite.]
2. **"One command" needs installed dependencies first.** `npm run dev` can't work on a fresh clone without `npm install` and `uv sync`, and those need the internet once. [`npm install` is a one-time setup step; a `postinstall` script runs `uv sync`, so `npm install` then `npm run dev` is the documented path. `STATUS.md` says this plainly.]
3. **Stage-change entries are not one of the three activity types.** Activities are note, call or email, but "Moved from Proposal to Negotiation" has to live in the same timeline. [Add a fourth, system-only type `stage_change`. Users can't create, edit or pick it; they can delete it with the deal. It has no follow-up.]
4. **Six stages, five brand colors.** The brand's ordering rule (Sea Green, Marigold, Coral, then Cerulean, then Raspberry) covers five series, and putting Sea Green first would make New look like Won. [New Cerulean, Qualified Marigold, Proposal Coral, Negotiation a lighter tint of Sea Green, Won Sea Green, Lost Raspberry, so Won and Lost carry their natural meaning.] This knowingly bends the brand's ordering rule.
5. **What "the funnel" measures.** "How much value reaches each stage" could mean value currently in each stage, or value that has ever passed through it. There is no stage history beyond timeline entries. [Funnel bar for a stage = total value of deals currently at that stage or any later open stage, plus Won. Lost is excluded. This is cumulative, so bars only narrow.]
6. **Activity relates to "the contact or deal".** Intent says one or the other. [An activity has an optional contact and an optional deal, and at least one is required. Logging from a deal pre-fills the deal and its main contact, so it shows on both timelines. The contact timeline shows activities linked to the contact directly or through any of their deals.]
7. **Moving a deal out of Won or Lost.** Intent doesn't say. [Close date stays as it was (the user can edit it). The contact stays a customer; nothing is reverted.]
8. **"That day" and time zones.** [Dates are local calendar dates taken from the user's computer. The frontend sends today's date with stage changes; the backend stores dates as `YYYY-MM-DD` and timestamps in UTC.]
9. **Sample data must stay current.** Fixed dates would age out of the 12-month charts. [The seed generates dates relative to the day it runs, from a fixed random seed so content is the same every reset.]
10. **Hand-set probability.** "Kept until the stage changes" needs no flag: any stage change overwrites probability with the stage default, and editing probability without changing stage keeps it. [No extra field.]
11. **Brand covers dark mode; the MVP is light only.** [Define colors as CSS variables so dark mode is a later swap, but ship light only.]
12. **Node version.** Node 26 is the stated runtime; 24 also works. [`engines` in root `package.json` set to `>=24`.]

## Requirements

### General

- R1. `npm run dev` starts backend and frontend; the app opens on the Dashboard at `http://localhost:5173`. No internet needed after install.
- R2. `npm run seed` wipes the database and reloads sample data. `npm test` runs Vitest, pytest and Playwright and fails if any fail.
- R3. All data lives in one SQLite file (`backend/data/accountable.db`, git-ignored). On every start the backend applies any pending Alembic migrations, creating the file if missing, and seeds it if it is new. Tests use a separate temp database.
- R4. Every change is saved through the API at once; nothing is held only in the browser.
- R5. Money is shown as US dollars with the currency, e.g. `$48,500 USD` in tables and `$1.2M USD` in compact chart labels. Numbers use JetBrains Mono.
- R6. Light mode only, laid out for screens 1280px wide and up.
- R7. No errors in the browser console during normal use.

### Tables (Organizations, Contacts, Deals)

- R8. Each table has a search box (matches any visible text column, case-insensitive), sortable columns (click a heading: ascending, descending, off), a "New" button, and Edit and Delete on each row. Clicking a row opens the record's page.
- R9. Add and Edit use a side panel form. Required fields are marked; Save stays disabled and the field shows a message until they are filled.
- R10. Delete opens a confirmation dialog naming the record and stating the effect on linked records:
  - Organization: "Its N contacts and M deals will be kept, with no organization."
  - Contact: "Its N activities will be deleted. Its M deals will be kept, with no main contact."
  - Deal: "Its N activities will be deleted."
- R11. Contacts table has a status filter: All, Lead, Qualified, Customer.
- R12. Deals table shows stage, value, probability, expected revenue, close date. A deal not Won or Lost with a close date before today is late: its close date shows in Raspberry with a "Late" tag.

### Record pages

- R13. Organization page: details, its contacts table, its deals table, and Edit/Delete.
- R14. Contact page: details, a link to the organization, their deals, and a timeline.
- R15. Deal page: details (with organization and main contact links), and a timeline.
- R16. Timelines list activities newest first by date, with type icon, description, date, and follow-up state. Each entry (except stage changes) has Edit and Delete. A "Log activity" button opens the activity form.

### Activities and follow-ups

- R17. Activity form: type (note, call, email), contact and/or deal, description, date (defaults to today), optional follow-up date, done checkbox. Type, description, date and at least one of contact or deal are required.
- R18. An activity with a follow-up date and not done is a follow-up task. On the dashboard it is overdue if the date is before today, otherwise upcoming. Ticking it done removes it from the dashboard.
- R19. A stage change writes a `stage_change` activity on the deal (and its main contact), description "Moved from {old} to {new}", date today.

### Deals and stages

- R20. Stages and default probabilities: New 10, Qualified 25, Proposal 50, Negotiation 75, Won 100, Lost 0.
- R21. On any stage change (from the board or the edit form): probability becomes the new stage's default; a stage change entry is written; moving to Won or Lost sets the close date to today; moving to Won sets the main contact's status to Customer.
- R22. A new deal defaults to stage New and that stage's probability, unless created from a pipeline column, which sets that stage.

### Pipeline

- R23. Six columns in stage order. Each card shows name, organization, value, close date, and a Late tag when late.
- R24. Drag a card to another column to change stage (R21 applies) or within a column to reorder. The drop position is kept and survives refresh.
- R25. The board header shows open total value and open expected revenue (New to Negotiation). Each column header shows its count, total value and expected revenue. Figures update immediately on drop (optimistic update, rolled back with a message if the save fails).
- R26. Each column has a "+" button that opens the deal form with that stage set; the new card goes to the top of the column.

### Dashboard

- R27. KPI tiles: open pipeline value, expected revenue, won this month (value and count), win rate over 12 months (won / (won + lost)).
- R28. Line chart: revenue won per month, last 12 months including the current one.
- R29. Bar chart: deals won per month, same 12 months.
- R30. Pipeline visual: funnel of value by stage (see concern 5), with stage colors.
- R31. Recent activity: latest 10 activities across all records, including stage changes, each linking to its record.
- R32. Follow-ups: overdue first (Raspberry), then upcoming by date, each with a done checkbox and a link to its record.
- R33. Figures are computed by the backend from live data, so they match the tables and reflect changes on the next load.

### Sample data

- R34. About 15 organizations across at least 6 industries; 40 contacts covering all three statuses; 40 deals covering all six stages, with Won and Lost spread over the past 12 months, open deals closing in the coming months, and 3 to 5 late; about 100 activities across all types, with at least 3 follow-ups overdue and 3 due in the next week. Realistic names and descriptions, no lorem ipsum.

## Design

### Repo layout

```
package.json              root scripts, npm workspace "frontend"
pyproject.toml, uv.lock   installs backend/accountable as the `accountable` package
playwright.config.ts
backend/
  alembic.ini
  migrations/             Alembic environment and versions; the first version creates the CRM tables
  accountable/
    main.py               builds the FastAPI app, applies migrations on start, mounts each area's router
    config.py             settings; database path from ACCOUNTABLE_DB
    db.py                 engine, shared metadata, connection dependency
    openapi.py            writes the OpenAPI schema used to generate frontend types
    crm/                  first business area; later areas (invoicing, inventory) sit beside it
      tables.py           organizations, contacts, deals, activities (SQLAlchemy Core)
      schemas.py          Pydantic models
      stages.py           stage rules as plain functions
      organizations.py    router and queries
      contacts.py
      deals.py            includes move and reorder
      activities.py
      pipeline.py
      dashboard.py
      seed.py             sample data generator
  tests/                  test_db, test_api, test_migrations; crm/ mirrors accountable/crm
  data/                   SQLite file (git-ignored)
frontend/
  src/
    app/                  router, layout, sidebar built from one nav list, providers
    ui/                   shared pieces: DataTable, SidePanel, DeleteDialog, Badge, Toast
    lib/                  API client, generated API types, format, dates
    theme/                CSS variables, fonts
    features/             organizations, contacts, deals, activities, pipeline, dashboard;
                          each holds its pages, forms, query hooks and tests
  vite.config.ts          proxies /api to the backend
e2e/                      Playwright specs and helpers
```

Structure rules:

- Code is grouped by business area, then by resource. A resource module holds its routes and queries together and is split only when it grows big enough to need it.
- A new business area is a new package beside `crm/` in the backend and new folders in `features/` in the frontend, plus one line in the sidebar's nav list.
- The `db.py` connection dependency is the one place sign-in will later attach the current user.
- No base classes, generic CRUD factories, repository or service layers for their own sake, or dependency injection containers.

### Scripts

- `dev`: `concurrently` runs `uv run uvicorn accountable.main:app --port 8000` and `npm run dev -w frontend`. The backend applies pending migrations as it starts.
- `seed`: `uv run python -m accountable.crm.seed --reset`: deletes the database, migrates a new one and loads the sample data.
- `types`: `uv run python -m accountable.openapi` writes the OpenAPI schema, then `openapi-typescript` turns it into `frontend/src/lib/api-types.ts`.
- `test`: checks the generated types are current and the frontend type-checks, then Vitest, pytest and Playwright. Playwright's `webServer` starts both servers with `ACCOUNTABLE_DB` pointing at a temp file and seeds it.
- `postinstall`: `uv sync`.
- A new migration is made with `uv run alembic -c backend/alembic.ini revision --autogenerate -m "<change>"`, reviewed, and committed with the code that needs it. `STATUS.md` documents this.

### Data model (SQLite via SQLAlchemy Core)

| Table | Columns |
|---|---|
| organizations | id, name (req), website, industry, notes, created_at, updated_at |
| contacts | id, name (req), email, phone, job_title, organization_id (FK, SET NULL), status (`lead`/`qualified`/`customer`, default `lead`), created_at, updated_at |
| deals | id, name (req), organization_id (FK, SET NULL), contact_id (FK, SET NULL), stage (req), value_cents (req, int >= 0), probability (int 0-100), close_date (date), position (int), created_at, updated_at |
| activities | id, type (`note`/`call`/`email`/`stage_change`), contact_id (FK, CASCADE), deal_id (FK, CASCADE), description (req), occurred_on (date, req), follow_up_on (date), done (bool), created_at |

- Tables are defined once, in `crm/tables.py`, on the shared metadata from `db.py`. Every schema change is an Alembic migration in `backend/migrations/`; Alembic's autogenerate reads that metadata. Migrations use batch mode so column changes work on SQLite, and plain SQLAlchemy operations so they carry over to Postgres when the app moves to Supabase.
- Money is stored in integer cents, sent to the frontend as cents, formatted there.
- Foreign keys enforced (`PRAGMA foreign_keys=ON` on each connection). Activity has a check that contact_id or deal_id is set.
- `position` orders cards within a stage. A move rewrites positions for the affected column(s) as 0..n in one transaction, so order is exact and simple.
- Expected revenue is computed (value x probability / 100), never stored.

### API (JSON under `/api`)

- `GET/POST /organizations`, `GET/PATCH/DELETE /organizations/{id}`. `GET` on one includes contacts and deals. `GET /organizations/{id}/delete-impact` returns linked counts for the dialog. Same pattern for contacts and deals.
- `GET /contacts?status=lead`.
- `GET /contacts/{id}/timeline`, `GET /deals/{id}/timeline`.
- `POST /activities`, `PATCH/DELETE /activities/{id}`. `stage_change` rejected on create and edit.
- `POST /deals/{id}/move` with `{stage, index, today}`: applies R21 if the stage changed, then places the deal at `index` in that column. Returns the updated board.
- `GET /pipeline`: deals grouped by stage in position order, with column and board totals.
- `GET /dashboard?today=YYYY-MM-DD`: KPIs, monthly series, funnel, recent activity, follow-ups.
- Errors: 422 with field messages for validation; 404 for missing records.

Search, sort and filter run in the browser (the data is small), so list endpoints return everything.

### Libraries

Backend: FastAPI, Uvicorn, SQLAlchemy Core, Alembic, Pydantic; pytest and httpx for tests.

| Frontend need | Library |
|---|---|
| API types | openapi-typescript, generated from the backend's OpenAPI schema |
| Routing | React Router |
| Server state, optimistic updates | TanStack Query |
| Tables (sort, filter) | TanStack Table |
| Forms and validation | React Hook Form + Zod |
| Charts | Recharts |
| Drag and drop | dnd-kit (core + sortable) |
| Dialogs, side panels, menus | Radix UI primitives |
| Icons | Lucide |
| Dates | date-fns |
| Fonts | @fontsource Instrument Sans, Instrument Serif, JetBrains Mono |

### Visual design

The chosen direction is **A (Ledger)** in `docs/mockups/`. The `a-*.html` files and their screenshots are the visual reference for every screen; build to match them. Directions B and C are kept for reference only.

- **Layout.** Left sidebar (Midnight `#073B4C` background, Sea Mist text) with the wordmark "Accountable" and the five sections; active item marked with a Sea Green pill. Content area on page background `#F0F4F5`. White panels, 12px radius, no borders, a soft shadow for lift. No one-edge borders or top rule lines.
- **Type.** Instrument Sans for everything; page titles 28px semibold. Instrument Serif italic for the one-line greeting on the dashboard (e.g. today's date and a short summary line). JetBrains Mono for money, percentages, dates in tables and IDs.
- **Color use.** Primary buttons Sea Green with Midnight text. Links and info badges Cerulean. Late and overdue Raspberry with white text. Sea Green and Marigold text on white is darkened (e.g. `#048A67`, `#B07D00`) to meet contrast.
- **Status badges.** Lead Cerulean, Qualified Marigold, Customer Sea Green.
- **Stage colors.** As in concern 4. Used on pipeline column headers, card stage chips, funnel bars and table stage badges.
- **Dashboard.** Row of four KPI tiles; then line chart (revenue won, Sea Green line with a light area fill) and bar chart (deals won, Cerulean bars, current month lighter) side by side; then the funnel full width as horizontal bars in stage colors, with deal count and value per stage; then recent activity and follow-ups side by side, overdue follow-ups first in Raspberry. Charts have tooltips with full currency values. Gradients only in the line chart's area fill.
- **Pipeline.** Six equal columns on a pale grey board. Each column has a white header with a stage-color swatch, the count, total value and expected revenue. Cards are white and show name, organization, value, close date and probability; late cards get a Raspberry close date and a Late tag. A dragged card tilts and lifts, and a Sea Green line marks where it will drop. Won and Lost cards are slightly muted. Board totals sit top right.
- **Tables and record pages.** As in the `a-` mockups: sortable column headings with an arrow, initials avatars, Edit and Delete icons at row end, record pages with an About panel on the left and linked records and the timeline on the right, and a stage tracker across the top of the deal page.
- **Forms and dialogs.** Add and Edit open a side panel from the right; Delete opens a centred dialog with a Raspberry button, as in `a-contact-new` and `a-organization-delete`.
- **Tables.** Sticky header, row hover in a light tint of the page background, Edit and Delete as icon buttons at row end. Empty states say what to do: "No deals yet. Add one with New deal."
- **Tone.** Short labels ("New deal", "Log activity", "Mark done"), no exclamation marks, plain messages ("Deal moved to Won. Close date set to 24 Nov 2026.").

### Testing

- **pytest:** stage rules (probability, close date, contact to customer, timeline entry), delete cascades and nulling, required-field validation, move/reorder positions, dashboard figures against a small fixed dataset, seed produces the required mix, migrations build a schema that matches the table definitions.
- **Type checks:** the generated API types match the backend, and the frontend type-checks.
- **Vitest:** money and date formatting, late-deal check, client-side search and sort helpers, form validation schemas.
- **Playwright (Chrome):** one spec per success criterion in `intent.md`: dashboard loads with data; CRUD with refresh on each table; contact status filter; drag to another stage and to Won, reorder within a column, refresh keeps order, totals change; log activity with follow-up and see it on dashboard, mark done; console has no errors on every page.
- **Manual check** (success criterion 8): a person walks every section and action in a real browser before the MVP is called done.
