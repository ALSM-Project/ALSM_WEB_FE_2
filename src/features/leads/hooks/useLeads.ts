import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '../api/leads.api';
import type { ListLeadsParams } from '../types/lead';

export const LEADS_QUERY_KEY = ['leads'] as const;

export function useLeadsList(params?: ListLeadsParams) {
  return useQuery({
    queryKey: [...LEADS_QUERY_KEY, params],
    queryFn: () => leadsApi.list(params),
    staleTime: 30_000,
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      leadsApi.updateStatus(id, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
    },
  });
}

