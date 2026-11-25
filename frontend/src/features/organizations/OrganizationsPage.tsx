import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { LoadError, Loading, PageHeader } from '../../app/Layout'
import type { OrganizationRow } from '../../lib/api'
import { money, plural } from '../../lib/format'
import { Avatar } from '../../ui/Badge'
import { countMatches, DataTable, type Col } from '../../ui/DataTable'
import { DeleteDialog } from '../../ui/DeleteDialog'
import { OrganizationForm } from './OrganizationForm'
import { useDeleteOrganization, useOrganizations } from './queries'

export function OrganizationsPage() {
  const { data, isPending, isError } = useOrganizations()
  const navigate = useNavigate()
  const remove = useDeleteOrganization()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<OrganizationRow | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<OrganizationRow | null>(null)

  const columns = useMemo<Col<OrganizationRow>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        value: (o) => o.name,
        cell: (o) => (
          <div className="namecell">
            <Avatar name={o.name} />
            <b>{o.name}</b>
          </div>
        ),
      },
      { id: 'industry', header: 'Industry', value: (o) => o.industry, cell: (o) => o.industry ?? <span className="none">None</span> },
      {
        id: 'website',
        header: 'Website',
        value: (o) => o.website,
        cell: (o) =>
          o.website ? (
            <a className="link" href={`https://${o.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
              {o.website}
            </a>
          ) : (
            <span className="none">None</span>
          ),
      },
      { id: 'contacts', header: 'Contacts', align: 'right', value: (o) => o.contact_count, cell: (o) => <span className="num">{o.contact_count}</span> },
      { id: 'open', header: 'Open deals', align: 'right', value: (o) => o.open_deal_count, cell: (o) => <span className="num">{o.open_deal_count}</span> },
      { id: 'value', header: 'Open value', align: 'right', value: (o) => o.open_value_cents, cell: (o) => <span className="num">{money(o.open_value_cents)}</span> },
    ],
    [],
  )

  if (isPending) return <Loading />
  if (isError) return <LoadError what="organizations" />
  const industries = new Set(data.map((o) => o.industry).filter(Boolean)).size

  return (
    <>
      <PageHeader
        title="Organizations"
        sub={`${plural(data.length, 'company', 'companies')} across ${plural(industries, 'industry', 'industries')}`}
        actions={
          <button className="btn" onClick={() => setEditing(null)}>
            <Plus size={16} /> New organization
          </button>
        }
      />
      <div className="tools">
        <label className="sbox">
          <Search size={16} aria-hidden />
          <input type="search" placeholder="Search organizations" aria-label="Search organizations" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <span className="count">
          Showing {countMatches(data, columns, search)} of {data.length}
        </span>
      </div>
      <div className="panel flush">
        <DataTable
          label="Organizations"
          rows={data}
          columns={columns}
          rowId={(o) => o.id}
          rowLabel={(o) => o.name}
          search={search}
          initialSort={{ id: 'name', desc: false }}
          onRowClick={(o) => navigate(`/organizations/${o.id}`)}
          onEdit={setEditing}
          onDelete={setDeleting}
          empty={search ? 'No organizations match your search.' : 'No organizations yet. Add one with New organization.'}
        />
      </div>
      <OrganizationForm open={editing !== undefined} organization={editing} onClose={() => setEditing(undefined)} />
      <DeleteDialog kind="organization" record={deleting} onClose={() => setDeleting(null)} onConfirm={() => remove.mutateAsync(deleting!.id)} />
    </>
  )
}
