import { apiClient } from '@/services/api/apiClient';
import type {
  ConversionQualityReviewRecord,
  ConversionQualityReviewResponse,
  SubmitQualityReviewPayload,
} from '../types/quality-review';

export class AdminQualityReviewService {
  getQualityReview(
    projectId: string,
    conversionJobId: string,
    organizationId?: string,
  ): Promise<ConversionQualityReviewResponse> {
    return apiClient.get<ConversionQualityReviewResponse>(
      `/projects/${projectId}/conversions/${conversionJobId}/quality-review`,
      organizationId ? { headers: { 'x-organization-id': organizationId } } : undefined,
    );
  }

  submitQualityReview(
    projectId: string,
    conversionJobId: string,
    payload: SubmitQualityReviewPayload,
    organizationId?: string,
  ): Promise<ConversionQualityReviewRecord> {
    return apiClient.patch<ConversionQualityReviewRecord>(
      `/projects/${projectId}/conversions/${conversionJobId}/quality-review`,
      payload,
      organizationId ? { headers: { 'x-organization-id': organizationId } } : undefined,
    );
  }
}

export const adminQualityReviewService = new AdminQualityReviewService();
