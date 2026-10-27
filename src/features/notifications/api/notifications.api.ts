import { apiClient } from '@/services/api/apiClient';

export interface NotificationItem {
  id: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'SECURITY' | string;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ListNotificationsResponse {
  items: NotificationItem[];
  unreadCount: number;
}

export const notificationsApi = {
  list: async (): Promise<ListNotificationsResponse> => {
    return apiClient.get<ListNotificationsResponse>('/notifications');
  },

  markRead: async (id: string): Promise<{ id: string; isRead: boolean }> => {
    return apiClient.patch<{ id: string; isRead: boolean }>(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<{ updatedCount: number }> => {
    return apiClient.patch<{ updatedCount: number }>('/notifications/read-all');
  },
};
