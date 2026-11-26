// S2, S3: contacts table, status filter, contact page, and what deleting a contact does.
import { expect, panel, row, rows, test } from './helpers'

test('add, edit and delete a contact; changes survive reload', async ({ page }) => {
  await page.goto('/contacts')
  await page.getByRole('button', { name: 'New contact' }).click()
  const form = panel(page, 'New contact')
  await expect(form.getByRole('button', { name: 'Save contact' })).toBeDisabled()
  await expect(form.getByText('Enter a name to save this contact.')).toBeVisible()
  await form.getByLabel('Name').fill('Nora Quinn')
  await form.getByLabel('Email').fill('nora.quinn@harborhealth.org')
  await form.getByLabel('Organization').selectOption({ label: 'Harbor Health' })
  await form.getByRole('radio', { name: 'Qualified' }).click()
  await form.getByRole('button', { name: 'Save contact' }).click()
  await expect(form).toBeHidden()
  await page.reload()
  await expect(row(page, 'Nora Quinn')).toContainText('Harbor Health')
  await expect(row(page, 'Nora Quinn')).toContainText('Qualified')

  await page.getByRole('button', { name: 'Edit Nora Quinn' }).click()
  const edit = panel(page, 'Edit contact')
  await edit.getByLabel('Job title').fill('Head of Nursing')
  await edit.getByRole('radio', { name: 'Customer' }).click()
  await edit.getByRole('button', { name: 'Save contact' }).click()
  await page.reload()
  await expect(row(page, 'Nora Quinn')).toContainText('Head of Nursing')
  await expect(row(page, 'Nora Quinn')).toContainText('Customer')

  await page.getByRole('button', { name: 'Delete Nora Quinn' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText(
    "Its 0 activities will be deleted. Its 0 deals will be kept, with no main contact. This can't be undone.",
  )
  await dialog.getByRole('button', { name: 'Delete contact' }).click()
  await page.reload()
  await expect(rows(page)).toHaveCount(40)
})

test('search, sort and the empty state', async ({ page }) => {
  await page.goto('/contacts')
  const search = page.getByRole('searchbox', { name: 'Search contacts' })
  await search.fill('northwind') // organization column
  await expect(rows(page)).toHaveCount(3)
  await search.fill('xyzzy')
  await expect(page.getByText('No contacts match.')).toBeVisible()
  await search.fill('')
  const name = page.getByRole('columnheader', { name: 'Name' })
  await expect(rows(page).first()).toContainText('Aisha Rahman')
  await name.getByRole('button').click() // was ascending, now descending
  await expect(rows(page).first()).toContainText('Tyler Brooks')
})

test('filter by each status', async ({ page }) => {
  await page.goto('/contacts')
  const filter = page.getByRole('group', { name: 'Filter by status' })
  for (const status of ['Lead', 'Qualified', 'Customer']) {
    const button = filter.getByRole('button', { name: new RegExp(`^${status}`) })
    const expected = Number(await button.locator('.c').textContent())
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(rows(page)).toHaveCount(expected)
    for (const badge of await rows(page).locator('td:nth-child(5)').allTextContents())
      expect(badge).toBe(status)
  }
  await filter.getByRole('button', { name: /^All/ }).click()
  await expect(rows(page)).toHaveCount(40)
})

test('the contact page shows details, organization, deals and timeline', async ({ page }) => {
  await page.goto('/contacts')
  await row(page, 'Maya Okafor').locator('td').first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Maya Okafor' })).toBeVisible()
  await expect(page.getByText('maya.okafor@northwind.co')).toBeVisible()
  const deals = page.getByRole('list', { name: 'Deals' })
  await expect(deals).toContainText('Route optimisation')
  await expect(deals).toContainText('Fleet telematics pilot')
  const timeline = page.getByRole('list', { name: 'Timeline' })
  await expect(timeline.getByTestId('timeline-entry').first()).toBeVisible()
  await page.getByRole('link', { name: 'Northwind Logistics' }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Northwind Logistics' })).toBeVisible()
})

test('deleting a contact deletes its activities and keeps its deals with no main contact', async ({
  page,
}) => {
  await page.goto('/contacts')
  await row(page, 'Maya Okafor').locator('td').first().click()
  await expect(page.getByTestId('timeline-entry').first()).toBeVisible()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText(
    /Its \d+ activit(y|ies) will be deleted\. Its 2 deals will be kept, with no main contact\./,
  )
  await dialog.getByRole('button', { name: 'Delete contact' }).click()
  await expect(page).toHaveURL(/\/contacts$/)
  await expect(row(page, 'Maya Okafor')).toHaveCount(0)

  await page.getByRole('link', { name: 'Deals' }).click()
  await expect(row(page, 'Route optimisation').locator('td').nth(2)).toHaveText('None')
  await row(page, 'Route optimisation').locator('td').first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Route optimisation' })).toBeVisible()
  await expect(page.getByText('Main contact').locator('xpath=following-sibling::dd[1]')).toHaveText(
    'None',
  )
  await expect(page.getByTestId('timeline-entry')).toHaveCount(0) // every entry was linked to Maya
})
