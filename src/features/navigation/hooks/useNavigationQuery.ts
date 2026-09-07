import { useQuery } from '@tanstack/react-query';
import { navigationApi, BackendNavItem } from '../api/navigation.api';

export const useNavigationQuery = (application: string = 'WEB_2') => {
  return useQuery<BackendNavItem[]>({
    queryKey: ['navigation', application],
    queryFn: () => navigationApi.getNavigation(application),
    staleTime: 1000 * 60 * 5, // 5 mins cache
  });
};
