// Other pages on this computer can't use the API through Vite's proxy (no CORS from Vite).
import { expect, test } from '@playwright/test'

const otherPage = { Origin: 'http://localhost:3000' }

test('a preflight from another local origin gets no CORS permission', async ({ request }) => {
  const response = await request.fetch('/api/organizations', {
    method: 'OPTIONS',
    headers: {
      ...otherPage,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  })
  expect(response.headers()['access-control-allow-origin']).toBeUndefined()
})

test('a read from another local origin gets no CORS permission', async ({ request }) => {
  const response = await request.get('/api/organizations', { headers: otherPage })
  expect(response.headers()['access-control-allow-origin']).toBeUndefined()
})
