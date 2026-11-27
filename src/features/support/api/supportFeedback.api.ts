import { apiClient } from '@/services/api/apiClient';

export type FeedbackStatus = 'SUBMITTED' | 'IN_REVIEW' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface SupportFeedbackAttachment {
  fileId?: string;
  name: string;
  url?: string;
  size?: number;
  mimeType?: string;
}

export interface SupportFeedbackItem {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  organizationId?: string;
  rating: number;
  category: string;
  description: string;
  attachments: SupportFeedbackAttachment[];
  status: FeedbackStatus;
  staffNotes?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackSummaryResult {
  totalCount: number;
  averageRating: number;
  ratingDistribution: Array<{ rating: number; count: number }>;
  categoryBreakdown: Array<{ category: string; count: number; averageRating: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
}

export const supportFeedbackApi = {
  listAll: (params?: {
    category?: string;
    status?: string;
    rating?: string;
    search?: string;
  }): Promise<SupportFeedbackItem[]> =>
    apiClient.get<SupportFeedbackItem[]>('/support/feedback', { params }),

  getSummary: (): Promise<FeedbackSummaryResult> =>
    apiClient.get<FeedbackSummaryResult>('/support/feedback/summary'),

  updateStatus: (
    id: string,
    payload: { status: FeedbackStatus; staffNotes?: string },
  ): Promise<SupportFeedbackItem> =>
    apiClient.patch<SupportFeedbackItem>(`/support/feedback/${encodeURIComponent(id)}/status`, payload),
};
