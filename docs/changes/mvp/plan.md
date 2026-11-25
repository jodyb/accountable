# Plan: building the Accountable MVP

How we build what `intent.md` (in this folder) asks for and `docs/spec.md` designs. The visual reference is mockup direction A (`docs/mockups/a-*`).

References used below:

- **R1 to R34**: requirements in `spec.md`.
- **C1 to C12**: the resolved concerns at the top of `spec.md`.
- **D1 to D9**: the design sections of `spec.md`, numbered here: D1 repo layout and structure rules, D2 scripts, D3 data model and migrations, D4 API, D5 libraries, D6 visual layout and color, D7 dashboard and pipeline visuals, D8 tables, forms and dialogs, D9 tone and messages.
- **S1 to S8**: success criteria in `intent.md`.

## 1. Files that change

`README.md` stays as it is. Everything else below is new unless marked.

**Repo root**

| File | Purpose |
|---|---|
| `package.json` | npm workspace (`frontend`), scripts `dev`, `test`, `seed`, `types`, `types:check`, `postinstall` (`uv sync`), `engines` node `>=24`, `concurrently` |
| `package-lock.json` | lock file |
| `pyproject.toml`, `uv.lock` | Python 3.12 project that installs `backend/accountable` as the `accountable` package: FastAPI, Uvicorn, SQLAlchemy, Alembic, Pydantic; dev: pytest, httpx |
| `.gitignore` (changed) | ignore `backend/data/`, `node_modules/`, `frontend/dist/`, test output, `.venv/` |
| `playwright.config.ts` | Chrome channel, `webServer` starting both servers on test ports with a temp database |

**Backend (`backend/`)**, grouped by business area (D1). `crm/` is the first area; later ones sit beside it.

| File | Purpose |
|---|---|
| `alembic.ini` | Alembic config, script location `migrations/` |
| `migrations/env.py` | reads the shared metadata and `ACCOUNTABLE_DB`; batch mode for SQLite |
| `migrations/versions/0001_crm_tables.py` | first migration: the four CRM tables, constraints and indexes |
| `accountable/main.py` | builds the app, applies pending migrations on start, seeds a new database, mounts area routers under `/api`; no CORS, and only local host names are answered (DNS rebinding) |
| `accountable/config.py` | settings; database path from `ACCOUNTABLE_DB`, default `backend/data/accountable.db` |
| `accountable/db.py` | engine, `PRAGMA foreign_keys=ON`, shared metadata, connection dependency |
| `accountable/openapi.py` | writes the OpenAPI schema for frontend type generation |
| `accountable/crm/tables.py` | the four tables with check constraints (SQLAlchemy Core) |
| `accountable/crm/schemas.py` | Pydantic models for input and output, required-field rules |
| `accountable/crm/stages.py` | stage list, default probabilities, stage-change rules and late check as plain functions |
| `accountable/crm/organizations.py`, `contacts.py`, `activities.py` | router and queries for each resource, including detail payloads and delete-impact |
| `accountable/crm/deals.py` | deal router and queries, move and reorder, timeline entry, contact to customer |
| `accountable/crm/pipeline.py`, `dashboard.py` | board with totals; KPIs, monthly series, funnel, recent activity, follow-ups |
| `accountable/crm/seed.py` | sample data generator with fixed random seed and dates relative to today; `--reset` |
| `tests/conftest.py` | migrated temp database and test client per test |
| `tests/test_db.py`, `test_api.py`, `test_migrations.py`; `tests/crm/test_*.py` | see Proof |

**Frontend (`frontend/`)**, grouped by feature (D1). Shared code lives in `app/`, `ui/` and `lib/` only when two or more features use it.

