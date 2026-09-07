import { apiClient } from '@/services/api/apiClient';

export interface UserSummaryDto {
  id: string;
  email: string;
  fullName: string;
  isPlatformAdmin: boolean;
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
};
