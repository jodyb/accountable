import { FileText, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { LoadError, Loading, PageHeader } from '../../app/Layout'
import type { Activity } from '../../lib/api'
import { displayDate, money } from '../../lib/format'
import { Avatar, StatusBadge } from '../../ui/Badge'
import { DeleteDialog } from '../../ui/DeleteDialog'
import { ActivityForm } from '../activities/ActivityForm'
import { Timeline } from '../activities/Timeline'
import { StageBadge } from '../deals/StageBadge'
import { ContactForm } from './ContactForm'
import { useContact, useContactTimeline, useDeleteContact } from './queries'

export function ContactPage() {
  const id = Number(useParams().id)
  // Set once a delete is confirmed, so nothing asks for the record again.
  const [gone, setGone] = useState(false)
  const contact = useContact(id, !gone)
  const timeline = useContactTimeline(id, !gone)
  const remove = useDeleteContact()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [logging, setLogging] = useState<Activity | null | undefined>(undefined)

  if (contact.isPending) return <Loading />
  if (contact.isError) return <LoadError what="this contact" />
  const c = contact.data
  const sub =
    [c.job_title, c.organization_name].filter(Boolean).join(' at ') ||
    'No job title or organization'

  return (
    <>
      <PageHeader
        title={c.name}
        crumb={{ label: 'Contacts', to: '/contacts' }}
        sub={sub}
        actions={
          <>
            <button className="btn" onClick={() => setLogging(null)}>
              <FileText size={16} /> Log activity
            </button>
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
              <Avatar name={c.name} color="var(--seagreen)" />
              <div>
                <h2>{c.name}</h2>
                <div className="mute">{c.job_title}</div>
              </div>
            </div>
            <dl className="kv">
              <dt>Status</dt>
              <dd>
                <StatusBadge status={c.status} />
              </dd>
              <dt>Organization</dt>
              <dd>
                {c.organization ? (
                  <Link className="link" to={`/organizations/${c.organization.id}`}>
                    {c.organization.name}
                  </Link>
                ) : (
                  <span className="none">None</span>
                )}
              </dd>
              <dt>Email</dt>
              <dd>
                {c.email ? (
                  <a className="link" href={`mailto:${c.email}`}>
                    {c.email}
                  </a>
                ) : (
                  <span className="none">None</span>
                )}
              </dd>
              <dt>Phone</dt>
              <dd className="num">{c.phone ?? <span className="none">None</span>}</dd>
              <dt>Added</dt>
              <dd className="num">{displayDate(c.created_at)}</dd>
            </dl>
          </div>
          <div className="panel">
            <div className="ph">
              <h2>Deals</h2>
              <span className="hint">{c.deals.length}</span>
            </div>
            {c.deals.length === 0 ? (
              <p className="mute">No deals with this contact yet.</p>
            ) : (
              <ul className="mini-list" aria-label="Deals">
                {c.deals.map((d) => (
                  <li key={d.id}>
                    <div>
                      <Link className="link" to={`/deals/${d.id}`}>
                        {d.name}
                      </Link>
                      <div className="mute num">{money(d.value_cents)}</div>
                    </div>
                    <StageBadge stage={d.stage} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="panel">
          <div className="ph">
            <h2>Timeline</h2>
            <span className="hint">Newest first</span>
          </div>
          {timeline.data ? (
            <Timeline activities={timeline.data} show="deal" onEdit={setLogging} />
          ) : (
            <Loading />
          )}
        </div>
      </div>
      <ContactForm open={editing} contact={c} onClose={() => setEditing(false)} />
      <ActivityForm
        open={logging !== undefined}
        activity={logging}
        prefill={{ contact_id: c.id }}
        onClose={() => setLogging(undefined)}
      />
      <DeleteDialog
        kind="contact"
        record={deleting ? c : null}
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          setGone(true)
          navigate('/contacts')
          await remove.mutateAsync(c.id)
        }}
      />
    </>
  )
}
