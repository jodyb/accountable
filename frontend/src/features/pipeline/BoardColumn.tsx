import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { Fragment } from 'react'
import type { Column, Deal, Stage } from '../../lib/api'
import { moneyCompact } from '../../lib/format'
import { isOpen, STAGE_COLOR } from '../deals/stages'
import { SortableDealCard } from './DealCard'

type Props = {
  stage: Stage
  deals: Deal[]
  totals: Column
  today: string
  dragDisabled: boolean
  /** Where a card from another column would land, marked with the drop line. */
  dropLineAt: number | null
  /** True while a card from this column is over another column. */
  leaving: boolean
  onAdd: (stage: Stage) => void
}

export const columnId = (stage: Stage) => `col:${stage}`

export function BoardColumn({
  stage,
  deals,
  totals,
  today,
  dragDisabled,
  dropLineAt,
  leaving,
  onAdd,
}: Props) {
  const { setNodeRef } = useDroppable({ id: columnId(stage), data: { stage } })
  return (
    <section
      ref={setNodeRef}
      className={`col${isOpen(stage) ? '' : ' closed'}`}
      aria-label={`${stage} column`}
      data-stage={stage}
    >
      <div className="col-h">
        <div className="col-t">
          <span className="sw" style={{ background: STAGE_COLOR[stage].bg }} />
          {stage}
          <span className="ct" data-testid="col-count">
            {totals.count}
          </span>
        </div>
        <div className="col-m">
          <span>
            Value{' '}
            <b className="num" data-testid="col-value">
              {moneyCompact(totals.value_cents)}
            </b>
          </span>
          <span>
            Expected{' '}
            <b className="num" data-testid="col-expected">
              {moneyCompact(totals.expected_cents)}
            </b>
          </span>
        </div>
      </div>
      <SortableContext
        id={columnId(stage)}
        items={deals.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="cards">
          {deals.map((d, i) => (
            <Fragment key={d.id}>
              {dropLineAt === i && <div className="drop" data-testid="drop-line" />}
              <SortableDealCard deal={d} today={today} disabled={dragDisabled} leaving={leaving} />
            </Fragment>
          ))}
          {dropLineAt !== null && dropLineAt >= deals.length && (
            <div className="drop" data-testid="drop-line" />
          )}
        </div>
      </SortableContext>
      <button
        type="button"
        className="add"
        onClick={() => onAdd(stage)}
        aria-label={`Add deal in ${stage}`}
      >
        <Plus size={14} /> Add deal
      </button>
    </section>
  )
}
