import { apiClient } from '@/services/api/apiClient';
import type {
  ConsultationTypeConfig,
  CreateMeetingRequestPayload,
  ListMeetingRequestsResponse,
  MeetingFormat,
  MeetingPriority,
  MeetingRequest,
  MeetingRequestStatus,
} from '../types/meeting-request';

export const meetingRequestsApi = {
  listMeetingRequests: (params?: {
    search?: string;
    status?: MeetingRequestStatus | '';
    consultationType?: string;
    priority?: MeetingPriority | '';
    assignedSalesId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListMeetingRequestsResponse> => {
    const qs = new URLSearchParams();
    if (params?.search) qs.append('search', params.search);
    if (params?.status) qs.append('status', params.status);
    if (params?.consultationType) qs.append('consultationType', params.consultationType);
    if (params?.priority) qs.append('priority', params.priority);
    if (params?.assignedSalesId) qs.append('assignedSalesId', params.assignedSalesId);
    if (params?.startDate) qs.append('startDate', params.startDate);
    if (params?.endDate) qs.append('endDate', params.endDate);
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));
    if (params?.sortBy) qs.append('sortBy', params.sortBy);
    if (params?.sortOrder) qs.append('sortOrder', params.sortOrder);
    const query = qs.toString();
    return apiClient.get<ListMeetingRequestsResponse>(`/meeting-requests${query ? `?${query}` : ''}`);
  },

  getMeetingRequest: (id: string): Promise<MeetingRequest> =>
    apiClient.get<MeetingRequest>(`/meeting-requests/${id}`),

  createMeetingRequest: (payload: CreateMeetingRequestPayload): Promise<MeetingRequest> =>
    apiClient.post<MeetingRequest>('/meeting-requests', payload),

  getConsultationTypes: (): Promise<ConsultationTypeConfig[]> =>
    apiClient.get<ConsultationTypeConfig[]>('/meeting-requests/consultation-types'),

  getCalendarStatus: (): Promise<{ isEnabled: boolean; calendarUserEmail?: string }> =>
    apiClient.get<{ isEnabled: boolean; calendarUserEmail?: string }>('/meeting-requests/calendar-status'),

  assignSales: (
    id: string,
    payload: { salesUserId: string; salesName?: string; salesEmail?: string; note?: string }
  ): Promise<MeetingRequest> =>
    apiClient.patch<MeetingRequest>(`/meeting-requests/${id}/assign`, payload),

  proposeMeetingSlots: (
    id: string,
    payload: { slots: Array<{ startTime: string; endTime: string }>; message?: string }
  ): Promise<MeetingRequest> =>
    apiClient.post<MeetingRequest>(`/meeting-requests/${id}/propose-slots`, payload),

  confirmMeeting: (
    id: string,
    payload: {
      scheduledStartTime: string;
      scheduledEndTime: string;
      format?: MeetingFormat;
      customMeetingUrl?: string;
      createGoogleMeet?: boolean;
    }
  ): Promise<MeetingRequest> =>
    apiClient.post<MeetingRequest>(`/meeting-requests/${id}/confirm`, payload),

  rescheduleMeeting: (
    id: string,
    payload: { scheduledStartTime: string; scheduledEndTime: string; reason: string }
  ): Promise<MeetingRequest> =>
    apiClient.post<MeetingRequest>(`/meeting-requests/${id}/reschedule`, payload),

  cancelMeeting: (id: string, reason: string): Promise<MeetingRequest> =>
    apiClient.post<MeetingRequest>(`/meeting-requests/${id}/cancel`, { reason }),

  addInternalNote: (id: string, content: string): Promise<MeetingRequest> =>
    apiClient.post<MeetingRequest>(`/meeting-requests/${id}/notes`, { content }),

  recordOutcome: (
    id: string,
    payload: { summary: string; qualificationScore?: number; nextSteps?: string }
  ): Promise<MeetingRequest> =>
    apiClient.post<MeetingRequest>(`/meeting-requests/${id}/record-outcome`, payload),

  convertToOpportunity: (
    id: string,
    payload: { title?: string; estimatedValue?: number; notes?: string }
  ): Promise<{ meeting: MeetingRequest; leadId: string }> =>
    apiClient.post<{ meeting: MeetingRequest; leadId: string }>(
      `/meeting-requests/${id}/convert-to-opportunity`,
      payload
    ),

  createEnterpriseQuote: (
    id: string,
    payload: {
      planName: string;
      amount: number;
      discountPercent?: number;
      discountReason?: string;
      projectScope?: string;
    }
  ): Promise<{ meeting: MeetingRequest; quoteId: string; quoteNumber: string }> =>
    apiClient.post<{ meeting: MeetingRequest; quoteId: string; quoteNumber: string }>(
      `/meeting-requests/${id}/create-quote`,
      payload
    ),
};
