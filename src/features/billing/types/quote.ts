export type QuoteStatus = 'PENDING' | 'CONTACTED' | 'CLOSED';

export interface QuoteRequest {
  id: string;
  status: QuoteStatus;
  fullName: string;
  companyName: string;
  email: string;
  phone?: string;
  message?: string;
  currentPlanTier?: string;
  createdAt: string;
}

export interface ListQuoteRequestsResponse {
  items: QuoteRequest[];
  total: number;
}
