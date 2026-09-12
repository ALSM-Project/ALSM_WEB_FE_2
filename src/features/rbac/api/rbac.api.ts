import { apiClient } from '@/services/api/apiClient';

export interface PermissionDto {
  key: string;
  label?: string;
  name?: string;
  group: string;
  description: string;
}

export interface RoleDto {
  id: string;
  key?: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissionCount?: number;
}

export interface RoleDetailDto extends RoleDto {
  permissions: string[];
}

export interface UserRbacDto {
  id: string;
  email: string;
  fullName: string;
  isPlatformAdmin: boolean;
  roles: string[];
}

export const rbacApi = {
  getRoles: async (): Promise<RoleDto[]> => {
    return apiClient.get<RoleDto[]>('/roles');
  },

  getRole: async (id: string): Promise<RoleDetailDto> => {
    return apiClient.get<RoleDetailDto>(`/roles/${id}`);
  },

  createRole: async (data: { key?: string; id?: string; name: string; description?: string }): Promise<RoleDto> => {
    return apiClient.post<RoleDto>('/roles', data);
  },

  updateRole: async (id: string, data: { name?: string; description?: string }): Promise<RoleDto> => {
    return apiClient.patch<RoleDto>(`/roles/${id}`, data);
  },

  deleteRole: async (id: string): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(`/roles/${id}`);
  },

  getPermissions: async (): Promise<PermissionDto[]> => {
    return apiClient.get<PermissionDto[]>('/permissions');
  },

  createPermission: async (data: { key: string; label: string; group: string; description?: string }): Promise<PermissionDto> => {
    return apiClient.post<PermissionDto>('/permissions', data);
  },

  updatePermission: async (
    key: string,
    data: { label?: string; group?: string; description?: string },
  ): Promise<PermissionDto> => {
    return apiClient.patch<PermissionDto>(`/permissions/${key}`, data);
  },

  deletePermission: async (key: string): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(`/permissions/${key}`);
  },


  getRolePermissions: async (roleId: string): Promise<string[]> => {
    return apiClient.get<string[]>(`/roles/${roleId}/permissions`);
  },

  updateRolePermissions: async (roleId: string, permissions: string[]): Promise<string[]> => {
    return apiClient.put<string[]>(`/roles/${roleId}/permissions`, { permissions });
  },

  getAllUsers: async (): Promise<UserRbacDto[]> => {
    return apiClient.get<UserRbacDto[]>('/users');
  },

  getUserRoles: async (userId: string): Promise<string[]> => {
    return apiClient.get<string[]>(`/users/${userId}/roles`);
  },

  updateUserRoles: async (userId: string, roles: string[]): Promise<string[]> => {
    return apiClient.put<string[]>(`/users/${userId}/roles`, { roles });
  },
};
