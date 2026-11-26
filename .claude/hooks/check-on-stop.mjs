// Stop hook: when Claude finishes a turn, run `npm run check:quick`. On failure, block the
// stop once and send the failing step's output back to Claude to fix. If Claude is already
// continuing because of this hook (stop_hook_active), let it stop, so it can never loop.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const input = JSON.parse(readFileSync(0, 'utf8') || '{}')
if (input.stop_hook_active) process.exit(0)

// Nothing changed since the last commit, so there is nothing new to check.
const status = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' })
if (status.status === 0 && status.stdout.trim() === '') process.exit(0)

// 2>&1 keeps each tool's errors in order with the rest of its output.
const check = spawnSync('npm run check:quick 2>&1', {
  encoding: 'utf8',
  env: { ...process.env, NO_COLOR: '1' },
  maxBuffer: 64 * 1024 * 1024,
  shell: true,
})
if (check.status === 0) process.exit(0)

// The runner prints "==> <step>" before each step, so the last one is the step that failed.
const output = check.stdout
const failedStep = output.slice(output.lastIndexOf('\n==> ') + 1)
const lines = failedStep.split('\n')
const shown = lines.length > 150 ? ['...', ...lines.slice(-150)] : lines
process.stderr.write(
  `npm run check:quick failed. Fix the problem below, then finish your turn.\n\n${shown.join('\n')}\n`,
)
process.exit(2)
