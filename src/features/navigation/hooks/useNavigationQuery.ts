import { useQuery } from '@tanstack/react-query';
import { navigationApi, BackendNavItem } from '../api/navigation.api';
import { tokenStore } from '@/services/api/tokenStore';

export const useNavigationQuery = (application: string = 'WEB_2') => {
  return useQuery<BackendNavItem[]>({
    queryKey: ['navigation', application],
    queryFn: () => navigationApi.getNavigation(application),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: Boolean(tokenStore.getAccessToken()),
  });
};
