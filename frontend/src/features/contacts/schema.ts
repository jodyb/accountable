import { z } from 'zod'
import type { Contact, ContactIn, Status } from '../../lib/api'
import { idValue } from '../../lib/format'

export const STATUSES: Status[] = ['lead', 'qualified', 'customer']

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name to save this contact.'),
  email: z.union([
    z.literal(''),
    z.string().trim().pipe(z.email('Enter an email address, like name@company.com.')),
  ]),
  phone: z.string().trim(),
  job_title: z.string().trim(),
  organization_id: z.string(),
  status: z.enum(STATUSES, 'Choose a status.'),
})

export type ContactValues = z.input<typeof contactSchema>

export const emptyContact: ContactValues = {
  name: '',
  email: '',
  phone: '',
  job_title: '',
  organization_id: '',
  status: 'lead',
}

export function toContactBody(v: ContactValues): ContactIn {
  return {
    name: v.name.trim(),
    email: v.email.trim() || null,
    phone: v.phone.trim() || null,
    job_title: v.job_title.trim() || null,
    organization_id: v.organization_id ? Number(v.organization_id) : null,
    status: v.status,
  }
}

/** The form's starting values: the contact being edited, or a new one in any pre-selected organization. */
export function contactDefaults(
  contact: Contact | null | undefined,
  organizationId?: number,
): ContactValues {
  if (!contact) return { ...emptyContact, organization_id: idValue(organizationId) }
  return {
    name: contact.name,
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    job_title: contact.job_title ?? '',
    organization_id: idValue(contact.organization_id),
    status: contact.status,
  }
}
