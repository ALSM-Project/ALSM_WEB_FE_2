import { apiClient } from '@/services/api/apiClient';
import { BackendNavItem } from '../../navigation/api/navigation.api';

export interface CreateMenuItemInput {
  key: string;
  application: 'WEB_1' | 'WEB_2' | 'WEB_3';
  label: string;
  type: 'GROUP' | 'PAGE' | 'EXTERNAL';
  icon?: string;
  route?: string | null;
  parentId?: string | null;
  order?: number;
  visibility?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  permissions?: string[];
}

export interface UpdateMenuItemInput {
  key?: string;
  label?: string;
  type?: 'GROUP' | 'PAGE' | 'EXTERNAL';
  icon?: string;
  route?: string | null;
  parentId?: string | null;
  order?: number;
  visibility?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  permissions?: string[];
}

export const menuItemsApi = {
  getAdminMenuTree: async (application: string = 'WEB_2'): Promise<BackendNavItem[]> => {
    return apiClient.get<BackendNavItem[]>(`/menu-items?application=${application}`);
  },
  createMenuItem: async (data: CreateMenuItemInput): Promise<BackendNavItem> => {
    return apiClient.post<BackendNavItem>('/menu-items', data);
  },
  updateMenuItem: async (id: string, data: UpdateMenuItemInput): Promise<BackendNavItem> => {
    return apiClient.patch<BackendNavItem>(`/menu-items/${id}`, data);
  },
  deleteMenuItem: async (id: string): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(`/menu-items/${id}`);
  },
  reorderMenuItems: async (items: Array<{ id: string; order: number }>): Promise<void> => {
    return apiClient.post('/menu-items/reorder', { items });
  },
  moveMenuItem: async (
    id: string,
    parentId: string | null,
    targetOrder?: number,
    targetId?: string,
    placement?: 'before' | 'after' | 'inside',
  ): Promise<BackendNavItem> => {
    return apiClient.post<BackendNavItem>(`/menu-items/${id}/move`, { parentId, targetOrder, targetId, placement });
  },
};
