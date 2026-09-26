export const ConversionQualityReviewStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  NEEDS_REWORK: 'NEEDS_REWORK',
  FLAGGED: 'FLAGGED',
} as const;

export type ConversionQualityReviewStatus =
  (typeof ConversionQualityReviewStatus)[keyof typeof ConversionQualityReviewStatus];

export type HumanQualityReviewTargetStatus =
  | typeof ConversionQualityReviewStatus.ACCEPTED
  | typeof ConversionQualityReviewStatus.NEEDS_REWORK
  | typeof ConversionQualityReviewStatus.FLAGGED;

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
