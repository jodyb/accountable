import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { LoadError, Loading, PageHeader } from '../../app/Layout'
import type { Board, Stage } from '../../lib/api'
import { today as localToday } from '../../lib/dates'
import { money } from '../../lib/format'
import { matchesSearch } from '../../lib/table'
import { useToast } from '../../ui/Toast'
import { DealForm, stageMessage } from '../deals/DealForm'
import { STAGES } from '../deals/stages'
import { BoardColumn } from './BoardColumn'
import { DealCard } from './DealCard'
import { addCardToTop, dropIndex, findDeal } from './pipeline'
import { PIPELINE, useMoveDeal, usePipeline } from './queries'

type Target = { stage: Stage; index: number }

export function PipelinePage() {
  const { data: board, isPending, isError } = usePipeline()
  const move = useMoveDeal()
  const qc = useQueryClient()
  const notify = useToast()
  const [activeId, setActiveId] = useState<number | null>(null)
  const [target, setTarget] = useState<Target | null>(null)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState<Stage | null>(null)
  const day = localToday()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const searching = search.trim() !== ''

  if (isPending) return <Loading />
  if (isError) return <LoadError what="the pipeline" />

  const ids = (stage: Stage) => board.columns.find((c) => c.stage === stage)!.deals.map((d) => d.id)

  /** Where the card would land if dropped now. Cards stay put while dragging, so this never moves the layout under the pointer. */
  const targetOf = ({
    active,
    over,
  }: DragOverEvent | DragMoveEvent | DragEndEvent): Target | null => {
    if (!over) return null
    const from = findDeal(board, Number(active.id))!.stage
    const stage = over.data.current?.stage as Stage | undefined
    if (!stage) return null
    const overCard = typeof over.id === 'number' ? over.id : null
    const pointer = active.rect.current.translated
    const lowerHalf =
      !!pointer && pointer.top + pointer.height / 2 > over.rect.top + over.rect.height / 2
    return {
      stage,
      index: dropIndex(ids(stage), Number(active.id), stage === from, overCard, lowerHalf),
    }
  }

  const track = (event: DragOverEvent | DragMoveEvent) => {
    const next = targetOf(event)
    setTarget((prev) => (prev?.stage === next?.stage && prev?.index === next?.index ? prev : next))
  }

  const onDragEnd = (event: DragEndEvent) => {
    const id = Number(event.active.id)
    const to = targetOf(event)
    setActiveId(null)
    setTarget(null)
    if (!to) return
    const original = findDeal(board, id)!
    if (original.stage === to.stage && ids(to.stage).indexOf(id) === to.index) return

    move.mutate(
      { id, body: { stage: to.stage, index: to.index, today: day } },
      {
        onSuccess: () => {
          const message = original.stage !== to.stage && stageMessage(to.stage, day)
          if (message) notify(message)
        },
        onError: () =>
          notify(`Couldn't move ${original.name}. It has been put back.`, { bad: true }),
      },
    )
  }

  const active = activeId !== null ? findDeal(board, activeId) : undefined
  const visible = (stage: Stage) => {
    const deals = board.columns.find((c) => c.stage === stage)!.deals
    return searching
      ? deals.filter((d) => matchesSearch([d.name, d.organization_name, d.contact_name], search))
      : deals
  }
  // A drop line marks the spot in another column; in its own column the gap opens by itself.
  const dropLineAt = (stage: Stage) =>
    target && active && target.stage === stage && active.stage !== stage ? target.index : null

  return (
    <>
      <PageHeader
        title="Pipeline"
        sub="Drag a card to change its stage or its place in a column."
        actions={
          <div className="board-sum">
            <div>
              <span className="lbl">Open value</span>
              <span className="num" data-testid="board-value">
                {money(board.open_value_cents)}
              </span>
            </div>
            <div>
              <span className="lbl">Expected revenue</span>
              <span className="num" data-testid="board-expected">
                {money(board.open_expected_cents)}
              </span>
            </div>
          </div>
        }
      />
      <div className="toolbar">
        <label className="sbox" style={{ width: 280 }}>
          <Search size={16} aria-hidden />
          <input
            type="search"
            placeholder="Search deals"
            aria-label="Search deals"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="btn" onClick={() => setAdding('New')}>
          <Plus size={16} /> New deal
        </button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={({ active }) => setActiveId(Number(active.id))}
        onDragOver={track}
        onDragMove={track}
        onDragEnd={onDragEnd}
        onDragCancel={() => (setActiveId(null), setTarget(null))}
      >
        <div className="board">
          {STAGES.map((stage) => (
            <BoardColumn
              key={stage}
              stage={stage}
              deals={visible(stage)}
              totals={board.columns.find((c) => c.stage === stage)!}
              today={day}
              dragDisabled={searching}
              dropLineAt={dropLineAt(stage)}
              leaving={!!(active && target && active.stage === stage && target.stage !== stage)}
              onAdd={setAdding}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {active ? <DealCard deal={active} today={day} lifted /> : null}
        </DragOverlay>
      </DndContext>
      <DealForm
        open={adding !== null}
        stage={adding ?? undefined}
        onClose={() => setAdding(null)}
        onCreated={(deal) => {
          const current = qc.getQueryData<Board>(PIPELINE)
          if (current) qc.setQueryData(PIPELINE, addCardToTop(current, deal))
        }}
      />
    </>
  )
}
