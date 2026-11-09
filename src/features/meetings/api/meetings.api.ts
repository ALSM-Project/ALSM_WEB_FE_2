import { apiClient } from '@/services/api/apiClient';
import type {
  CreateMeetingRequest,
  ListMeetingsResponse,
  Meeting,
  MeetingStatus,
  UpdateMeetingRequest,
} from '../types/meeting';

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

  getById: (id: string): Promise<Meeting> =>
    apiClient.get<Meeting>(`/meetings/${encodeURIComponent(id)}`),

  update: (id: string, dto: UpdateMeetingRequest): Promise<Meeting> =>
    apiClient.patch<Meeting>(`/meetings/${encodeURIComponent(id)}`, dto),

  updateStatus: (id: string, status: MeetingStatus): Promise<Meeting> =>
    apiClient.patch<Meeting>(`/meetings/${encodeURIComponent(id)}/status`, { status }),

  delete: (id: string): Promise<{ success: boolean; message: string }> =>
    apiClient.delete<{ success: boolean; message: string }>(`/meetings/${encodeURIComponent(id)}`),
};
