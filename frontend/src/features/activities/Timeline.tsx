// A record's activities, newest first. Stage changes have no Edit or Delete.
import { ArrowRight, Check, FileText, Mail, Pencil, Phone, Trash2, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import type { Activity, ActivityType } from '../../lib/api'
import { today } from '../../lib/dates'
import { displayDate, shortDate } from '../../lib/format'
import { useToast } from '../../ui/Toast'
import { useDeleteActivity } from './queries'
import { TYPE_LABEL } from './schema'

export const TYPE_ICON: Record<ActivityType, LucideIcon> = {
  note: FileText,
  call: Phone,
  email: Mail,
  stage_change: ArrowRight,
}

export function ActivityIcon({ type, small }: { type: ActivityType; small?: boolean }) {
  const Icon = TYPE_ICON[type]
  return (
    <span className={`fi ${type}${small ? ' sm' : ''}`} aria-label={TYPE_LABEL[type]} role="img">
      <Icon size={15} strokeWidth={2} />
    </span>
  )
}

export function FollowUpChip({ activity }: { activity: Activity }) {
  if (!activity.follow_up_on) return null
  if (activity.done)
    return (
      <span className="chip done">
        <Check size={12} /> Follow-up done
      </span>
    )
  if (activity.follow_up_on < today()) return <span className="chip over">Follow-up overdue, {shortDate(activity.follow_up_on)}</span>
  return <span className="chip up">Follow-up {shortDate(activity.follow_up_on)}</span>
}

/** "Moved from Proposal to Negotiation" with the two stage names in bold, as in the mockup. */
export function StageChangeText({ text }: { text: string }) {
  const m = /^Moved from (.+) to (.+)$/.exec(text)
  if (!m) return <>{text}</>
  return (
    <>
      Moved from <b>{m[1]}</b> to <b>{m[2]}</b>
    </>
  )
}

type Props = {
  activities: Activity[]
  /** Which linked record to show beside each entry: the deal on a contact page, the contact on a deal page. */
  show: 'deal' | 'contact'
  onEdit: (activity: Activity) => void
}

export function Timeline({ activities, show, onEdit }: Props) {
  const remove = useDeleteActivity()
  const notify = useToast()

  if (activities.length === 0) return <p className="empty">Nothing yet. Log a note, call or email with Log activity.</p>

  return (
    <ul className="tline" aria-label="Timeline">
      {activities.map((a) => {
        const link =
          show === 'deal' && a.deal_id ? (
            <Link className="link" to={`/deals/${a.deal_id}`}>
              {a.deal_name}
            </Link>
          ) : show === 'contact' && a.contact_id ? (
            <Link className="link" to={`/contacts/${a.contact_id}`}>
              {a.contact_name}
            </Link>
          ) : null
        return (
          <li key={a.id} className={a.type} data-testid="timeline-entry">
            <ActivityIcon type={a.type} />
            <div>
              <div className="tx">{a.type === 'stage_change' ? <StageChangeText text={a.description} /> : a.description}</div>
              <div className="tm">
                {TYPE_LABEL[a.type]} · <span className="num">{displayDate(a.occurred_on)}</span>
                {link && <> · {link}</>}
              </div>
              <FollowUpChip activity={a} />
            </div>
            {a.type === 'stage_change' ? (
              <span />
            ) : (
              <div className="acts">
                <button type="button" title="Edit" aria-label={`Edit activity: ${a.description}`} onClick={() => onEdit(a)}>
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  className="del"
                  title="Delete"
                  aria-label={`Delete activity: ${a.description}`}
                  onClick={() =>
                    remove.mutate(a.id, {
                      onSuccess: () => notify('Activity deleted.'),
                      onError: () => notify("Couldn't delete the activity. Try again.", { bad: true }),
                    })
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
