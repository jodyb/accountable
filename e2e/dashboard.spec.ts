// S6, S7: the dashboard's figures match the data and follow changes.
import type { APIRequestContext, Page } from '@playwright/test'
import { expect, kpi, panel, row, test, toast, TODAY } from './helpers'

type Dash = {
  kpis: Record<string, number | null>
  months: { month: string; revenue_cents: number; won_count: number }[]
  funnel: { stage: string; count: number; value_cents: number }[]
  recent_activity: {
    description: string
    deal_id: number | null
    deal_name: string | null
    contact_name: string | null
  }[]
  follow_ups: { description: string; overdue: boolean }[]
}

const usd = (cents: number) => `$${Math.round(cents / 100).toLocaleString('en-US')} USD`
const fetchDash = async (request: APIRequestContext): Promise<Dash> =>
  (await request.get(`/api/dashboard?today=${TODAY}`)).json()

async function hoverLastMonth(page: Page, chart: string) {
  const box = (await page.getByTestId(chart).boundingBox())!
  await page.mouse.move(box.x + box.width - 14, box.y + box.height / 2)
  return page.getByTestId('chart-tooltip')
}

test('KPI tiles, charts and funnel are present and match the API', async ({ page, request }) => {
  const d = await fetchDash(request)
  await page.goto('/')
  await expect(kpi(page, 'Open pipeline')).toHaveText(usd(d.kpis.open_value_cents!))
  await expect(kpi(page, 'Expected revenue')).toHaveText(usd(d.kpis.open_expected_cents!))
  await expect(kpi(page, 'Won this month')).toHaveText(usd(d.kpis.won_this_month_cents!))
  await expect(kpi(page, 'Win rate')).toHaveText(`${d.kpis.win_rate}%`)
  await expect(page.getByTestId('kpi').filter({ hasText: 'Won this month' })).toContainText(
    `${d.kpis.won_this_month_count} deals in November`,
  )
  await expect(page.getByTestId('kpi').filter({ hasText: 'Open pipeline' })).toContainText(
    `${d.kpis.open_count} open deals`,
  )

  await expect(page.getByTestId('revenue-chart').locator('.recharts-area-curve')).toBeVisible()
  await expect(page.getByTestId('won-chart').locator('.recharts-bar-rectangle')).toHaveCount(
    d.months.filter((m) => m.won_count > 0).length,
  )
  await expect(
    page
      .getByTestId('won-chart')
      .locator('.recharts-cartesian-axis-tick-value')
      .filter({ hasText: /^[A-Z][a-z]{2}$/ }),
  ).toHaveText(['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'])

  const funnel = page.getByTestId('funnel').locator('.fb-row')
  await expect(funnel).toHaveCount(5)
  for (const [i, s] of d.funnel.entries()) {
    await expect(funnel.nth(i)).toContainText(s.stage)
    await expect(funnel.nth(i).locator('.fb-val')).toHaveText(usd(s.value_cents))
    await expect(funnel.nth(i)).toContainText(`${s.count} deals`)
  }
})

test('hovering a chart shows the full USD value', async ({ page, request }) => {
  const d = await fetchDash(request)
  await page.goto('/')
  const tip = await hoverLastMonth(page, 'revenue-chart')
  await expect(tip).toContainText('November 2026')
  await expect(tip).toContainText(usd(d.months[11].revenue_cents))
  const bars = await hoverLastMonth(page, 'won-chart')
  await expect(bars).toContainText(`${d.months[11].won_count} deals`)
  await page.getByTestId('funnel').locator('.fb-row').first().hover()
  await expect(page.getByTestId('funnel').getByRole('tooltip').first()).toContainText(
    usd(d.funnel[0].value_cents),
  )
})

test('recent activity lists the latest entries with links', async ({ page, request }) => {
  const d = await fetchDash(request)
  await page.goto('/')
  const items = page.getByRole('list', { name: 'Recent activity' }).getByRole('listitem')
  await expect(items).toHaveCount(10)
  for (const [i, a] of d.recent_activity.entries())
    await expect(items.nth(i)).toContainText(a.description)
  const first = d.recent_activity[0]
  await items.first().getByRole('link').click()
  await expect(
    page.getByRole('heading', { level: 1, name: first.deal_name ?? first.contact_name! }),
  ).toBeVisible()
})

