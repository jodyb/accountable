# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

Read these first, in this order:

1. `docs/spec.md`: the whole product as it stands today. It is the authority on what Accountable does.
2. `docs/TECH_STACK.md`: the stack
3. `docs/STATUS.md`: how to run it and what's done so far
4. `docs/STANDARDS.md`: the coding guidelines all code follows

## Changes

Each change has its own folder, `docs/changes/<branch name>/`, named after its git branch (for example `docs/changes/mvp/` for the `mvp` branch). It holds that change's `intent.md` (what the change is for) and `plan.md` (how it gets built and proved).

- Read only the current change's folder, the one matching the branch you're on. Other folders are history: don't read them or follow them.
- A change updates `docs/spec.md` so the spec still describes the whole product when the change is done.

Update `docs/STATUS.md` when you finish a piece of work

## Checks

Run `npm run check` before calling any work done. It runs gitleaks, Prettier and ruff format, ESLint and ruff check (complexity at most 15), ty, then `npm test`: the API type check, tsc (app and e2e), Vitest and pytest (each at least 80% coverage), then Playwright. It stops and exits non-zero at the first failure. `npm run check:quick` is the same without Playwright. `npm run format` fixes formatting.

Hooks also run checks. Git's pre-commit hook (lefthook, `lefthook.yml`) formats staged files, then runs lint, type checks and gitleaks. It needs gitleaks installed. In Claude Code, a Stop hook runs `npm run check:quick` when a turn ends and sends any failure back once. A PreToolUse hook refuses edits to `.env`, which belongs to the user.

Fix what the checks find. Don't skip tests or weaken a rule, threshold or allowlist without asking. The tests use their own servers (ports 8100 and 5174) and a temp database, so they are safe to run alongside `npm run dev`.
