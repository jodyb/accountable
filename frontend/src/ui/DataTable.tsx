// Table with search, sortable headings, row click, Edit and Delete icons, and an empty state.
import {
  createFilteredRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  columnFilteringFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { compareValues, matchesSearch, nextSort, type SortDir } from '../lib/table'

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
})

export type Col<T extends RowData> = {
  id: string
  header: string
  /** The value searched and sorted on. Leave out for columns that aren't data. */
  value?: (row: T) => string | number | null | undefined
  cell: (row: T) => ReactNode
  align?: 'right'
  sortable?: boolean
}

type Props<T extends RowData> = {
  rows: T[]
  columns: Col<T>[]
  rowId: (row: T) => string | number
  search?: string
  onRowClick?: (row: T) => void
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  rowLabel?: (row: T) => string
  empty: ReactNode
  initialSort?: { id: string; desc: boolean }
  label: string
  scroll?: boolean
}

export function DataTable<T extends RowData>(props: Props<T>) {
  const { rows, columns, rowId, search = '', onRowClick, onEdit, onDelete, empty, label } = props
  const [sorting, setSorting] = useState<SortingState>(props.initialSort ? [props.initialSort] : [])

  const defs = useMemo<Array<ColumnDef<typeof features, T>>>(
    () =>
      columns.map((c) => ({
        id: c.id,
        header: c.header,
        accessorFn: (row: T) => c.value?.(row) ?? null,
        cell: (info) => c.cell(info.row.original),
        enableSorting: c.sortable !== false && !!c.value,
        enableGlobalFilter: !!c.value,
        sortFn: (a, b, id) => compareValues(a.getValue(id), b.getValue(id)),
        sortUndefined: 'last',
      })),
    [columns],
  )

  const table = useTable({
    features,
    columns: defs,
    data: rows,
    getRowId: (row) => String(rowId(row)),
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    globalFilterFn: (row, columnId, query) => matchesSearch([row.getValue(columnId)], String(query)),
  })

  const sortOf = (id: string): SortDir => {
    const s = sorting.find((x) => x.id === id)
    return s ? (s.desc ? 'desc' : 'asc') : false
  }
  const toggle = (id: string) => {
    const next = nextSort(sortOf(id))
    setSorting(next ? [{ id, desc: next === 'desc' }] : [])
  }

  const visible = table.getRowModel().rows
  const hasActions = !!(onEdit || onDelete)
  const colCount = columns.length + (hasActions ? 1 : 0)

  const body = (
    <table className={`tbl${onRowClick ? '' : ' static'}`} aria-label={label}>
      <thead>
        <tr>
          {columns.map((c) => {
            const dir = sortOf(c.id)
            const canSort = c.sortable !== false && !!c.value
            const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ChevronsUpDown
            return (
              <th
                key={c.id}
                className={`${c.align === 'right' ? 'r' : ''} ${dir ? 'sorted' : ''}`}
                aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined}
              >
                {canSort ? (
                  <button type="button" onClick={() => toggle(c.id)}>
                    {c.header}
                    <Icon className="sa" size={13} aria-hidden />
                  </button>
                ) : (
                  c.header
                )}
              </th>
            )
          })}
          {hasActions && <th className="a" aria-label="Actions" />}
        </tr>
      </thead>
      <tbody>
        {visible.length === 0 ? (
          <tr>
            <td colSpan={colCount} className="empty">
              {empty}
            </td>
          </tr>
        ) : (
          visible.map((r) => {
            const row = r.original
            const name = props.rowLabel?.(row) ?? ''
            return (
              <tr key={r.id} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                {columns.map((c) => (
                  <td key={c.id} className={c.align === 'right' ? 'r' : undefined}>
                    {c.cell(row)}
                  </td>
                ))}
                {hasActions && (
                  <td className="a" onClick={(e) => e.stopPropagation()}>
                    <div className="acts">
                      {onEdit && (
                        <button type="button" title="Edit" aria-label={`Edit ${name}`} onClick={() => onEdit(row)}>
                          <Pencil size={15} />
                        </button>
                      )}
                      {onDelete && (
                        <button type="button" className="del" title="Delete" aria-label={`Delete ${name}`} onClick={() => onDelete(row)}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )
          })
        )}
      </tbody>
    </table>
  )
  return props.scroll === false ? body : <div className="table-scroll">{body}</div>
}

/** Rows after search, for "Showing N of M" counts. */
export function countMatches<T extends RowData>(rows: T[], columns: Col<T>[], search: string): number {
  return rows.filter((row) => matchesSearch(columns.map((c) => c.value?.(row)), search)).length
}
