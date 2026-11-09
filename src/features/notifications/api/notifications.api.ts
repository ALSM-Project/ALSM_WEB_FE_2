import { apiClient } from '@/services/api/apiClient';

export interface UserNotification {
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

export type NotificationItem = UserNotification;

export interface NotificationsResponse {
  items: UserNotification[];
  unreadCount: number;
}

export type ListNotificationsResponse = NotificationsResponse;

export const notificationsApi = {
  list: async (): Promise<NotificationsResponse> => {
    return apiClient.get<NotificationsResponse>('/notifications');
  },

  markRead: async (id: string): Promise<{ id: string; isRead: boolean }> => {
    return apiClient.patch<{ id: string; isRead: boolean }>(
      `/notifications/${encodeURIComponent(id)}/read`,
    );
  },

  markAllRead: async (): Promise<{ updatedCount: number }> => {
    return apiClient.patch<{ updatedCount: number }>('/notifications/read-all');
  },
};
