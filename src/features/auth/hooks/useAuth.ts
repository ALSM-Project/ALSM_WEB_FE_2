import { useEffect } from 'react';
import { tokenStore } from '@/services/api/tokenStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, UserProfile } from '../api/auth.api';

export const useAuth = () => {
  const queryClient = useQueryClient();
  useEffect(() => tokenStore.subscribe(() => {
    if (!tokenStore.getRefreshToken() && !tokenStore.isLogoutPending()) queryClient.setQueryData(['currentUser'], null);
  }), [queryClient]);
  const { data: user, isLoading, error } = useQuery<UserProfile | null>({
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
