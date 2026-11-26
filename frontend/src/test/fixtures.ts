// A small, typed CRM for component tests: two organizations, two contacts, three deals.
import type {
  Activity,
  Board,
  Contact,
  ContactDetail,
  Dashboard,
  Deal,
  DealDetail,
  Organization,
  OrganizationDetail,
  OrganizationRow,
  Stage,
} from '../lib/api'
import { addDaysISO, today } from '../lib/dates'
import { STAGES } from '../features/deals/stages'

const day = today()
const stamp = `${addDaysISO(day, -30)}T09:00:00`

export const ATLAS: Organization = {
  id: 1,
  name: 'Atlas Engineering',
  industry: 'Engineering',
  website: 'atlas-eng.com',
  notes: 'Prefers calls in the morning.',
  created_at: stamp,
  updated_at: stamp,
}

export const BRIGHTLINE: Organization = {
  id: 2,
  name: 'Brightline Retail',
  industry: null,
  website: null,
  notes: null,
  created_at: stamp,
  updated_at: stamp,
}

export const MAYA: Contact = {
  id: 1,
  name: 'Maya Okafor',
  job_title: 'Operations Director',
  email: 'maya@atlas-eng.com',
  phone: '(415) 555-0107',
  organization_id: 1,
  organization_name: 'Atlas Engineering',
  status: 'customer',
  created_at: stamp,
  updated_at: stamp,
}

export const SOFIA: Contact = {
  id: 2,
  name: 'Sofia Lindqvist',
  job_title: null,
  email: null,
  phone: null,
  organization_id: null,
  organization_name: null,
  status: 'lead',
  created_at: stamp,
  updated_at: stamp,
}

export const ROUTE_DEAL: Deal = {
  id: 10,
  name: 'Route optimisation',
  organization_id: 1,
  organization_name: 'Atlas Engineering',
  contact_id: 1,
  contact_name: 'Maya Okafor',
  stage: 'Proposal',
  value_cents: 4_850_000,
  probability: 50,
  // Past due and still open, so it shows as late.
  close_date: addDaysISO(day, -3),
  position: 0,
  created_at: stamp,
  updated_at: stamp,
}

export const LICENCE_DEAL: Deal = {
  id: 11,
  name: 'Multi-site licence',
  organization_id: 2,
  organization_name: 'Brightline Retail',
  contact_id: 2,
  contact_name: 'Sofia Lindqvist',
  stage: 'Won',
  value_cents: 12_000_000,
  probability: 100,
  close_date: addDaysISO(day, -10),
  position: 0,
  created_at: stamp,
  updated_at: stamp,
}

export const PILOT_DEAL: Deal = {
  id: 12,
  name: 'Pilot',
  organization_id: null,
  organization_name: null,
  contact_id: null,
  contact_name: null,
  stage: 'New',
  value_cents: 500_000,
  probability: 10,
  close_date: null,
  position: 0,
  created_at: stamp,
  updated_at: stamp,
}

export const DEALS = [ROUTE_DEAL, LICENCE_DEAL, PILOT_DEAL]

export const NOTE: Activity = {
  id: 100,
  type: 'note',
  description: 'Sent the proposal',
  contact_id: 1,
  contact_name: 'Maya Okafor',
  deal_id: 10,
  deal_name: 'Route optimisation',
  occurred_on: addDaysISO(day, -2),
  follow_up_on: addDaysISO(day, 5),
  done: false,
  created_at: stamp,
}

export const CALL: Activity = {
  id: 101,
  type: 'call',
  description: 'Discovery call',
  contact_id: 1,
  contact_name: 'Maya Okafor',
  deal_id: null,
  deal_name: null,
  occurred_on: addDaysISO(day, -8),
  follow_up_on: addDaysISO(day, -1),
  done: false,
  created_at: stamp,
}

