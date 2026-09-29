import { apiClient } from '@/services/api/apiClient';
import type { ListQuoteRequestsResponse, QuoteRequest, QuoteStatus } from '../types/quote';

export const quoteApi = {
  listQuoteRequests: (params?: {
    status?: QuoteStatus | '';
    page?: number;
    limit?: number;
  }): Promise<ListQuoteRequestsResponse> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return apiClient.get<ListQuoteRequestsResponse>(
      `/billing/enterprise/quote-requests${qs ? `?${qs}` : ''}`
    );
  },

  updateQuoteStatus: (id: string, status: 'CONTACTED' | 'CLOSED'): Promise<QuoteRequest> => {
    return apiClient.patch<QuoteRequest>(
      `/billing/enterprise/quote-requests/${id}/status`,
      { status }
    );
  },
};
