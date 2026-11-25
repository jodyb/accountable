import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router'
import type { Deal } from '../../lib/api'
import { money, percent, shortDate } from '../../lib/format'
import { isLate } from '../deals/stages'

type Props = { deal: Deal; today: string; lifted?: boolean }

/** The card's content; also used for the copy that follows the pointer while dragging. */
export function DealCard({ deal, today, lifted }: Props) {
  const late = isLate(deal, today)
  return (
    <div className={`card${late ? ' late' : ''}${lifted ? ' lifted' : ''}`} data-testid="deal-card" data-deal={deal.name}>
      <div className="cn">
        <Link to={`/deals/${deal.id}`} draggable={false}>
          {deal.name}
        </Link>
      </div>
      {deal.organization_name && <div className="co">{deal.organization_name}</div>}
      <div className="cf">
        <span className="cv num">{money(deal.value_cents)}</span>
        {late && <span className="late-tag">Late</span>}
      </div>
      <div className="cf">
        <span className="cd num">{deal.close_date ? shortDate(deal.close_date) : 'No close date'}</span>
        <span className="pr num">{percent(deal.probability)}</span>
      </div>
    </div>
  )
}

/** A card that can be dragged. While dragged within its column its slot shows the drop line; while headed for another column, a faint copy stays behind. */
export function SortableDealCard({ deal, today, disabled, leaving }: Props & { disabled?: boolean; leaving?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { stage: deal.stage },
    disabled,
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-roledescription="Draggable deal card"
      aria-label={deal.name}
    >
      {/* The slot keeps the card's height so the column doesn't shift under the pointer. */}
      <div className={isDragging ? (leaving ? 'card-leaving' : 'slot') : undefined} data-testid={isDragging && !leaving ? 'drop-line' : undefined}>
        <DealCard deal={deal} today={today} />
      </div>
    </div>
  )
}
