import { apiClient } from '@/services/api/apiClient';

export type OffboardingRequestStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'HANDOVER_IN_PROGRESS'
  | 'HANDOVER_COMPLETED'
  | 'ACCESS_REVOCATION_PENDING'
  | 'COMPLETED'
  | 'CANCELLED';

export type OffboardingType =
  | 'Resignation'
  | 'Contract Expiration'
  | 'Termination'
  | 'Project Completion'
  | 'Other';

export type DocumentationStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Completed'
  | 'Not Required';

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
  offboardingType?: OffboardingType;
  effectiveDate?: string;
  handoverDeadline?: string;
  pendingTasks?: string;
  documentationStatus?: DocumentationStatus;
  department?: string;
  directManager?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffSearchResultDto {
  id: string;
  fullName: string;
  email: string;
  employeeId: string;
  department: string;
  teamName?: string;
  roles: string[];
  isActive: boolean;
  avatarUrl?: string;
  directManager?: string;
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
    code?: string;
    status: string;
    assignedStaffId?: string;
    assignedStaffName?: string;
    conversionType?: string;
    teamLead?: string;
    role?: string;
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
  offboardingType?: OffboardingType;
  effectiveDate?: string;
  handoverDeadline?: string;
  pendingTasks?: string;
  documentationStatus?: DocumentationStatus;
  department?: string;
  directManager?: string;
  isDraft?: boolean;
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

export interface CancelOffboardingRequestPayload {
  reason?: string;
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

  getUserOffboardingSummary: async (userId: string): Promise<OffboardingLiveSummary> => {
    return apiClient.get<OffboardingLiveSummary>(`/users/${userId}/offboarding-summary`);
  },

  searchStaff: async (query: string): Promise<StaffSearchResultDto[]> => {
    return apiClient.get<StaffSearchResultDto[]>('/offboarding-requests/search-staff', {
      params: { q: query },
    });
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

  cancelRequest: async (
    id: string,
    reason?: string,
  ): Promise<OffboardingRequestDto> => {
    return apiClient.post<OffboardingRequestDto>(
      `/offboarding-requests/${id}/cancel`,
      { reason },
    );
  },
};
