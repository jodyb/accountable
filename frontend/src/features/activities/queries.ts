import { useMutation } from '@tanstack/react-query'
import { api, type Activity, type ActivityIn, type ActivityPatch } from '../../lib/api'

export const useSaveActivity = () =>
  useMutation({
    mutationFn: ({ id, body }: { id?: number; body: ActivityIn | ActivityPatch }) =>
      id ? api.patch<Activity>(`/activities/${id}`, body) : api.post<Activity>('/activities', body),
  })

export const useDeleteActivity = () => useMutation({ mutationFn: (id: number) => api.delete(`/activities/${id}`) })
