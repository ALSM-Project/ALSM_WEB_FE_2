import { apiClient } from '@/services/api/apiClient';

export interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  items: UserNotification[];
  unreadCount: number;
}

export const notificationsApi = {
  list: () => apiClient.get<NotificationsResponse>('/notifications'),
  markRead: (id: string) => apiClient.patch<{ id: string; isRead: boolean }>(`/notifications/${encodeURIComponent(id)}/read`),
  markAllRead: () => apiClient.patch<{ updatedCount: number }>('/notifications/read-all'),
};
