import { describe, expect, it } from 'vitest'
import { dealSchema, emptyDeal, toDealBody } from './schema'

const messages = (values: unknown) => {
  const r = dealSchema.safeParse(values)
  return r.success
    ? {}
    : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('deal form', () => {
  it('requires a name and value; stage starts as New at 10%', () => {
    const empty = emptyDeal()
    expect(empty.stage).toBe('New')
    expect(empty.probability).toBe('10')
    expect(messages(empty)).toEqual({ name: 'Enter a deal name.', value: 'Enter a value.' })
  })
  it('requires a stage', () => {
    expect(messages({ ...emptyDeal(), name: 'D', value: '100', stage: '' })).toEqual({
      stage: 'Choose a stage.',
    })
  })
  it('a column stage sets its probability', () => {
    expect(emptyDeal('Proposal')).toMatchObject({ stage: 'Proposal', probability: '50' })
  })
  it('checks value and probability', () => {
    expect(messages({ ...emptyDeal(), name: 'D', value: 'lots' })).toHaveProperty('value')
    expect(
      messages({ ...emptyDeal(), name: 'D', value: '100', probability: '101' }),
    ).toHaveProperty('probability')
    expect(messages({ ...emptyDeal(), name: 'D', value: '100', probability: '' })).toHaveProperty(
      'probability',
    )
  })
  it('caps the value at the API limit of $1 trillion', () => {
    expect(messages({ ...emptyDeal(), name: 'D', value: '1000000000000' })).toEqual({})
    expect(messages({ ...emptyDeal(), name: 'D', value: '1000000000001' })).toEqual({
      value: 'Enter at most $1,000,000,000,000.',
    })
  })
  it('sends value in cents', () => {
    expect(toDealBody({ ...emptyDeal(), name: 'D', value: '48,500' })).toMatchObject({
      value_cents: 4_850_000,
      probability: 10,
      close_date: null,
    })
  })
})
