import { describe, expect, it } from 'vitest'
import { compareValues, matchesSearch, nextSort, sortRows } from './table'

describe('search', () => {
  const row = ['Atlas Engineering', 'Engineering', 'atlas-eng.com', 3, null]

  it('matches any visible column, ignoring case', () => {
    expect(matchesSearch(row, 'atlas')).toBe(true)
    expect(matchesSearch(row, 'ENG.COM')).toBe(true)
    expect(matchesSearch(row, 'engineering')).toBe(true)
    expect(matchesSearch(row, '3')).toBe(true)
  })
  it('does not match what is not there', () => {
    expect(matchesSearch(row, 'harbor')).toBe(false)
    expect(matchesSearch(row, 'null')).toBe(false)
  })
  it('an empty or blank query matches everything', () => {
    expect(matchesSearch(row, '')).toBe(true)
    expect(matchesSearch(row, '   ')).toBe(true)
  })
})

describe('sort', () => {
  it('cycles ascending, descending, off', () => {
    expect(nextSort(false)).toBe('asc')
    expect(nextSort('asc')).toBe('desc')
    expect(nextSort('desc')).toBe(false)
  })

  const rows = [{ v: 'beta' }, { v: 'Alpha' }, { v: null }, { v: 'gamma 10' }, { v: 'gamma 9' }]
  const names = (dir: 'asc' | 'desc' | false) => sortRows(rows, (r) => r.v, dir).map((r) => r.v)

  it('ascending is natural and case-insensitive, empties last', () => {
    expect(names('asc')).toEqual(['Alpha', 'beta', 'gamma 9', 'gamma 10', null])
  })
  it('descending reverses, empties still last', () => {
    expect(names('desc')).toEqual(['gamma 10', 'gamma 9', 'beta', 'Alpha', null])
  })
  it('off keeps the original order', () => {
    expect(names(false)).toEqual(rows.map((r) => r.v))
  })
  it('compares numbers numerically', () => {
    expect(compareValues(9, 10)).toBeLessThan(0)
    expect(compareValues('2026-01-05', '2025-12-31')).toBeGreaterThan(0)
  })
})
