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
  openInNewTab?: boolean;
  hideParentLabel?: boolean;
  children?: BackendNavItem[];
}

export const navigationApi = {
  getNavigation: async (
    application: string = 'WEB_2',
    contractType?: string,
    role?: string,
  ): Promise<BackendNavItem[]> => {
    let url = `/navigation?application=${application}`;
    if (contractType && contractType !== 'ALL') url += `&contractType=${contractType}`;
    if (role && role !== 'ALL') url += `&role=${role}`;
    return apiClient.get<BackendNavItem[]>(url);
  },
};