| File | Purpose |
|---|---|
| `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html` | Vite + React + TypeScript, `/api` proxy with Vite's CORS off, Vitest config; the D5 libraries (React Router, TanStack Query and Table, React Hook Form, Zod, Recharts, dnd-kit, Radix UI, Lucide, date-fns, @fontsource, openapi-typescript) |
| `src/main.tsx` | entry point |
| `src/app/` | `App.tsx` (router, query client), `Layout.tsx`, `Sidebar.tsx`, `nav.ts` (the one list of sections) |
| `src/theme/tokens.css`, `src/theme/fonts.ts` | brand tokens as CSS variables (ready for a later dark mode), self-hosted fonts |
| `src/lib/api.ts`, `src/lib/api-types.ts` | typed fetch client; generated types (not edited by hand) |
| `src/lib/format.ts`, `src/lib/dates.ts`, `src/lib/table.ts` | money from cents, local dates, search and sort helpers |
| `src/ui/` | `DataTable.tsx` (search, sort, row actions, row click, empty state), `SidePanel.tsx`, `DeleteDialog.tsx`, `Badge.tsx`, `Toast.tsx` |
| `src/features/organizations/` | list and record pages, form, query hooks |
| `src/features/contacts/` | list and record pages with status filter, form, query hooks |
| `src/features/deals/` | list and record pages, form, `StageTrack.tsx`, `stages.ts` (colors, probabilities, late check, expected revenue), query hooks |
| `src/features/activities/` | `Timeline.tsx`, `ActivityForm.tsx`, query hooks |
| `src/features/pipeline/` | board, columns, cards, optimistic move with rollback |
| `src/features/dashboard/` | page, KPI tiles, Recharts line, bar and funnel charts, recent activity, follow-ups |
| `src/**/*.test.ts(x)` | next to the code they test; see Proof |

**End to end (`e2e/`)**: one spec file per area (see Proof), plus `helpers.ts` for reseeding, pinning the test date and console-error capture, and `global-setup.ts`, which refuses to run unless `ACCOUNTABLE_DB` points at a temp file.

**Docs**: `docs/STATUS.md` (changed) updated at the end of each phase, including prerequisites (Node 24+, uv, Google Chrome) and how to install and run.

## 2. Order of work

Each phase ends with `npm test` passing and a commit. A phase isn't finished until its proof is in place. The traceability tables under Proof map every spec item to its phase and tests.

**Phase 1: Skeleton** (R1, R2, C2, C12, D1, D2)
- Root workspace, scripts, `pyproject.toml` installing the `accountable` package, the empty `crm/` package and `features/` folders, Vite app, FastAPI app with `/api/health`, Alembic set up with no versions yet, `types` script, Playwright config and global setup.
- One trivial test in each of pytest, Vitest and Playwright, plus the type checks, so `npm test` runs them all.
- Exit: on a clean clone, `npm install` then `npm run dev` shows a blank branded shell at `http://localhost:5173`; `npm test` passes; a deliberately failing test in each runner makes `npm test` exit non-zero (checked once, then removed); scripts use no shell-specific syntax.

**Phase 2: Data model and API** (R3, R10, R16 to R22, R24, R25, R27 to R33 server side, C3, C5 to C8, C10, D3, D4)
- `crm/tables.py` and the first migration made from it, schemas, CRUD for all four records, record detail payloads, delete rules, delete-impact counts, validation and error responses.
- Stage rules, `POST /deals/{id}/move`, timelines, `/pipeline`, `/dashboard`.
- Run `npm run types` so the frontend has the API types before Phase 4.
- Exit: backend unit tests for every rule pass, including the migration tests.

**Phase 3: Sample data** (R2, R3, R34, C9)
- `seed.py` with the counts and mix from R34, relative dates, fixed seed; `npm run seed`; auto-seed of a new database.
- Exit: seed tests pass; dashboard endpoint returns non-empty figures for every widget.

**Phase 4: Frontend foundation** (R1 offline fonts, R5, R6, R8 to R10 shared parts, C1, C4, C8, C11, D5, D6, D8, D9)
- Tokens, fonts, `app/` layout and sidebar from mockup A, the API client on the generated types, formatting and date helpers, and the `ui/` pieces: DataTable, side panel, delete dialog, badge, toast.
- Exit: helper unit tests pass; empty pages render in the shell with no console errors.

