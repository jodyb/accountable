import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { LoadError, Loading, PageHeader } from '../../app/Layout'
import type { Contact, Status } from '../../lib/api'
import { plural } from '../../lib/format'
import { Avatar, STATUS_STYLE, StatusBadge } from '../../ui/Badge'
import { countMatches, DataTable, type Col } from '../../ui/DataTable'
import { DeleteDialog } from '../../ui/DeleteDialog'
import { ContactForm } from './ContactForm'
import { useContacts, useDeleteContact } from './queries'
import { STATUSES } from './schema'

export function ContactsPage() {
  const { data, isPending, isError } = useContacts()
  const navigate = useNavigate()
  const remove = useDeleteContact()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<Status | 'all'>('all')
  const [editing, setEditing] = useState<Contact | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Contact | null>(null)

  const columns = useMemo<Col<Contact>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        value: (c) => `${c.name} ${c.email ?? ''}`,
        cell: (c) => (
          <div className="namecell">
            <Avatar name={c.name} />
            <div>
              <b>{c.name}</b>
              {c.email && <div className="mute">{c.email}</div>}
            </div>
          </div>
        ),
      },
      { id: 'title', header: 'Job title', value: (c) => c.job_title, cell: (c) => c.job_title ?? <span className="none">None</span> },
      {
        id: 'org',
        header: 'Organization',
        value: (c) => c.organization_name,
        cell: (c) =>
          c.organization_id ? (
            <Link className="link" to={`/organizations/${c.organization_id}`} onClick={(e) => e.stopPropagation()}>
              {c.organization_name}
            </Link>
          ) : (
            <span className="none">None</span>
          ),
      },
      { id: 'phone', header: 'Phone', value: (c) => c.phone, cell: (c) => <span className="num">{c.phone}</span> },
      { id: 'status', header: 'Status', value: (c) => STATUS_STYLE[c.status].label, cell: (c) => <StatusBadge status={c.status} /> },
    ],
    [],
  )

  const rows = useMemo(() => (data ?? []).filter((c) => status === 'all' || c.status === status), [data, status])

  if (isPending) return <Loading />
  if (isError) return <LoadError what="contacts" />
  const count = (s: Status) => data.filter((c) => c.status === s).length

  return (
    <>
      <PageHeader
        title="Contacts"
        sub={`${plural(data.length, 'person', 'people')}, ${count('lead')} of them leads`}
        actions={
          <button className="btn" onClick={() => setEditing(null)}>
            <Plus size={16} /> New contact
          </button>
        }
      />
      <div className="tools">
        <label className="sbox">
          <Search size={16} aria-hidden />
          <input type="search" placeholder="Search contacts" aria-label="Search contacts" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <div className="seg" role="group" aria-label="Filter by status">
          <button className={status === 'all' ? 'on' : ''} aria-pressed={status === 'all'} onClick={() => setStatus('all')}>
            All<span className="c">{data.length}</span>
          </button>
          {STATUSES.map((s) => (
            <button key={s} className={status === s ? 'on' : ''} aria-pressed={status === s} onClick={() => setStatus(s)}>
              {STATUS_STYLE[s].label}
              <span className="c">{count(s)}</span>
            </button>
          ))}
        </div>
        <span className="count">
          Showing {countMatches(rows, columns, search)} of {data.length}
        </span>
      </div>
      <div className="panel flush">
        <DataTable
          label="Contacts"
          rows={rows}
          columns={columns}
          rowId={(c) => c.id}
          rowLabel={(c) => c.name}
          search={search}
          initialSort={{ id: 'name', desc: false }}
          onRowClick={(c) => navigate(`/contacts/${c.id}`)}
          onEdit={setEditing}
          onDelete={setDeleting}
          empty={search || status !== 'all' ? 'No contacts match.' : 'No contacts yet. Add one with New contact.'}
        />
      </div>
      <ContactForm open={editing !== undefined} contact={editing} onClose={() => setEditing(undefined)} />
      <DeleteDialog kind="contact" record={deleting} onClose={() => setDeleting(null)} onConfirm={() => remove.mutateAsync(deleting!.id)} />
    </>
  )
}
