// Display formats. Money arrives in cents and is rounded once, here.
import { format } from 'date-fns'
import { parseDate } from './dates'

const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const withCents = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** `$48,500 USD`; cents appear only when there are some. */
export function money(cents: number): string {
  const rounded = Math.round(cents)
  const dollars = rounded / 100
  const text = rounded % 100 === 0 ? whole.format(Math.abs(dollars)) : withCents.format(Math.abs(dollars))
  return `${dollars < 0 ? '-' : ''}$${text} USD`
}

/** `$1.2M USD`, `$52K USD`, `$950 USD`, for chart labels and tight spaces. */
export function moneyCompact(cents: number): string {
  const dollars = Math.round(cents) / 100
  const abs = Math.abs(dollars)
  const sign = dollars < 0 ? '-' : ''
  let text: string
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    text = `${m >= 10 ? Math.round(m) : trim(m.toFixed(1))}M`
  } else if (abs >= 1_000) {
    const k = Math.round(abs / 1_000)
    text = k >= 1000 ? '1M' : `${k}K`
  } else {
    text = whole.format(abs)
  }
  return `${sign}$${text} USD`
}

const trim = (s: string) => s.replace(/\.0$/, '')

export function percent(n: number): string {
  return `${Math.round(n)}%`
}

/** `Nov 24, 2026` */
export function displayDate(iso: string | null | undefined): string {
  return iso ? format(parseDate(iso), 'MMM d, yyyy') : ''
}

/** `Nov 24` */
export function shortDate(iso: string | null | undefined): string {
  return iso ? format(parseDate(iso), 'MMM d') : ''
}

/** `24 Nov 2026`, used in messages. */
export function messageDate(iso: string): string {
  return format(parseDate(iso), 'd MMM yyyy')
}

/** `Tuesday, 24 November 2026` */
export function longDate(iso: string): string {
  return format(parseDate(iso), 'EEEE, d MMMM yyyy')
}

export function plural(n: number, word: string, many = `${word}s`): string {
  return `${n} ${n === 1 ? word : many}`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/** Dollars typed in a form, to cents. Returns null for anything that isn't a sum of money. */
export function dollarsToCents(text: string): number | null {
  const clean = text.replace(/[$,\s]|USD/gi, '')
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null
  return Math.round(Number(clean) * 100)
}

export function centsToDollars(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
}
