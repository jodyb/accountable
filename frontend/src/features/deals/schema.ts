import { z } from 'zod'
import type { DealIn, Stage } from '../../lib/api'
import { dollarsToCents } from '../../lib/format'
import { DEFAULT_PROBABILITY, STAGES } from './stages'

export const dealSchema = z.object({
  name: z.string().trim().min(1, 'Enter a deal name.'),
  organization_id: z.string(),
  contact_id: z.string(),
  stage: z.enum(STAGES as [Stage, ...Stage[]], 'Choose a stage.'),
  value: z
    .string()
    .trim()
    .min(1, 'Enter a value.')
    .refine((v) => v === '' || dollarsToCents(v) !== null, 'Enter an amount in US dollars, like 48500.'),
  probability: z
    .string()
    .trim()
    .min(1, 'Enter a probability.')
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) <= 100), 'Enter a whole number from 0 to 100.'),
  close_date: z.string(),
})

export type DealValues = z.input<typeof dealSchema>

export function emptyDeal(stage: Stage = 'New'): DealValues {
  return {
    name: '',
    organization_id: '',
    contact_id: '',
    stage,
    value: '',
    probability: String(DEFAULT_PROBABILITY[stage]),
    close_date: '',
  }
}

export function toDealBody(v: DealValues): DealIn {
  return {
    name: v.name.trim(),
    organization_id: v.organization_id ? Number(v.organization_id) : null,
    contact_id: v.contact_id ? Number(v.contact_id) : null,
    stage: v.stage,
    value_cents: dollarsToCents(v.value) ?? 0,
    probability: Number(v.probability),
    close_date: v.close_date || null,
  }
}
