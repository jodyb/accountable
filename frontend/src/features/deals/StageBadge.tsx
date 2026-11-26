import type { Stage } from '../../lib/api'
import { displayDate } from '../../lib/format'
import { Badge } from '../../ui/Badge'
import { isLate, STAGE_COLOR } from './stages'

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <Badge bg={STAGE_COLOR[stage].bg} fg={STAGE_COLOR[stage].fg}>
      {stage}
    </Badge>
  )
}

/** Close date, in Raspberry with a Late tag when the deal is late. */
export function CloseDate({
  deal,
  today,
}: {
  deal: { stage: Stage; close_date: string | null }
  today: string
}) {
  if (!deal.close_date) return <span className="none">None</span>
  const late = isLate(deal, today)
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <span className={`num${late ? ' late-d' : ''}`}>{displayDate(deal.close_date)}</span>
      {late && <span className="late-tag">Late</span>}
    </span>
  )
}
