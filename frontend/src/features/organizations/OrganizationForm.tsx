import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError, type Organization } from '../../lib/api'
import { applyServerErrors, Field, invalid } from '../../ui/Field'
import { SidePanel } from '../../ui/SidePanel'
import { useToast } from '../../ui/Toast'
import {
  emptyOrganization,
  organizationSchema,
  toOrganizationBody,
  type OrganizationValues,
} from './schema'
import { useSaveOrganization } from './queries'

type Props = {
  open: boolean
  organization?: Organization | null
  onClose: () => void
  onSaved?: (org: Organization) => void
}

export function OrganizationForm({ open, organization, onClose, onSaved }: Props) {
  return (
    <SidePanel
      open={open}
      title={organization ? 'Edit organization' : 'New organization'}
      onClose={onClose}
    >
      {open && <Body organization={organization} onClose={onClose} onSaved={onSaved} />}
    </SidePanel>
  )
}

function Body({ organization, onClose, onSaved }: Omit<Props, 'open'>) {
  const save = useSaveOrganization()
  const notify = useToast()
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, formState, setError, trigger, setFocus } =
    useForm<OrganizationValues>({
      resolver: zodResolver(organizationSchema),
      mode: 'all',
      defaultValues: organization
        ? {
            name: organization.name,
            website: organization.website ?? '',
            industry: organization.industry ?? '',
            notes: organization.notes ?? '',
          }
        : emptyOrganization,
    })
  useEffect(() => {
    trigger()
    setFocus('name')
  }, [trigger, setFocus])
  const e = formState.errors

  const submit = handleSubmit(async (values) => {
    setFormError('')
    try {
      const saved = await save.mutateAsync({
        id: organization?.id,
        body: toOrganizationBody(values),
      })
      notify(organization ? 'Organization saved.' : `${saved.name} added.`)
      onSaved?.(saved)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setFormError(applyServerErrors(err.errors, setError, Object.keys(emptyOrganization)))
      } else setFormError("Couldn't save. Check that the app is running and try again.")
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <div className="fields">
        <Field label="Name" htmlFor="org-name" required error={e.name?.message}>
          <input
            {...invalid('org-name', e.name?.message)}
            {...register('name')}
            placeholder="For example, Atlas Engineering"
          />
        </Field>
        <Field label="Website" htmlFor="org-website">
          <input {...invalid('org-website')} {...register('website')} placeholder="atlas-eng.com" />
        </Field>
        <Field label="Industry" htmlFor="org-industry">
          <input
            {...invalid('org-industry')}
            {...register('industry')}
            placeholder="For example, Engineering"
          />
        </Field>
        <Field label="Notes" htmlFor="org-notes">
          <textarea {...invalid('org-notes')} {...register('notes')} rows={4} />
        </Field>
      </div>
      {formError && <div className="form-error">{formError}</div>}
      <div className="foot">
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn"
          disabled={!formState.isValid || formState.isSubmitting}
        >
          Save organization
        </button>
      </div>
    </form>
  )
}
