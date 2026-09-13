import React, { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { Bell, Search, ChevronDown, X } from 'lucide-react';
import { Breadcrumb } from '@/shared/navigation/Breadcrumb';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNavigation } from '@/hooks/useNavigation';
import { tokenStore } from '@/services/api/tokenStore';
import { authApi } from '@/features/auth/api/auth.api';

const getInitials = (name?: string) => {
  if (!name) return 'SA';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const { pageTitle, sectionTitle } = useNavigation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Detect OS for shortcut badge text
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent || '');
  const shortcutText = isMac ? '⌘ K' : 'Ctrl K';

  // Global keyboard shortcut (Ctrl+K or Cmd+K) to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (showMobileSearch) {
          searchInputRef.current?.focus();
        } else {
          setShowMobileSearch(true);
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMobileSearch]);

  const handleLogout = async () => {
    try {
      const refreshToken = tokenStore.getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } finally {
      tokenStore.clear();
      const loginUrl = import.meta.env.VITE_USER_PORTAL_URL || 'http://localhost:5173';
      window.location.href = `${loginUrl}/login`;
    }
  };

  const displayName = user?.fullName || 'System Admin';
  const displayTitle = pageTitle || sectionTitle || 'Dashboard';

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#091E42] flex font-sans">
      {/* Dynamic Dark Navy Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
      />

      {/* Main Container (Header + Content Area) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Global Header - Height 64px (h-16), Padding px-6 */}
        <header className="sticky top-0 z-40 bg-white border-b border-[#E5EAF0] px-6 h-16 flex items-center justify-between shadow-2xs">
          {/* Left: Dynamic Page Title */}
          <div className="flex items-center space-x-3 min-w-0 shrink-0">
            <h1 className="text-lg font-bold text-[#091E42] tracking-tight truncate max-w-[200px] sm:max-w-[280px] lg:max-w-[360px]">
              {displayTitle}
            </h1>
          </div>

          {/* Center: Global Search (Desktop & Tablet) */}
          <div className="hidden sm:flex flex-1 max-w-[400px] mx-6 items-center relative">
            <label htmlFor="global-search-input" className="sr-only">
              Search projects, screens, users
            </label>
            <Search className="w-4 h-4 text-[#6B778C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              id="global-search-input"
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search projects, screens, users..."
              className="w-full pl-9 pr-14 py-2 text-xs bg-[#F7F9FC] focus:bg-white border border-[#D9E2EC] focus:border-[#0652CC] rounded-lg text-[#091E42] placeholder-[#8993A4] outline-none transition-all shadow-2xs focus:ring-2 focus:ring-[#0652CC]/20 h-9"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-[#6B778C] bg-white border border-[#D9E2EC] rounded shadow-2xs pointer-events-none select-none">
              {shortcutText}
            </kbd>
          </div>

          {/* Right: Notifications & User Account */}
          <div className="flex items-center space-x-4 text-xs text-[#42526E] shrink-0">
            {/* Mobile Search Icon Button */}
            <button
              type="button"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="sm:hidden p-1.5 text-[#42526E] hover:text-[#0652CC] hover:bg-[#F7F9FC] rounded-lg transition-colors cursor-pointer"
              aria-label="Toggle Global Search"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notifications Bell */}
            <button
              type="button"
              className="p-1.5 text-[#42526E] hover:text-[#0652CC] hover:bg-[#F7F9FC] rounded-lg transition-colors relative cursor-pointer"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                3
              </span>
            </button>

            {/* User Profile Avatar & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                aria-label="User account menu"
                className="flex items-center space-x-2 p-1 rounded-lg hover:bg-[#F7F9FC] transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-[#0652CC] text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
                  {getInitials(user?.fullName)}
                </div>
                <span className="hidden sm:inline font-semibold text-[#091E42]">{displayName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#6B778C]" />
              </button>

              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-[#D9E2EC] rounded-xl shadow-lg py-1.5 z-50 text-xs">
                    <div className="px-3.5 py-2 border-b border-[#E5EAF0]">
                      <p className="font-semibold text-[#091E42]">{displayName}</p>
                      <p className="text-[10px] text-[#6B778C] truncate">{user?.email || 'admin@alsm.io'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 font-medium cursor-pointer transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Search Input Row */}
        {showMobileSearch && (
          <div className="sm:hidden bg-white border-b border-[#E5EAF0] px-4 py-2 flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#6B778C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search projects, screens, users..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F7F9FC] border border-[#D9E2EC] focus:border-[#0652CC] rounded-lg text-[#091E42] placeholder-[#8993A4] outline-none"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => setShowMobileSearch(false)}
              className="p-1.5 text-[#6B778C] hover:text-[#091E42]"
              aria-label="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dedicated Breadcrumb Row Directly Below Header */}
        <div className="sticky top-16 z-30 bg-[#FAFBFD] border-b border-[#E5EAF0] px-6 sm:px-8 py-2 flex items-center min-h-[38px]">
          <Breadcrumb />
        </div>

        {/* Content Area - Full Available Workspace Width */}
        <main className="flex-grow px-6 sm:px-8 py-6 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
