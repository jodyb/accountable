// Runs every check in order, stops at the first failure, then prints how each step went and how long it took.
// Usage: node scripts/check.mjs [--quick]   (--quick leaves out the end-to-end tests)
import { spawnSync } from 'node:child_process'

const STEPS = [
  { label: 'Secrets (gitleaks)', script: 'secrets' },
  { label: 'Format, frontend (Prettier)', script: 'format:check:web' },
  { label: 'Format, backend (ruff format)', script: 'format:check:py' },
  { label: 'Lint, frontend (ESLint)', script: 'lint:web' },
  { label: 'Lint, backend (ruff check)', script: 'lint:py' },
  { label: 'Types, backend (ty)', script: 'typecheck:py' },
  { label: 'API types up to date', script: 'types:check' },
  { label: 'Types, frontend (tsc)', script: 'typecheck:web' },
  { label: 'Types, e2e (tsc)', script: 'typecheck:e2e' },
  { label: 'Unit tests, frontend (Vitest, 80% coverage)', script: 'test:web' },
  { label: 'Unit tests, backend (pytest, 80% coverage)', script: 'test:py' },
  { label: 'End-to-end tests (Playwright)', script: 'test:e2e', e2e: true },
]

const color = process.stdout.isTTY && !process.env.NO_COLOR
const paint = (code) => (text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text)
const green = paint('32')
const red = paint('31')
const dim = paint('2')
const bold = paint('1')

function duration(ms) {
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(1)}s`
}

function run(step) {
  console.log(bold(`\n==> ${step.label}`) + dim(`  (npm run ${step.script})`))
  const start = performance.now()
  const result = spawnSync('npm', ['run', '--silent', step.script], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  return { ...step, ms: performance.now() - start, passed: result.status === 0 }
}

function printSummary(results, skipped, totalMs) {
  const width = Math.max(...[...results, ...skipped].map((s) => s.label.length))
  console.log(bold('\nCheck summary'))
  for (const r of results) {
    const status = r.passed ? green('PASS') : red('FAIL')
    console.log(`  ${status}  ${r.label.padEnd(width)}  ${duration(r.ms).padStart(9)}`)
  }
  for (const s of skipped) console.log(dim(`  SKIP  ${s.label.padEnd(width)}`))
  const failed = results.filter((r) => !r.passed).length
  const counts = [
    `${results.length - failed} passed`,
    `${failed} failed`,
    `${skipped.length} skipped`,
  ]
  console.log(`\n  ${bold('Total')} ${duration(totalMs)}   ${counts.join(', ')}`)
}

const quick = process.argv.includes('--quick')
const steps = STEPS.filter((s) => !(quick && s.e2e))
const start = performance.now()
const results = []
for (const step of steps) {
  const result = run(step)
  results.push(result)
  if (!result.passed) break
}
printSummary(results, steps.slice(results.length), performance.now() - start)
process.exit(results.every((r) => r.passed) ? 0 : 1)
