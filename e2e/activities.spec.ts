// S5: log, edit and delete activities from contacts and deals; stage changes appear by themselves.
import type { Page } from '@playwright/test'
import { expect, panel, row, test } from './helpers'

async function openContact(page: Page, name: string) {
  await page.goto('/contacts')
  await row(page, name).locator('td').first().click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

async function openDeal(page: Page, name: string) {
  await page.goto('/deals')
  await row(page, name).locator('td').first().click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

const entries = (page: Page) => page.getByTestId('timeline-entry')

test('log a note, call and email from a contact, newest first', async ({ page }) => {
  await openContact(page, 'Hannah Brooks')
  for (const [type, text] of [
    ['Note', 'Prefers email over phone'],
    ['Call', 'Called about the summer budget'],
    ['Email', 'Sent the education pricing sheet'],
  ]) {
    await page.getByRole('button', { name: 'Log activity' }).click()
    const form = panel(page, 'Log activity')
    await expect(form.getByLabel(/^Contact/)).toHaveValue(/\d+/)
    await expect(form.getByLabel(/^Date/)).toHaveValue('2026-11-24')
    await form.getByRole('radio', { name: type }).click()
    await form.getByLabel('Description').fill(text)
    await form.getByRole('button', { name: 'Save activity' }).click()
    await expect(form).toBeHidden()
    await expect(entries(page).first()).toContainText(text)
    await expect(entries(page).first().getByRole('img', { name: type })).toBeVisible()
    await expect(entries(page).first()).toContainText('Nov 24, 2026')
  }
  // Same date, so the latest logged comes first.
  await expect(entries(page).nth(0)).toContainText('Sent the education pricing sheet')
  await expect(entries(page).nth(1)).toContainText('Called about the summer budget')
  await expect(entries(page).nth(2)).toContainText('Prefers email over phone')
})

test('logging from a deal pre-fills its main contact; it shows on both timelines with its follow-up', async ({ page }) => {
  await openDeal(page, 'Multi-site licence')
  await page.getByRole('button', { name: 'Log activity' }).click()
  const form = panel(page, 'Log activity')
  await expect(form.getByLabel(/^Deal/).locator('option:checked')).toHaveText('Multi-site licence')
  await expect(form.getByLabel(/^Contact/).locator('option:checked')).toHaveText('Sofia Lindqvist')
  await form.getByRole('radio', { name: 'Email' }).click()
  await form.getByLabel('Description').fill('Sent the final licence schedule')
  await form.getByLabel('Follow-up date').fill('2026-11-30')
  await form.getByRole('button', { name: 'Save activity' }).click()
  await expect(form).toBeHidden()

  const entry = entries(page).filter({ hasText: 'Sent the final licence schedule' })
  await expect(entry).toContainText('Follow-up Nov 30')
  await expect(entry.getByRole('link', { name: 'Sofia Lindqvist' })).toBeVisible()
  await expect(entries(page).first()).toContainText('Sent the final licence schedule')

  await entry.getByRole('link', { name: 'Sofia Lindqvist' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Sofia Lindqvist' })).toBeVisible()
  const onContact = entries(page).filter({ hasText: 'Sent the final licence schedule' })
  await expect(onContact).toContainText('Follow-up Nov 30')
  await expect(onContact.getByRole('link', { name: 'Multi-site licence' })).toBeVisible()
})

test('overdue and done follow-ups show their state', async ({ page }) => {
  await openContact(page, 'Ben Carter')
  await page.getByRole('button', { name: 'Log activity' }).click()
  const form = panel(page, 'Log activity')
  await form.getByLabel('Description').fill('Chase the signed order form')
  await form.getByLabel(/^Date/).fill('2026-11-10')
  await form.getByLabel('Follow-up date').fill('2026-11-20')
  await form.getByRole('button', { name: 'Save activity' }).click()
  const entry = entries(page).filter({ hasText: 'Chase the signed order form' })
  await expect(entry).toContainText('Follow-up overdue, Nov 20')

  await entry.getByRole('button', { name: /^Edit activity/ }).click()
  const edit = panel(page, 'Edit activity')
  await edit.getByLabel('Follow-up done').check()
  await edit.getByRole('button', { name: 'Save activity' }).click()
  await expect(entry).toContainText('Follow-up done')
})

test('edit and delete an activity', async ({ page }) => {
  await openContact(page, 'Emily Zhang')
  await expect(entries(page)).toHaveCount(1)
  const first = entries(page).first()
  await first.getByRole('button', { name: /^Edit activity/ }).click()
  const form = panel(page, 'Edit activity')
  await form.getByLabel('Description').fill('Met Emily at the regional trade show in Denver')
  await form.getByRole('button', { name: 'Save activity' }).click()
  await expect(first).toContainText('in Denver')
  await page.reload()
  await expect(entries(page).first()).toContainText('in Denver')

  await entries(page).first().getByRole('button', { name: /^Delete activity/ }).click()
  await expect(entries(page)).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('Nothing yet. Log a note, call or email with Log activity.')).toBeVisible()
})

test('stage changes appear by themselves and have no Edit or Delete', async ({ page }) => {
  await openDeal(page, 'Data migration')
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const form = panel(page, 'Edit deal')
  await form.getByLabel('Stage').selectOption('Proposal')
  await form.getByRole('button', { name: 'Save deal' }).click()
  await expect(form).toBeHidden()
  const stageEntries = page.locator('li.stage_change')
  await expect(stageEntries.first()).toContainText('Moved from Qualified to Proposal')
  await expect(stageEntries.first().getByRole('img', { name: 'Stage change' })).toBeVisible()
  const count = await stageEntries.count()
  expect(count).toBeGreaterThanOrEqual(2)
  for (let i = 0; i < count; i++) await expect(stageEntries.nth(i).getByRole('button')).toHaveCount(0)
  // Other entries do have them.
  await expect(page.locator('li:not(.stage_change)[data-testid="timeline-entry"]').first().getByRole('button')).toHaveCount(2)
})
