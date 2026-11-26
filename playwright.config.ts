import { defineConfig, devices } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// The tests get their own database in a temp folder, and their own ports, so they
// never touch your data or clash with `npm run dev`. Set once, then inherited by workers.
process.env.ACCOUNTABLE_E2E_DB ??= join(mkdtempSync(join(tmpdir(), 'accountable-e2e-')), 'e2e.db')
export const API_PORT = 8100
export const WEB_PORT = 5174

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1, // one shared database, reseeded before each test
  retries: 0,
  forbidOnly: !!process.env.CI,
  // CI also writes an HTML report, which the workflow uploads when a run fails.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    baseURL: `http://localhost:${WEB_PORT}`,
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `uv run uvicorn accountable.main:app --port ${API_PORT}`,
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      env: { ACCOUNTABLE_DB: process.env.ACCOUNTABLE_E2E_DB, ACCOUNTABLE_TEST: '1' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npm run dev -w frontend',
      url: `http://localhost:${WEB_PORT}`,
      env: { ACCOUNTABLE_API_PORT: String(API_PORT), ACCOUNTABLE_WEB_PORT: String(WEB_PORT) },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
