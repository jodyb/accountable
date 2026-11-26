// S2, S3: add, find, sort, edit and delete organizations; the record page shows linked records.
import { expect, panel, row, rows, test } from './helpers'

test('add, edit and delete an organization; changes survive reload', async ({ page }) => {
  await page.goto('/organizations')
  await page.getByRole('button', { name: 'New organization' }).click()
  const form = panel(page, 'New organization')
  const save = form.getByRole('button', { name: 'Save organization' })
  await expect(save).toBeDisabled()
  await expect(form.getByText('Enter a name to save this organization.')).toBeVisible()

  await form.getByLabel('Name').fill('Zephyr Analytics')
  await form.getByLabel('Industry').fill('Software')
  await form.getByLabel('Website').fill('zephyr.io')
  await expect(form.getByText('Enter a name to save this organization.')).toBeHidden()
  await save.click()
  await expect(form).toBeHidden()
  await expect(row(page, 'Zephyr Analytics')).toContainText('Software')
  await page.reload()
  await expect(row(page, 'Zephyr Analytics')).toContainText('zephyr.io')

  await page.getByRole('button', { name: 'Edit Zephyr Analytics' }).click()
  const edit = panel(page, 'Edit organization')
  await expect(edit.getByLabel('Name')).toHaveValue('Zephyr Analytics')
  await edit.getByLabel('Industry').fill('Data services')
  await edit.getByRole('button', { name: 'Save organization' }).click()
  await page.reload()
  await expect(row(page, 'Zephyr Analytics')).toContainText('Data services')

  await page.getByRole('button', { name: 'Delete Zephyr Analytics' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog.getByRole('heading')).toHaveText('Delete Zephyr Analytics?')
  await expect(dialog).toContainText(
    "Its 0 contacts and 0 deals will be kept, with no organization. This can't be undone.",
  )
  await dialog.getByRole('button', { name: 'Delete organization' }).click()
  await expect(row(page, 'Zephyr Analytics')).toHaveCount(0)
  await page.reload()
  await expect(rows(page)).toHaveCount(15)
  await expect(row(page, 'Zephyr Analytics')).toHaveCount(0)
})

test('search, sort and the empty state', async ({ page }) => {
  await page.goto('/organizations')
  const search = page.getByRole('searchbox', { name: 'Search organizations' })
  await search.fill('HARBOR')
  await expect(rows(page)).toHaveCount(1)
  await expect(rows(page).first()).toContainText('Harbor Health')
  await search.fill('logistics') // matches the industry column too
  await expect(rows(page)).toHaveCount(2)
  await search.fill('nothing like this')
  await expect(page.getByText('No organizations match your search.')).toBeVisible()
  await search.fill('')

  const industry = page.getByRole('columnheader', { name: 'Industry' })
  await industry.getByRole('button').click()
  await expect(industry).toHaveAttribute('aria-sort', 'ascending')
  await expect(rows(page).first()).toContainText('Fernhill Architects') // Architecture
  await industry.getByRole('button').click()
  await expect(industry).toHaveAttribute('aria-sort', 'descending')
  await expect(rows(page).first()).toContainText('Brightline Retail') // Retail
  await industry.getByRole('button').click()
  await expect(industry).not.toHaveAttribute('aria-sort')
  await expect(rows(page).first()).toContainText('Atlas Engineering') // back to the list order
})

test('a row opens the record page with details, contacts, deals, Edit and Delete', async ({
  page,
}) => {
  await page.goto('/organizations')
  await row(page, 'Atlas Engineering').locator('td').first().click()
  await expect(page).toHaveURL(/\/organizations\/\d+$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Atlas Engineering' })).toBeVisible()
  await expect(page.getByText('Civil and structural engineering firm')).toBeVisible()
  const contacts = page.getByRole('table', { name: 'Contacts' })
  await expect(contacts.locator('tbody tr')).toHaveCount(3)
  await expect(contacts).toContainText('Sofia Lindqvist')
  const deals = page.getByRole('table', { name: 'Deals' })
  await expect(deals).toContainText('Multi-site licence')
  await expect(deals).toContainText('Data migration')
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeVisible()
})

test('deleting an organization keeps its contacts and deals with no organization', async ({
  page,
}) => {
  await page.goto('/organizations')
  await row(page, 'Atlas Engineering').locator('td').first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Atlas Engineering' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText(
    'Its 3 contacts and 2 deals will be kept, with no organization.',
  )
  await dialog.getByRole('button', { name: 'Delete organization' }).click()
  await expect(page).toHaveURL(/\/organizations$/)
  await expect(rows(page)).toHaveCount(14)

  await page.getByRole('link', { name: 'Contacts' }).click()
  await page.getByRole('searchbox').fill('Sofia')
  await expect(row(page, 'Sofia Lindqvist').locator('td').nth(2)).toHaveText('None')
  await page.getByRole('link', { name: 'Deals' }).click()
  await expect(row(page, 'Multi-site licence').locator('td').nth(1)).toHaveText('None')
  await expect(row(page, 'Data migration').locator('td').nth(1)).toHaveText('None')
})
