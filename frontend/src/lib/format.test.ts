import { describe, expect, it } from 'vitest'
import {
  dollarsToCents,
  displayDate,
  longDate,
  messageDate,
  money,
  moneyCompact,
  percent,
  shortDate,
} from './format'

describe('money', () => {
  it('shows full dollars with the currency', () => {
    expect(money(4_850_000)).toBe('$48,500 USD')
    expect(money(0)).toBe('$0 USD')
    expect(money(120_000_000)).toBe('$1,200,000 USD')
  })
  it('shows cents only when there are some, rounding fractions of a cent once', () => {
    expect(money(123_456)).toBe('$1,234.56 USD')
    expect(money(2_062_500.4)).toBe('$20,625 USD')
    expect(money(150.5)).toBe('$1.51 USD')
  })
  it('always ends in USD', () => {
    for (const cents of [1, 99, 100_000, 987_654_321]) expect(money(cents)).toMatch(/ USD$/)
  })
})

describe('moneyCompact', () => {
  it('uses M, K or plain dollars and ends in USD', () => {
    expect(moneyCompact(120_000_000)).toBe('$1.2M USD')
    expect(moneyCompact(100_000_000)).toBe('$1M USD')
    expect(moneyCompact(5_200_000)).toBe('$52K USD')
    expect(moneyCompact(95_000)).toBe('$950 USD')
    expect(moneyCompact(0)).toBe('$0 USD')
    expect(moneyCompact(1_500_000_000)).toBe('$15M USD')
  })
})

describe('percent and dates', () => {
  it('formats percentages', () => {
    expect(percent(75)).toBe('75%')
    expect(percent(0)).toBe('0%')
  })
  it('formats display dates from YYYY-MM-DD without shifting the day', () => {
    expect(displayDate('2026-11-24')).toBe('Nov 24, 2026')
    expect(shortDate('2027-01-01')).toBe('Jan 1')
    expect(messageDate('2026-11-24')).toBe('24 Nov 2026')
    expect(longDate('2026-11-24')).toBe('Tuesday, 24 November 2026')
    expect(displayDate(null)).toBe('')
  })
})

describe('dollarsToCents', () => {
  it('reads typed amounts', () => {
    expect(dollarsToCents('48500')).toBe(4_850_000)
    expect(dollarsToCents('$48,500.5')).toBe(4_850_050)
    expect(dollarsToCents('12.34 USD')).toBe(1234)
  })
  it('refuses anything else', () => {
    for (const bad of ['', 'abc', '-5', '1.234', '1e5']) expect(dollarsToCents(bad)).toBeNull()
  })
})
