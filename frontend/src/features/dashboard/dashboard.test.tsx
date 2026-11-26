import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, serverError } from '../../test/fakeApi'
import { pageTitle, renderApp } from '../../test/renderApp'

afterEach(() => vi.unstubAllGlobals())

describe('Dashboard', () => {
  it('summarises the pipeline and shows the four figures', async () => {
    fakeApi()
    renderApp('/')
    await pageTitle('Dashboard')
    expect(
      screen.getByText('2 open deals worth $53,500 USD, 1 follow-up overdue.'),
    ).toBeInTheDocument()
    const kpis = screen.getAllByTestId('kpi').map((k) => k.textContent)
    expect(kpis[0]).toContain('$53,500 USD')
    expect(kpis[3]).toContain('50%')
    expect(kpis[3]).toContain('1 won, 1 lost')
  })

  it('shows the funnel, recent activity and follow-ups', async () => {
    fakeApi()
    renderApp('/')
    await pageTitle('Dashboard')
    expect(within(screen.getByTestId('funnel')).getByText('Reached Won')).toBeInTheDocument()
    const recent = screen.getByRole('list', { name: 'Recent activity' })
    expect(within(recent).getByRole('link', { name: 'Route optimisation' })).toBeInTheDocument()
    expect(within(recent).getByRole('link', { name: 'Maya Okafor' })).toBeInTheDocument()
    const followUps = screen.getByRole('list', { name: 'Follow-ups' })
    expect(within(followUps).getByText('Today')).toBeInTheDocument()
    expect(within(followUps).getByText(/^Overdue,/)).toBeInTheDocument()
  })

  it('marks a follow-up done', async () => {
    const api = fakeApi()
    const { user } = renderApp('/')
    await pageTitle('Dashboard')
    await user.click(screen.getByRole('checkbox', { name: 'Mark done: Discovery call' }))
    expect(await screen.findByText('Follow-up marked done.')).toBeInTheDocument()
    expect(api.sent('PATCH', '/activities/101')).toEqual({ done: true })
  })

  it('says when marking done fails', async () => {
    fakeApi({ 'PATCH /activities/101': serverError() })
    const { user } = renderApp('/')
    await pageTitle('Dashboard')
    await user.click(screen.getByRole('checkbox', { name: 'Mark done: Discovery call' }))
    expect(await screen.findByText("Couldn't mark it done. Try again.")).toBeInTheDocument()
  })

  it('shows empty states and no win rate on a new workspace', async () => {
    const { DASHBOARD } = await import('../../test/fixtures')
    fakeApi({
      'GET /dashboard': {
        ...DASHBOARD,
        kpis: { ...DASHBOARD.kpis, win_rate: null },
        recent_activity: [],
        follow_ups: [],
      },
    })
    renderApp('/')
    await pageTitle('Dashboard')
    expect(screen.getByText('None yet')).toBeInTheDocument()
    expect(screen.getByText('No activity yet.')).toBeInTheDocument()
    expect(screen.getByText(/^No follow-ups due/)).toBeInTheDocument()
  })

  it('opens the forms from the header buttons', async () => {
    fakeApi()
    const { user } = renderApp('/')
    await pageTitle('Dashboard')
    await user.click(screen.getByRole('button', { name: 'Log activity' }))
    expect(await screen.findByRole('heading', { name: 'Log activity' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(screen.getByRole('button', { name: 'New deal' }))
    expect(await screen.findByRole('heading', { name: 'New deal' })).toBeInTheDocument()
  })

  it('says when the dashboard cannot load', async () => {
    fakeApi({ 'GET /dashboard': serverError() })
    renderApp('/')
    expect(await screen.findByText(/Couldn't load the dashboard/)).toBeInTheDocument()
  })
})

describe('Unknown pages', () => {
  it('point back to the dashboard', async () => {
    fakeApi()
    renderApp('/nowhere')
    await pageTitle('Page not found')
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: 'Dashboard' }),
    ).toBeInTheDocument()
  })
})
