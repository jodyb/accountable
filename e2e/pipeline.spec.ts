// S4: the board, dragging between and within columns, totals, rollback, and adding in a column.
import {
  allowConsoleError,
  card,
  cardNames,
  column,
  drag,
  expect,
  panel,
  row,
  test,
  toast,
  TODAY,
} from './helpers'

// Tall enough that every card is on screen: a mouse drag doesn't scroll the page.
test.use({ viewport: { width: 1440, height: 1500 } })

test.beforeEach(async ({ page }) => {
  await page.goto('/pipeline')
  await expect(page.getByTestId('deal-card')).toHaveCount(40)
})

test('six columns; cards show name, organization, value, close date and Late when late', async ({
  page,
}) => {
  await expect(page.locator('section[data-stage]')).toHaveCount(6)
  const stages = await page
    .locator('section[data-stage]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-stage')))
  expect(stages).toEqual(['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'])

  const multi = card(page, 'Multi-site licence')
  await expect(multi).toContainText('Atlas Engineering')
  await expect(multi).toContainText('$120,000 USD')
  await expect(multi).toContainText('75%')
  await expect(multi.locator('.cd')).toHaveText(/^[A-Z][a-z]{2} \d{1,2}$/)
  await expect(multi.getByText('Late')).toHaveCount(0)

  const late = card(page, 'Store analytics')
  await expect(late.getByText('Late')).toBeVisible()
  await expect(late.locator('.cd')).toHaveText('Nov 2')
  await expect(late.locator('.cd')).toHaveCSS('color', 'rgb(196, 45, 82)')
  await expect(page.locator('.card .late-tag')).toHaveCount(4)
})

test('drag to another column changes stage and probability, shown in the Deals table', async ({
  page,
}) => {
  await drag(page, card(page, 'Fleet telematics pilot'), card(page, 'Warehouse scanners'), 'top')
  await expect(
    column(page, 'Qualified').locator('[data-deal="Fleet telematics pilot"]'),
  ).toBeVisible()
  await expect(card(page, 'Fleet telematics pilot')).toContainText('25%')
  await page.waitForLoadState('networkidle')

  await page.getByRole('link', { name: 'Deals' }).click()
  await expect(row(page, 'Fleet telematics pilot')).toContainText('Qualified')
  await expect(row(page, 'Fleet telematics pilot')).toContainText('25%')
})

test('drag to Won sets close date to today, makes the contact a customer and says so', async ({
  page,
}) => {
  await drag(page, card(page, 'Clinic scheduling upgrade'), column(page, 'Won'), 'bottom')
  await expect(toast(page, 'Deal moved to Won. Close date set to 24 Nov 2026.')).toBeVisible()
  await expect(card(page, 'Clinic scheduling upgrade')).toContainText('Nov 24')
  await expect(card(page, 'Clinic scheduling upgrade')).toContainText('100%')
  await expect(column(page, 'Won').locator('[data-deal="Clinic scheduling upgrade"]')).toBeVisible()
  await page.waitForLoadState('networkidle')

  await page.getByRole('link', { name: 'Contacts' }).click()
  await expect(row(page, 'Daniel Reyes')).toContainText('Customer')
})

test('reorder within a column survives a reload', async ({ page }) => {
  const before = await cardNames(page, 'New')
  const last = before[before.length - 1]!
  await drag(page, card(page, last), card(page, before[0]!), 'top')
  await expect.poll(() => cardNames(page, 'New')).toEqual([last, ...before.slice(0, -1)])
  await page.waitForLoadState('networkidle')
  await page.reload()
  await expect(page.getByTestId('deal-card')).toHaveCount(40)
  expect(await cardNames(page, 'New')).toEqual([last, ...before.slice(0, -1)])
})

test('drop between cards in another column survives a reload', async ({ page }) => {
  const proposal = await cardNames(page, 'Proposal')
  await drag(page, card(page, 'Guest Wi-Fi upgrade'), card(page, proposal[1]!), 'top')
  await expect(column(page, 'Proposal').locator('[data-deal="Guest Wi-Fi upgrade"]')).toBeVisible()
  const after = await cardNames(page, 'Proposal')
  expect(after).toHaveLength(proposal.length + 1)
  const at = after.indexOf('Guest Wi-Fi upgrade')
  expect(at).toBeGreaterThan(0) // not at the top...
  expect(at).toBeLessThan(after.length - 1) // ...nor the bottom: between cards
  await page.waitForLoadState('networkidle')
  await page.reload()
  await expect(page.getByTestId('deal-card')).toHaveCount(40)
  expect(await cardNames(page, 'Proposal')).toEqual(after)
})

