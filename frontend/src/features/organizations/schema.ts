import { z } from 'zod'
import type { OrganizationIn } from '../../lib/api'

export const organizationSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name to save this organization.'),
  website: z.string().trim(),
  industry: z.string().trim(),
  notes: z.string().trim(),
})

export type OrganizationValues = z.input<typeof organizationSchema>

export const emptyOrganization: OrganizationValues = { name: '', website: '', industry: '', notes: '' }

export function toOrganizationBody(v: OrganizationValues): OrganizationIn {
  return {
    name: v.name.trim(),
    website: v.website.trim() || null,
    industry: v.industry.trim() || null,
    notes: v.notes.trim() || null,
  }
}
