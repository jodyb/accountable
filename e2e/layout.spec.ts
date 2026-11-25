// R5, R6, D6: fits 1280px, money in JetBrains Mono with USD, sidebar marks the current section.
import { expect, rows, test } from './helpers'

const PAGES = ['/', '/organizations', '/contacts', '/deals', '/pipeline', '/organizations/1', '/contacts/1', '/deals/18']

test('no page scrolls sideways at 1280px wide', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  for (const path of PAGES) {
    await page.goto(path)
    await expect(page.locator('h1')).toBeVisible()
    await page.waitForLoadState('networkidle')
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }))
    expect(scroll, `${path} width`).toBeLessThanOrEqual(client)
  }
  await page.goto('/pipeline')
  const board = (await page.locator('.board').boundingBox())!
  expect(board.x + board.width).toBeLessThanOrEqual(1280)
})

test('money cells use JetBrains Mono and end in USD', async ({ page }) => {
  await page.goto('/deals')
  await expect(rows(page)).toHaveCount(40)
  const valueCells = rows(page).locator('td:nth-child(5) .num')
  const texts = await valueCells.allTextContents()
  expect(texts).toHaveLength(40)
  for (const t of texts) expect(t).toMatch(/^\$[\d,]+(\.\d\d)? USD$/)
  const font = await valueCells.first().evaluate((el) => getComputedStyle(el).fontFamily)
  expect(font).toMatch(/^"?JetBrains Mono/)

  await page.goto('/pipeline')
  for (const t of await page.locator('[data-testid="col-value"]').allTextContents()) expect(t).toMatch(/ USD$/)
})

test('secondary (ghost) buttons are fully opaque, not faded like a dragged card', async ({ page }) => {
  await page.goto('/organizations/1')
  for (const name of ['Edit', 'Delete', 'Add contact', 'New deal']) {
    const opacity = await page.getByRole('button', { name, exact: true }).evaluate((el) => getComputedStyle(el).opacity)
    expect(opacity, name).toBe('1')
  }
})

test('sidebar shows the five sections with the current one marked', async ({ page }) => {
  await page.goto('/contacts/1')
  const nav = page.getByRole('navigation', { name: 'Sections' })
  await expect(nav.getByRole('link')).toHaveText(['Dashboard', 'Organizations', 'Contacts', 'Deals', 'Pipeline'])
  await expect(nav.getByRole('link', { name: 'Contacts' })).toHaveClass(/active/)
  await expect(nav.locator('a.active')).toHaveCount(1)
  const bg = await nav.getByRole('link', { name: 'Contacts' }).evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bg).toBe('rgb(6, 214, 160)') // Sea Green pill
})
