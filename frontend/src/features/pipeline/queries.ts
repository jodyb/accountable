import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Board, type MoveIn } from '../../lib/api'
import { moveCard } from './pipeline'

export const PIPELINE = ['pipeline'] as const

export const usePipeline = () =>
  useQuery({ queryKey: PIPELINE, queryFn: () => api.get<Board>('/pipeline') })

/** Move a card: show it at once, keep the server's board after, put the old one back on failure. */
export const useMoveDeal = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: MoveIn }) =>
      api.post<Board>(`/deals/${id}/move`, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: PIPELINE })
      const before = qc.getQueryData<Board>(PIPELINE)
      if (before)
        qc.setQueryData(PIPELINE, moveCard(before, id, body.stage, body.index, body.today))
      return { before }
    },
    onError: (_err, _vars, context) => {
      if (context?.before) qc.setQueryData(PIPELINE, context.before)
    },
    onSuccess: (board) => qc.setQueryData(PIPELINE, board),
  })
}
