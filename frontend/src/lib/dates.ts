// Calendar dates are local to the user's computer and travel as YYYY-MM-DD.
import { addDays, format, parse } from 'date-fns'

const ISO = 'yyyy-MM-dd'

/** Today's local calendar date, even late in the evening west of UTC. */
export function today(now: Date = new Date()): string {
  return toISODate(now)
}

export function toISODate(d: Date): string {
  return format(d, ISO)
}

/** A YYYY-MM-DD string as a local Date at midnight (not UTC). */
export function parseDate(iso: string): Date {
  return parse(iso.slice(0, 10), ISO, new Date(0))
}

export function addDaysISO(iso: string, days: number): string {
  return toISODate(addDays(parseDate(iso), days))
}

export function isISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = parseDate(s)
  return !Number.isNaN(d.getTime()) && toISODate(d) === s
}
