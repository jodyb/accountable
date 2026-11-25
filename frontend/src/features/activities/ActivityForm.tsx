import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Loading } from '../../app/Layout'
import { ApiError, type Activity } from '../../lib/api'
import { today } from '../../lib/dates'
import { applyServerErrors, Field, invalid } from '../../ui/Field'
import { SidePanel } from '../../ui/SidePanel'
import { useToast } from '../../ui/Toast'
import { useContacts } from '../contacts/queries'
import { useDeals } from '../deals/queries'
import { useSaveActivity } from './queries'
import { activitySchema, toActivityBody, TYPE_LABEL, USER_TYPES, type ActivityValues, type UserType } from './schema'

export type Prefill = { contact_id?: number | null; deal_id?: number | null }

type Props = {
  open: boolean
  activity?: Activity | null
  /** Logging from a deal passes the deal and its main contact; from a contact, the contact. */
  prefill?: Prefill
  onClose: () => void
}

export function ActivityForm({ open, activity, prefill, onClose }: Props) {
  return (
    <SidePanel open={open} title={activity ? 'Edit activity' : 'Log activity'} onClose={onClose}>
      {open && <WhenListsLoaded activity={activity} prefill={prefill} onClose={onClose} />}
    </SidePanel>
  )
}

/** The selects need their options before a pre-filled value can show. */
function WhenListsLoaded(props: Omit<Props, 'open'>) {
  const contacts = useContacts()
  const deals = useDeals()
  if (!contacts.data || !deals.data) return <Loading />
  return <ActivityFormBody {...props} />
}

const FIELDS = ['type', 'contact_id', 'deal_id', 'description', 'occurred_on', 'follow_up_on', 'done']

export function ActivityFormBody({ activity, prefill, onClose }: Omit<Props, 'open'>) {
  const save = useSaveActivity()
  const contacts = useContacts()
  const deals = useDeals()
  const notify = useToast()
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, formState, setError, trigger, watch, setValue, getValues } = useForm<ActivityValues>({
    resolver: zodResolver(activitySchema),
    mode: 'all',
    defaultValues: activity
      ? {
          type: activity.type as UserType,
          contact_id: activity.contact_id ? String(activity.contact_id) : '',
          deal_id: activity.deal_id ? String(activity.deal_id) : '',
          description: activity.description,
          occurred_on: activity.occurred_on,
          follow_up_on: activity.follow_up_on ?? '',
          done: activity.done,
        }
      : {
          type: 'note',
          contact_id: prefill?.contact_id ? String(prefill.contact_id) : '',
          deal_id: prefill?.deal_id ? String(prefill.deal_id) : '',
          description: '',
          occurred_on: today(),
          follow_up_on: '',
          done: false,
        },
  })
  useEffect(() => {
    trigger()
  }, [trigger])
  const e = formState.errors
  const type = watch('type')
  const followUp = watch('follow_up_on')

  const dealField = register('deal_id', {
    // Picking a deal fills in its main contact when no contact is chosen yet.
    onChange: (event) => {
      const deal = deals.data?.find((d) => String(d.id) === event.target.value)
      if (deal?.contact_id && !getValues('contact_id')) setValue('contact_id', String(deal.contact_id), { shouldValidate: true })
      trigger('contact_id')
    },
  })

  const submit = handleSubmit(async (values) => {
    setFormError('')
    try {
      await save.mutateAsync({ id: activity?.id, body: toActivityBody(values) })
      notify(activity ? 'Activity saved.' : `${TYPE_LABEL[values.type]} logged.`)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setFormError(applyServerErrors(err.errors, setError, FIELDS))
      else setFormError("Couldn't save. Check that the app is running and try again.")
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <div className="fields">
        <Field label="Type" required error={e.type?.message}>
          <div className="seg in-seg" role="radiogroup" aria-label="Type">
            {USER_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                className={type === t ? 'on' : ''}
                onClick={() => setValue('type', t, { shouldValidate: true })}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Contact" htmlFor="act-contact" required error={e.contact_id?.message}>
          <select {...invalid('act-contact', e.contact_id?.message)} {...register('contact_id', { onChange: () => trigger('contact_id') })}>
            <option value="">No contact</option>
            {contacts.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Deal" htmlFor="act-deal">
          <select {...invalid('act-deal')} {...dealField}>
            <option value="">No deal</option>
            {deals.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description" htmlFor="act-desc" required error={e.description?.message}>
          <textarea {...invalid('act-desc', e.description?.message)} {...register('description')} autoFocus rows={3} placeholder="What happened, or what needs doing" />
        </Field>
        <div className="field-row">
          <Field label="Date" htmlFor="act-date" required error={e.occurred_on?.message}>
            <input {...invalid('act-date', e.occurred_on?.message)} {...register('occurred_on')} type="date" className={`in num${e.occurred_on ? ' bad' : ''}`} />
          </Field>
          <Field label="Follow-up date" htmlFor="act-follow">
            <input {...invalid('act-follow')} {...register('follow_up_on')} type="date" className="in num" />
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" {...register('done')} disabled={!followUp} />
          Follow-up done
        </label>
      </div>
      {formError && <div className="form-error">{formError}</div>}
      <div className="foot">
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn" disabled={!formState.isValid || formState.isSubmitting}>
          Save activity
        </button>
      </div>
    </form>
  )
}
