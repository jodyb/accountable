# Status

The MVP in `docs/plan.md` is built, Phases 1 to 8. Every automated check in the plan's Proof section is in place and passing. The manual checks that need a person (below) are still to do.

## Prerequisites

- Node 24 or later (26 is the target)
- [uv](https://docs.astral.sh/uv/) (it installs Python 3.12 for you)
- Google Chrome, for the end-to-end tests

## Install and run

```
npm install      # once; also runs `uv sync` for the backend
npm run dev      # backend on :8000, app on http://localhost:5173
```

The first start creates `backend/data/accountable.db` and fills it with sample data. After that the app needs no internet connection.

| Command | What it does |
|---|---|
| `npm run seed` | Deletes the database and reloads the sample data |
| `npm test` | API type check, TypeScript checks, Vitest, pytest, then Playwright; fails if any fail |
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

Test counts: 152 pytest, 64 Vitest, 42 Playwright.

- **Mockup review (M5):** all ten screens captured at 1440px and compared with their `a-` mockups. Fixed: a global `.ghost` rule from the pipeline drag faded every secondary button to 35% opacity (now `.card-leaving`, with an e2e check); stage names in timeline entries are now bold; selects use the mockup's chevron.

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
- On the pipeline, cards stay in place while dragging. In the card's own column a gap opens; in another column a Sea Green line marks the drop spot. Moving cards between columns mid-drag caused render loops in dnd-kit.
