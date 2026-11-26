// S2, R3, R4: changes survive a server restart, and `npm run seed` brings back the sample data.
// Runs its own backend on its own temp database, so it can stop and start it.
import { request as http, type APIRequestContext } from '@playwright/test'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from './helpers'

const PORT = 8201
const BASE = `http://127.0.0.1:${PORT}`
const DB = join(mkdtempSync(join(tmpdir(), 'accountable-persist-')), 'persist.db')
const env = { ...process.env, ACCOUNTABLE_DB: DB }
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

async function start(): Promise<{ server: ChildProcess; api: APIRequestContext }> {
  const server = spawn('uv', ['run', 'uvicorn', 'accountable.main:app', '--port', String(PORT)], {
    env,
    stdio: 'ignore',
  })
  const api = await http.newContext({ baseURL: BASE })
  await expect
    .poll(async () => (await api.get('/api/health').catch(() => null))?.status(), {
      timeout: 30_000,
    })
    .toBe(200)
  return { server, api }
}

async function stop({ server, api }: { server: ChildProcess; api: APIRequestContext }) {
  await api.dispose()
  const exited = new Promise((r) => server.once('exit', r))
  server.kill()
  await exited
}

test('changes survive a restart, and the seed command resets to the sample data', async () => {
  test.setTimeout(120_000)
  let app = await start()
  expect((await (await app.api.get('/api/organizations')).json()).length).toBe(15) // a new database is seeded
  const created = await app.api.post('/api/organizations', { data: { name: 'Kept After Restart' } })
  expect(created.status()).toBe(201)
  const org = await created.json()
  await app.api.patch(`/api/organizations/${org.id}`, { data: { industry: 'Testing' } })
  await stop(app)

  app = await start()
  const kept = await (await app.api.get(`/api/organizations/${org.id}`)).json()
  expect(kept).toMatchObject({ name: 'Kept After Restart', industry: 'Testing' })
  await stop(app)

  const seed = spawnSync(npm, ['run', 'seed'], {
    env,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  expect(seed.status, seed.stderr).toBe(0)

  app = await start()
  const names = (await (await app.api.get('/api/organizations')).json()).map(
    (o: { name: string }) => o.name,
  )
  expect(names).toHaveLength(15)
  expect(names).not.toContain('Kept After Restart')
  expect((await (await app.api.get('/api/deals')).json()).length).toBe(40)
  await stop(app)
})
