import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Link, Route, Routes } from 'react-router'
import { ContactPage } from '../features/contacts/ContactPage'
import { ContactsPage } from '../features/contacts/ContactsPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { DealPage } from '../features/deals/DealPage'
import { DealsPage } from '../features/deals/DealsPage'
import { OrganizationPage } from '../features/organizations/OrganizationPage'
import { OrganizationsPage } from '../features/organizations/OrganizationsPage'
import { PipelinePage } from '../features/pipeline/PipelinePage'
import { ToastProvider } from '../ui/Toast'
import { Layout, PageHeader } from './Layout'

export function makeQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, staleTime: 5_000 },
      mutations: { retry: false },
    },
    // Records link to each other, so after any change every view reloads what it shows.
    // Delete-impact counts are only read while the dialog is open, and refetching them
    // after a delete would ask for a record that no longer exists.
    mutationCache: new MutationCache({
      onSettled: () =>
        client.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'delete-impact' }),
    }),
  })
  return client
}

const queryClient = makeQueryClient()

function NotFound() {
  return (
    <PageHeader
      title="Page not found"
      sub={
        <>
          That page doesn't exist. Go to the{' '}
          <Link className="link" to="/">
            Dashboard
          </Link>
          .
        </>
      }
    />
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="organizations" element={<OrganizationsPage />} />
        <Route path="organizations/:id" element={<OrganizationPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="contacts/:id" element={<ContactPage />} />
        <Route path="deals" element={<DealsPage />} />
        <Route path="deals/:id" element={<DealPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
