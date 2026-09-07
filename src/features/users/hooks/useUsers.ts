import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, UserSummaryDto } from '../api/users.api';

export const useUsers = () => {
  const queryClient = useQueryClient();

  const usersQuery = useQuery<UserSummaryDto[]>({
    queryKey: ['users'],
    queryFn: usersApi.getAllUsers,
  });

  const updateUserRolesMutation = useMutation({
    mutationFn: ({ userId, roles }: { userId: string; roles: string[] }) =>
      usersApi.updateUserRoles(userId, roles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['navigation'] });
    },
  });

  return {
    users: usersQuery.data || [],
    isLoading: usersQuery.isLoading,
    updateUserRoles: updateUserRolesMutation.mutateAsync,
  };
};
