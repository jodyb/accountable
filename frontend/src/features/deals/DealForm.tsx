import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Loading } from '../../app/Layout'
import { ApiError, type Deal, type Stage } from '../../lib/api'
import { messageDate } from '../../lib/format'
import { today } from '../../lib/dates'
import { applyServerErrors, Field, invalid } from '../../ui/Field'
import { SidePanel } from '../../ui/SidePanel'
import { useToast } from '../../ui/Toast'
import { useContacts } from '../contacts/queries'
import { useOrganizations } from '../organizations/queries'
import { useCreateDeal, useUpdateDeal } from './queries'
import { dealDefaults, dealSchema, emptyDeal, toDealBody, type DealValues } from './schema'
import { DEFAULT_PROBABILITY, STAGES } from './stages'

type Props = {
  open: boolean
  deal?: Deal | null
  /** For a new deal: the stage (from a pipeline column) and links to pre-fill. */
  stage?: Stage
  organizationId?: number
  contactId?: number
  onClose: () => void
  onCreated?: (deal: Deal) => void
}

export function DealForm({ open, deal, onClose, ...rest }: Props) {
  return (
    <SidePanel open={open} title={deal ? 'Edit deal' : 'New deal'} onClose={onClose}>
      {open && <WhenListsLoaded deal={deal} onClose={onClose} {...rest} />}
    </SidePanel>
  )
}

/** A message for a stage change, or null if nothing to say. */
export function stageMessage(stage: Stage, day: string): string | null {
  if (stage === 'Won' || stage === 'Lost')
    return `Deal moved to ${stage}. Close date set to ${messageDate(day)}.`
  return null
}

/** The selects need their options before a pre-filled value can show. */
function WhenListsLoaded(props: Omit<Props, 'open'>) {
  const orgs = useOrganizations()
  const contacts = useContacts()
  if (!orgs.data || !contacts.data) return <Loading />
  return <Body {...props} />
}

function Body({ deal, stage, organizationId, contactId, onClose, onCreated }: Omit<Props, 'open'>) {
  const create = useCreateDeal()
  const update = useUpdateDeal()
  const orgs = useOrganizations()
  const contacts = useContacts()
  const notify = useToast()
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, formState, setError, trigger, setValue, setFocus } =
    useForm<DealValues>({
      resolver: zodResolver(dealSchema),
      mode: 'all',
      defaultValues: dealDefaults(deal, { stage, organizationId, contactId }),
    })
  useEffect(() => {
    trigger()
    setFocus('name')
  }, [trigger, setFocus])
  const e = formState.errors

  const stageField = register('stage', {
    // A stage change takes the new stage's usual probability, as the server will.
    onChange: (event) =>
      setValue('probability', String(DEFAULT_PROBABILITY[event.target.value as Stage]), {
        shouldValidate: true,
      }),
  })

  const submit = handleSubmit(async (values) => {
    setFormError('')
    const body = toDealBody(values)
    try {
      if (deal) {
        const day = today()
        const saved = await update.mutateAsync({ id: deal.id, body: { ...body, today: day } })
        notify((saved.stage !== deal.stage && stageMessage(saved.stage, day)) || 'Deal saved.')
      } else {
        const saved = await create.mutateAsync({ ...body, today: today() })
        notify(`${saved.name} added.`)
        onCreated?.(saved)
      }
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const errors = { ...err.errors }
        if (errors.value_cents) errors.value = errors.value_cents
        setFormError(applyServerErrors(errors, setError, Object.keys(emptyDeal())))
      } else setFormError("Couldn't save. Check that the app is running and try again.")
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <div className="fields">
        <Field label="Deal name" htmlFor="deal-name" required error={e.name?.message}>
          <input
            {...invalid('deal-name', e.name?.message)}
            {...register('name')}
            placeholder="For example, Multi-site licence"
          />
        </Field>
        <Field label="Organization" htmlFor="deal-org">
          <select {...invalid('deal-org')} {...register('organization_id')}>
            <option value="">No organization</option>
            {orgs.data?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Main contact" htmlFor="deal-contact">
          <select {...invalid('deal-contact')} {...register('contact_id')}>
            <option value="">No main contact</option>
            {contacts.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.organization_name ? ` (${c.organization_name})` : ''}
              </option>
            ))}
          </select>
        </Field>
        <div className="field-row">
          <Field label="Stage" htmlFor="deal-stage" required error={e.stage?.message}>
            <select {...invalid('deal-stage', e.stage?.message)} {...stageField}>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Probability (%)"
            htmlFor="deal-prob"
            required
            error={e.probability?.message}
          >
            <input
              {...invalid('deal-prob', e.probability?.message)}
              {...register('probability')}
              inputMode="numeric"
              className={`in num${e.probability ? ' bad' : ''}`}
            />
          </Field>
        </div>
        <div className="field-row">
          <Field label="Value (USD)" htmlFor="deal-value" required error={e.value?.message}>
            <input
              {...invalid('deal-value', e.value?.message)}
              {...register('value')}
              inputMode="decimal"
              placeholder="48500"
              className={`in num${e.value ? ' bad' : ''}`}
            />
          </Field>
          <Field label="Close date" htmlFor="deal-close">
            <input
              {...invalid('deal-close')}
              {...register('close_date')}
              type="date"
              className="in num"
            />
          </Field>
        </div>
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
          Save deal
        </button>
      </div>
    </form>
  )
}