test('follow-ups show overdue first and leave when marked done', async ({ page, request }) => {
  const d = await fetchDash(request)
  await page.goto('/')
  const tasks = page.getByRole('list', { name: 'Follow-ups' }).getByRole('listitem')
  await expect(tasks).toHaveCount(d.follow_ups.length)
  const overdue = d.follow_ups.filter((f) => f.overdue).length
  expect(overdue).toBeGreaterThanOrEqual(3)
  await expect(page.locator('.pill.rasp')).toHaveText(`${overdue} overdue`)
  for (let i = 0; i < d.follow_ups.length; i++) {
    if (i < overdue) {
      await expect(tasks.nth(i)).toHaveClass(/over/)
      await expect(tasks.nth(i)).toContainText('Overdue,')
    } else await expect(tasks.nth(i)).not.toHaveClass(/over/)
  }
  await expect(tasks.nth(0).locator('.due')).toHaveCSS('color', 'rgb(196, 45, 82)')

  const text = d.follow_ups[0].description
  await tasks.first().getByRole('checkbox').check()
  await expect(toast(page, 'Follow-up marked done.')).toBeVisible()
  await expect(tasks).toHaveCount(d.follow_ups.length - 1)
  await page.reload()
  await expect(
    page.getByRole('list', { name: 'Follow-ups' }).getByText(text, { exact: true }),
  ).toHaveCount(0)
  await expect(page.locator('.pill.rasp')).toHaveText(`${overdue - 1} overdue`)
})

test('marking a deal Won updates won this month, the revenue chart and the funnel', async ({
  page,
  request,
}) => {
  const before = await fetchDash(request)
  await page.goto('/deals')
  await row(page, 'Branch kiosk software').locator('td').first().click() // $39,000 USD, Negotiation
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const form = panel(page, 'Edit deal')
  await form.getByLabel('Stage').selectOption('Won')
  await form.getByRole('button', { name: 'Save deal' }).click()
  await expect(toast(page, 'Deal moved to Won. Close date set to 24 Nov 2026.')).toBeVisible()

  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(kpi(page, 'Won this month')).toHaveText(
    usd(before.kpis.won_this_month_cents! + 3_900_000),
  )
  await expect(page.getByTestId('kpi').filter({ hasText: 'Won this month' })).toContainText(
    `${before.kpis.won_this_month_count! + 1} deals`,
  )
  await expect(kpi(page, 'Open pipeline')).toHaveText(
    usd(before.kpis.open_value_cents! - 3_900_000),
  )
  const tip = await hoverLastMonth(page, 'revenue-chart')
  await expect(tip).toContainText(usd(before.months[11].revenue_cents + 3_900_000))
  const won = page.getByTestId('funnel').locator('.fb-row[data-stage="Won"]')
  await expect(won).toContainText(`${before.funnel[4].count + 1} deals`)
  await expect(
    page.getByRole('list', { name: 'Recent activity' }).getByRole('listitem').first(),
  ).toContainText('Moved from Negotiation to Won')
})

test('a new follow-up appears on the dashboard', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Log activity' }).click()
  const form = panel(page, 'Log activity')
  await form.getByLabel(/^Contact/).selectOption({ label: 'Olivia Bennett' })
  await form.getByRole('radio', { name: 'Call' }).click()
  await form.getByLabel('Description').fill('Confirm the spring event dates')
  await form.getByLabel('Follow-up date').fill('2026-11-25')
  await form.getByRole('button', { name: 'Save activity' }).click()
  await expect(form).toBeHidden()
  const task = page
    .getByRole('list', { name: 'Follow-ups' })
    .getByRole('listitem')
    .filter({ hasText: 'Confirm the spring event dates' })
  await expect(task).toContainText('Nov 25')
  await expect(task.getByRole('link', { name: 'Olivia Bennett' })).toBeVisible()
  await expect(
    page.getByRole('list', { name: 'Recent activity' }).getByRole('listitem').first(),
  ).toContainText('Confirm the spring event dates')
})
