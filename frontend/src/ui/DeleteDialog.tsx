// Delete confirmation: names the record and says what happens to linked records.
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { api, type DeleteImpact } from '../lib/api'
import { plural } from '../lib/format'

export type DeleteKind = 'organization' | 'contact' | 'deal'

const PATHS: Record<DeleteKind, string> = { organization: 'organizations', contact: 'contacts', deal: 'deals' }

export function deleteMessage(kind: DeleteKind, impact: DeleteImpact): string {
  const n = { contacts: impact.contacts ?? 0, deals: impact.deals ?? 0, activities: impact.activities ?? 0 }
  switch (kind) {
    case 'organization':
      return `Its ${plural(n.contacts, 'contact')} and ${plural(n.deals, 'deal')} will be kept, with no organization.`
    case 'contact':
      return `Its ${plural(n.activities, 'activity', 'activities')} will be deleted. Its ${plural(n.deals, 'deal')} will be kept, with no main contact.`
    case 'deal':
      return `Its ${plural(n.activities, 'activity', 'activities')} will be deleted.`
  }
}

type Props = {
  kind: DeleteKind
  record: { id: number; name: string } | null
  onClose: () => void
  onConfirm: () => Promise<unknown>
}

export function DeleteDialog({ kind, record, onClose, onConfirm }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const impact = useQuery({
    queryKey: ['delete-impact', kind, record?.id],
    queryFn: () => api.get<DeleteImpact>(`/${PATHS[kind]}/${record!.id}/delete-impact`),
    enabled: !!record,
    gcTime: 0,
  })

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch {
      setError(`Couldn't delete this ${kind}. Try again.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root open={!!record} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="scrim" />
        <Dialog.Content className="dialog" role="alertdialog">
          <span className="dl-ic">
            <TriangleAlert size={22} />
          </span>
          <Dialog.Title asChild>
            <h2>Delete {record?.name}?</h2>
          </Dialog.Title>
          <Dialog.Description>
            {impact.data ? `${deleteMessage(kind, impact.data)} This can't be undone.` : 'Checking linked records...'}
          </Dialog.Description>
          {error && <div className="form-error">{error}</div>}
          <div className="foot">
            <Dialog.Close className="btn ghost">Cancel</Dialog.Close>
            <button className="btn danger" type="button" onClick={confirm} disabled={busy || !impact.data}>
              Delete {kind}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
