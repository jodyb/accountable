// A stand-in for the backend: answers fetch calls from the fixtures and records what was sent.
import { vi } from 'vitest'
import * as f from './fixtures'

type Reply = unknown | Response
type Route = Reply | ((body: unknown) => Reply)
export type Routes = Record<string, Route>

export type Call = { method: string; path: string; body: unknown }

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** A 422 with one message per field, as the backend sends. */
export const invalid = (errors: Record<string, string>) => json({ detail: 'Invalid', errors }, 422)

export const serverError = () => new Response('Internal Server Error', { status: 500 })

const merge = (record: object) => (body: unknown) => ({ ...record, ...(body as object) })

const impact = { contacts: 1, deals: 1, activities: 2 }

function defaultRoutes(): Routes {
  return {
    'GET /organizations': f.ORGANIZATION_ROWS,
    'GET /organizations/1': f.ATLAS_DETAIL,
    'GET /organizations/2': f.BRIGHTLINE_DETAIL,
    'POST /organizations': merge({ ...f.BRIGHTLINE, id: 3 }),
    'PATCH /organizations/1': merge(f.ATLAS),
    'DELETE /organizations/1': undefined,
    'DELETE /organizations/2': undefined,
    'GET /organizations/1/delete-impact': impact,
    'GET /organizations/2/delete-impact': impact,
    'GET /contacts': [f.MAYA, f.SOFIA],
    'GET /contacts/1': f.MAYA_DETAIL,
    'GET /contacts/2': f.SOFIA_DETAIL,
    'GET /contacts/1/timeline': [f.NOTE, f.STAGE_CHANGE, f.CALL],
    'GET /contacts/2/timeline': [],
    'POST /contacts': merge({ ...f.SOFIA, id: 3 }),
    'PATCH /contacts/1': merge(f.MAYA),
    'PATCH /contacts/2': merge(f.SOFIA),
    'DELETE /contacts/1': undefined,
    'DELETE /contacts/2': undefined,
    'GET /contacts/1/delete-impact': impact,
    'GET /contacts/2/delete-impact': impact,
    'GET /deals': f.DEALS,
    'GET /deals/10': f.ROUTE_DETAIL,
    'GET /deals/12': f.PILOT_DETAIL,
    'GET /deals/10/timeline': [f.NOTE, f.STAGE_CHANGE],
    'GET /deals/12/timeline': [],
    'POST /deals': merge({ ...f.PILOT_DEAL, id: 13 }),
    'PATCH /deals/10': merge(f.ROUTE_DEAL),
    'PATCH /deals/12': merge(f.PILOT_DEAL),
    'DELETE /deals/10': undefined,
    'DELETE /deals/11': undefined,
    'DELETE /deals/12': undefined,
    'GET /deals/10/delete-impact': impact,
    'GET /deals/11/delete-impact': impact,
    'GET /deals/12/delete-impact': impact,
    'POST /activities': merge({ ...f.NOTE, id: 200 }),
    'PATCH /activities/100': merge(f.NOTE),
    'PATCH /activities/101': merge(f.CALL),
    'DELETE /activities/100': undefined,
    'GET /pipeline': f.boardOf(f.DEALS),
    'POST /deals/10/move': f.boardOf(f.DEALS),
    'POST /deals/12/move': f.boardOf(f.DEALS),
    'GET /dashboard': f.DASHBOARD,
  }
}

/** Replace fetch with the fake backend. Routes given here override the defaults. */
export function fakeApi(overrides: Routes = {}) {
  const routes = { ...defaultRoutes(), ...overrides }
  const calls: Call[] = []
  const fetch = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost')
    const method = init?.method ?? 'GET'
    const path = url.pathname.replace(/^\/api/, '')
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ method, path, body })
    const key = `${method} ${path}`
    if (!(key in routes)) return json({ detail: `No fake for ${key}` }, 404)
    const route = routes[key]
    const reply = typeof route === 'function' ? route(body) : route
    if (reply instanceof Response) return reply
    if (reply === undefined) return new Response(null, { status: 204 })
    return json(reply)
  })
  vi.stubGlobal('fetch', fetch)
  return {
    calls,
    /** The body of the last request sent with this method to this path. */
    sent: (method: string, path: string) =>
      calls.findLast((c) => c.method === method && c.path === path)?.body,
  }
}