**Phase 5: Tables and record pages** (R4, R8 to R17, C6)
- Organizations, Contacts (status filter), Deals (late marking) tables with add, edit, delete, row click and empty states.
- Organization, Contact and Deal pages with linked records, timelines, log/edit/delete activity, stage track.
- Exit: CRUD, filter, record page and timeline e2e specs pass.

**Phase 6: Pipeline** (R21 to R26, D7 pipeline)
- dnd-kit board, cross-column and within-column moves, optimistic totals with rollback and message, add deal in a column, late cards, drag visuals.
- Exit: pipeline e2e spec passes, including order kept after refresh and rollback on a failed save.

**Phase 7: Dashboard** (R18, R27 to R33, C5, D7 dashboard)
- KPI tiles, serif greeting line, revenue line chart, deals-won bar chart, funnel, recent activity, follow-ups with mark done, chart tooltips.
- Exit: dashboard e2e spec passes; figures match the data.

**Phase 8: Finish and prove** (R7, S1 to S8, all manual checks)
- Remaining e2e specs, console-error check on every page, layout checks, compare every screen with its `a-` mockup.
- A person walks every section and action in Chrome (S8), fixes are made, `STATUS.md` is final.

## 3. Risks

| Risk | Mitigation |
|---|---|
| Fonts or other assets fetched from the internet break offline use | Self-host with `@fontsource`; e2e fails on any request to an external host |
| Drag and drop between and within columns is fiddly, and order must survive refresh | Use dnd-kit sortable with one context per board; server rewrites positions in one transaction; e2e checks order after reload |
| Optimistic pipeline totals drift from the server | Totals derived from the cached board, replaced by the server's board after each move; rollback on error; e2e forces a failed save |
| "Today" differs between browser and server (time zones), so close dates and overdue are off by a day | Browser sends its local date with stage changes and dashboard requests; unit tests cover late-evening times; e2e pins the date |
| Seed dates are relative, so tests could change from day to day | Tests seed with a fixed "today" and assert on relative relationships, not fixed calendar dates |
| Scripts behave differently on Windows | Only npm scripts and Node or uv commands, no shell syntax; `concurrently` for parallel runs; env vars set in Node or Playwright config |
| Tests touch real data or clash with a running dev server | Tests use `ACCOUNTABLE_DB` in a temp folder and different ports; global setup refuses the real database path |
| SQLite can't alter most columns in place, so later migrations fail | Alembic batch mode from the first migration; `test_migrations` runs every migration up and down |
| Table definitions and migrations drift apart | `test_migrations` fails if autogenerate finds any difference between the migrated database and `crm/tables.py` |
| Migrations written for SQLite don't carry over to Postgres on Supabase | Only plain SQLAlchemy and Alembic operations in migrations, no raw SQLite SQL |
| Frontend types drift from the API | Types generated from the OpenAPI schema; `npm test` fails if regenerating changes them or the frontend doesn't type-check |
| Folders by feature drift back into a pile of shared helpers | Code moves to `ui/` or `lib/` only once two features use it; checked in Phase 8 (M9) |
| SQLite ignores foreign keys by default, so cascades silently fail | Enable the pragma on every connection; tests cover each delete rule and the pragma itself |
| Money rounding errors | Store integer cents; expected revenue rounded once, at display |
| Users without Google Chrome installed can't run e2e | Documented as a prerequisite in `STATUS.md` |
| Dashboard looks plain next to the mockup once Recharts defaults apply | Theme charts to the mockup and compare screenshots in Phase 8 |
| Spec and mockup differ in small ways | The spec text wins where it states a rule; the mockup wins on look. Known case: the spec's serif greeting line is added to the dashboard, which mockup A doesn't show |
| Scope creep beyond the MVP list | Anything in intent's "Not in the MVP" list is refused or noted for later |

