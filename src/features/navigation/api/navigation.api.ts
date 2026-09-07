import { apiClient } from '@/services/api/apiClient';

export interface BackendNavItem {
  id: string;
  key: string;
  application: string;
  label: string;
  type: string;
  icon: string;
  route: string | null;
  parentId: string | null;
  order: number;
  visibility: boolean;
  status: string;
  requiredPermissions: string[];
  children?: BackendNavItem[];
}

export const navigationApi = {
  getNavigation: async (application: string = 'WEB_2'): Promise<BackendNavItem[]> => {
    return apiClient.get<BackendNavItem[]>(`/navigation?application=${application}`);
  },
};
