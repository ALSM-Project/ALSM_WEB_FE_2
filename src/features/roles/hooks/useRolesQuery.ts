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

const STANDARD_FINANCE_PERMISSIONS: PermissionDto[] = [
  {
    key: 'bank_accounts.view',
    label: 'View Bank Accounts',
    group: 'Finance',
    description: 'View company receiving bank accounts',
  },
  {
    key: 'bank_accounts.create',
    label: 'Create Bank Account',
    group: 'Finance',
    description: 'Add new company receiving bank account',
  },
  {
    key: 'bank_accounts.update',
    label: 'Update Bank Account',
    group: 'Finance',
    description: 'Edit company receiving bank account details',
  },
  {
    key: 'bank_accounts.set_default',
    label: 'Set Default Bank Account',
    group: 'Finance',
    description: 'Set receiving bank account as currency default',
  },
  {
    key: 'bank_accounts.deactivate',
    label: 'Deactivate Bank Account',
    group: 'Finance',
    description: 'Deactivate company receiving bank account',
  },
  {
    key: 'bank_accounts.reveal_sensitive_data',
    label: 'Reveal Full Bank Account Number',
    group: 'Finance',
    description: 'Reveal unmasked company bank account number with audit logging',
  },
];

export const usePermissionsQuery = () => {
  return useQuery<PermissionDto[]>({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: async () => {
      let data: PermissionDto[] = [];
      try {
        data = await rbacApi.getPermissions();
      } catch (err) {
        console.warn('Failed to fetch permissions catalog:', err);
      }
      const existingKeys = new Set(data.map((p) => p.key));
      const missing = STANDARD_FINANCE_PERMISSIONS.filter((p) => !existingKeys.has(p.key));
      return [...data, ...missing];
    },
  });
};

export const useRolePermissionsQuery = (roleId: string | null) => {
  return useQuery<string[]>({
    queryKey: ['roles', roleId, 'permissions'],
    queryFn: async () => {
      const serverPerms = await rbacApi.getRolePermissions(roleId!);
      // Ensure ADMIN / SYSTEM_ADMIN roles default to having bank_accounts permissions enabled
      if (roleId === 'ADMIN' || roleId === 'SYSTEM_ADMIN') {
        const bankKeys = STANDARD_FINANCE_PERMISSIONS.map((p) => p.key);
        const combined = new Set([...serverPerms, ...bankKeys]);
        return Array.from(combined);
      }
      return serverPerms;
    },
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
