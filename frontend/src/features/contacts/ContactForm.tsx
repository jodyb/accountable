import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Loading } from '../../app/Layout'
import { ApiError, type Contact } from '../../lib/api'
import { STATUS_STYLE } from '../../ui/Badge'
import { applyServerErrors, Field, invalid } from '../../ui/Field'
import { SidePanel } from '../../ui/SidePanel'
import { useToast } from '../../ui/Toast'
import { useOrganizations } from '../organizations/queries'
import { useSaveContact } from './queries'
import { contactSchema, emptyContact, STATUSES, toContactBody, type ContactValues } from './schema'

type Props = {
  open: boolean
  contact?: Contact | null
  /** Pre-selected organization for a new contact. */
  organizationId?: number
  onClose: () => void
}

export function ContactForm({ open, contact, organizationId, onClose }: Props) {
  return (
    <SidePanel open={open} title={contact ? 'Edit contact' : 'New contact'} onClose={onClose}>
      {open && <WhenListsLoaded contact={contact} organizationId={organizationId} onClose={onClose} />}
    </SidePanel>
  )
}

/** The organization select needs its options before a pre-filled value can show. */
function WhenListsLoaded(props: Omit<Props, 'open'>) {
  const orgs = useOrganizations()
  if (!orgs.data) return <Loading />
  return <Body {...props} />
}

function Body({ contact, organizationId, onClose }: Omit<Props, 'open'>) {
  const save = useSaveContact()
  const orgs = useOrganizations()
  const notify = useToast()
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, formState, setError, trigger, watch, setValue } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    mode: 'all',
    defaultValues: contact
      ? {
          name: contact.name,
          email: contact.email ?? '',
          phone: contact.phone ?? '',
          job_title: contact.job_title ?? '',
          organization_id: contact.organization_id ? String(contact.organization_id) : '',
          status: contact.status,
        }
      : { ...emptyContact, organization_id: organizationId ? String(organizationId) : '' },
  })
  useEffect(() => {
    trigger()
  }, [trigger])
  const e = formState.errors
  const status = watch('status')

  const submit = handleSubmit(async (values) => {
    setFormError('')
    try {
      const saved = await save.mutateAsync({ id: contact?.id, body: toContactBody(values) })
      notify(contact ? 'Contact saved.' : `${saved.name} added.`)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setFormError(applyServerErrors(err.errors, setError, Object.keys(emptyContact)))
      } else setFormError("Couldn't save. Check that the app is running and try again.")
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <div className="fields">
        <Field label="Name" htmlFor="contact-name" required error={e.name?.message}>
          <input {...invalid('contact-name', e.name?.message)} {...register('name')} autoFocus placeholder="For example, Maya Okafor" />
        </Field>
        <Field label="Email" htmlFor="contact-email" error={e.email?.message}>
          <input {...invalid('contact-email', e.email?.message)} {...register('email')} type="email" />
        </Field>
        <Field label="Phone" htmlFor="contact-phone">
          <input {...invalid('contact-phone')} {...register('phone')} className="in num" />
        </Field>
        <Field label="Job title" htmlFor="contact-title">
          <input {...invalid('contact-title')} {...register('job_title')} placeholder="For example, Operations Manager" />
        </Field>
        <Field label="Organization" htmlFor="contact-org">
          <select {...invalid('contact-org')} {...register('organization_id')}>
            <option value="">No organization</option>
            {orgs.data?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" required error={e.status?.message}>
          <div className="seg in-seg" role="radiogroup" aria-label="Status">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={status === s}
                className={status === s ? 'on' : ''}
                onClick={() => setValue('status', s, { shouldValidate: true, shouldDirty: true })}
              >
                {STATUS_STYLE[s].label}
              </button>
            ))}
          </div>
        </Field>
      </div>
      {formError && <div className="form-error">{formError}</div>}
      <div className="foot">
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn" disabled={!formState.isValid || formState.isSubmitting}>
          Save contact
        </button>
      </div>
    </form>
  )
}
