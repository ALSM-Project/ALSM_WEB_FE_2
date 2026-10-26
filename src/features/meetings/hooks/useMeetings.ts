import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { meetingsApi } from '../api/meetings.api';
import type { CreateMeetingRequest, MeetingStatus, UpdateMeetingRequest } from '../types/meeting';

export const MEETINGS_QUERY_KEY = ['meetings'] as const;

export function useMeetingsList(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...MEETINGS_QUERY_KEY, params],
    queryFn: () => meetingsApi.list(params),
    staleTime: 30_000,
  });
}

export function useMeeting(id?: string) {
  return useQuery({
    queryKey: [...MEETINGS_QUERY_KEY, id],
    queryFn: () => (id ? meetingsApi.getById(id) : Promise.reject('No ID')),
    enabled: Boolean(id),
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

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateMeetingRequest }) =>
      meetingsApi.update(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEY });
    },
  });
}

export function useUpdateMeetingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MeetingStatus }) =>
      meetingsApi.updateStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEY });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => meetingsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEY });
    },
  });
}
