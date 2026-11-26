import { describe, expect, it } from 'vitest'
import { emptyOrganization, organizationSchema, toOrganizationBody } from './schema'

const messages = (values: unknown) => {
  const r = organizationSchema.safeParse(values)
  return r.success
    ? {}
    : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('organization form', () => {
  it('requires a name', () => {
    expect(messages(emptyOrganization)).toEqual({ name: 'Enter a name to save this organization.' })
    expect(messages({ ...emptyOrganization, name: '   ' })).toEqual({
      name: 'Enter a name to save this organization.',
    })
  })
  it('needs nothing else', () => {
    expect(messages({ ...emptyOrganization, name: 'Atlas Engineering' })).toEqual({})
  })
  it('sends blanks as null', () => {
    expect(toOrganizationBody({ ...emptyOrganization, name: ' Atlas ' })).toEqual({
      name: 'Atlas',
      website: null,
      industry: null,
      notes: null,
    })
  })
})
