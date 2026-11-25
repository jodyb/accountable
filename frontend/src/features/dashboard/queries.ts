import { useMutation, useQuery } from '@tanstack/react-query'
import { api, type Activity, type Dashboard } from '../../lib/api'

export const useDashboard = (today: string) =>
  useQuery({ queryKey: ['dashboard', today], queryFn: () => api.get<Dashboard>(`/dashboard?today=${today}`) })

export const useMarkDone = () =>
  useMutation({ mutationFn: (id: number) => api.patch<Activity>(`/activities/${id}`, { done: true }) })
