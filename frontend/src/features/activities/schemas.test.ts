import { describe, expect, it } from 'vitest'
import { activitySchema, toActivityBody, type ActivityValues } from './schema'

const base: ActivityValues = {
  type: 'note',
  contact_id: '',
  deal_id: '',
  description: '',
  occurred_on: '',
  follow_up_on: '',
  done: false,
}

const messages = (values: unknown) => {
  const r = activitySchema.safeParse(values)
  return r.success
    ? {}
    : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('activity form', () => {
  it('requires a description, a date and a contact or deal', () => {
    expect(messages(base)).toEqual({
      description: 'Enter a description.',
      occurred_on: 'Enter a date.',
      contact_id: 'Choose a contact or a deal.',
    })
  })
  it('requires a type', () => {
    expect(
      messages({ ...base, type: '', description: 'x', occurred_on: '2026-11-24', deal_id: '1' }),
    ).toEqual({ type: 'Choose a type.' })
  })
  it('refuses stage_change', () => {
    expect(
      messages({
        ...base,
        type: 'stage_change',
        description: 'x',
        occurred_on: '2026-11-24',
        deal_id: '1',
      }),
    ).toHaveProperty('type')
  })
  it('a contact or a deal is enough', () => {
    const filled = { ...base, description: 'Call', occurred_on: '2026-11-24' }
    expect(messages({ ...filled, contact_id: '3' })).toEqual({})
    expect(messages({ ...filled, deal_id: '4' })).toEqual({})
  })
  it('clears done when there is no follow-up, so one added later starts open', () => {
    const filled = {
      ...base,
      description: 'Call',
      occurred_on: '2026-11-24',
      deal_id: '4',
      done: true,
    }
    expect(toActivityBody(filled).done).toBe(false)
    expect(toActivityBody({ ...filled, follow_up_on: '2026-12-01' }).done).toBe(true)
  })
  it('sends blanks as null', () => {
    expect(
      toActivityBody({ ...base, description: ' Call ', occurred_on: '2026-11-24', deal_id: '4' }),
    ).toEqual({
      type: 'note',
      contact_id: null,
      deal_id: 4,
      description: 'Call',
      occurred_on: '2026-11-24',
      follow_up_on: null,
      done: false,
    })
  })
})
