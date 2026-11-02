import { apiClient } from '@/services/api/apiClient';

export type OffboardingRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ProjectTransferItemDto {
  projectId: string;
  projectName?: string;
  targetStaffId: string;
  targetStaffName?: string;
  reason?: string;
}

export interface OffboardingRequestDto {
  id: string;
  organizationId: string;
  teamId?: string;
  teamName?: string;
  targetUserId: string;
  targetUserName: string;
  targetUserEmail: string;
  targetUserRoles?: string[];
  requestedById: string;
  requestedByName: string;
  requestedByEmail?: string;
  transferToUserId?: string;
  transferToUserName?: string;
  projectTransfers?: ProjectTransferItemDto[];
  reason: string;
  note?: string;
  status: OffboardingRequestStatus;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  rejectionReason?: string;
  executionResult?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OffboardingEligibleCandidate {
  id: string;
  fullName: string;
  email: string;
  roles?: string[];
  activeWorkload?: number;
  activeProjectCount?: number;
}

export interface OffboardingLiveSummary {
  activeSessionsCount?: number;
  activeSessions?: Array<{
    id: string;
    deviceType?: string;
    browser?: string;
    ipAddress?: string;
    lastActiveAt?: string | Date;
  }>;
  apiCredentialsCount?: number;
  apiKeysCount?: number;
  assignedProjects?: Array<{
    id: string;
    name: string;
    status: string;
    assignedStaffId?: string;
    assignedStaffName?: string;
    conversionType?: string;
  }>;
  pendingJobsCount?: number;
  eligibleStaff?: OffboardingEligibleCandidate[];
  eligibleSuccessors?: OffboardingEligibleCandidate[];
  error?: string;
}

export interface OffboardingRequestDetailResponse {
  request: OffboardingRequestDto;
  liveSummary: OffboardingLiveSummary;
  isAuthorizedToReview: boolean;
}

export interface CreateOffboardingRequestPayload {
  targetUserId: string;
  reason: string;
  note?: string;
  transferToUserId?: string;
  projectTransfers?: ProjectTransferItemDto[];
}

export interface ApproveOffboardingRequestPayload {
  transferToUserId?: string;
  projectTransfers?: ProjectTransferItemDto[];
  note?: string;
}

export interface RejectOffboardingRequestPayload {
  rejectionReason: string;
  note?: string;
}

export const offboardingApprovalApi = {
  listRequests: async (params?: {
    status?: OffboardingRequestStatus;
    teamId?: string;
    targetUserId?: string;
  }): Promise<OffboardingRequestDto[]> => {
    return apiClient.get<OffboardingRequestDto[]>('/offboarding-requests', {
      params,
    });
  },

  getRequestDetails: async (id: string): Promise<OffboardingRequestDetailResponse> => {
    return apiClient.get<OffboardingRequestDetailResponse>(`/offboarding-requests/${id}`);
  },

  createRequest: async (
    data: CreateOffboardingRequestPayload,
  ): Promise<OffboardingRequestDto> => {
    return apiClient.post<OffboardingRequestDto>('/offboarding-requests', data);
  },

  approveRequest: async (
    id: string,
    data?: ApproveOffboardingRequestPayload,
  ): Promise<{ request: OffboardingRequestDto; executionResult: Record<string, unknown> }> => {
    return apiClient.post<{ request: OffboardingRequestDto; executionResult: Record<string, unknown> }>(
      `/offboarding-requests/${id}/approve`,
      data || {},
    );
  },

  rejectRequest: async (
    id: string,
    data: RejectOffboardingRequestPayload,
  ): Promise<OffboardingRequestDto> => {
    return apiClient.post<OffboardingRequestDto>(
      `/offboarding-requests/${id}/reject`,
      data,
    );
  },
};
