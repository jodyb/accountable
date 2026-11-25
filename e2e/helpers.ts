// Shared test setup: fresh sample data, a pinned date, and checks for console
// errors and requests to other hosts after every test.
import { test as base, expect, type Locator, type Page } from '@playwright/test'

/** Every test runs on this date, in the browser and in the sample data. */
export const TODAY = '2026-11-24'

const allowed = new WeakMap<Page, RegExp[]>()

/** Let one test expect a console error, such as the 500 from a forced failed save. */
export function allowConsoleError(page: Page, pattern: RegExp) {
  allowed.set(page, [...(allowed.get(page) ?? []), pattern])
}

export const test = base.extend({
  page: async ({ page, request }, use) => {
    const reseed = await request.post('/api/test/reseed', { data: { today: TODAY } })
    expect(reseed.status(), 'reseed the test database').toBe(204)
    await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00`))

    const errors: string[] = []
    const external: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    page.on('pageerror', (e) => errors.push(e.message))
    // Name the request behind each "Failed to load resource" console error.
    page.on('response', (r) => {
      if (r.status() >= 400) errors.push(`(${r.status()} from ${r.request().method()} ${new URL(r.url()).pathname})`)
    })
    page.on('request', (r) => {
      const url = new URL(r.url())
      if (url.protocol.startsWith('http') && !['localhost', '127.0.0.1'].includes(url.hostname)) external.push(r.url())
    })

    await use(page)

    const ok = allowed.get(page) ?? []
    const unexpected = errors.filter((e) => !ok.some((p) => p.test(e)))
    expect(unexpected, 'browser console errors and failed requests').toEqual([])
    expect(external, 'requests to other hosts').toEqual([])
  },
})

export { expect }

/** Table body rows (not the header). */
export const rows = (page: Page) => page.locator('table.tbl tbody tr')
export const row = (page: Page, text: string) => rows(page).filter({ hasText: text })

/** A side panel form, by its title. */
export const panel = (page: Page, title: string) => page.getByRole('dialog', { name: title })

export const column = (page: Page, stage: string) => page.locator(`section[data-stage="${stage}"]`)
export const card = (page: Page, name: string) => page.locator(`[data-deal="${name}"]`)
export const cardNames = (page: Page, stage: string) =>
  column(page, stage).locator('[data-testid="deal-card"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-deal')))

/**
 * Drag with the mouse the way a person would: press, nudge past the 5px threshold,
 * glide to the target, settle, release. `where` picks a spot on the target box.
 */
export async function drag(page: Page, from: Locator, to: Locator, where: 'top' | 'middle' | 'bottom' = 'middle') {
  const a = (await from.boundingBox())!
  const b = (await to.boundingBox())!
  const sx = a.x + a.width / 2
  const sy = a.y + Math.min(20, a.height / 2)
  const tx = b.x + b.width / 2
  const ty = where === 'top' ? b.y + 6 : where === 'bottom' ? b.y + b.height - 6 : b.y + b.height / 2
  await page.mouse.move(sx, sy)
  await page.mouse.down()
  await page.mouse.move(sx + 8, sy + 8, { steps: 4 })
  await page.mouse.move(tx, ty, { steps: 25 })
  await page.mouse.move(tx, ty + 1, { steps: 4 })
  await page.waitForTimeout(150)
  await page.mouse.up()
}

/** The figure on the KPI tile with this label. */
export const kpi = (page: Page, label: string) => page.getByTestId('kpi').filter({ hasText: label }).locator('.kv-big')

/** The visible toast with this message (Radix also keeps a hidden copy for screen readers). */
export const toast = (page: Page, text: string) => page.locator('.toast').filter({ hasText: text })
