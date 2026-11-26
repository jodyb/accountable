# Status

The MVP in `docs/changes/mvp/plan.md` is built, Phases 1 to 8. Every automated check in the plan's Proof section is in place and passing. The manual checks that need a person (below) are still to do.

## Prerequisites

- Node 24 or later (26 is the target)
- [uv](https://docs.astral.sh/uv/) (it installs Python 3.12 for you)
- Google Chrome, for the end-to-end tests
- [gitleaks](https://github.com/gitleaks/gitleaks), for `npm run check` (`brew install gitleaks`)

## Install and run

```
npm install      # once; also runs `uv sync` for the backend
npm run dev      # backend on :8000, app on http://localhost:5173
```

The first start creates `backend/data/accountable.db` and fills it with sample data. After that the app needs no internet connection.

| Command | What it does |
|---|---|
| `npm run seed` | Replaces all data with the sample data (safe while `npm run dev` runs) |
| `npm run check` | gitleaks, Prettier, ruff format, ESLint, ruff check, ty, then everything in `npm test`; stops at the first failure and ends with a summary of each step and its time |
| `npm run check:quick` | The same without the Playwright tests |
| `npm run format` | Fixes formatting with Prettier and ruff format |
| `npm test` | API type check, TypeScript checks, Vitest and pytest (80% coverage each), then Playwright; fails if any fail |
| `npm run types` | Regenerates `frontend/src/lib/api-types.ts` after an API change |

`npm test` starts its own servers on ports 8100 and 5174 with a database in a temp folder, so it never touches your data and can run alongside `npm run dev`.

## Changing the database

Edit the tables in `backend/accountable/crm/tables.py`, then make a migration:

```
uv run alembic -c backend/alembic.ini revision --autogenerate -m "<change>"
```

Review the file it writes in `backend/migrations/versions/`, and commit it with the code that needs it. The app applies pending migrations every time it starts. `test_migrations.py` fails if the tables and migrations drift apart.

## What's done

- **Phase 1, skeleton:** npm workspace, uv project, FastAPI with `/api/health`, Vite app, Alembic, Playwright config and global setup (refuses to run on a non-temp database), `npm test` across all runners. Each runner failing makes `npm test` exit non-zero (checked).
- **Phase 2, data model and API:** four tables and the first migration (batch mode), CRUD, record pages, delete rules and delete-impact counts, stage rules, move and reorder, timelines, pipeline and dashboard figures, field-level 422 messages.
- **Phase 3, sample data:** 15 organizations in 13 industries, 40 contacts, 40 deals, about 110 activities. Dates are relative to today, from a fixed random seed.
- **Phase 4, frontend foundation:** brand tokens as CSS variables (light only), self-hosted fonts, sidebar and layout from mockup A, typed API client on generated types, shared table, side panel, delete dialog, badges and toasts.
- **Phases 5 to 7:** tables with search, sort, filter and empty states; record pages with timelines and activity logging; the drag-and-drop pipeline with optimistic totals and rollback; the dashboard with KPI tiles, line and bar charts, funnel, recent activity and follow-ups.
- **Phase 8:** console-error and external-request checks on every e2e test; layout checks at 1280px; dashboard, pipeline, deal page and New contact form compared with their `a-` mockups by screenshot.

- **Harness, enforced standards:** `npm run check`, `check:quick` and `format` (see the table above). To pass them without loosening any rule: FastAPI routes take the connection as `Conn = Annotated[Connection, Depends(get_conn)]`; `db.insert_id` replaces the untyped `inserted_primary_key[0]`; the four forms build their defaults in `schema.ts` and focus their first field with React Hook Form's `setFocus` instead of `autoFocus`; `useWatch` replaces `watch`. Page-level Vitest tests against a fake API (`frontend/src/test/`) lifted frontend unit coverage from 23% to over 90%.

Test counts: 166 pytest, 128 Vitest, 45 Playwright.

- **Mockup review (M5):** all ten screens captured at 1440px and compared with their `a-` mockups. Fixed: a global `.ghost` rule from the pipeline drag faded every secondary button to 35% opacity (now `.card-leaving`, with an e2e check); stage names in timeline entries are now bold; selects use the mockup's chevron.

## Review findings (`docs/review.md`, branch `mvp` against `main`)

| # | Pass | Severity | Finding | State |
|---|---|---|---|---|
| 1 | Bugs | Important | A deal created at Won or Lost (the column's "+ Add deal", or the stage select in New deal) got no close date and its contact stayed a lead, so the dashboard's won figures, charts and win rate left it out while the tables showed it (R33). | Fixed: created Won or Lost, a deal closes on the browser's today unless a close date is given, and Won makes its contact a customer. pytest and e2e cover it. |
| 2 | Bugs | Important | `npm run seed` deleted the database file, so a running dev server kept the old file open and every write failed with 500 until restart. | Fixed: the seed empties and reloads the tables in place, in one transaction. A pytest runs it under a live app. |
| 3 | Security | Important | CORS let any `http://localhost:*` page read and change all data. Removing it from FastAPI wasn't enough: Vite's own default CORS allows any localhost origin and applies to the `/api` proxy. | Fixed: CORS off in FastAPI and in Vite (`server.cors: false`). A pytest checks FastAPI; an e2e test (`security.spec.ts`) checks a preflight through Vite. |
| 7 | Security | Should fix | The API on port 8000 answered any `Host`, so a website using DNS rebinding could reach it. | Fixed: `TrustedHostMiddleware` answers only `localhost` and `127.0.0.1`; pytest covers allowed and refused hosts. |
| 8 | Spec | Should fix | `spec.md` (D2) still said the seed deletes the database, and `plan.md` listed CORS for Vite. | Fixed: both documents describe what the code does. |
| 4 | Plan | Process | Phase 8's manual checks (M1, M2, M8) are still open, and the build went in as one commit rather than one per phase. | Open: the manual checks need a person; the commit history stays as it is. |
| 5 | Bugs | Nit | A deal value too big for SQLite (over about $92 quadrillion) crashed with 500 instead of a field message. | Fixed: values are capped at $1 trillion in the API (422) and the form. |
| 6 | Bugs | Nit | An activity could be saved as done with no follow-up date, so a follow-up added later started out done and never reached the dashboard. | Fixed: the form clears done when there is no follow-up date. |

## Docs layout

`docs/spec.md` describes the whole product as it stands and is the authority. Each change keeps its intent and plan in `docs/changes/<branch name>/`; the MVP's are in `docs/changes/mvp/`. See `AGENTS.md`.

## Still to do (manual checks)

- **M1:** from a clean clone, `npm install` then `npm run dev`, then use the app with the network off.
- **M2:** install and run on Node 24 (only Node 26 has been used so far).
- **M8:** a person uses every section and action in Chrome with the console open, as a salesperson would.

## Decisions made while building

- `POST /deals/{id}/move` lives in `crm/pipeline.py` because it answers with the board; the position logic it uses is in `crm/deals.py`.
- `crm/queries.py` holds three selects (deal, contact and activity rows with their linked names) that several modules need. Keeping them in the resource modules would have made those modules import each other.
- Stage-change entries can't be deleted through the API, only with their deal.
- Deleting a contact deletes every activity linked to them, including stage changes on their deals that were linked to them. This follows the spec's CASCADE rule.
- The funnel is drawn with plain bars, not Recharts, to match mockup A. It has hover tooltips like the charts.
- Playwright resets its database through `POST /api/test/reseed`, which exists only when `ACCOUNTABLE_TEST=1`.
- A deal created already Won or Lost isn't a stage change, so it gets no "Moved from" entry, but it closes (today's date unless one is given) and Won makes its contact a customer, so the dashboard counts it.
- Neither the backend nor Vite sends CORS headers: the app's pages are same-origin with `/api` through Vite's proxy, so no other page needs them.
- The backend answers only the host names `localhost` and `127.0.0.1`, against DNS rebinding. Test clients use `http://localhost` (`tests/factories.py`).
- On the pipeline, cards stay in place while dragging. In the card's own column a gap opens; in another column a Sea Green line marks the drop spot. Moving cards between columns mid-drag caused render loops in dnd-kit.
