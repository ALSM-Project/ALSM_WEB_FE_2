import { tokenStore } from '@/services/api/tokenStore';
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
    if (tokenStore.requiresPasswordChange()) {
      apiClient.routePasswordChange();
      return new Promise(() => {}); // Navigation completes the remediation handoff.
    }
    return apiClient.get<UserProfile>('/auth/me');
  },
  logout: async (): Promise<void> => {
    return apiClient.logout();
  },
};
