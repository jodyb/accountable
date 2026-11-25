import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { LoadError, Loading, PageHeader } from '../../app/Layout'
import type { Deal } from '../../lib/api'
import { today } from '../../lib/dates'
import { money, percent, plural } from '../../lib/format'
import { countMatches, DataTable, type Col } from '../../ui/DataTable'
import { DeleteDialog } from '../../ui/DeleteDialog'
import { DealForm } from './DealForm'
import { useDeals, useDeleteDeal } from './queries'
import { CloseDate, StageBadge } from './StageBadge'
import { expectedCents, isLate, isOpen } from './stages'

const none = <span className="none">None</span>

export function dealColumns(day: string): Col<Deal>[] {
  return [
    { id: 'name', header: 'Deal', value: (d) => d.name, cell: (d) => <b>{d.name}</b> },
    {
      id: 'org',
      header: 'Organization',
      value: (d) => d.organization_name,
      cell: (d) =>
        d.organization_id ? (
          <Link className="link" to={`/organizations/${d.organization_id}`} onClick={(e) => e.stopPropagation()}>
            {d.organization_name}
          </Link>
        ) : (
          none
        ),
    },
    {
      id: 'contact',
      header: 'Main contact',
      value: (d) => d.contact_name,
      cell: (d) =>
        d.contact_id ? (
          <Link className="link" to={`/contacts/${d.contact_id}`} onClick={(e) => e.stopPropagation()}>
            {d.contact_name}
          </Link>
        ) : (
          none
        ),
    },
    { id: 'stage', header: 'Stage', value: (d) => d.stage, cell: (d) => <StageBadge stage={d.stage} /> },
    { id: 'value', header: 'Value', align: 'right', value: (d) => d.value_cents, cell: (d) => <span className="num">{money(d.value_cents)}</span> },
    { id: 'prob', header: 'Prob.', align: 'right', value: (d) => d.probability, cell: (d) => <span className="num">{percent(d.probability)}</span> },
    { id: 'expected', header: 'Expected', align: 'right', value: (d) => expectedCents(d), cell: (d) => <span className="num">{money(expectedCents(d))}</span> },
    { id: 'close', header: 'Close date', value: (d) => d.close_date, cell: (d) => <CloseDate deal={d} today={day} /> },
  ]
}

export function DealsPage() {
  const { data, isPending, isError } = useDeals()
  const navigate = useNavigate()
  const remove = useDeleteDeal()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Deal | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Deal | null>(null)
  const day = today()
  const columns = useMemo(() => dealColumns(day), [day])

  if (isPending) return <Loading />
  if (isError) return <LoadError what="deals" />
  const open = data.filter((d) => isOpen(d.stage))
  const late = data.filter((d) => isLate(d, day)).length

  return (
    <>
      <PageHeader
        title="Deals"
        sub={`${plural(data.length, 'deal')}, ${open.length} open, worth ${money(open.reduce((s, d) => s + d.value_cents, 0))}`}
        actions={
          <button className="btn" onClick={() => setEditing(null)}>
            <Plus size={16} /> New deal
          </button>
        }
      />
      <div className="tools">
        <label className="sbox">
          <Search size={16} aria-hidden />
          <input type="search" placeholder="Search deals" aria-label="Search deals" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <span className="count">
          {late > 0 && <span className="late-d">{late} late</span>}
          {late > 0 && ' · '}
          Showing {countMatches(data, columns, search)} of {data.length}
        </span>
      </div>
      <div className="panel flush">
        <DataTable
          label="Deals"
          rows={data}
          columns={columns}
          rowId={(d) => d.id}
          rowLabel={(d) => d.name}
          search={search}
          initialSort={{ id: 'close', desc: false }}
          onRowClick={(d) => navigate(`/deals/${d.id}`)}
          onEdit={setEditing}
          onDelete={setDeleting}
          empty={search ? 'No deals match your search.' : 'No deals yet. Add one with New deal.'}
        />
      </div>
      <DealForm open={editing !== undefined} deal={editing} onClose={() => setEditing(undefined)} />
      <DeleteDialog kind="deal" record={deleting} onClose={() => setDeleting(null)} onConfirm={() => remove.mutateAsync(deleting!.id)} />
    </>
  )
}

