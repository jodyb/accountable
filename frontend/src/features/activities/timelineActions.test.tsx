import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, invalid, serverError } from '../../test/fakeApi'
import { pageTitle, renderApp } from '../../test/renderApp'

afterEach(() => vi.unstubAllGlobals())

async function openMaya() {
  const app = renderApp('/contacts/1')
  await pageTitle('Maya Okafor')
  await screen.findAllByTestId('timeline-entry')
  return app
}

describe('Activities on a timeline', () => {
  it('edits an activity and marks its follow-up done', async () => {
    const api = fakeApi()
    const { user } = await openMaya()
    await user.click(screen.getByRole('button', { name: 'Edit activity: Sent the proposal' }))
    expect(await screen.findByRole('heading', { name: 'Edit activity' })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Description/)).toHaveValue('Sent the proposal')
    await user.click(screen.getByLabelText('Follow-up done'))
    await user.click(screen.getByRole('button', { name: 'Save activity' }))
    expect(await screen.findByText('Activity saved.')).toBeInTheDocument()
    expect(api.sent('PATCH', '/activities/100')).toMatchObject({ done: true, deal_id: 10 })
  })

  it('fills in the main contact when a deal is picked', async () => {
    fakeApi()
    const { user } = renderApp('/')
    await pageTitle('Dashboard')
    await user.click(screen.getByRole('button', { name: 'Log activity' }))
    await user.selectOptions(await screen.findByLabelText(/^Deal/), 'Route optimisation')
    expect(screen.getByLabelText(/^Contact/)).toHaveValue('1')
  })

  it('shows server messages and failures when saving', async () => {
    fakeApi({ 'PATCH /activities/100': invalid({ occurred_on: 'Enter a date.' }) })
    const { user } = await openMaya()
    await user.click(screen.getByRole('button', { name: 'Edit activity: Sent the proposal' }))
    await user.click(await screen.findByRole('button', { name: 'Save activity' }))
    expect(await screen.findByText('Enter a date.')).toBeInTheDocument()
  })

  it('says when an activity cannot be saved', async () => {
    fakeApi({ 'PATCH /activities/100': serverError() })
    const { user } = await openMaya()
    await user.click(screen.getByRole('button', { name: 'Edit activity: Sent the proposal' }))
    await user.click(await screen.findByRole('button', { name: 'Save activity' }))
    expect(
      await screen.findByText("Couldn't save. Check that the app is running and try again."),
    ).toBeInTheDocument()
  })

  it('deletes an activity', async () => {
    const api = fakeApi()
    const { user } = await openMaya()
    await user.click(screen.getByRole('button', { name: 'Delete activity: Sent the proposal' }))
    expect(await screen.findByText('Activity deleted.')).toBeInTheDocument()
    expect(api.calls.some((c) => c.method === 'DELETE' && c.path === '/activities/100')).toBe(true)
  })

  it('says when an activity cannot be deleted', async () => {
    fakeApi()
    const { user } = await openMaya()
    await user.click(screen.getByRole('button', { name: 'Delete activity: Discovery call' }))
    expect(await screen.findByText("Couldn't delete the activity. Try again.")).toBeInTheDocument()
  })

  it('gives stage changes no edit or delete', async () => {
    fakeApi()
    await openMaya()
    const stageChange = screen
      .getAllByTestId('timeline-entry')
      .find((e) => e.textContent?.includes('Moved from'))!
    expect(within(stageChange).queryByRole('button')).not.toBeInTheDocument()
  })
})
