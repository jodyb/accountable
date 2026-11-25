# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/intent.md`: what we're building
- `docs/TECH_STACK.md`: the stack
- `docs/STATUS.md`: what's done so far

Update `docs/STATUS.md` when you finish a piece of work

## Testing

Run `npm test` before calling any work done. It runs, in order: the API type check, TypeScript checks (app and e2e), Vitest, pytest, then Playwright. It stops and exits non-zero at the first failure. Fix failures rather than skipping tests. It uses its own servers (ports 8100 and 5174) and a temp database, so it is safe to run alongside `npm run dev`.