test('board and column totals change at once, before the server answers', async ({ page }) => {
  let release = () => {}
  const held = new Promise<void>((r) => (release = r))
  await page.route('**/api/deals/*/move', async (route) => {
    await held
    await route.continue()
  })
  const value = page.getByTestId('board-value')
  const newCount = column(page, 'New').getByTestId('col-count')
  const wonCount = column(page, 'Won').getByTestId('col-count')
  await expect(value).toHaveText('$790,800 USD')
  await expect(newCount).toHaveText('6')

  await drag(page, card(page, 'Fleet telematics pilot'), column(page, 'Won'), 'bottom') // $18,000 USD
  await expect(value).toHaveText('$772,800 USD')
  await expect(newCount).toHaveText('5')
  await expect(wonCount).toHaveText('14')
  await expect(column(page, 'New').getByTestId('col-value')).toHaveText('$86K USD')
  release()
  await page.waitForLoadState('networkidle')
  await expect(value).toHaveText('$772,800 USD')
})

test('a failed save puts the card and totals back and says so', async ({ page }) => {
  allowConsoleError(page, /status of 500|500 from POST \/api\/deals\/\d+\/move/)
  await page.route('**/api/deals/*/move', (route) =>
    route.fulfill({ status: 500, body: 'Server error' }),
  )
  const value = page.getByTestId('board-value')
  await expect(value).toHaveText('$790,800 USD')
  await drag(page, card(page, 'ERP integration'), column(page, 'Lost'), 'bottom')
  await expect(toast(page, "Couldn't move ERP integration. It has been put back.")).toBeVisible()
  await expect(column(page, 'Proposal').locator('[data-deal="ERP integration"]')).toBeVisible()
  await expect(column(page, 'Lost').locator('[data-deal="ERP integration"]')).toHaveCount(0)
  await expect(value).toHaveText('$790,800 USD')
  await expect(column(page, 'Proposal').getByTestId('col-count')).toHaveText('5')
})

test('a deal added in the Won column closes today and counts as won on the dashboard', async ({
  page,
  request,
}) => {
  const kpis = async () => (await (await request.get(`/api/dashboard?today=${TODAY}`)).json()).kpis
  const before = await kpis()
  await page.getByRole('button', { name: 'Add deal in Won' }).click()
  const form = panel(page, 'New deal')
  await form.getByLabel('Deal name').fill('Signed at the trade show')
  await form.getByLabel('Value (USD)').fill('7000')
  await form.getByRole('button', { name: 'Save deal' }).click()
  await expect(form).toBeHidden()
  await expect(card(page, 'Signed at the trade show')).toContainText('Nov 24')
  const after = await kpis()
  expect(after.won_this_month_count).toBe(before.won_this_month_count + 1)
  expect(after.won_this_month_cents).toBe(before.won_this_month_cents + 700_000)
})

test('"Add deal" in a column opens the form at that stage; the card appears at the top', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Add deal in Proposal' }).click()
  const form = panel(page, 'New deal')
  await expect(form.getByLabel('Stage')).toHaveValue('Proposal')
  await expect(form.getByLabel('Probability (%)')).toHaveValue('50')
  await form.getByLabel('Deal name').fill('Harbor kiosks')
  await form.getByLabel('Value (USD)').fill('12000')
  await form.getByRole('button', { name: 'Save deal' }).click()
  await expect(form).toBeHidden()
  await expect
    .poll(() => cardNames(page, 'Proposal'))
    .toEqual(expect.arrayContaining(['Harbor kiosks']))
  expect((await cardNames(page, 'Proposal'))[0]).toBe('Harbor kiosks')
  await page.reload()
  await expect(page.getByTestId('deal-card')).toHaveCount(41)
  expect((await cardNames(page, 'Proposal'))[0]).toBe('Harbor kiosks')
})
