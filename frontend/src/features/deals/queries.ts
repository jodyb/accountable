import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  api,
  type Activity,
  type Deal,
  type DealDetail,
  type DealIn,
  type DealPatch,
} from '../../lib/api'

export const useDeals = () =>
  useQuery({ queryKey: ['deals'], queryFn: () => api.get<Deal[]>('/deals') })

export const useDeal = (id: number, enabled = true) =>
  useQuery({ enabled, queryKey: ['deal', id], queryFn: () => api.get<DealDetail>(`/deals/${id}`) })

export const useDealTimeline = (id: number, enabled = true) =>
  useQuery({
    enabled,
    queryKey: ['timeline', 'deal', id],
    queryFn: () => api.get<Activity[]>(`/deals/${id}/timeline`),
  })

export const useCreateDeal = () =>
  useMutation({ mutationFn: (body: DealIn) => api.post<Deal>('/deals', body) })

export const useUpdateDeal = () =>
  useMutation({
    mutationFn: ({ id, body }: { id: number; body: DealPatch }) =>
      api.patch<Deal>(`/deals/${id}`, body),
  })

/** Forgets the record once it is gone, so the refresh after a delete doesn't ask for it again. */
export const useDeleteDeal = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/deals/${id}`)
      qc.removeQueries({ queryKey: ['deal', id] })
      qc.removeQueries({ queryKey: ['timeline', 'deal', id] })
    },
  })
}
