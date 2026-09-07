import { useQuery } from '@tanstack/react-query';
import { authApi, UserProfile } from '../api/auth.api';

export const useAuth = () => {
  const { data: user, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['currentUser'],
    queryFn: authApi.getMe,
    retry: false,
  });

  const hasPermission = (permissionKey: string): boolean => {
    if (!user) return false;
    if (user.isPlatformAdmin) return true;
    return user.effectivePermissions?.includes(permissionKey) ?? false;
  };

  return {
    user,
    isLoading,
    error,
    hasPermission,
  };
};
