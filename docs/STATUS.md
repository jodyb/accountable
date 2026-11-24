The project has not yet started.

- `docs/intent.md` is finished: it now covers what deleting does to linked records, required fields, the default probability for each stage, what happens when a deal is won, the dashboard's time range and how much sample data there is.
- `docs/spec.md` is agreed: requirements and design for the MVP. The concerns at the top are resolved with their proposed solutions.
- `docs/mockups/` has three design directions (A Ledger, B Briefing, C Cockpit). Each covers every screen: dashboard, pipeline, the organizations, contacts and deals tables, a record page for each, the New contact form and the delete confirmation. Each is an HTML file with a screenshot beside it. Direction A (Ledger) is chosen and recorded in `docs/spec.md`; its `a-*` mockups are the visual reference for the build.
- `docs/plan.md` is drafted: files that change, eight phases of work, risks, and the unit, end-to-end and manual checks that prove each part. Every requirement, resolved concern, design section and success criterion traces to its phase and proof. No code is written yet.
- Structure agreed: the backend is the `accountable` package grouped by business area (`crm/` first), the frontend is grouped by feature, schema changes go through Alembic migrations, and frontend API types are generated from the backend. Both `spec.md` and `plan.md` reflect this.
