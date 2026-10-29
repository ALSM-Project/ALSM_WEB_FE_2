import { apiClient } from '@/services/api/apiClient';
import type { CreateLeadPayload, CreateLeadResponse, Lead, ListLeadsParams, ListLeadsResponse } from '../types/lead';

export interface UpdateLeadStatusPayload {
  status: string;
  notes?: string;
}

export interface UpdateLeadStatusResponse {
  lead: Lead;
  updated: boolean;
  message: string;
}

export const leadsApi = {
  create: (payload: CreateLeadPayload, requestId: string): Promise<CreateLeadResponse> =>
    apiClient.post<CreateLeadResponse>('/leads', payload, {
      headers: { 'Idempotency-Key': requestId },
    }),

  notifyContact: (id: string, requestId: string): Promise<CreateLeadResponse> =>
    apiClient.post<CreateLeadResponse>(`/leads/${encodeURIComponent(id)}/notification`, undefined, {
      headers: { 'Idempotency-Key': requestId },
    }),

  list: (params?: ListLeadsParams): Promise<ListLeadsResponse> => {
    const qs = new URLSearchParams();
    if (params?.status) qs.append('status', params.status);
    if (params?.source) qs.append('source', params.source);
    if (params?.priority) qs.append('priority', params.priority);
    if (params?.assignedToUserId) qs.append('assignedToUserId', params.assignedToUserId);
    if (params?.search) qs.append('search', params.search);
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));
    if (params?.sortBy) qs.append('sortBy', params.sortBy);
    if (params?.sortOrder) qs.append('sortOrder', params.sortOrder);
    const query = qs.toString();
    return apiClient.get<ListLeadsResponse>(`/leads${query ? `?${query}` : ''}`);
  },

  updateStatus: (
    id: string,
    payload: UpdateLeadStatusPayload,
  ): Promise<UpdateLeadStatusResponse> => {
    return apiClient.patch<UpdateLeadStatusResponse>(`/leads/${id}/status`, payload);
  },

  sendQuote: (
    id: string,
    payload: import('../types/lead').SendQuotePayload,
  ): Promise<import('../types/lead').SendQuoteResponse> => {
    return apiClient.post<import('../types/lead').SendQuoteResponse>(`/leads/${id}/quotes`, payload);
  },
};

