import { FileText, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { LoadError, Loading, PageHeader } from '../../app/Layout'
import type { Activity } from '../../lib/api'
import { today } from '../../lib/dates'
import { displayDate, money, percent } from '../../lib/format'
import { DeleteDialog } from '../../ui/DeleteDialog'
import { ActivityForm } from '../activities/ActivityForm'
import { Timeline } from '../activities/Timeline'
import { DealForm } from './DealForm'
import { useDeal, useDealTimeline, useDeleteDeal } from './queries'
import { CloseDate, StageBadge } from './StageBadge'
import { StageTrack } from './StageTrack'
import { expectedCents } from './stages'

export function DealPage() {
  const id = Number(useParams().id)
  // Set once a delete is confirmed, so nothing asks for the record again.
  const [gone, setGone] = useState(false)
  const deal = useDeal(id, !gone)
  const timeline = useDealTimeline(id, !gone)
  const remove = useDeleteDeal()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [logging, setLogging] = useState<Activity | null | undefined>(undefined)

  if (deal.isPending) return <Loading />
  if (deal.isError) return <LoadError what="this deal" />
  const d = deal.data
  const closed = d.stage === 'Won' || d.stage === 'Lost'
  const sub =
    [d.organization_name, d.contact_name].filter(Boolean).join(' · ') ||
    'No organization or main contact'

  return (
    <>
      <PageHeader
        title={d.name}
        crumb={{ label: 'Deals', to: '/deals' }}
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
      <div className="panel deal-top">
        <StageTrack stage={d.stage} />
        <div className="facts">
          <div>
            <div className="lbl">Value</div>
            <div className="v num">{money(d.value_cents)}</div>
          </div>
          <div>
            <div className="lbl">Probability</div>
            <div className="v num">{percent(d.probability)}</div>
          </div>
          <div>
            <div className="lbl">Expected revenue</div>
            <div className="v num">{money(expectedCents(d))}</div>
          </div>
          <div>
            <div className="lbl">{closed ? 'Closed' : 'Expected close'}</div>
            <div className="v">
              <CloseDate deal={d} today={today()} />
            </div>
          </div>
        </div>
      </div>
      <div className="detail rev">
        <div className="panel">
          <div className="ph">
            <h2>Timeline</h2>
            <span className="hint">Newest first</span>
          </div>
          {timeline.data ? (
            <Timeline activities={timeline.data} show="contact" onEdit={setLogging} />
          ) : (
            <Loading />
          )}
        </div>
        <div className="panel">
          <div className="ph">
            <h2>Details</h2>
          </div>
          <dl className="kv">
            <dt>Organization</dt>
            <dd>
              {d.organization ? (
                <Link className="link" to={`/organizations/${d.organization.id}`}>
                  {d.organization.name}
                </Link>
              ) : (
                <span className="none">None</span>
              )}
            </dd>
            <dt>Main contact</dt>
            <dd>
              {d.contact ? (
                <Link className="link" to={`/contacts/${d.contact.id}`}>
                  {d.contact.name}
                </Link>
              ) : (
                <span className="none">None</span>
              )}
            </dd>
            <dt>Stage</dt>
            <dd>
              <StageBadge stage={d.stage} />
            </dd>
            <dt>Created</dt>
            <dd className="num">{displayDate(d.created_at)}</dd>
            <dt>Last activity</dt>
            <dd className="num">
              {d.last_activity_on ? (
                displayDate(d.last_activity_on)
              ) : (
                <span className="none">None</span>
              )}
            </dd>
          </dl>
        </div>
      </div>
      <DealForm open={editing} deal={d} onClose={() => setEditing(false)} />
      <ActivityForm
        open={logging !== undefined}
        activity={logging}
        prefill={{ deal_id: d.id, contact_id: d.contact_id }}
        onClose={() => setLogging(undefined)}
      />
      <DeleteDialog
        kind="deal"
        record={deleting ? d : null}
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          setGone(true)
          navigate('/deals')
          await remove.mutateAsync(d.id)
        }}
      />
    </>
  )
}
