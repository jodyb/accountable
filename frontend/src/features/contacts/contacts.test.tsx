import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, invalid, serverError } from '../../test/fakeApi'
import { pageTitle, renderApp } from '../../test/renderApp'

afterEach(() => vi.unstubAllGlobals())

const rows = () => within(screen.getByRole('table', { name: 'Contacts' })).getAllByRole('row')

describe('Contacts page', () => {
  it('lists people with their organization and status', async () => {
    fakeApi()
    renderApp('/contacts')
    await pageTitle('Contacts')
    expect(screen.getByText('2 people, 1 of them leads')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Atlas Engineering' })).toHaveAttribute(
      'href',
      '/organizations/1',
    )
    expect(screen.getByText('maya@atlas-eng.com')).toBeInTheDocument()
  })

  it('filters by status and search', async () => {
    fakeApi()
    const { user } = renderApp('/contacts')
    await pageTitle('Contacts')
    const filters = screen.getByRole('group', { name: 'Filter by status' })
    await user.click(within(filters).getByRole('button', { name: /^Lead/ }))
    expect(rows()).toHaveLength(2)
    expect(screen.getByText('Sofia Lindqvist')).toBeInTheDocument()
    await user.click(within(filters).getByRole('button', { name: /^Qualified/ }))
    expect(screen.getByText('No contacts match.')).toBeInTheDocument()
    await user.click(within(filters).getByRole('button', { name: /^All/ }))
    await user.type(screen.getByLabelText('Search contacts'), 'maya')
    expect(screen.getByText('Showing 1 of 2')).toBeInTheDocument()
  })

  it('opens a contact when its row is clicked', async () => {
    fakeApi()
    const { user } = renderApp('/contacts')
    await pageTitle('Contacts')
    await user.click(screen.getByText('Sofia Lindqvist'))
    expect(await pageTitle('Sofia Lindqvist')).toBeInTheDocument()
  })

  it('adds a contact with a status', async () => {
    const api = fakeApi()
    const { user } = renderApp('/contacts')
    await pageTitle('Contacts')
    await user.click(screen.getByRole('button', { name: 'New contact' }))
    const name = await screen.findByLabelText(/^Name/)
    expect(name).toHaveFocus()
    await user.type(name, 'Leo Park')
    await user.selectOptions(screen.getByLabelText('Organization'), 'Atlas Engineering')
    await user.click(screen.getByRole('radio', { name: 'Qualified' }))
    await user.click(screen.getByRole('button', { name: 'Save contact' }))
    expect(await screen.findByText('Leo Park added.')).toBeInTheDocument()
    expect(api.sent('POST', '/contacts')).toMatchObject({
      name: 'Leo Park',
      organization_id: 1,
      status: 'qualified',
    })
  })

  it('shows a field message from the server', async () => {
    fakeApi({ 'PATCH /contacts/1': invalid({ email: 'Enter a valid email.' }) })
    const { user } = renderApp('/contacts')
    await pageTitle('Contacts')
    await user.click(screen.getByRole('button', { name: 'Edit Maya Okafor' }))
    expect(await screen.findByLabelText('Email')).toHaveValue('maya@atlas-eng.com')
    await user.click(screen.getByRole('button', { name: 'Save contact' }))
    expect(await screen.findByText('Enter a valid email.')).toBeInTheDocument()
  })

  it('says when a save fails', async () => {
    fakeApi({ 'PATCH /contacts/2': serverError() })
    const { user } = renderApp('/contacts')
    await pageTitle('Contacts')
    await user.click(screen.getByRole('button', { name: 'Edit Sofia Lindqvist' }))
    await screen.findByLabelText(/^Name/)
    await user.click(screen.getByRole('button', { name: 'Save contact' }))
    expect(
      await screen.findByText("Couldn't save. Check that the app is running and try again."),
    ).toBeInTheDocument()
  })

  it('deletes a contact after confirming', async () => {
    const api = fakeApi()
    const { user } = renderApp('/contacts')
    await pageTitle('Contacts')
    await user.click(screen.getByRole('button', { name: 'Delete Sofia Lindqvist' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(
      await within(dialog).findByText(
        "Its 2 activities will be deleted. Its 1 deal will be kept, with no main contact. This can't be undone.",
      ),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete contact' }))
    await waitFor(() => expect(api.calls.some((c) => c.method === 'DELETE')).toBe(true))
  })

  it('says when the list cannot load', async () => {
    fakeApi({ 'GET /contacts': serverError() })
    renderApp('/contacts')
    expect(await screen.findByText(/Couldn't load contacts/)).toBeInTheDocument()
  })
})

describe('Contact page', () => {
  it('shows details, deals and the timeline', async () => {
    fakeApi()
    renderApp('/contacts/1')
    await pageTitle('Maya Okafor')
    expect(screen.getByText('Operations Director at Atlas Engineering')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'maya@atlas-eng.com' })).toHaveAttribute(
      'href',
      'mailto:maya@atlas-eng.com',
    )
    const deals = screen.getByRole('list', { name: 'Deals' })
    expect(within(deals).getByRole('link', { name: 'Route optimisation' })).toBeInTheDocument()
    expect(await screen.findAllByTestId('timeline-entry')).toHaveLength(3)
  })

  it('shows empty states for a contact with nothing linked', async () => {
    fakeApi()
    renderApp('/contacts/2')
    await pageTitle('Sofia Lindqvist')
    expect(screen.getByText('No job title or organization')).toBeInTheDocument()
    expect(screen.getByText('No deals with this contact yet.')).toBeInTheDocument()
    expect(
      await screen.findByText('Nothing yet. Log a note, call or email with Log activity.'),
    ).toBeInTheDocument()
  })

  it('logs an activity for the contact', async () => {
    const api = fakeApi()
    const { user } = renderApp('/contacts/1')
    await pageTitle('Maya Okafor')
    await user.click(screen.getByRole('button', { name: 'Log activity' }))
    const description = await screen.findByLabelText(/^Description/)
    expect(description).toHaveFocus()
    expect(screen.getByLabelText(/^Contact/)).toHaveValue('1')
    await user.click(screen.getByRole('radio', { name: 'Call' }))
    await user.type(description, 'Called about pricing')
    await user.click(screen.getByRole('button', { name: 'Save activity' }))
    expect(await screen.findByText('Call logged.')).toBeInTheDocument()
    expect(api.sent('POST', '/activities')).toMatchObject({
      type: 'call',
      contact_id: 1,
      description: 'Called about pricing',
    })
  })

  it('edits the contact', async () => {
    fakeApi()
    const { user } = renderApp('/contacts/1')
    await pageTitle('Maya Okafor')
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await screen.findByLabelText(/^Name/)
    await user.click(screen.getByRole('button', { name: 'Save contact' }))
    expect(await screen.findByText('Contact saved.')).toBeInTheDocument()
  })

  it('goes back to the list after a delete', async () => {
    fakeApi()
    const { user } = renderApp('/contacts/1')
    await pageTitle('Maya Okafor')
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(await within(dialog).findByRole('button', { name: 'Delete contact' }))
    expect(await pageTitle('Contacts')).toBeInTheDocument()
  })

  it('says when the record cannot load', async () => {
    fakeApi()
    renderApp('/contacts/99')
    expect(await screen.findByText(/Couldn't load this contact/)).toBeInTheDocument()
  })
})
