import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Settings, Wallet, LogOut, Menu, X } from 'lucide-react';
import { Breadcrumb } from '@/shared/navigation/Breadcrumb';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNavigation } from '@/hooks/useNavigation';
import { authApi } from '@/features/auth/api/auth.api';

import { ImpersonationBanner } from '@/features/admin/components/ImpersonationBanner';
import { SupportViewProvider } from '@/features/admin/context/SupportViewContext';
import { WalletConnectPill } from '@/features/web3/components/WalletConnectPill';
import { NotificationCenterModal } from '@/shared/components/NotificationCenterModal';
import { CommandPaletteModal } from '@/shared/components/CommandPaletteModal';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

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
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Detect OS for shortcut badge text
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent || '');
  const shortcutText = isMac ? '⌘ K' : 'Ctrl K';

  // Global keyboard shortcut (Ctrl+K or Cmd+K) to open Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
  };

  const displayName = user?.fullName || 'System Admin';
  const displayTitle = pageTitle || sectionTitle || 'Platform Administration';
  const userRole = (user?.roles && user.roles[0]) ? String(user.roles[0]) : 'Specialist';

  return (
    <SupportViewProvider>
      <div className="flex min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans">
        {/* Responsive Sidebar */}
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onLogout={handleLogout}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        {/* Main Content Layout Container */}
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
          {/* Support Impersonation Banner */}
          <ImpersonationBanner />

          {/* Global Header */}
          <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between shadow-xs">
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
              <h1 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight truncate max-w-[180px] sm:max-w-[280px] lg:max-w-[360px]">
                {displayTitle}
              </h1>
            </div>

            {/* Center: Global Search (Triggers Command Palette) */}
            <div
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex flex-1 max-w-[380px] mx-4 lg:mx-6 items-center relative cursor-pointer group"
            >
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-[#0652CC] transition-colors" />
              <div className="w-full pl-8 pr-12 py-1.5 text-xs bg-[#F8FAFC] group-hover:bg-white border border-[#CBD5E1] group-hover:border-[#0652CC] rounded-md text-[#64748B] outline-none transition-all shadow-xs h-8 flex items-center">
                Search pages, actions, commands...
              </div>
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B] bg-white border border-[#CBD5E1] rounded shadow-xs pointer-events-none select-none">
                {shortcutText}
              </kbd>
            </div>

            {/* Right: Web3 Wallet Connect, Notifications & User Account */}
            <div className="flex items-center space-x-2.5 sm:space-x-3 text-xs text-[#475569] shrink-0">
              {/* Mobile Search Button */}
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className="sm:hidden p-1.5 text-[#475569] hover:text-[#0652CC] hover:bg-[#F1F5F9] rounded-md transition-colors cursor-pointer"
                aria-label="Open Command Palette"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Web3 Wallet Connect Pill */}
              <WalletConnectPill />

              {/* Notifications Dropdown Drawer */}
              <NotificationCenterModal />

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
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#0652CC] border border-[#BFDBFE]">
                          {userRole}
                        </span>
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            navigate('/admin/web3');
                          }}
                          className="w-full text-left px-3.5 py-2 text-[#0F172A] hover:bg-[#F8FAFC] flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Wallet className="w-3.5 h-3.5 text-[#64748B]" />
                          <span>Web3 Administration</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            navigate('/admin/settings');
                          }}
                          className="w-full text-left px-3.5 py-2 text-[#0F172A] hover:bg-[#F8FAFC] flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5 text-[#64748B]" />
                          <span>Application Settings</span>
                        </button>
                      </div>

                      <div className="pt-1 border-t border-[#E2E8F0]">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-600" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Dedicated Breadcrumb Row Directly Below Header */}
          <div className="sticky top-14 sm:top-16 z-30 bg-[#FAFBFD] border-b border-[#E2E8F0] px-4 sm:px-6 py-1.5 flex items-center min-h-[34px]">
            <Breadcrumb />
          </div>

          {/* Content Area - Protected with ErrorBoundary */}
          <main className="flex-grow px-4 sm:px-6 lg:px-8 py-5 w-full">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>

      {/* Global Command Palette */}
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </SupportViewProvider>
  );
};

export default AppLayout;
