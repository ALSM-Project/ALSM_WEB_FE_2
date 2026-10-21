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
  offboardUser: async (
    userId: string,
    data: { transferToUserId: string; reason: string }
  ): Promise<{ ok: boolean; message: string }> => {
    return apiClient.post<{ ok: boolean; message: string }>(`/admin/users/${userId}/offboard`, data);
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