## 4. Proof

`npm test` runs every automated check below (type checks, then Vitest, pytest and Playwright) and fails if any fails. Passing tests are necessary but not enough: Phase 8 includes a full manual walkthrough in a real browser with the console open.

### Type checks

- `types:check`: regenerating `api-types.ts` from the backend gives no change.
- `tsc --noEmit`: the frontend type-checks against the generated types.

### Backend unit tests (pytest)

Shared tests are in `backend/tests/`; CRM tests are in `backend/tests/crm/`.

- `test_migrations.py`: upgrading an empty database to head gives the tables, constraints and indexes in `crm/tables.py`, and autogenerate finds no difference; every migration downgrades and upgrades again; starting the app on an out-of-date database upgrades it and keeps its data.
- `test_db.py`: foreign keys are on for every connection; check constraints reject a negative value, a probability outside 0 to 100, an unknown status, stage or activity type, and an activity with neither contact nor deal; money is stored as integer cents.
- `test_api.py`: 404 for a missing record on every route; 422 with a message per field for invalid input; `created_at` set on create and `updated_at` changed on edit; dates returned as `YYYY-MM-DD`.
- `test_organizations.py`: create, read, update, delete; name required; the detail payload includes its contacts and deals; delete keeps contacts and deals with no organization; delete-impact counts.
- `test_contacts.py`: CRUD; name required; status defaults to lead; filter by status; the detail payload includes the organization and deals; delete removes activities and keeps deals with no main contact; delete-impact counts.
- `test_deals.py`: CRUD; name, stage and value required; value sent and returned in cents; new deal defaults to New at 10%; a deal created at another stage takes that stage and its probability and goes to the top of the column; the detail payload includes organization and main contact; delete removes its activities; delete-impact counts.
- `test_stage_rules.py`: each default probability (New 10, Qualified 25, Proposal 50, Negotiation 75, Won 100, Lost 0); changing stage sets the default, from both PATCH and move; a hand-set probability is kept when stage doesn't change and replaced when it does; moving to Won or Lost sets close date to the `today` sent by the client, not the server clock; Won makes the main contact a customer; a Won deal with no main contact still saves; each change writes one `stage_change` entry "Moved from X to Y" linked to the deal and its main contact; moving out of Won keeps close date and customer status.
- `test_move.py`: the response is the updated board; moving between columns and within a column, to the top, middle and bottom, gives the right order; positions in both columns stay 0..n with no gaps or repeats; a move to an unknown stage is rejected and changes nothing.
- `test_activities.py`: type, description, date and a contact or deal required; `stage_change` can't be created or edited through the API and has no follow-up; a deal's `stage_change` entries go when the deal is deleted; timelines newest first; a contact's timeline includes activities on its deals; follow-up date and done can be set and changed.
- `test_pipeline.py`: six columns in stage order and cards in position order; column count, total and expected revenue; board totals cover New to Negotiation only.
- `test_dashboard.py`: against a small fixed dataset and a given `today`: open pipeline value, expected revenue, won this month (value and count), win rate as won / (won + lost) over 12 months; 12 months of revenue and counts ending with the current month, empty months as zero; funnel is cumulative from each stage onward plus Won, Lost excluded; recent activity is the latest 10 including stage changes, with the linked record; follow-ups overdue first then upcoming by date, done ones excluded; marking a deal Won or adding a follow-up changes the next response.
- `test_seed.py`: about 15 organizations in at least 6 industries, 40 contacts with all three statuses, 40 deals with all six stages, about 100 activities with all three user types; won and lost deals spread across the past 12 months; open deals closing in coming months; 3 to 5 late deals; at least 3 overdue follow-ups and 3 due within 7 days; no placeholder text; reset replaces existing data; same output twice for the same today; a missing database is created and seeded on start, an existing one is left alone.

### Frontend unit tests (Vitest)

