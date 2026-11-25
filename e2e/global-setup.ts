// Refuse to run unless the tests' database is a temp file, never the real one.
import { realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'

export default function globalSetup() {
  const db = process.env.ACCOUNTABLE_E2E_DB
  if (!db) throw new Error('ACCOUNTABLE_E2E_DB is not set; refusing to run end-to-end tests.')
  const real = resolve('backend/data/accountable.db')
  const tmp = realpathSync(tmpdir())
  const dbDir = realpathSync(dirname(db))
  if (resolve(db) === real || !dbDir.startsWith(tmp)) {
    throw new Error(`End-to-end tests must use a database in ${tmp}, not ${db}.`)
  }
}
