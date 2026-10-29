import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '../api/leads.api';
import type { ListLeadsParams } from '../types/lead';

export const LEADS_QUERY_KEY = ['leads'] as const;
export const LEAD_DETAILS_QUERY_KEY = [...LEADS_QUERY_KEY, 'detail'] as const;

export function useLeadsList(params?: ListLeadsParams) {
  return useQuery({
    queryKey: [...LEADS_QUERY_KEY, params],
    queryFn: () => leadsApi.list(params),
    staleTime: 30_000,
  });
}

export function useLeadDetails(id?: string | null) {
  return useQuery({
    queryKey: [...LEAD_DETAILS_QUERY_KEY, id],
    queryFn: () => leadsApi.getById(id!),
    enabled: Boolean(id),
    retry: false,
    staleTime: 0,
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

export function useSendQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: import('../types/lead').SendQuotePayload }) =>
      leadsApi.sendQuote(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
    },
  });
}