Each test sits next to the code it tests: `format`, `dates` and `table` in `lib/`; `DeleteDialog` in `ui/`; `deals` (testing `stages.ts`) in `features/deals/`; `ActivityForm` in `features/activities/`; `pipeline` in `features/pipeline/`; `schemas` split across the feature that owns each form.

- `format.test.ts`: money from cents always ends in USD, full (`$48,500 USD`) and compact (`$1.2M USD`) forms; percentages; display dates.
- `dates.test.ts`: "today" is the local calendar date, including late in the evening in time zones behind UTC; date strings are `YYYY-MM-DD`.
- `deals.test.ts`: late check (open stage and close date before today only); expected revenue; stage colors as in C4; default probabilities.
- `schemas.test.ts`: each form's required fields and messages (organization name; contact name; deal name, stage and value; activity type, description, date and a contact or deal).
- `ActivityForm.test.tsx`: date defaults to today; type offers note, call and email only; logging from a deal pre-fills the deal and its main contact.
- `table.test.ts`: search across visible columns, case-insensitive; sort ascending, descending, off.
- `pipeline.test.ts`: optimistic move updates column and board totals; rollback restores them; a new deal from a column is placed at the top.
- `DeleteDialog.test.tsx`: the exact message for organization, contact and deal, with counts.

### End-to-end tests (Playwright, installed Chrome)

Each spec starts from freshly seeded test data with a pinned date and fails on any browser console error or any request to an external host.

- `smoke.spec.ts` (S1): the app opens on the Dashboard; every section shows sample data; fonts in use are the brand fonts and load locally.
- `layout.spec.ts` (R5, R6, D6): at 1280px wide no page scrolls sideways (the pipeline board fits); money cells use JetBrains Mono and end in USD; sidebar shows the five sections with the current one marked.
- `organizations.spec.ts` (S2, S3): add, search, sort, edit, delete with the confirmation text; Save disabled with a message until name is filled; clicking a row opens the page, which shows details, contacts, deals, Edit and Delete; changes survive reload; after delete, its contacts and deals remain with no organization; a search with no match shows the empty-state message.
- `contacts.spec.ts` (S2, S3): the same table checks; filter by each status; the contact page shows details, a link to the organization, their deals and the timeline; delete removes activities and keeps deals with no main contact.
- `deals.spec.ts` (S2, S4): the same table checks; required name, stage and value; the table shows stage, value, probability, expected revenue and close date; late deals show a Raspberry date and Late tag; the deal page links to organization and main contact; changing stage in the edit form updates probability and adds a timeline entry.
- `pipeline.spec.ts` (S4): six columns; cards show name, organization, value, close date and Late tag when late; drag to another column changes stage and probability, shown in the Deals table; drag to Won sets close date to today, makes the contact a customer and shows the "Deal moved to Won" message; reorder within a column and drop between cards in another column both survive reload; board and column totals change at once; a failed save (forced by intercepting the request) puts the card and totals back and shows a message; "+" in a column opens the form at that stage and the new card appears at the top.
- `activities.spec.ts` (S5): log a note, call and email from a contact and from a deal (deal pre-fills its main contact); each shows on the right timelines, newest first, with type icon, date and follow-up state; edit and delete them; stage-change entries appear by themselves and have no Edit or Delete.
- `dashboard.spec.ts` (S6, S7): KPI tiles, line chart, bar chart and funnel are present and match the API; hovering a chart shows a full USD value; recent activity lists the latest entries with links; follow-ups show overdue first and leave when marked done; marking a deal Won updates won this month, the revenue chart and the funnel; a new follow-up appears.
- `persistence.spec.ts` (S2, R3, R4): changes survive a server restart; `npm run seed` brings back the sample data.

### Manual checks (Phase 8)

