import { apiClient } from '@/services/api/apiClient';

export interface UserSummaryDto {
  id: string;
  email: string;
  fullName: string;
  isPlatformAdmin: boolean;
  isActive: boolean;
  isLocked?: boolean;
  lockReason?: string;
  lockedAt?: string;
  lockedBy?: string;
  roles: string[];
}

export interface OffboardingAssignedProjectDto {
  id: string;
  name: string;
  status: string;
  organizationId: string;
  assignedRole: 'CONVERSION_STAFF' | 'TEAM_LEAD' | 'OWNER';
  isTransferable: boolean;
}

export interface OffboardingActiveSessionDto {
  id: string;
  deviceType?: string;
  browser?: string;
  ipAddress?: string;
  lastActiveAt?: string;
  createdAt?: string;
}

export interface OffboardingPendingJobDto {
  id: string;
  projectId: string;
  status: string;
  priority: string;
  conversionType: string;
}

export interface OffboardingEligibleSuccessorDto {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
  activeWorkload: number;
}

export interface UserOffboardingSummaryDto {
  user: {
    id: string;
    fullName: string;
    email: string;
    isActive: boolean;
    isLocked: boolean;
    roles: string[];
  };
  activeSessionsCount: number;
  activeSessions: OffboardingActiveSessionDto[];
  apiCredentialsCount: number;
  assignedProjects: OffboardingAssignedProjectDto[];
  pendingJobsCount: number;
  pendingJobs: OffboardingPendingJobDto[];
  eligibleStaff: OffboardingEligibleSuccessorDto[];
}

export interface UserOffboardingResultDto {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    isActive: boolean;
    isLocked: boolean;
  };
  operations: {
    projectsTransferred: number;
    sessionsRevoked: number;
    apiCredentialsRevoked: number;
    rolesRemoved: number;
    accountDeactivated: boolean;
  };
  transferredProjects: Array<{
    projectId: string;
    projectName: string;
    previousOwnerId?: string;
    newOwnerId: string;
    newOwnerName: string;
  }>;
}

export const usersApi = {
  getAllUsers: async (): Promise<UserSummaryDto[]> => {
    return apiClient.get<UserSummaryDto[]>('/users');
  },
  getUserRoles: async (userId: string): Promise<string[]> => {
    return apiClient.get<string[]>(`/users/${userId}/roles`);
  },
  updateUserRoles: async (userId: string, roles: string[]): Promise<string[]> => {
    return apiClient.put<string[]>(`/users/${userId}/roles`, { roles });
  },
  onboardUser: async (data: {
    email: string;
    fullName: string;
    role: string;
    organizationId?: string;
  }): Promise<UserSummaryDto> => {
    return apiClient.post<UserSummaryDto>('/users', data);
  },
  updateUserStatus: async (userId: string, isActive: boolean): Promise<{ ok: true }> => {
    return apiClient.patch<{ ok: true }>(`/users/${userId}/status`, { isActive });
  },
  lockUser: async (userId: string, reason: string): Promise<{ ok: boolean; message: string }> => {
    return apiClient.post<{ ok: boolean; message: string }>(`/admin/users/${userId}/lock`, { reason });
  },
  unlockUser: async (userId: string): Promise<{ ok: boolean; message: string }> => {
    return apiClient.post<{ ok: boolean; message: string }>(`/admin/users/${userId}/unlock`, {});
  },
  getOffboardingSummary: async (userId: string): Promise<UserOffboardingSummaryDto> => {
    try {
      return await apiClient.get<UserOffboardingSummaryDto>(`/users/${userId}/offboarding-summary`);
    } catch {
      // Fallback for admin-only route if needed
      return await apiClient.get<UserOffboardingSummaryDto>(`/admin/users/${userId}/offboarding-summary`);
    }
  },
  offboardUser: async (
    userId: string,
    data: { transferToUserId?: string; reason?: string; confirmDeactivation?: boolean }
  ): Promise<UserOffboardingResultDto> => {
    try {
      return await apiClient.post<UserOffboardingResultDto>(`/users/${userId}/offboard`, data);
    } catch {
      // Fallback for admin-only route if needed
      return await apiClient.post<UserOffboardingResultDto>(`/admin/users/${userId}/offboard`, data);
    }
  },
  transferResource: async (data: {
    fromUserId: string;
    toUserId: string;
    resourceType: 'PROJECT' | 'JOB';
    resourceId: string;
  }): Promise<{ ok: boolean; message: string }> => {
    return apiClient.post<{ ok: boolean; message: string }>('/admin/resources/transfer', data);
  },
};
