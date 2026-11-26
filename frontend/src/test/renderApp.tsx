// Render the whole app at a URL, with the real routes, query client and toasts.
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AppRoutes, makeQueryClient } from '../app/App'
import { ToastProvider } from '../ui/Toast'

export function renderApp(path: string) {
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
  return { user }
}

/** The page's main heading, once it has loaded. */
export const pageTitle = (name: string) => screen.findByRole('heading', { level: 1, name })
