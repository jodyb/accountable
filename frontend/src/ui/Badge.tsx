// Colored pill badges, and the initials avatar.
import type { Status } from '../lib/api'
import { initials } from '../lib/format'

export function Badge({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <span className="badge" style={{ background: bg, color: fg }}>
      {children}
    </span>
  )
}

export const STATUS_STYLE: Record<Status, { label: string; bg: string; fg: string }> = {
  lead: { label: 'Lead', bg: 'var(--cerulean)', fg: 'var(--white)' },
  qualified: { label: 'Qualified', bg: 'var(--marigold)', fg: 'var(--midnight)' },
  customer: { label: 'Customer', bg: 'var(--seagreen)', fg: 'var(--midnight)' },
}

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLE[status]
  return (
    <Badge bg={s.bg} fg={s.fg}>
      {s.label}
    </Badge>
  )
}

export function Avatar({ name, color = 'var(--soft)' }: { name: string; color?: string }) {
  return (
    <span className="avt" style={{ background: color }} aria-hidden>
      {initials(name)}
    </span>
  )
}
