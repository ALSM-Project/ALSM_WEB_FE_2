export enum ConversionQualityReviewStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  NEEDS_REWORK = 'NEEDS_REWORK',
  FLAGGED = 'FLAGGED',
}

export type HumanQualityReviewTargetStatus =
  | ConversionQualityReviewStatus.ACCEPTED
  | ConversionQualityReviewStatus.NEEDS_REWORK
  | ConversionQualityReviewStatus.FLAGGED;

export interface ConversionQualityReviewRecord {
  id?: string;
  organizationId: string;
  projectId: string;
  conversionJobId: string;
  screenId?: string;
  status: ConversionQualityReviewStatus;
  reviewNote?: string;
  qualityScore?: number;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConversionQualityReviewResponse {
  review: ConversionQualityReviewRecord;
  fileSummary: {
    fileCount: number;
    totalLines: number;
    toolVersion?: string;
  };
}

export interface SubmitQualityReviewPayload {
  status: HumanQualityReviewTargetStatus;
  reviewNote?: string;
  qualityScore?: number;
}
