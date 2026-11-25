import { describe, expect, it } from 'vitest'
import { DEFAULT_PROBABILITY, expectedCents, isLate, STAGE_COLOR, STAGES } from './stages'

const TODAY = '2026-11-24'

describe('late check', () => {
  it('is late only for an open stage with a close date before today', () => {
    for (const stage of ['New', 'Qualified', 'Proposal', 'Negotiation'] as const) {
      expect(isLate({ stage, close_date: '2026-11-23' }, TODAY)).toBe(true)
      expect(isLate({ stage, close_date: TODAY }, TODAY)).toBe(false)
      expect(isLate({ stage, close_date: '2026-12-01' }, TODAY)).toBe(false)
      expect(isLate({ stage, close_date: null }, TODAY)).toBe(false)
    }
  })
  it('is never late once Won or Lost', () => {
    expect(isLate({ stage: 'Won', close_date: '2025-01-01' }, TODAY)).toBe(false)
    expect(isLate({ stage: 'Lost', close_date: '2025-01-01' }, TODAY)).toBe(false)
  })
})

describe('expected revenue', () => {
  it('is value times probability, unrounded', () => {
    expect(expectedCents({ value_cents: 12_000_000, probability: 75 })).toBe(9_000_000)
    expect(expectedCents({ value_cents: 333, probability: 50 })).toBe(166.5)
    expect(expectedCents({ value_cents: 5_000_000, probability: 0 })).toBe(0)
  })
})

describe('stages', () => {
  it('has the six stages in order with their default probabilities', () => {
    expect(STAGES).toEqual(['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'])
    expect(DEFAULT_PROBABILITY).toEqual({ New: 10, Qualified: 25, Proposal: 50, Negotiation: 75, Won: 100, Lost: 0 })
  })
  it('uses the colors from concern 4', () => {
    expect(STAGE_COLOR.New.bg).toBe('var(--cerulean)')
    expect(STAGE_COLOR.Qualified.bg).toBe('var(--marigold)')
    expect(STAGE_COLOR.Proposal.bg).toBe('var(--coral)')
    expect(STAGE_COLOR.Negotiation.bg).toBe('var(--seagreen-tint)')
    expect(STAGE_COLOR.Won.bg).toBe('var(--seagreen)')
    expect(STAGE_COLOR.Lost.bg).toBe('var(--raspberry)')
  })
  it('uses white text on Cerulean and Raspberry, Midnight on the rest', () => {
    expect(STAGE_COLOR.New.fg).toBe('var(--white)')
    expect(STAGE_COLOR.Lost.fg).toBe('var(--white)')
    for (const s of ['Qualified', 'Proposal', 'Negotiation', 'Won'] as const) expect(STAGE_COLOR[s].fg).toBe('var(--midnight)')
  })
})
