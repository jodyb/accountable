import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeleteDialog, deleteMessage } from './DeleteDialog'

describe('deleteMessage', () => {
  it('organization: contacts and deals are kept', () => {
    expect(deleteMessage('organization', { contacts: 3, deals: 2, activities: 0 })).toBe(
      'Its 3 contacts and 2 deals will be kept, with no organization.',
    )
    expect(deleteMessage('organization', { contacts: 1, deals: 1, activities: 0 })).toBe(
      'Its 1 contact and 1 deal will be kept, with no organization.',
    )
  })
  it('contact: activities go, deals are kept', () => {
    expect(deleteMessage('contact', { contacts: 0, deals: 2, activities: 5 })).toBe(
      'Its 5 activities will be deleted. Its 2 deals will be kept, with no main contact.',
    )
    expect(deleteMessage('contact', { contacts: 0, deals: 0, activities: 1 })).toBe(
      'Its 1 activity will be deleted. Its 0 deals will be kept, with no main contact.',
    )
  })
  it('deal: activities go', () => {
    expect(deleteMessage('deal', { contacts: 0, deals: 0, activities: 4 })).toBe(
      'Its 4 activities will be deleted.',
    )
  })
})

describe('DeleteDialog', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('names the record and shows the counts from the server', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ contacts: 2, deals: 3, activities: 0 }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetch)
    render(
      <QueryClientProvider client={new QueryClient()}>
        <DeleteDialog
          kind="organization"
          record={{ id: 7, name: 'Brightline Retail' }}
          onClose={() => {}}
          onConfirm={async () => {}}
        />
      </QueryClientProvider>,
    )
    expect(screen.getByRole('heading', { name: 'Delete Brightline Retail?' })).toBeInTheDocument()
    expect(
      await screen.findByText(
        "Its 2 contacts and 3 deals will be kept, with no organization. This can't be undone.",
      ),
    ).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/organizations/7/delete-impact', expect.anything())
    expect(screen.getByRole('button', { name: 'Delete organization' })).toBeEnabled()
  })
})
