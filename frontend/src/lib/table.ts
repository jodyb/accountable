// Search and sort rules for the data tables. The data is small, so this runs in the browser.

export type SortDir = 'asc' | 'desc' | false

/** Clicking a heading cycles: ascending, descending, off. */
export function nextSort(current: SortDir): SortDir {
  return current === false ? 'asc' : current === 'asc' ? 'desc' : false
}

/** True when any of the visible text values contains the query, ignoring case. */
export function matchesSearch(values: unknown[], query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return values.some((v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q))
}

/** Compare for sorting: empty values last, numbers numerically, text naturally and case-insensitively. */
export function compareValues(a: unknown, b: unknown): number {
  const emptyA = a === null || a === undefined || a === ''
  const emptyB = b === null || b === undefined || b === ''
  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' })
}

export function sortRows<T>(rows: T[], value: (row: T) => unknown, dir: SortDir): T[] {
  if (!dir) return rows
  const sorted = [...rows].sort((x, y) => {
    const a = value(x)
    const b = value(y)
    const c = compareValues(a, b)
    // Empty values stay last in both directions.
    const empty =
      a === null || a === undefined || a === '' || b === null || b === undefined || b === ''
    return dir === 'desc' && !empty ? -c : c
  })
  return sorted
}
