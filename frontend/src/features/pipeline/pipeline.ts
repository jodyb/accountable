// Board changes made in the browser before the server answers (optimistic updates).
// Each function returns a new board and leaves the one passed in untouched, so the
// old board can be put back if the save fails.
import type { Board, Column, Deal, Stage } from '../../lib/api'
import { DEFAULT_PROBABILITY, expectedCents, isOpen } from '../deals/stages'

function totals(stage: Stage, deals: Deal[]): Column {
  return {
    stage,
    deals,
    count: deals.length,
    value_cents: deals.reduce((s, d) => s + d.value_cents, 0),
    expected_cents: deals.reduce((s, d) => s + expectedCents(d), 0),
  }
}

/** Rebuild counts, column totals and board totals from the cards. */
export function withTotals(columns: { stage: Stage; deals: Deal[] }[]): Board {
  const cols = columns.map((c) => totals(c.stage, c.deals.map((d, position) => ({ ...d, position }))))
  const open = cols.filter((c) => isOpen(c.stage))
  return {
    columns: cols,
    open_value_cents: open.reduce((s, c) => s + c.value_cents, 0),
    open_expected_cents: open.reduce((s, c) => s + c.expected_cents, 0),
  }
}

export function findDeal(board: Board, dealId: number): Deal | undefined {
  for (const c of board.columns) {
    const d = c.deals.find((x) => x.id === dealId)
    if (d) return d
  }
  return undefined
}

/** Move a card to `index` in the `stage` column, applying the stage's probability if it changed. */
export function moveCard(board: Board, dealId: number, stage: Stage, index: number, today: string): Board {
  const deal = findDeal(board, dealId)
  if (!deal) return board
  let moved = deal
  if (deal.stage !== stage) {
    moved = { ...deal, stage, probability: DEFAULT_PROBABILITY[stage] }
    if (stage === 'Won' || stage === 'Lost') moved.close_date = today
  }
  return withTotals(
    board.columns.map((c) => {
      const rest = c.deals.filter((d) => d.id !== dealId)
      if (c.stage !== stage) return { stage: c.stage, deals: rest }
      const at = Math.max(0, Math.min(index, rest.length))
      return { stage: c.stage, deals: [...rest.slice(0, at), moved, ...rest.slice(at)] }
    }),
  )
}

/**
 * Where a dragged card lands in the target column (its index once placed).
 * `overId` is the card under the pointer, or null for the column's empty space.
 * In its own column the card takes the place of the card it is over; in another
 * column it goes before that card, or after it when the pointer is in its lower half.
 */
export function dropIndex(target: number[], activeId: number, sameColumn: boolean, overId: number | null, lowerHalf: boolean): number {
  const others = target.filter((id) => id !== activeId)
  if (overId === null || overId === activeId) {
    return overId === activeId ? target.indexOf(activeId) : others.length
  }
  const at = target.indexOf(overId)
  if (at < 0) return others.length
  if (sameColumn) return at
  return at + (lowerHalf ? 1 : 0)
}

/** A deal added from a column's "+" goes to the top of its column. */
export function addCardToTop(board: Board, deal: Deal): Board {
  return withTotals(
    board.columns.map((c) => ({
      stage: c.stage,
      deals: c.stage === deal.stage ? [deal, ...c.deals.filter((d) => d.id !== deal.id)] : c.deals,
    })),
  )
}