export const EMAILED: Activity = {
  id: 102,
  type: 'email',
  description: 'Sent the contract',
  contact_id: 2,
  contact_name: 'Sofia Lindqvist',
  deal_id: null,
  deal_name: null,
  occurred_on: addDaysISO(day, -12),
  follow_up_on: addDaysISO(day, -11),
  done: true,
  created_at: stamp,
}

export const STAGE_CHANGE: Activity = {
  id: 103,
  type: 'stage_change',
  description: 'Moved from Qualified to Proposal',
  contact_id: 1,
  contact_name: 'Maya Okafor',
  deal_id: 10,
  deal_name: 'Route optimisation',
  occurred_on: addDaysISO(day, -4),
  follow_up_on: null,
  done: false,
  created_at: stamp,
}

export const ORGANIZATION_ROWS: OrganizationRow[] = [
  { ...ATLAS, contact_count: 1, open_deal_count: 1, open_value_cents: 4_850_000 },
  { ...BRIGHTLINE, contact_count: 1, open_deal_count: 0, open_value_cents: 0 },
]

export const ATLAS_DETAIL: OrganizationDetail = {
  ...ATLAS,
  contacts: [MAYA],
  deals: [ROUTE_DEAL],
}

export const BRIGHTLINE_DETAIL: OrganizationDetail = { ...BRIGHTLINE, contacts: [], deals: [] }

export const MAYA_DETAIL: ContactDetail = { ...MAYA, organization: ATLAS, deals: [ROUTE_DEAL] }

export const SOFIA_DETAIL: ContactDetail = { ...SOFIA, organization: null, deals: [] }

export const ROUTE_DETAIL: DealDetail = {
  ...ROUTE_DEAL,
  organization: ATLAS,
  contact: MAYA,
  last_activity_on: NOTE.occurred_on,
}

export const PILOT_DETAIL: DealDetail = {
  ...PILOT_DEAL,
  organization: null,
  contact: null,
  last_activity_on: null,
}

export function boardOf(deals: Deal[]): Board {
  const column = (stage: Stage) => {
    const cards = deals.filter((d) => d.stage === stage)
    const value = cards.reduce((s, d) => s + d.value_cents, 0)
    const expected = cards.reduce((s, d) => s + (d.value_cents * d.probability) / 100, 0)
    return {
      stage,
      count: cards.length,
      value_cents: value,
      expected_cents: expected,
      deals: cards,
    }
  }
  const columns = STAGES.map(column)
  const open = columns.filter((c) => c.stage !== 'Won' && c.stage !== 'Lost')
  return {
    columns,
    open_value_cents: open.reduce((s, c) => s + c.value_cents, 0),
    open_expected_cents: open.reduce((s, c) => s + c.expected_cents, 0),
  }
}

export const DASHBOARD: Dashboard = {
  today: day,
  kpis: {
    open_value_cents: 5_350_000,
    open_expected_cents: 2_475_000,
    open_count: 2,
    won_this_month_cents: 12_000_000,
    won_this_month_count: 1,
    win_rate: 50,
    won_12m_count: 1,
    lost_12m_count: 1,
    late_count: 1,
  },
  months: [
    { month: day.slice(0, 7), revenue_cents: 12_000_000, won_count: 1 },
    { month: addDaysISO(day, -40).slice(0, 7), revenue_cents: 0, won_count: 0 },
  ],
  funnel: [
    { stage: 'New', count: 3, value_cents: 17_350_000 },
    { stage: 'Qualified', count: 2, value_cents: 16_850_000 },
    { stage: 'Proposal', count: 2, value_cents: 16_850_000 },
    { stage: 'Negotiation', count: 1, value_cents: 12_000_000 },
    { stage: 'Won', count: 1, value_cents: 12_000_000 },
  ],
  recent_activity: [NOTE, CALL, { ...EMAILED, contact_id: null, contact_name: null }],
  follow_ups: [
    { ...CALL, overdue: true },
    { ...NOTE, follow_up_on: day, overdue: false },
  ],
}
