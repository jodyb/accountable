// Revenue won (line), deals won (bars) and the sales funnel, styled to mockup A.
import { format } from 'date-fns'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Dashboard } from '../../lib/api'
import { parseDate } from '../../lib/dates'
import { money, moneyCompact, plural } from '../../lib/format'
import { STAGE_COLOR } from '../deals/stages'

type Point = { label: string; month: string; revenue: number; won: number }

function points(months: Dashboard['months']): Point[] {
  return months.map((m) => {
    const d = parseDate(`${m.month}-01`)
    return {
      label: format(d, 'MMM'),
      month: format(d, 'MMMM yyyy'),
      revenue: m.revenue_cents,
      won: m.won_count,
    }
  })
}

const axis = { stroke: 'var(--muted)', tickLine: false, axisLine: false }

function ChartTip({
  active,
  payload,
  kind,
}: {
  active?: boolean
  payload?: readonly { payload: Point }[]
  kind: 'revenue' | 'won'
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="tip" data-testid="chart-tooltip">
      <b>{p.month}</b>
      <span className="num">{kind === 'revenue' ? money(p.revenue) : plural(p.won, 'deal')}</span>
      {kind === 'won' && <span className="num"> · {money(p.revenue)}</span>}
    </div>
  )
}

export function RevenueChart({ months }: { months: Dashboard['months'] }) {
  const data = points(months)
  return (
    <div className="chart-box" data-testid="revenue-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--seagreen)" stopOpacity={0.28} />
              <stop offset="1" stopColor="var(--seagreen)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" {...axis} interval={0} />
          <YAxis {...axis} width={84} tickFormatter={(v: number) => moneyCompact(v)} />
          <Tooltip
            content={(props) => <ChartTip {...(props as object)} kind="revenue" />}
            cursor={{ stroke: 'var(--seamist)' }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--seagreen)"
            strokeWidth={3}
            fill="url(#revenueFill)"
            dot={false}
            activeDot={{ r: 5, fill: 'var(--seagreen)', stroke: 'var(--panel)', strokeWidth: 2.5 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DealsWonChart({ months }: { months: Dashboard['months'] }) {
  const data = points(months)
  return (
    <div className="chart-box" data-testid="won-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 18, right: 4, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" {...axis} interval={0} />
          <YAxis {...axis} allowDecimals={false} />
          <Tooltip
            content={(props) => <ChartTip {...(props as object)} kind="won" />}
            cursor={{ fill: 'var(--soft)' }}
          />
          <Bar dataKey="won" radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={22}>
            {data.map((p, i) => (
              <Cell
                key={p.month}
                fill="var(--cerulean)"
                fillOpacity={i === data.length - 1 ? 0.45 : 1}
              />
            ))}
            <LabelList dataKey="won" position="top" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Horizontal bars, widths relative to the widest (New) stage. */
export function Funnel({ funnel }: { funnel: Dashboard['funnel'] }) {
  const max = Math.max(1, ...funnel.map((s) => s.value_cents))
  return (
    <div className="funnel" data-testid="funnel">
      {funnel.map((s) => (
        <div className="fb-row" key={s.stage} data-stage={s.stage}>
          <div className="fb-label">
            {s.stage}
            <span>{plural(s.count, 'deal')}</span>
          </div>
          <div className="fb-track">
            <div
              className="fb-bar"
              style={{
                width: `${(100 * s.value_cents) / max}%`,
                background: STAGE_COLOR[s.stage].bg,
              }}
            />
          </div>
          <div className="fb-val num">{money(s.value_cents)}</div>
          <div className="tip" role="tooltip">
            <b>Reached {s.stage}</b>
            <span className="num">
              {plural(s.count, 'deal')} · {money(s.value_cents)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