- M1 (C2, R1, S1): from a clean clone, the documented `npm install` then `npm run dev` works with no other steps; then with the network off, the app still works.
- M2 (C12): install and run on Node 24 as well as 26.
- M3 (R2): `npm test` exits non-zero when any one runner fails (Phase 1 check, repeated once at the end).
- M4 (D2): after `npm test`, the real database file is unchanged.
- M5 (D6, D7, D8, C4, S7): every screen compared with its `a-` mockup: sidebar, white rounded panels with no outlines or one-edge borders, stage and status colors, darkened Sea Green and Marigold text, serif greeting, chart styling, drag visuals, sticky table header, row hover, side panel and dialog.
- M6 (D9): labels are short, no exclamation marks, messages are plain.
- M7 (C11): colors come only from CSS variables in `tokens.css`, so dark mode can be added later.
- M8 (S8): a person uses every section and action as a salesperson would, with the console open.
- M9 (D1): the code follows the structure rules: CRM code lives under `crm/` and `features/`, shared folders hold only code used by two or more features, no base classes or generic layers, a new migration exists for every table change, and `STATUS.md` explains how to make one.

### Traceability: requirements

"Manual" points to the checks above. Test names drop their `test_` prefix and file suffixes; (fe) marks a frontend test where a backend test has the same name.

| Req | What | Phase | Unit tests | E2E specs | Manual |
|---|---|---|---|---|---|
| R1 | `npm run dev` opens on the Dashboard at :5173, works offline | 1, 4 | | smoke | M1 |
| R2 | `npm run seed` resets; `npm test` runs all and fails on any failure | 1, 3 | seed | persistence | M3 |
| R3 | One SQLite file, migrated on every start, seeded when new; tests use their own | 1 to 3 | seed, db, migrations | persistence | M4 |
| R4 | Every change saved through the API at once | 5 | | organizations, contacts, deals, persistence | |
| R5 | Money in USD, full and compact; numbers in JetBrains Mono | 4 | format | layout | M5 |
| R6 | Light mode, laid out for 1280px and up | 4 | | layout | M5 |
| R7 | No console errors | 8 | | all specs | M8 |
| R8 | Tables: search, sort, New, Edit, Delete, row opens record | 4, 5 | table | organizations, contacts, deals | |
| R9 | Side panel forms; required fields marked, Save disabled with message | 4, 5 | schemas; api | organizations, contacts, deals | M5 |
| R10 | Delete dialog names the record and its effect on linked records | 2, 4, 5 | organizations, contacts, deals; DeleteDialog | organizations, contacts, deals | |
| R11 | Contacts status filter | 5 | contacts | contacts | |
| R12 | Deals table columns; late deals in Raspberry with Late tag | 5 | deals (fe) | deals | |
| R13 | Organization page: details, contacts, deals, Edit and Delete | 2, 5 | organizations | organizations | M5 |
| R14 | Contact page: details, organization link, deals, timeline | 2, 5 | contacts | contacts | M5 |
| R15 | Deal page: details with links, timeline | 2, 5 | deals | deals | M5 |
| R16 | Timelines newest first with icon, date, follow-up; Edit/Delete except stage changes; Log activity | 2, 5 | activities | activities | |
| R17 | Activity form fields, date defaults to today, required fields | 2, 5 | activities; schemas, ActivityForm | activities | |
| R18 | Follow-ups overdue or upcoming until done | 2, 7 | dashboard | dashboard | |
| R19 | Stage change writes "Moved from X to Y" on deal and contact | 2 | stage_rules | activities, pipeline | |
| R20 | Stage default probabilities | 2 | stage_rules; deals (fe) | pipeline | |
| R21 | Stage change from board or form: probability, entry, close date, customer | 2 | stage_rules | pipeline, deals | |
| R22 | New deal defaults to New, or the column's stage | 2, 6 | deals | pipeline | |
| R23 | Six columns; card contents; late cards | 6 | pipeline | pipeline | M5 |
| R24 | Drag changes stage or order; order survives refresh | 2, 6 | move | pipeline | M5 |
| R25 | Board and column totals; update at once; rollback with message | 2, 6 | pipeline; pipeline (fe) | pipeline | |
| R26 | "+" in a column; new card at the top | 2, 6 | deals; pipeline (fe) | pipeline | |
| R27 | KPI tiles and win rate formula | 2, 7 | dashboard | dashboard | |
| R28 | Revenue line chart, 12 months including current | 2, 7 | dashboard | dashboard | M5 |
| R29 | Deals won bar chart, same 12 months | 2, 7 | dashboard | dashboard | M5 |
| R30 | Funnel of value by stage, stage colors | 2, 7 | dashboard | dashboard | M5 |
| R31 | Recent activity, latest 10, with links | 2, 7 | dashboard | dashboard | |
| R32 | Follow-ups: overdue first, then by date, done box, link | 2, 7 | dashboard | dashboard | |
| R33 | Figures computed by the backend from live data | 2, 7 | dashboard | dashboard | |
| R34 | Sample data mix and counts | 3 | seed | smoke | M5 |

