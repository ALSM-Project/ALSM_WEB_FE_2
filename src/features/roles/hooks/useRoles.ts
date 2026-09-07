import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi, RoleDto } from '../api/roles.api';
import { permissionsApi, PermissionDto } from '../../permissions/api/permissions.api';

export const useRoles = () => {
  const queryClient = useQueryClient();

  const rolesQuery = useQuery<RoleDto[]>({
    queryKey: ['roles'],
    queryFn: rolesApi.getRoles,
  });

  const permissionsQuery = useQuery<PermissionDto[]>({
    queryKey: ['permissions'],
    queryFn: permissionsApi.getPermissions,
  });

  const createRoleMutation = useMutation({
    mutationFn: rolesApi.createRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
      rolesApi.updateRole(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: rolesApi.deleteRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  const updateRolePermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      permissionsApi.updateRolePermissions(roleId, permissions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rolePermissions', variables.roleId] });
      queryClient.invalidateQueries({ queryKey: ['navigation'] });
    },
  });

  return {
    roles: rolesQuery.data || [],
    permissions: permissionsQuery.data || [],
    isLoading: rolesQuery.isLoading || permissionsQuery.isLoading,
    createRole: createRoleMutation.mutateAsync,
    updateRole: updateRoleMutation.mutateAsync,
    deleteRole: deleteRoleMutation.mutateAsync,
    updateRolePermissions: updateRolePermissionsMutation.mutateAsync,
  };
};
