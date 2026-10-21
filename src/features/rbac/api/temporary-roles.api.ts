import { apiClient } from '@/services/api/apiClient';

export interface TemporaryRoleDto {
  id: string;
  userId: string;
  userEmail: string;
  userFullName?: string;
  role: string;
  durationHours: number;
  reason: string;
  grantedBy: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING' | 'REJECTED';
  expiresAt: string;
  createdAt: string;
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
  targetProject?: string;
}

export const temporaryRolesApi = {
  getActiveRoles: async (): Promise<TemporaryRoleDto[]> => {
    return apiClient.get<TemporaryRoleDto[]>('/rbac/temporary-roles/active');
  },

  getHistory: async (params?: { userId?: string; status?: string }): Promise<TemporaryRoleDto[]> => {
    return apiClient.get<TemporaryRoleDto[]>('/rbac/temporary-roles/history', { params });
  },

  exportHistoryCsv: async (): Promise<string> => {
    return apiClient.get<string>('/rbac/temporary-roles/history/export');
  },

  grantRole: async (data: {
    targetUserId: string;
    role: string;
    durationHours: number;
    reason: string;
  }): Promise<TemporaryRoleDto> => {
    return apiClient.post<TemporaryRoleDto>('/rbac/temporary-roles/grant', data);
  },

  requestRole: async (data: {
    role: string;
    durationHours: number;
    reason: string;
    targetProject?: string;
  }): Promise<TemporaryRoleDto> => {
    return apiClient.post<TemporaryRoleDto>('/rbac/temporary-roles/request', data);
  },

  approveRequest: async (data: {
    requestId: string;
    approved: boolean;
    rejectionReason?: string;
  }): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>('/rbac/temporary-roles/approve', data);
  },

  revokeRole: async (data: {
    assignmentId: string;
    reason: string;
  }): Promise<{ ok: boolean; message: string }> => {
    return apiClient.post<{ ok: boolean; message: string }>('/rbac/temporary-roles/revoke', data);
  },
};
