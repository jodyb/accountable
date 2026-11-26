import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Activity, type Contact, type ContactDetail, type ContactIn } from '../../lib/api'

export const useContacts = () =>
  useQuery({ queryKey: ['contacts'], queryFn: () => api.get<Contact[]>('/contacts') })

export const useContact = (id: number, enabled = true) =>
  useQuery({
    enabled,
    queryKey: ['contact', id],
    queryFn: () => api.get<ContactDetail>(`/contacts/${id}`),
  })

export const useContactTimeline = (id: number, enabled = true) =>
  useQuery({
    enabled,
    queryKey: ['timeline', 'contact', id],
    queryFn: () => api.get<Activity[]>(`/contacts/${id}/timeline`),
  })

export const useSaveContact = () =>
  useMutation({
    mutationFn: ({ id, body }: { id?: number; body: ContactIn }) =>
      id ? api.patch<Contact>(`/contacts/${id}`, body) : api.post<Contact>('/contacts', body),
  })

/** Forgets the record once it is gone, so the refresh after a delete doesn't ask for it again. */
export const useDeleteContact = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/contacts/${id}`)
      qc.removeQueries({ queryKey: ['contact', id] })
      qc.removeQueries({ queryKey: ['timeline', 'contact', id] })
    },
  })
}
