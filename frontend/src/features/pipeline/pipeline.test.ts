import { describe, expect, it } from 'vitest'
import type { Board, Deal, Stage } from '../../lib/api'
import { STAGES } from '../deals/stages'
import { addCardToTop, dropIndex, moveCard, withTotals } from './pipeline'

const TODAY = '2026-11-24'
let nextId = 1

function deal(name: string, stage: Stage, value_cents: number, probability?: number): Deal {
  const defaults: Record<Stage, number> = { New: 10, Qualified: 25, Proposal: 50, Negotiation: 75, Won: 100, Lost: 0 }
  return {
    id: nextId++,
    name,
    stage,
    value_cents,
    probability: probability ?? defaults[stage],
    close_date: '2027-01-15',
    position: 0,
    organization_id: null,
    organization_name: null,
    contact_id: null,
    contact_name: null,
    created_at: '2026-11-01T09:00:00Z',
    updated_at: '2026-11-01T09:00:00Z',
  }
}

function board(): Board {
  const cards = [
    deal('A', 'New', 100_000),
    deal('B', 'New', 200_000),
    deal('C', 'Proposal', 400_000, 40),
    deal('D', 'Won', 1_000_000),
  ]
  return withTotals(STAGES.map((stage) => ({ stage, deals: cards.filter((d) => d.stage === stage) })))
}

const col = (b: Board, stage: Stage) => b.columns.find((c) => c.stage === stage)!
const names = (b: Board, stage: Stage) => col(b, stage).deals.map((d) => d.name)

describe('withTotals', () => {
  it('counts each column and the open board', () => {
    const b = board()
    expect(col(b, 'New')).toMatchObject({ count: 2, value_cents: 300_000, expected_cents: 30_000 })
    expect(col(b, 'Proposal')).toMatchObject({ count: 1, value_cents: 400_000, expected_cents: 160_000 })
    expect(b.open_value_cents).toBe(700_000)
    expect(b.open_expected_cents).toBe(190_000)
  })
})

describe('optimistic move', () => {
  it('moving to another column updates stage, probability, column and board totals', () => {
    const before = board()
    const a = col(before, 'New').deals[0]
    const after = moveCard(before, a.id, 'Negotiation', 0, TODAY)
    expect(names(after, 'New')).toEqual(['B'])
    expect(names(after, 'Negotiation')).toEqual(['A'])
    expect(col(after, 'Negotiation').deals[0]).toMatchObject({ stage: 'Negotiation', probability: 75 })
    expect(col(after, 'New')).toMatchObject({ count: 1, value_cents: 200_000, expected_cents: 20_000 })
    expect(col(after, 'Negotiation')).toMatchObject({ count: 1, value_cents: 100_000, expected_cents: 75_000 })
    expect(after.open_value_cents).toBe(700_000)
    expect(after.open_expected_cents).toBe(20_000 + 160_000 + 75_000)
  })

  it('moving to Won leaves the open totals and sets the close date to today', () => {
    const before = board()
    const c = col(before, 'Proposal').deals[0]
    const after = moveCard(before, c.id, 'Won', 0, TODAY)
    expect(col(after, 'Won').deals[0]).toMatchObject({ name: 'C', probability: 100, close_date: TODAY })
    expect(after.open_value_cents).toBe(300_000)
    expect(after.open_expected_cents).toBe(30_000)
  })

  it('reordering within a column keeps the probability, including a hand-set one', () => {
    const before = withTotals(STAGES.map((stage) => ({ stage, deals: stage === 'Proposal' ? [deal('X', 'Proposal', 1, 40), deal('Y', 'Proposal', 1)] : [] })))
    const x = col(before, 'Proposal').deals[0]
    const after = moveCard(before, x.id, 'Proposal', 1, TODAY)
    expect(names(after, 'Proposal')).toEqual(['Y', 'X'])
    expect(col(after, 'Proposal').deals[1].probability).toBe(40)
    expect(col(after, 'Proposal').deals.map((d) => d.position)).toEqual([0, 1])
  })

  it('rollback: the board passed in is left untouched, so it can be put back', () => {
    const before = board()
    const snapshot = structuredClone(before)
    moveCard(before, col(before, 'New').deals[0].id, 'Lost', 0, TODAY)
    expect(before).toEqual(snapshot)
  })
})

describe('dropIndex', () => {
  const col = [1, 2, 3, 4]
  it('in its own column, takes the place of the card it is over', () => {
    expect(dropIndex(col, 4, true, 1, false)).toBe(0) // bottom to top
    expect(dropIndex(col, 1, true, 4, true)).toBe(3) // top to bottom
    expect(dropIndex(col, 1, true, 3, false)).toBe(2)
    expect(dropIndex(col, 2, true, 2, false)).toBe(1) // over itself: no change
  })
  it('in another column, goes before the card, or after it from its lower half', () => {
    expect(dropIndex(col, 9, false, 1, false)).toBe(0)
    expect(dropIndex(col, 9, false, 2, false)).toBe(1)
    expect(dropIndex(col, 9, false, 2, true)).toBe(2)
    expect(dropIndex(col, 9, false, 4, true)).toBe(4)
  })
  it('empty space in a column means the bottom', () => {
    expect(dropIndex(col, 9, false, null, false)).toBe(4)
    expect(dropIndex([], 9, false, null, false)).toBe(0)
    expect(dropIndex(col, 2, true, null, false)).toBe(3)
  })
})

describe('new deal from a column', () => {
  it('goes to the top of its column and into the totals', () => {
    const before = board()
    const after = addCardToTop(before, deal('New one', 'New', 50_000))
    expect(names(after, 'New')).toEqual(['New one', 'A', 'B'])
    expect(col(after, 'New')).toMatchObject({ count: 3, value_cents: 350_000 })
    expect(after.open_value_cents).toBe(750_000)
  })
})
