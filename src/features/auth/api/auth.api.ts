import { apiClient } from '@/services/api/apiClient';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  isPlatformAdmin: boolean;
  roles: string[];
  effectivePermissions: string[];
  isActive: boolean;
}

export const authApi = {
  getMe: async (): Promise<UserProfile> => {
    return apiClient.get<UserProfile>('/auth/me');
  },
  logout: async (refreshToken: string): Promise<void> => {
    return apiClient.post('/auth/logout', { refreshToken });
  },
};
