import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { today } from '../../lib/dates'
import { ActivityForm } from './ActivityForm'

const CONTACTS = [
  { id: 1, name: 'Maya Okafor' },
  { id: 2, name: 'Sofia Lindqvist' },
]
const DEALS = [
  { id: 10, name: 'Route optimisation', contact_id: 1 },
  { id: 11, name: 'Multi-site licence', contact_id: 2 },
]

function renderForm(props: Partial<Parameters<typeof ActivityForm>[0]> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ActivityForm open onClose={() => {}} {...props} />
    </QueryClientProvider>,
  )
}

describe('ActivityForm', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const body = url.endsWith('/contacts') ? CONTACTS : url.endsWith('/deals') ? DEALS : []
        return new Response(JSON.stringify(body), { status: 200 })
      }),
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  it('defaults the date to today', async () => {
    renderForm()
    expect(await screen.findByLabelText(/^Date/)).toHaveValue(today())
  })

  it('offers note, call and email only', async () => {
    renderForm()
    const types = (await screen.findAllByRole('radio')).map((r) => r.textContent)
    expect(types).toEqual(['Note', 'Call', 'Email'])
  })

  it('logging from a deal pre-fills the deal and its main contact', async () => {
    renderForm({ prefill: { deal_id: 11, contact_id: 2 } })
    await waitFor(() => expect(screen.getByLabelText(/^Deal/)).toHaveValue('11'))
    expect(screen.getByLabelText(/^Contact/)).toHaveValue('2')
  })

  it('keeps Save disabled with a message until required fields are filled', async () => {
    renderForm()
    expect(await screen.findByText('Enter a description.')).toBeInTheDocument()
    expect(screen.getByText('Choose a contact or a deal.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save activity' })).toBeDisabled()
  })
})
