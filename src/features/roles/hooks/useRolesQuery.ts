import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacApi, RoleDto, RoleDetailDto, PermissionDto } from '@/features/rbac/api/rbac.api';

export const ROLES_QUERY_KEY = ['roles'];
export const PERMISSIONS_QUERY_KEY = ['permissions'];

export const useRolesQuery = () => {
  return useQuery<RoleDto[]>({
    queryKey: ROLES_QUERY_KEY,
    queryFn: rbacApi.getRoles,
  });
};

export const useRoleQuery = (roleId: string | null) => {
  return useQuery<RoleDetailDto>({
    queryKey: ['roles', roleId],
    queryFn: () => rbacApi.getRole(roleId!),
    enabled: Boolean(roleId),
  });
};

export const usePermissionsQuery = () => {
  return useQuery<PermissionDto[]>({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: rbacApi.getPermissions,
  });
};

export const useRolePermissionsQuery = (roleId: string | null) => {
  return useQuery<string[]>({
    queryKey: ['roles', roleId, 'permissions'],
    queryFn: () => rbacApi.getRolePermissions(roleId!),
    enabled: Boolean(roleId),
  });
};

export const useCreatePermissionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { key: string; label: string; group: string; description?: string }) =>
      rbacApi.createPermission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERMISSIONS_QUERY_KEY });
    },
  });
};

export const useUpdatePermissionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: { label?: string; group?: string; description?: string } }) =>
      rbacApi.updatePermission(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERMISSIONS_QUERY_KEY });
    },
  });
};

export const useDeletePermissionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => rbacApi.deletePermission(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERMISSIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
    },
  });
};


export const useCreateRoleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { key: string; name: string; description?: string }) => rbacApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
    },
  });
};

export const useUpdateRoleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
      rbacApi.updateRole(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['roles', variables.id] });
    },
  });
};

export const useDeleteRoleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rbacApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
    },
  });
};

export const useUpdateRolePermissionsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      rbacApi.updateRolePermissions(roleId, permissions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['roles', variables.roleId] });
      queryClient.invalidateQueries({ queryKey: ['roles', variables.roleId, 'permissions'] });
    },
  });
};