### Traceability: resolved concerns

| Concern | Decision | Phase | Proof |
|---|---|---|---|
| C1 | Fonts self-hosted | 4 | smoke (local fonts, no external requests); M1 |
| C2 | `npm install` then `npm run dev`; `postinstall` runs `uv sync` | 1 | M1 |
| C3 | System-only `stage_change` type | 2, 5 | activities, stage_rules; activities (e2e) |
| C4 | Stage colors | 4 | deals (fe); M5 |
| C5 | Cumulative funnel, Lost excluded | 2, 7 | dashboard; dashboard (e2e) |
| C6 | Activity has contact and/or deal; deal pre-fills main contact; contact timeline includes its deals | 2, 5 | activities, db; ActivityForm; activities (e2e) |
| C7 | Leaving Won or Lost reverts nothing | 2 | stage_rules |
| C8 | Local dates from the browser; `YYYY-MM-DD`; UTC timestamps | 2, 4 | stage_rules, api; dates |
| C9 | Seed dates relative, fixed random seed | 3 | seed |
| C10 | Hand-set probability kept until stage changes | 2 | stage_rules |
| C11 | Colors as CSS variables, light only | 4 | M7 |
| C12 | `engines` node `>=24` | 1 | M2 |

### Traceability: design

| Design | What | Phase | Proof |
|---|---|---|---|
| D1 | Repo layout by business area and feature; structure rules | 1 | Files that change (section 1); Phase 1 exit; M9 |
| D2 | Scripts: `dev`, `seed`, `types`, `test`, `postinstall`; new-migration command; tests on a temp database | 1 | type checks; persistence; global setup; M1, M3, M4, M9 |
| D3 | Data model, constraints, cents, positions; Alembic migrations in batch mode | 2 | migrations, db, move, deals |
| D4 | API routes, detail payloads, delete-impact, move response, errors | 2 | api, organizations, contacts, deals, move, activities, pipeline, dashboard; type checks |
| D5 | Backend and frontend libraries, generated API types | 1 to 7 | Files that change; type checks; every unit test and e2e spec runs on them |
| D6 | Layout, type, color, badges | 4 | layout; M5 |
| D7 | Dashboard and pipeline visuals, tooltips, drag visuals | 6, 7 | dashboard, pipeline; M5 |
| D8 | Tables, record pages, forms and dialogs, empty states | 4, 5 | organizations, contacts, deals; M5 |
| D9 | Tone and messages | 4 to 7 | pipeline ("Deal moved to Won"); DeleteDialog; M6 |

### Traceability: success criteria

| Criterion | Proof |
|---|---|
| S1 | smoke; M1 |
| S2 | organizations, contacts, deals, persistence |
| S3 | organizations, contacts |
| S4 | pipeline, deals |
| S5 | activities |
| S6 | dashboard |
| S7 | dashboard, layout; M5 |
| S8 | M8 |
