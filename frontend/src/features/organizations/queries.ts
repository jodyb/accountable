import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  api,
  type Organization,
  type OrganizationDetail,
  type OrganizationIn,
  type OrganizationRow,
} from '../../lib/api'

export const useOrganizations = () =>
  useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.get<OrganizationRow[]>('/organizations'),
  })

export const useOrganization = (id: number, enabled = true) =>
  useQuery({
    enabled,
    queryKey: ['organization', id],
    queryFn: () => api.get<OrganizationDetail>(`/organizations/${id}`),
  })

export const useSaveOrganization = () =>
  useMutation({
    mutationFn: ({ id, body }: { id?: number; body: OrganizationIn }) =>
      id
        ? api.patch<Organization>(`/organizations/${id}`, body)
        : api.post<Organization>('/organizations', body),
  })

/** Forgets the record once it is gone, so the refresh after a delete doesn't ask for it again. */
export const useDeleteOrganization = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/organizations/${id}`)
      qc.removeQueries({ queryKey: ['organization', id] })
    },
  })
}
