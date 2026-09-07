import { apiClient } from '@/services/api/apiClient';

export interface RoleDto {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
}

export const rolesApi = {
  getRoles: async (): Promise<RoleDto[]> => {
    return apiClient.get<RoleDto[]>('/roles');
  },
  createRole: async (data: { id: string; name: string; description?: string }): Promise<RoleDto> => {
    return apiClient.post<RoleDto>('/roles', data);
  },
  updateRole: async (id: string, data: { name?: string; description?: string }): Promise<RoleDto> => {
    return apiClient.patch<RoleDto>(`/roles/${id}`, data);
  },
  deleteRole: async (id: string): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(`/roles/${id}`);
  },
};
