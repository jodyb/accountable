import { describe, expect, it } from 'vitest'
import { contactSchema, emptyContact, toContactBody } from './schema'

const messages = (values: unknown) => {
  const r = contactSchema.safeParse(values)
  return r.success
    ? {}
    : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('contact form', () => {
  it('requires a name', () => {
    expect(messages(emptyContact)).toEqual({ name: 'Enter a name to save this contact.' })
  })
  it('defaults to lead and needs nothing else', () => {
    expect(emptyContact.status).toBe('lead')
    expect(messages({ ...emptyContact, name: 'Maya Okafor' })).toEqual({})
  })
  it('checks an email only when one is given', () => {
    expect(messages({ ...emptyContact, name: 'M', email: 'not an email' })).toHaveProperty('email')
    expect(messages({ ...emptyContact, name: 'M', email: 'maya@northwind.co' })).toEqual({})
  })
  it('sends the organization as a number, or null', () => {
    expect(
      toContactBody({ ...emptyContact, name: 'M', organization_id: '7' }).organization_id,
    ).toBe(7)
    expect(toContactBody({ ...emptyContact, name: 'M' }).organization_id).toBeNull()
  })
})
