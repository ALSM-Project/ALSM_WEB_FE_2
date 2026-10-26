import { useQuery } from '@tanstack/react-query';
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
