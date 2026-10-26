import React, { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { Bell, Search, ChevronDown, X, Menu } from 'lucide-react';
import { Breadcrumb } from '@/shared/navigation/Breadcrumb';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNavigation } from '@/hooks/useNavigation';
import { authApi } from '@/features/auth/api/auth.api';

import { ImpersonationBanner } from '@/features/admin/components/ImpersonationBanner';
import { SupportViewProvider } from '@/features/admin/context/SupportViewContext';

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
      await authApi.logout();
      const loginUrl = import.meta.env.VITE_USER_PORTAL_URL || 'http://localhost:5173';
      window.location.href = `${loginUrl}/login`;
    } catch {
      window.alert('Sign out could not be confirmed. Please try Sign Out again.');
    }
  };

  const displayName = user?.fullName || 'System Admin';
  const displayTitle = pageTitle || sectionTitle || 'Dashboard';
  const userRole = (user?.roles && user.roles[0]) ? String(user.roles[0]) : 'Specialist';

  return (
    <SupportViewProvider>
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex font-sans">
        {/* Dynamic Dark Navy Sidebar */}
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onLogout={handleLogout}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        {/* Main Container (Header + Content Area) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Impersonation / Support View Warning Banner */}
          <ImpersonationBanner />

          {/* Global Header - Height 56px (h-14), Compact & Engineering-First */}
          <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 h-14 flex items-center justify-between shadow-xs">
            {/* Left: Mobile Menu Toggle & Dynamic Page Title */}
            <div className="flex items-center space-x-2.5 min-w-0 shrink-0">
              <button
                type="button"
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="md:hidden p-1.5 -ml-1 text-[#475569] hover:text-[#0652CC] hover:bg-[#F1F5F9] rounded-md transition-colors cursor-pointer"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-base font-bold text-[#0F172A] tracking-tight truncate max-w-[180px] sm:max-w-[280px] lg:max-w-[360px]">
                {displayTitle}
              </h1>
            </div>

            {/* Center: Global Search (Desktop & Tablet) */}
            <div className="hidden sm:flex flex-1 max-w-[380px] mx-4 lg:mx-6 items-center relative">
              <label htmlFor="global-search-input" className="sr-only">
                Search projects, screens, users
              </label>
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                id="global-search-input"
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search projects, screens, users..."
                className="w-full pl-8 pr-12 py-1 text-xs bg-[#F8FAFC] focus:bg-white border border-[#CBD5E1] focus:border-[#0652CC] rounded-md text-[#0F172A] placeholder-[#94A3B8] outline-none transition-all shadow-xs focus:ring-1 focus:ring-[#0652CC] h-8"
              />
              {searchValue ? (
                <button
                  type="button"
                  onClick={() => setSearchValue('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#94A3B8] hover:text-[#475569]"
                  aria-label="Clear search input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.2 text-[10px] font-semibold text-[#64748B] bg-white border border-[#CBD5E1] rounded shadow-xs pointer-events-none select-none">
                  {shortcutText}
                </kbd>
              )}
            </div>

            {/* Right: Notifications & User Account */}
            <div className="flex items-center space-x-2.5 sm:space-x-3 text-xs text-[#475569] shrink-0">
              {/* Mobile Search Icon Button */}
              <button
                type="button"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="sm:hidden p-1.5 text-[#475569] hover:text-[#0652CC] hover:bg-[#F1F5F9] rounded-md transition-colors cursor-pointer"
                aria-label="Toggle Global Search"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Notifications Bell */}
              <button
                type="button"
                className="p-1.5 text-[#475569] hover:text-[#0652CC] hover:bg-[#F1F5F9] rounded-md transition-colors relative cursor-pointer"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute 1 top-1 right-1 w-2 h-2 rounded-full bg-[#0652CC] ring-2 ring-white"></span>
              </button>

              {/* User Profile Avatar & Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  aria-label="User account menu"
                  className="flex items-center space-x-2 p-1 rounded-md hover:bg-[#F1F5F9] transition-colors cursor-pointer border border-transparent hover:border-[#E2E8F0]"
                >
                  <div className="w-7 h-7 rounded-md bg-[#0652CC] text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                    {getInitials(user?.fullName)}
                  </div>
                  <div className="hidden sm:flex flex-col text-left leading-tight">
                    <span className="font-semibold text-xs text-[#0F172A]">{displayName}</span>
                    <span className="text-[10px] text-[#64748B] truncate">{userRole}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
                </button>

                {profileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-transparent"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-56 bg-white border border-[#E2E8F0] rounded-lg shadow-md py-1 z-50 text-xs animate-fade-in">
                      <div className="px-3.5 py-2.5 border-b border-[#F1F5F9]">
                        <p className="font-semibold text-[#0F172A]">{displayName}</p>
                        <p className="text-[11px] text-[#64748B] truncate mt-0.5">{user?.email || 'admin@alsm.io'}</p>
                        <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#0652CC] border border-[#BFDBFE]">
                          {userRole}
                        </span>
                      </div>
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            handleLogout();
                          }}
                          className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 font-medium cursor-pointer transition-colors"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Mobile Search Input Row */}
          {showMobileSearch && (
            <div className="sm:hidden bg-white border-b border-[#E2E8F0] px-4 py-2 flex items-center space-x-2 animate-fade-in">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search projects, screens, users..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0652CC] rounded-md text-[#0F172A] placeholder-[#94A3B8] outline-none"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => setShowMobileSearch(false)}
                className="p-1.5 text-[#64748B] hover:text-[#0F172A]"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Dedicated Breadcrumb Row Directly Below Header */}
          <div className="sticky top-14 z-30 bg-[#FAFBFD] border-b border-[#E2E8F0] px-4 sm:px-6 py-1.5 flex items-center min-h-[32px]">
            <Breadcrumb />
          </div>

          {/* Content Area - Full Available Workspace Width */}
          <main className="flex-grow px-4 sm:px-6 lg:px-8 py-5 w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </SupportViewProvider>
  );
};

export default AppLayout;
