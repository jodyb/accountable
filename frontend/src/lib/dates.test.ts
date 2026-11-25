import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addDaysISO, isISODate, parseDate, today, toISODate } from './dates'

describe('today', () => {
  let saved: string | undefined
  beforeEach(() => {
    saved = process.env.TZ
  })
  afterEach(() => {
    process.env.TZ = saved
  })

  it('is the local calendar date late in the evening behind UTC', () => {
    process.env.TZ = 'America/Los_Angeles'
    // 21:30 on the 24th in Los Angeles is already the 25th in UTC.
    expect(today(new Date('2026-11-25T05:30:00Z'))).toBe('2026-11-24')
  })

  it('is the local calendar date early in the morning ahead of UTC', () => {
    process.env.TZ = 'Pacific/Auckland'
    // 08:00 on the 25th in Auckland is still the 24th in UTC.
    expect(today(new Date('2026-11-24T19:00:00Z'))).toBe('2026-11-25')
  })

  it('is YYYY-MM-DD', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('date strings', () => {
  it('parses YYYY-MM-DD as local midnight, so the day never shifts', () => {
    process.env.TZ = 'America/New_York'
    const d = parseDate('2026-11-24')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 24, 0])
    expect(toISODate(d)).toBe('2026-11-24')
  })
  it('adds days across months', () => {
    expect(addDaysISO('2026-11-28', 7)).toBe('2026-12-05')
  })
  it('validates', () => {
    expect(isISODate('2026-02-28')).toBe(true)
    expect(isISODate('2026-02-30')).toBe(false)
    expect(isISODate('24/11/2026')).toBe(false)
  })
})
