# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

Read these first, in this order:

1. `docs/spec.md`: the whole product as it stands today. It is the authority on what Accountable does.
2. `docs/TECH_STACK.md`: the stack
3. `docs/STATUS.md`: how to run it and what's done so far

## Changes

Each change has its own folder, `docs/changes/<branch name>/`, named after its git branch (for example `docs/changes/mvp/` for the `mvp` branch). It holds that change's `intent.md` (what the change is for) and `plan.md` (how it gets built and proved).

- Read only the current change's folder, the one matching the branch you're on. Other folders are history: don't read them or follow them.
- A change updates `docs/spec.md` so the spec still describes the whole product when the change is done.

Update `docs/STATUS.md` when you finish a piece of work

## Testing

Run `npm test` before calling any work done. It runs, in order: the API type check, TypeScript checks (app and e2e), Vitest, pytest, then Playwright. It stops and exits non-zero at the first failure. Fix failures rather than skipping tests. It uses its own servers (ports 8100 and 5174) and a temp database, so it is safe to run alongside `npm run dev`.
