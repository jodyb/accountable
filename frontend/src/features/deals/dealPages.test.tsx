import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { today } from '../../lib/dates'
import { ROUTE_DEAL } from '../../test/fixtures'
import { fakeApi, invalid, serverError } from '../../test/fakeApi'
import { pageTitle, renderApp } from '../../test/renderApp'

afterEach(() => vi.unstubAllGlobals())

const dealNames = () =>
  within(screen.getByRole('table', { name: 'Deals' }))
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent)

describe('Deals page', () => {
  it('lists deals by close date with open value and late count', async () => {
    fakeApi()
    renderApp('/deals')
    await pageTitle('Deals')
    expect(screen.getByText('3 deals, 2 open, worth $53,500 USD')).toBeInTheDocument()
    expect(screen.getByText('1 late')).toBeInTheDocument()
    expect(dealNames()).toEqual(['Multi-site licence', 'Route optimisation', 'Pilot'])
  })

  it('sorts by value both ways and searches', async () => {
    fakeApi()
    const { user } = renderApp('/deals')
    await pageTitle('Deals')
    const value = screen.getByRole('button', { name: /^Value/ })
    await user.click(value)
    expect(dealNames()[0]).toBe('Pilot')
    await user.click(value)
    expect(dealNames()[0]).toBe('Multi-site licence')
    await user.click(value)
    await user.type(screen.getByLabelText('Search deals'), 'nothing like this')
    expect(screen.getByText('No deals match your search.')).toBeInTheDocument()
  })

  it('adds a deal at a closed stage with its default probability', async () => {
    const api = fakeApi()
    const { user } = renderApp('/deals')
    await pageTitle('Deals')
    await user.click(screen.getByRole('button', { name: 'New deal' }))
    const name = await screen.findByLabelText(/^Deal name/)
    expect(name).toHaveFocus()
    await user.type(name, 'Fleet upgrade')
    await user.type(screen.getByLabelText(/^Value/), '2500')
    await user.selectOptions(screen.getByRole('combobox', { name: /^Stage/ }), 'Negotiation')
    expect(screen.getByLabelText(/^Probability/)).toHaveValue('75')
    await user.click(screen.getByRole('button', { name: 'Save deal' }))
    expect(await screen.findByText('Fleet upgrade added.')).toBeInTheDocument()
    expect(api.sent('POST', '/deals')).toMatchObject({
      name: 'Fleet upgrade',
      stage: 'Negotiation',
      value_cents: 250_000,
      today: today(),
    })
  })

  it('maps a server value message onto the value field', async () => {
    fakeApi({ 'PATCH /deals/10': invalid({ value_cents: 'Too much.' }) })
    const { user } = renderApp('/deals')
    await pageTitle('Deals')
    await user.click(screen.getByRole('button', { name: 'Edit Route optimisation' }))
    expect(await screen.findByLabelText(/^Value/)).toHaveValue('48500')
    await user.click(screen.getByRole('button', { name: 'Save deal' }))
    expect(await screen.findAllByText('Too much.')).not.toHaveLength(0)
  })

  it('says when a save fails', async () => {
    fakeApi({ 'POST /deals': serverError() })
    const { user } = renderApp('/deals')
    await pageTitle('Deals')
    await user.click(screen.getByRole('button', { name: 'New deal' }))
    await user.type(await screen.findByLabelText(/^Deal name/), 'Fleet upgrade')
    await user.type(screen.getByLabelText(/^Value/), '2500')
    await user.click(screen.getByRole('button', { name: 'Save deal' }))
    expect(
      await screen.findByText("Couldn't save. Check that the app is running and try again."),
    ).toBeInTheDocument()
  })

  it('deletes a deal after confirming', async () => {
    const api = fakeApi()
    const { user } = renderApp('/deals')
    await pageTitle('Deals')
    await user.click(screen.getByRole('button', { name: 'Delete Pilot' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(await within(dialog).findByRole('button', { name: 'Delete deal' }))
    await waitFor(() =>
      expect(api.calls.some((c) => c.method === 'DELETE' && c.path === '/deals/12')).toBe(true),
    )
  })

  it('opens a deal when its row is clicked', async () => {
    fakeApi()
    const { user } = renderApp('/deals')
    await pageTitle('Deals')
    await user.click(screen.getByText('Pilot'))
    expect(await pageTitle('Pilot')).toBeInTheDocument()
  })

  it('says when the list cannot load', async () => {
    fakeApi({ 'GET /deals': serverError() })
    renderApp('/deals')
    expect(await screen.findByText(/Couldn't load deals/)).toBeInTheDocument()
  })
})

describe('Deal page', () => {
  it('shows the stage track, figures, details and timeline', async () => {
    fakeApi()
    renderApp('/deals/10')
    await pageTitle('Route optimisation')
    expect(screen.getByText('Atlas Engineering · Maya Okafor')).toBeInTheDocument()
    const track = screen.getByLabelText('Stage: Proposal')
    expect(within(track).getByText('Proposal')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('$48,500 USD')).toBeInTheDocument()
    expect(screen.getByText('$24,250 USD')).toBeInTheDocument()
    expect(screen.getByText('Expected close')).toBeInTheDocument()
    const entries = await screen.findAllByTestId('timeline-entry')
    expect(entries[1]).toHaveTextContent('Moved from Qualified to Proposal')
  })

  it('shows a deal with no links or activity', async () => {
    fakeApi()
    renderApp('/deals/12')
    await pageTitle('Pilot')
    expect(screen.getByText('No organization or main contact')).toBeInTheDocument()
    expect(screen.getAllByText('None')).toHaveLength(4)
  })

  it('tells the user when an edit closes the deal', async () => {
    const api = fakeApi()
    const { user } = renderApp('/deals/10')
    await pageTitle('Route optimisation')
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.selectOptions(await screen.findByRole('combobox', { name: /^Stage/ }), 'Won')
    await user.click(screen.getByRole('button', { name: 'Save deal' }))
    expect(await screen.findByText(/^Deal moved to Won\. Close date set to/)).toBeInTheDocument()
    expect(api.sent('PATCH', '/deals/10')).toMatchObject({ stage: 'Won', probability: 100 })
  })

  it('logs an activity with the deal and its contact filled in', async () => {
    fakeApi()
    const { user } = renderApp('/deals/10')
    await pageTitle('Route optimisation')
    await user.click(screen.getByRole('button', { name: 'Log activity' }))
    expect(await screen.findByLabelText(/^Deal/)).toHaveValue(String(ROUTE_DEAL.id))
    expect(screen.getByLabelText(/^Contact/)).toHaveValue('1')
  })

  it('goes back to the list after a delete', async () => {
    fakeApi()
    const { user } = renderApp('/deals/10')
    await pageTitle('Route optimisation')
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(await within(dialog).findByRole('button', { name: 'Delete deal' }))
    expect(await pageTitle('Deals')).toBeInTheDocument()
  })

  it('says when the record cannot load', async () => {
    fakeApi()
    renderApp('/deals/99')
    expect(await screen.findByText(/Couldn't load this deal/)).toBeInTheDocument()
  })
})
