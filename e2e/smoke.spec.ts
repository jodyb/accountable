// S1: the app opens on the Dashboard with sample data everywhere, in the brand fonts, loaded locally.
import { expect, rows, test } from './helpers'

test('opens on the Dashboard with sample data', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('kpi')).toHaveCount(4)
  await expect(page.getByRole('list', { name: 'Recent activity' }).getByRole('listitem')).toHaveCount(10)
})

test('every section shows sample data', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Sections' })
  for (const [section, count] of [
    ['Organizations', 15],
    ['Contacts', 40],
    ['Deals', 40],
  ] as const) {
    await nav.getByRole('link', { name: section }).click()
    await expect(page.getByRole('heading', { level: 1, name: section })).toBeVisible()
    await expect(rows(page)).toHaveCount(count)
  }
  await nav.getByRole('link', { name: 'Pipeline' }).click()
  await expect(page.getByTestId('deal-card')).toHaveCount(40)
})

test('uses the brand fonts, served by the app itself', async ({ page }) => {
  const fontRequests: string[] = []
  page.on('request', (r) => {
    if (/\.woff2?(\?|$)/.test(r.url())) fontRequests.push(r.url())
  })
  await page.goto('/')
  await expect(page.getByTestId('kpi').first()).toBeVisible()
  await page.evaluate(() => document.fonts.ready)

  const families = await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    money: getComputedStyle(document.querySelector('.kv-big')!).fontFamily,
    greeting: getComputedStyle(document.querySelector('.greeting')!).fontFamily,
    loaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')),
  }))
  expect(families.body).toMatch(/^"?Instrument Sans/)
  expect(families.money).toMatch(/^"?JetBrains Mono/)
  expect(families.greeting).toMatch(/^"?Instrument Serif/)
  expect(new Set(families.loaded)).toEqual(new Set(['Instrument Sans', 'JetBrains Mono', 'Instrument Serif']))
  expect(fontRequests.length).toBeGreaterThan(0)
  for (const url of fontRequests) expect(new URL(url).hostname).toBe('localhost')
})
