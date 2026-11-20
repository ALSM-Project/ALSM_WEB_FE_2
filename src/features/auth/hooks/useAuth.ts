import { useEffect } from 'react';
import { tokenStore } from '@/services/api/tokenStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, UserProfile } from '../api/auth.api';

export const useAuth = () => {
  const queryClient = useQueryClient();
  useEffect(() => tokenStore.subscribe(() => {
    if (!tokenStore.getRefreshToken() && !tokenStore.isLogoutPending()) {
      queryClient.setQueryData(['currentUser'], null);
    } else if (tokenStore.getRefreshToken() || tokenStore.getAccessToken()) {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  }), [queryClient]);

  const hasToken = Boolean(tokenStore.getRefreshToken() || tokenStore.getAccessToken());

  const { data: user, isLoading, error } = useQuery<UserProfile | null>({
    queryKey: ['currentUser'],
    queryFn: authApi.getMe,
    enabled: hasToken,
    retry: false,
  });

  const hasPermission = (permissionKey: string): boolean => {
    if (!user) return false;
    if (user.isPlatformAdmin) return true;
    return user.effectivePermissions?.includes(permissionKey) ?? false;
  };

  return {
    user: hasToken ? user : null,
    isLoading: hasToken ? isLoading : false,
    error,
    hasPermission,
  };
};
