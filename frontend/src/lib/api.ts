// Typed fetch client on the generated API types. Every change goes straight to the backend.
import type { components } from './api-types'

type Schemas = components['schemas']

export type Organization = Schemas['Organization']
export type OrganizationRow = Schemas['OrganizationRow']
export type OrganizationDetail = Schemas['OrganizationDetail']
export type OrganizationIn = Schemas['OrganizationIn']
export type OrganizationPatch = Schemas['OrganizationPatch']
export type Contact = Schemas['Contact']
export type ContactDetail = Schemas['ContactDetail']
export type ContactIn = Schemas['ContactIn']
export type ContactPatch = Schemas['ContactPatch']
export type Status = Contact['status']
export type Deal = Schemas['Deal']
export type DealDetail = Schemas['DealDetail']
export type DealIn = Schemas['DealIn']
export type DealPatch = Schemas['DealPatch']
export type Stage = Deal['stage']
export type Activity = Schemas['Activity']
export type ActivityIn = Schemas['ActivityIn']
export type ActivityPatch = Schemas['ActivityPatch']
export type ActivityType = Activity['type']
export type DeleteImpact = Schemas['DeleteImpact']
export type Board = Schemas['Board']
export type Column = Schemas['Column']
export type MoveIn = Schemas['MoveIn']
export type Dashboard = Schemas['Dashboard']
export type FollowUp = Schemas['FollowUp']

/** A failed request. `errors` holds one message per field for a 422. */
export class ApiError extends Error {
  status: number
  errors: Record<string, string>

  constructor(status: number, message: string, errors: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    let errors: Record<string, string> = {}
    try {
      const data = await response.json()
      if (typeof data.detail === 'string') detail = data.detail
      if (data.errors) errors = data.errors
    } catch {
      // Not JSON: keep the generic message.
    }
    throw new ApiError(response.status, detail, errors)
  }
  return (response.status === 204 ? undefined : await response.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: (path: string) => request<void>('DELETE', path),
}
