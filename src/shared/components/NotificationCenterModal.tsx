import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
  Trash2,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi, NotificationItem } from '@/features/notifications/api/notifications.api';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'SECURITY';
  actionRoute?: string;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return dateStr;
  }
}

function mapBackendType(typeStr?: string): SystemNotification['type'] {
  const upper = (typeStr || '').toUpperCase();
  if (upper.includes('SUCCESS') || upper.includes('COMPLETE')) return 'SUCCESS';
  if (upper.includes('WARN') || upper.includes('DISCOUNT') || upper.includes('PENDING')) return 'WARNING';
  if (upper.includes('SEC') || upper.includes('LOCK') || upper.includes('AUTH') || upper.includes('ERROR')) return 'SECURITY';
  return 'INFO';
}

export const NotificationCenterModal: React.FC = () => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.list();
      if (res && Array.isArray(res.items) && res.items.length > 0) {
        setNotifications(
          res.items.map((item: NotificationItem) => ({
            id: item.id,
            title: item.title,
            message: item.message,
            timestamp: formatRelativeTime(item.createdAt),
            read: item.isRead,
            type: mapBackendType(item.type),
            actionRoute: item.link || undefined,
          }))
        );
      } else {
        setNotifications([]);
      }
    } catch {
      // Keep empty array on network failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllRead();
    } catch {
      // Ignore network error and update local UI
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const handleNotificationClick = async (item: SystemNotification) => {
    try {
      await notificationsApi.markRead(item.id);
    } catch {
      // Ignore network error
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    setIsOpen(false);
    if (item.actionRoute) {
      navigate(item.actionRoute);
    }
  };

  const filtered = filter === 'UNREAD' ? notifications.filter((n) => !n.read) : notifications;

  const renderIcon = (type: SystemNotification['type']) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-700" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-800" />;
      case 'SECURITY':
        return <ShieldAlert className="w-4 h-4 text-rose-700" />;
      default:
        return <FileCheck className="w-4 h-4 text-[#244A70]" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded-md text-[#8491A3] hover:text-[#17263A] hover:bg-[#EEF1F6] transition-colors cursor-pointer"
        aria-label="System Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#244A70] ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#DCE3EC] rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#DCE3EC] flex items-center justify-between bg-[#F8FAFC]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-[#17263A]">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EEF1F6] text-[#244A70] border border-[#DCE3EC]">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[#244A70] hover:underline cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 text-[#8491A3] hover:text-rose-600 cursor-pointer"
                  title="Clear all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Filter pills */}
          <div className="px-4 py-2 border-b border-[#DCE3EC] flex gap-2 text-[11px]">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-[#17263A] text-white'
                  : 'text-[#8491A3] hover:bg-[#EEF1F6]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-2.5 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                filter === 'UNREAD'
                  ? 'bg-[#244A70] text-white'
                  : 'text-[#8491A3] hover:bg-[#EEF1F6]'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#E8EDF4]">
            {loading ? (
              <div className="py-8 text-center text-xs text-[#8491A3] flex items-center justify-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#244A70]" />
                <span>Loading notifications...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8491A3]">
                No notifications in this view.
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 flex items-start gap-3 text-xs cursor-pointer transition-colors ${
                    !item.read ? 'bg-[#EEF1F6]/70 hover:bg-[#EEF1F6]' : 'hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="mt-0.5 p-1 rounded-md bg-white border border-[#DCE3EC] shrink-0">
                    {renderIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${!item.read ? 'text-[#244A70]' : 'text-[#17263A]'}`}>
                        {item.title}
                      </span>
                      <span className="text-[10px] text-[#8491A3]">{item.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-[#8491A3] mt-0.5 line-clamp-2">
                      {item.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
