import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
  Trash2,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'SECURITY';
  actionRoute?: string;
}

const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-1',
    title: 'Pending Discount Approval',
    message: 'Alex Mercer requested a 20% discount on Quote Q-2026-FNX-01 ($54,000).',
    timestamp: '15 mins ago',
    read: false,
    type: 'WARNING',
    actionRoute: '/crm/discounts',
  },
  {
    id: 'notif-2',
    title: 'Blockchain Proof Anchored',
    message: 'Conversion batch SHA-256 root anchored on Sepolia block #6891204.',
    timestamp: '1 hour ago',
    read: false,
    type: 'SUCCESS',
    actionRoute: '/admin/web3',
  },
  {
    id: 'notif-3',
    title: 'Support Session Initiated',
    message: 'System Administrator entered read-only support session for Acme Corporation.',
    timestamp: '3 hours ago',
    read: true,
    type: 'SECURITY',
    actionRoute: '/admin/audit-logs',
  },
];

export const NotificationCenterModal: React.FC = () => {
  const [notifications, setNotifications] = useState<SystemNotification[]>(INITIAL_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (item: SystemNotification) => {
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
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'SECURITY':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      default:
        return <FileCheck className="w-4 h-4 text-[#0652CC]" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-[#5E6C84] hover:text-[#172B4D] hover:bg-[#F7F9FC] transition-colors cursor-pointer"
        aria-label="System Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0652CC] ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#DFE3E8] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#DFE3E8] flex items-center justify-between bg-[#F7F9FC]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-[#172B4D]">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F1FF] text-[#0652CC]">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[#0652CC] hover:underline cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 text-[#5E6C84] hover:text-rose-600 cursor-pointer"
                  title="Clear all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Filter pills */}
          <div className="px-4 py-2 border-b border-[#DFE3E8] flex gap-2 text-[11px]">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-0.5 rounded-full font-semibold transition-colors cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-[#172B4D] text-white'
                  : 'text-[#5E6C84] hover:bg-[#F7F9FC]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-2.5 py-0.5 rounded-full font-semibold transition-colors cursor-pointer ${
                filter === 'UNREAD'
                  ? 'bg-[#0652CC] text-white'
                  : 'text-[#5E6C84] hover:bg-[#F7F9FC]'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#DFE3E8]">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#5E6C84]">
                No notifications in this view.
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 flex items-start gap-3 text-xs cursor-pointer transition-colors ${
                    !item.read ? 'bg-[#F0F4FA]/60 hover:bg-[#F0F4FA]' : 'hover:bg-[#F7F9FC]'
                  }`}
                >
                  <div className="mt-0.5 p-1 rounded-lg bg-white border border-[#DFE3E8] shrink-0">
                    {renderIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${!item.read ? 'text-[#0652CC]' : 'text-[#172B4D]'}`}>
                        {item.title}
                      </span>
                      <span className="text-[10px] text-[#5E6C84]">{item.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-[#5E6C84] mt-0.5 line-clamp-2">
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
