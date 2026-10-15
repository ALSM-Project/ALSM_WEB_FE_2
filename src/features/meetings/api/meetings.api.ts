import { apiClient } from '@/services/api/apiClient';
import type { CreateMeetingRequest, ListMeetingsResponse, Meeting } from '../types/meeting';

export const meetingsApi = {
  create: (dto: CreateMeetingRequest): Promise<Meeting> =>
    apiClient.post<Meeting>('/meetings', dto),

  list: (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ListMeetingsResponse> => {
    const qs = new URLSearchParams();
    if (params?.status) qs.append('status', params.status);
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));
    const query = qs.toString();
    return apiClient.get<ListMeetingsResponse>(`/meetings${query ? `?${query}` : ''}`);
  },
};
