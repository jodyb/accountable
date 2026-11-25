// Stage colors (concern 4), default probabilities, the late check and expected revenue.
import type { Deal, Stage } from '../../lib/api'

export const STAGES: Stage[] = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']
export const OPEN_STAGES: Stage[] = ['New', 'Qualified', 'Proposal', 'Negotiation']

export const DEFAULT_PROBABILITY: Record<Stage, number> = {
  New: 10,
  Qualified: 25,
  Proposal: 50,
  Negotiation: 75,
  Won: 100,
  Lost: 0,
}

/** New Cerulean, Qualified Marigold, Proposal Coral, Negotiation light Sea Green, Won Sea Green, Lost Raspberry. */
export const STAGE_COLOR: Record<Stage, { bg: string; fg: string }> = {
  New: { bg: 'var(--cerulean)', fg: 'var(--white)' },
  Qualified: { bg: 'var(--marigold)', fg: 'var(--midnight)' },
  Proposal: { bg: 'var(--coral)', fg: 'var(--midnight)' },
  Negotiation: { bg: 'var(--seagreen-tint)', fg: 'var(--midnight)' },
  Won: { bg: 'var(--seagreen)', fg: 'var(--midnight)' },
  Lost: { bg: 'var(--raspberry)', fg: 'var(--white)' },
}

export function isOpen(stage: Stage): boolean {
  return OPEN_STAGES.includes(stage)
}

/** Still open and its close date has passed. `today` is the local YYYY-MM-DD. */
export function isLate(deal: Pick<Deal, 'stage' | 'close_date'>, today: string): boolean {
  return isOpen(deal.stage) && !!deal.close_date && deal.close_date < today
}

/** In cents, unrounded; format rounds once for display. */
export function expectedCents(deal: Pick<Deal, 'value_cents' | 'probability'>): number {
  return (deal.value_cents * deal.probability) / 100
}
