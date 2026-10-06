export type QuoteStatus = 'PENDING' | 'CONTACTED' | 'APPROVED' | 'SUSPENDED' | 'REJECTED' | 'CLOSED';

export interface QuoteRequest {
  id: string;
  status: QuoteStatus;
  statusReason?: string;
  appealMessage?: string;
  appealStatus?: 'PENDING' | 'APPROVED' | 'DECLINED';
  appealResponse?: string;
  appealedAt?: string;
  appealResolvedAt?: string;
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
