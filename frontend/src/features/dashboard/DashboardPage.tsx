import { FileText, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { LoadError, Loading, PageHeader } from '../../app/Layout'
import type { Activity, Dashboard } from '../../lib/api'
import { parseDate, today as localToday } from '../../lib/dates'
import { longDate, money, plural, shortDate } from '../../lib/format'
import { useToast } from '../../ui/Toast'
import { ActivityForm } from '../activities/ActivityForm'
import { ActivityIcon } from '../activities/Timeline'
import { DealForm } from '../deals/DealForm'
import { DealsWonChart, Funnel, RevenueChart } from './Charts'
import { useDashboard, useMarkDone } from './queries'

function RecordLink({ a }: { a: Activity }) {
  if (a.deal_id)
    return (
      <Link className="link" to={`/deals/${a.deal_id}`}>
        {a.deal_name}
      </Link>
    )
  if (a.contact_id)
    return (
      <Link className="link" to={`/contacts/${a.contact_id}`}>
        {a.contact_name}
      </Link>
    )
  return null
}

function Kpis({ d }: { d: Dashboard }) {
  const k = d.kpis
  const monthName = parseDate(d.today).toLocaleDateString('en-US', { month: 'long' })
  const tiles = [
    {
      label: 'Open pipeline',
      value: money(k.open_value_cents),
      sub: plural(k.open_count, 'open deal'),
      color: 'var(--cerulean)',
    },
    {
      label: 'Expected revenue',
      value: money(k.open_expected_cents),
      sub: 'Value x probability',
      color: 'var(--marigold)',
    },
    {
      label: 'Won this month',
      value: money(k.won_this_month_cents),
      sub: `${plural(k.won_this_month_count, 'deal')} in ${monthName}`,
      color: 'var(--seagreen)',
    },
    {
      label: 'Win rate',
      value: k.win_rate === null ? 'None yet' : `${k.win_rate}%`,
      sub: `Last 12 months, ${k.won_12m_count} won, ${k.lost_12m_count} lost`,
      color: 'var(--coral)',
    },
  ]
  return (
    <section className="kpis">
      {tiles.map((t) => (
        <div className="panel kpi" key={t.label} data-testid="kpi">
          <span className="dot" style={{ background: t.color }} />
          <div className="kl">{t.label}</div>
          <div className="kv-big num">{t.value}</div>
          <div className="ks">{t.sub}</div>
        </div>
      ))}
    </section>
  )
}

export function DashboardPage() {
  const day = localToday()
  const { data, isPending, isError } = useDashboard(day)
  const markDone = useMarkDone()
  const notify = useToast()
  const [logging, setLogging] = useState(false)
  const [addingDeal, setAddingDeal] = useState(false)

  if (isPending) return <Loading />
  if (isError) return <LoadError what="the dashboard" />
  const overdue = data.follow_ups.filter((f) => f.overdue).length
  const summary = [
    `${plural(data.kpis.open_count, 'open deal')} worth ${money(data.kpis.open_value_cents)}`,
    overdue ? `${plural(overdue, 'follow-up')} overdue` : 'no follow-ups overdue',
  ].join(', ')

  return (
    <>
      <PageHeader
        title="Dashboard"
        sub={longDate(day)}
        actions={
          <>
            <button className="btn ghost" onClick={() => setLogging(true)}>
              <FileText size={16} /> Log activity
            </button>
            <button className="btn" onClick={() => setAddingDeal(true)}>
              <Plus size={16} /> New deal
            </button>
          </>
        }
      >
        <p className="greeting">{summary}.</p>
      </PageHeader>

      <Kpis d={data} />

      <section className="grid-2">
        <div className="panel">
          <div className="ph">
            <h2>Revenue won</h2>
            <span className="hint">Last 12 months, USD</span>
          </div>
          <RevenueChart months={data.months} />
        </div>
        <div className="panel">
          <div className="ph">
            <h2>Deals won</h2>
            <span className="hint">Per month</span>
          </div>
          <DealsWonChart months={data.months} />
        </div>
      </section>

      <section className="panel">
        <div className="ph">
          <h2>Sales funnel</h2>
          <span className="hint">Value that reached each stage, Lost left out</span>
        </div>
        <Funnel funnel={data.funnel} />
      </section>

      <section className="grid-2 even">
        <div className="panel">
          <div className="ph">
            <h2>Recent activity</h2>
            <span className="hint">Latest 10</span>
          </div>
          {data.recent_activity.length === 0 ? (
            <p className="empty">No activity yet.</p>
          ) : (
            <ul className="feed" aria-label="Recent activity">
              {data.recent_activity.map((a) => (
                <li key={a.id}>
                  <ActivityIcon type={a.type} small />
                  <div>
                    <div>{a.description}</div>
                    <div className="meta">
                      <RecordLink a={a} />
                    </div>
                  </div>
                  <span className="when num">{shortDate(a.occurred_on)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel">
          <div className="ph">
            <h2>Follow-ups</h2>
            {overdue > 0 && <span className="pill rasp">{overdue} overdue</span>}
          </div>
          {data.follow_ups.length === 0 ? (
            <p className="empty">
              No follow-ups due. Add one by logging an activity with a follow-up date.
            </p>
          ) : (
            <ul className="tasks" aria-label="Follow-ups">
              {data.follow_ups.map((f) => (
                <li key={f.id} className={f.overdue ? 'over' : ''}>
                  <input
                    type="checkbox"
                    className="box"
                    aria-label={`Mark done: ${f.description}`}
                    title="Mark done"
                    disabled={markDone.isPending && markDone.variables === f.id}
                    onChange={() =>
                      markDone.mutate(f.id, {
                        onSuccess: () => notify('Follow-up marked done.'),
                        onError: () => notify("Couldn't mark it done. Try again.", { bad: true }),
                      })
                    }
                  />
                  <div>
                    <div>{f.description}</div>
                    <div className="meta">
                      <RecordLink a={f} />
                    </div>
                  </div>
                  <span className="due num">
                    {f.overdue ? 'Overdue, ' : ''}
                    {f.follow_up_on === day ? 'Today' : shortDate(f.follow_up_on)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ActivityForm open={logging} onClose={() => setLogging(false)} />
      <DealForm open={addingDeal} onClose={() => setAddingDeal(false)} />
    </>
  )
}
