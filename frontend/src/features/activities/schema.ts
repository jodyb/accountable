import { z } from 'zod'
import type { ActivityIn } from '../../lib/api'

export const USER_TYPES = ['note', 'call', 'email'] as const
export type UserType = (typeof USER_TYPES)[number]

export const TYPE_LABEL: Record<string, string> = { note: 'Note', call: 'Call', email: 'Email', stage_change: 'Stage change' }

export const activitySchema = z
  .object({
    type: z.enum(USER_TYPES, 'Choose a type.'),
    contact_id: z.string(),
    deal_id: z.string(),
    description: z.string().trim().min(1, 'Enter a description.'),
    occurred_on: z.string().min(1, 'Enter a date.'),
    follow_up_on: z.string(),
    done: z.boolean(),
  })
  .refine((v) => v.contact_id !== '' || v.deal_id !== '', {
    message: 'Choose a contact or a deal.',
    path: ['contact_id'],
  })

export type ActivityValues = z.input<typeof activitySchema>

export function toActivityBody(v: ActivityValues): ActivityIn {
  return {
    type: v.type,
    contact_id: v.contact_id ? Number(v.contact_id) : null,
    deal_id: v.deal_id ? Number(v.deal_id) : null,
    description: v.description.trim(),
    occurred_on: v.occurred_on,
    follow_up_on: v.follow_up_on || null,
    done: v.done,
  }
}
