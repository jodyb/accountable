// S2, S4: deals table, required fields, late deals, deal page, stage change from the form.
import { expect, panel, row, rows, test } from './helpers'

test('add, edit and delete a deal; required fields; changes survive reload', async ({ page }) => {
  await page.goto('/deals')
  await page.getByRole('button', { name: 'New deal' }).click()
  const form = panel(page, 'New deal')
  const save = form.getByRole('button', { name: 'Save deal' })
  await expect(save).toBeDisabled()
  await expect(form.getByText('Enter a deal name.')).toBeVisible()
  await expect(form.getByText('Enter a value.')).toBeVisible()
  await expect(form.getByLabel('Stage')).toHaveValue('New')
  await expect(form.getByLabel('Probability (%)')).toHaveValue('10')

  await form.getByLabel('Deal name').fill('Fleet maintenance app')
  await expect(save).toBeDisabled()
  await form.getByLabel('Value (USD)').fill('lots')
  await expect(form.getByText('Enter an amount in US dollars, like 48500.')).toBeVisible()
  await form.getByLabel('Value (USD)').fill('48,500')
  await form.getByLabel('Organization').selectOption({ label: 'Bluewater Marine' })
  await form.getByLabel('Close date').fill('2027-02-15')
  await save.click()
  await expect(form).toBeHidden()
  await page.reload()
  const created = row(page, 'Fleet maintenance app')
  await expect(created).toContainText('Bluewater Marine')
  await expect(created).toContainText('$48,500 USD')
  await expect(created).toContainText('10%')
  await expect(created).toContainText('$4,850 USD')

  await page.getByRole('button', { name: 'Edit Fleet maintenance app' }).click()
  const edit = panel(page, 'Edit deal')
  await edit.getByLabel('Value (USD)').fill('50000')
  await edit.getByLabel('Probability (%)').fill('30')
  await edit.getByRole('button', { name: 'Save deal' }).click()
  await page.reload()
  await expect(row(page, 'Fleet maintenance app')).toContainText('$50,000 USD')
  await expect(row(page, 'Fleet maintenance app')).toContainText('30%')

  await page.getByRole('button', { name: 'Delete Fleet maintenance app' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText("Its 0 activities will be deleted. This can't be undone.")
  await dialog.getByRole('button', { name: 'Delete deal' }).click()
  await page.reload()
  await expect(rows(page)).toHaveCount(40)
})

test('search, sort and the empty state', async ({ page }) => {
  await page.goto('/deals')
  const search = page.getByRole('searchbox', { name: 'Search deals' })
  await search.fill('Harbor')
  await expect(rows(page)).toHaveCount(3)
  await search.fill('qqq')
  await expect(page.getByText('No deals match your search.')).toBeVisible()
  await search.fill('')
  const value = page.getByRole('columnheader', { name: 'Value' })
  await value.getByRole('button').click()
  await expect(rows(page).first()).toContainText('$9,600 USD')
  await value.getByRole('button').click()
  await expect(rows(page).first()).toContainText('Multi-site licence')
})

test('the table shows stage, value, probability, expected revenue and close date', async ({
  page,
}) => {
  await page.goto('/deals')
  await expect(page.getByRole('columnheader')).toHaveText([
    'Deal',
    'Organization',
    'Main contact',
    'Stage',
    'Value',
    'Prob.',
    'Expected',
    'Close date',
    '',
  ])
  const r = row(page, 'Multi-site licence')
  await expect(r).toContainText('Negotiation')
  await expect(r).toContainText('$120,000 USD')
  await expect(r).toContainText('75%')
  await expect(r).toContainText('$90,000 USD')
})

test('late deals show a Raspberry close date and a Late tag', async ({ page }) => {
  await page.goto('/deals')
  for (const name of [
    'Store analytics',
    'POS rollout phase 2',
    'Annual support renewal',
    'Design workstation leasing',
  ]) {
    const cell = row(page, name).locator('td').nth(7)
    await expect(cell.getByText('Late')).toBeVisible()
    await expect(cell.locator('.late-d')).toHaveCSS('color', 'rgb(196, 45, 82)')
  }
  await expect(page.locator('.late-tag')).toHaveCount(4)
  await expect(row(page, 'Multi-site licence').getByText('Late')).toHaveCount(0)
})

test('the deal page links to its organization and main contact', async ({ page }) => {
  await page.goto('/deals')
  await row(page, 'Multi-site licence').locator('td').first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Multi-site licence' })).toBeVisible()
  await expect(page.getByLabel('Stage: Negotiation')).toBeVisible()
  await page.getByRole('link', { name: 'Sofia Lindqvist' }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Sofia Lindqvist' })).toBeVisible()
  await page.goBack()
  await page.getByRole('link', { name: 'Atlas Engineering' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Atlas Engineering' })).toBeVisible()
})

test('changing stage in the edit form updates probability and adds a timeline entry', async ({
  page,
}) => {
  await page.goto('/deals')
  await row(page, 'Patient portal').locator('td').first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Patient portal' })).toBeVisible()
  await expect(page.locator('.facts')).toContainText('40%') // set by hand in the sample data
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const form = panel(page, 'Edit deal')
  await form.getByLabel('Stage').selectOption('Negotiation')
  await expect(form.getByLabel('Probability (%)')).toHaveValue('75')
  await form.getByRole('button', { name: 'Save deal' }).click()
  await expect(form).toBeHidden()
  await expect(page.locator('.facts')).toContainText('75%')
  const first = page.getByTestId('timeline-entry').first()
  await expect(first).toContainText('Moved from Proposal to Negotiation')
  await expect(first).toContainText('Nov 24, 2026')

  await page.getByRole('link', { name: 'Deals', exact: true }).first().click()
  await expect(row(page, 'Patient portal')).toContainText('Negotiation')
  await expect(row(page, 'Patient portal')).toContainText('75%')
})
