import { z } from 'zod'
import type { Activity, ActivityIn } from '../../lib/api'
import { idValue } from '../../lib/format'

export const USER_TYPES = ['note', 'call', 'email'] as const
export type UserType = (typeof USER_TYPES)[number]

export const TYPE_LABEL: Record<string, string> = {
  note: 'Note',
  call: 'Call',
  email: 'Email',
  stage_change: 'Stage change',
}

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
    // "Done" belongs to a follow-up. Without one it is cleared, so a follow-up added later starts open.
    done: v.follow_up_on ? v.done : false,
  }
}

export type Prefill = { contact_id?: number | null; deal_id?: number | null }

/** The form's starting values: the activity being edited, or a new one with any pre-filled links. */
export function activityDefaults(
  activity: Activity | null | undefined,
  prefill: Prefill | undefined,
  day: string,
): ActivityValues {
  if (!activity)
    return {
      type: 'note',
      contact_id: idValue(prefill?.contact_id),
      deal_id: idValue(prefill?.deal_id),
      description: '',
      occurred_on: day,
      follow_up_on: '',
      done: false,
    }
  return {
    type: activity.type as UserType,
    contact_id: idValue(activity.contact_id),
    deal_id: idValue(activity.deal_id),
    description: activity.description,
    occurred_on: activity.occurred_on,
    follow_up_on: activity.follow_up_on ?? '',
    done: activity.done,
  }
}
