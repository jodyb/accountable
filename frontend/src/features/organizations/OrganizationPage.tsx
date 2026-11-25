import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { LoadError, Loading, PageHeader } from '../../app/Layout'
import type { Contact, Deal } from '../../lib/api'
import { today } from '../../lib/dates'
import { money } from '../../lib/format'
import { Avatar, StatusBadge } from '../../ui/Badge'
import { DataTable, type Col } from '../../ui/DataTable'
import { DeleteDialog } from '../../ui/DeleteDialog'
import { ContactForm } from '../contacts/ContactForm'
import { DealForm } from '../deals/DealForm'
import { CloseDate, StageBadge } from '../deals/StageBadge'
import { isOpen } from '../deals/stages'
import { OrganizationForm } from './OrganizationForm'
import { useDeleteOrganization, useOrganization } from './queries'

const contactCols: Col<Contact>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (c) => (
      <div className="namecell">
        <Avatar name={c.name} />
        <Link className="link" to={`/contacts/${c.id}`}>
          {c.name}
        </Link>
      </div>
    ),
  },
  { id: 'title', header: 'Job title', cell: (c) => c.job_title },
  { id: 'email', header: 'Email', cell: (c) => c.email },
  { id: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
]

function dealCols(day: string): Col<Deal>[] {
  return [
    {
      id: 'name',
      header: 'Deal',
      cell: (d) => (
        <Link className="link" to={`/deals/${d.id}`}>
          {d.name}
        </Link>
      ),
    },
    { id: 'stage', header: 'Stage', cell: (d) => <StageBadge stage={d.stage} /> },
    { id: 'value', header: 'Value', align: 'right', cell: (d) => <span className="num">{money(d.value_cents)}</span> },
    { id: 'close', header: 'Close date', cell: (d) => <CloseDate deal={d} today={day} /> },
  ]
}

export function OrganizationPage() {
  const id = Number(useParams().id)
  // Set once a delete is confirmed, so nothing asks for the record again.
  const [gone, setGone] = useState(false)
  const org = useOrganization(id, !gone)
  const remove = useDeleteOrganization()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [addingContact, setAddingContact] = useState(false)
  const [addingDeal, setAddingDeal] = useState(false)

  if (org.isPending) return <Loading />
  if (org.isError) return <LoadError what="this organization" />
  const o = org.data
  const open = o.deals.filter((d) => isOpen(d.stage))
  const sub = [o.industry, o.website].filter(Boolean).join(' · ')

  return (
    <>
      <PageHeader
        title={o.name}
        crumb={{ label: 'Organizations', to: '/organizations' }}
        sub={sub || undefined}
        actions={
          <>
            <button className="btn ghost" onClick={() => setEditing(true)}>
              <Pencil size={16} /> Edit
            </button>
            <button className="btn ghost danger-t" onClick={() => setDeleting(true)}>
              <Trash2 size={16} /> Delete
            </button>
          </>
        }
      />
      <div className="detail">
        <div className="stack">
          <div className="panel">
            <div className="prof">
              <Avatar name={o.name} color="var(--marigold)" />
              <div>
                <h2>{o.name}</h2>
                <div className="mute">{o.industry}</div>
              </div>
            </div>
            <dl className="kv">
              <dt>Website</dt>
              <dd>
                {o.website ? (
                  <a className="link" href={`https://${o.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer">
                    {o.website}
                  </a>
                ) : (
                  <span className="none">None</span>
                )}
              </dd>
              <dt>Industry</dt>
              <dd>{o.industry ?? <span className="none">None</span>}</dd>
              <dt>Notes</dt>
              <dd>{o.notes ?? <span className="none">None</span>}</dd>
            </dl>
          </div>
          <div className="stats">
            <div className="panel stat-t">
              <div className="lbl">Contacts</div>
              <div className="v num">{o.contacts.length}</div>
            </div>
            <div className="panel stat-t">
              <div className="lbl">Open deals</div>
              <div className="v num">{open.length}</div>
            </div>
            <div className="panel stat-t wide">
              <div className="lbl">Open value</div>
              <div className="v num">{money(open.reduce((s, d) => s + d.value_cents, 0))}</div>
            </div>
          </div>
        </div>
        <div className="stack">
          <div className="panel flush">
            <div className="ph pad">
              <h2>Contacts</h2>
              <button className="btn ghost sm" onClick={() => setAddingContact(true)}>
                <Plus size={14} /> Add contact
              </button>
            </div>
            <DataTable label="Contacts" scroll={false} rows={o.contacts} columns={contactCols} rowId={(c) => c.id} empty="No contacts yet. Add one with Add contact." />
          </div>
          <div className="panel flush">
            <div className="ph pad">
              <h2>Deals</h2>
              <button className="btn ghost sm" onClick={() => setAddingDeal(true)}>
                <Plus size={14} /> New deal
              </button>
            </div>
            <DataTable label="Deals" scroll={false} rows={o.deals} columns={dealCols(today())} rowId={(d) => d.id} empty="No deals yet. Add one with New deal." />
          </div>
        </div>
      </div>
      <OrganizationForm open={editing} organization={o} onClose={() => setEditing(false)} />
      <ContactForm open={addingContact} organizationId={o.id} onClose={() => setAddingContact(false)} />
      <DealForm open={addingDeal} organizationId={o.id} onClose={() => setAddingDeal(false)} />
      <DeleteDialog
        kind="organization"
        record={deleting ? o : null}
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          setGone(true)
          navigate('/organizations')
          await remove.mutateAsync(o.id)
        }}
      />
    </>
  )
}
