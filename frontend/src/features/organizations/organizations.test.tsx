import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, invalid, serverError } from '../../test/fakeApi'
import { pageTitle, renderApp } from '../../test/renderApp'

afterEach(() => vi.unstubAllGlobals())

const table = () => screen.getByRole('table', { name: 'Organizations' })
const names = () =>
  within(table())
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent)

describe('Organizations page', () => {
  it('lists organizations with counts and a summary', async () => {
    fakeApi()
    renderApp('/organizations')
    await pageTitle('Organizations')
    expect(screen.getByText('2 companies across 1 industry')).toBeInTheDocument()
    expect(names()).toEqual(['AEAtlas Engineering', 'BRBrightline Retail'])
    expect(screen.getByRole('link', { name: 'atlas-eng.com' })).toHaveAttribute(
      'href',
      'https://atlas-eng.com',
    )
    expect(screen.getByText('Showing 2 of 2')).toBeInTheDocument()
  })

  it('searches, sorts and shows an empty state', async () => {
    fakeApi()
    const { user } = renderApp('/organizations')
    await pageTitle('Organizations')
    await user.click(screen.getByRole('button', { name: /^Name/ }))
    expect(names()[0]).toContain('Brightline')
    await user.type(screen.getByLabelText('Search organizations'), 'atlas')
    expect(names()).toHaveLength(1)
    expect(screen.getByText('Showing 1 of 2')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Search organizations'), 'zzz')
    expect(screen.getByText('No organizations match your search.')).toBeInTheDocument()
  })

  it('opens a record when its row is clicked', async () => {
    fakeApi()
    const { user } = renderApp('/organizations')
    await pageTitle('Organizations')
    await user.click(screen.getByText('Atlas Engineering'))
    expect(await pageTitle('Atlas Engineering')).toBeInTheDocument()
  })

  it('adds an organization from the side panel', async () => {
    const api = fakeApi()
    const { user } = renderApp('/organizations')
    await pageTitle('Organizations')
    await user.click(screen.getByRole('button', { name: 'New organization' }))
    const name = await screen.findByLabelText(/^Name/)
    expect(name).toHaveFocus()
    await user.type(name, 'Cobalt Labs')
    await user.type(screen.getByLabelText('Website'), 'cobalt.io')
    await user.click(screen.getByRole('button', { name: 'Save organization' }))
    expect(await screen.findByText('Cobalt Labs added.')).toBeInTheDocument()
    expect(api.sent('POST', '/organizations')).toMatchObject({
      name: 'Cobalt Labs',
      website: 'cobalt.io',
    })
  })

  it('shows the server field messages when a save is refused', async () => {
    fakeApi({ 'PATCH /organizations/1': invalid({ name: 'That name is taken.', other: 'Odd.' }) })
    const { user } = renderApp('/organizations')
    await pageTitle('Organizations')
    await user.click(screen.getByRole('button', { name: 'Edit Atlas Engineering' }))
    expect(await screen.findByLabelText(/^Name/)).toHaveValue('Atlas Engineering')
    await user.click(screen.getByRole('button', { name: 'Save organization' }))
    expect(await screen.findByText('That name is taken.')).toBeInTheDocument()
    expect(screen.getByText('Odd.')).toBeInTheDocument()
  })

  it('says when a save fails for another reason', async () => {
    fakeApi({ 'POST /organizations': serverError() })
    const { user } = renderApp('/organizations')
    await pageTitle('Organizations')
    await user.click(screen.getByRole('button', { name: 'New organization' }))
    await user.type(await screen.findByLabelText(/^Name/), 'Cobalt Labs')
    await user.click(screen.getByRole('button', { name: 'Save organization' }))
    expect(
      await screen.findByText("Couldn't save. Check that the app is running and try again."),
    ).toBeInTheDocument()
  })

  it('deletes an organization after confirming', async () => {
    const api = fakeApi()
    const { user } = renderApp('/organizations')
    await pageTitle('Organizations')
    await user.click(screen.getByRole('button', { name: 'Delete Brightline Retail' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(await within(dialog).findByRole('button', { name: 'Delete organization' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(api.calls.some((c) => c.method === 'DELETE' && c.path === '/organizations/2')).toBe(true)
  })

  it('says when a delete fails', async () => {
    fakeApi({ 'DELETE /organizations/2': serverError() })
    const { user } = renderApp('/organizations')
    await pageTitle('Organizations')
    await user.click(screen.getByRole('button', { name: 'Delete Brightline Retail' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(await within(dialog).findByRole('button', { name: 'Delete organization' }))
    expect(await screen.findByText("Couldn't delete this organization. Try again.")).toBeVisible()
  })

  it('says when the list cannot load', async () => {
    fakeApi({ 'GET /organizations': serverError() })
    renderApp('/organizations')
    expect(await screen.findByText(/Couldn't load organizations/)).toBeInTheDocument()
  })
})

describe('Organization page', () => {
  it('shows the profile, contacts and open deals', async () => {
    fakeApi()
    renderApp('/organizations/1')
    await pageTitle('Atlas Engineering')
    expect(screen.getByText('Prefers calls in the morning.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Maya Okafor' })).toHaveAttribute('href', '/contacts/1')
    expect(screen.getByRole('link', { name: 'Route optimisation' })).toHaveAttribute(
      'href',
      '/deals/10',
    )
  })

  it('shows empty states for a bare organization', async () => {
    fakeApi()
    renderApp('/organizations/2')
    await pageTitle('Brightline Retail')
    expect(screen.getByText('No contacts yet. Add one with Add contact.')).toBeInTheDocument()
    expect(screen.getByText('No deals yet. Add one with New deal.')).toBeInTheDocument()
    expect(screen.getAllByText('None')).toHaveLength(3)
  })

  it('adds a contact and a deal pre-linked to the organization', async () => {
    fakeApi()
    const { user } = renderApp('/organizations/1')
    await pageTitle('Atlas Engineering')
    await user.click(screen.getByRole('button', { name: 'Add contact' }))
    expect(await screen.findByLabelText('Organization')).toHaveValue('1')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(screen.getByRole('button', { name: 'New deal' }))
    expect(await screen.findByLabelText('Organization')).toHaveValue('1')
  })

  it('edits the organization', async () => {
    const api = fakeApi()
    const { user } = renderApp('/organizations/1')
    await pageTitle('Atlas Engineering')
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const notes = await screen.findByLabelText('Notes')
    await user.clear(notes)
    await user.type(notes, 'Call after 10.')
    await user.click(screen.getByRole('button', { name: 'Save organization' }))
    expect(await screen.findByText('Organization saved.')).toBeInTheDocument()
    expect(api.sent('PATCH', '/organizations/1')).toMatchObject({ notes: 'Call after 10.' })
  })

  it('goes back to the list after a delete', async () => {
    fakeApi()
    const { user } = renderApp('/organizations/1')
    await pageTitle('Atlas Engineering')
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(await within(dialog).findByRole('button', { name: 'Delete organization' }))
    expect(await pageTitle('Organizations')).toBeInTheDocument()
  })

  it('says when the record cannot load', async () => {
    fakeApi()
    renderApp('/organizations/99')
    expect(await screen.findByText(/Couldn't load this organization/)).toBeInTheDocument()
  })
})
