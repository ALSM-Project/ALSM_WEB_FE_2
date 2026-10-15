import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { meetingsApi } from '../api/meetings.api';
import type { CreateMeetingRequest } from '../types/meeting';

export const MEETINGS_QUERY_KEY = ['meetings'] as const;

export function useMeetingsList(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...MEETINGS_QUERY_KEY, params],
    queryFn: () => meetingsApi.list(params),
    staleTime: 30_000,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateMeetingRequest) => meetingsApi.create(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEY });
    },
  });
}
