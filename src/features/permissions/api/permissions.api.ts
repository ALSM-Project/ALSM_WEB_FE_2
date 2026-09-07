import { apiClient } from '@/services/api/apiClient';

export interface PermissionDto {
  key: string;
  label: string;
  group: string;
  description: string;
}

export const permissionsApi = {
  getPermissions: async (): Promise<PermissionDto[]> => {
    return apiClient.get<PermissionDto[]>('/permissions');
  },
  getRolePermissions: async (roleId: string): Promise<string[]> => {
    return apiClient.get<string[]>(`/roles/${roleId}/permissions`);
  },
  updateRolePermissions: async (roleId: string, permissions: string[]): Promise<string[]> => {
    return apiClient.put<string[]>(`/roles/${roleId}/permissions`, { permissions });
  },
};
