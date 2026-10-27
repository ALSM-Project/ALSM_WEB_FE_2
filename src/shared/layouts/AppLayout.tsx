import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Settings, Wallet, LogOut } from 'lucide-react';
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
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
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

  const displayName = user?.fullName || 'System Administrator';
  const displayTitle = pageTitle || sectionTitle || 'Platform Administration';

  return (
    <SupportViewProvider>
      <div className="flex min-h-screen bg-[#F7F9FC]">
        {/* Collapsible Enterprise Sidebar */}
        <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} onLogout={handleLogout} />

        {/* Main Content Layout Container */}
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
          {/* Support Impersonation Banner */}
          <ImpersonationBanner />

          {/* Global Header - Height 64px (h-16), Padding px-6 */}
          <header className="sticky top-0 z-40 bg-white border-b border-[#DFE3E8] px-6 h-16 flex items-center justify-between shadow-2xs">
            {/* Left: Dynamic Page Title */}
            <div className="flex items-center space-x-3 min-w-0 shrink-0">
              <h1 className="text-lg font-bold text-[#172B4D] tracking-tight truncate max-w-[200px] sm:max-w-[280px] lg:max-w-[360px]">
                {displayTitle}
              </h1>
            </div>

            {/* Center: Global Search (Triggers Command Palette) */}
            <div
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex flex-1 max-w-[380px] mx-6 items-center relative cursor-pointer group"
            >
              <Search className="w-4 h-4 text-[#5E6C84] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-[#0652CC] transition-colors" />
              <div className="w-full pl-9 pr-14 py-2 text-xs bg-[#F7F9FC] group-hover:bg-white border border-[#DFE3E8] group-hover:border-[#0652CC] rounded-xl text-[#5E6C84] outline-none transition-all shadow-2xs h-9 flex items-center">
                Search pages, actions, commands...
              </div>
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-[#5E6C84] bg-white border border-[#DFE3E8] rounded shadow-2xs pointer-events-none select-none">
                {shortcutText}
              </kbd>
            </div>

            {/* Right: Web3 Wallet Connect, Notifications & User Account */}
            <div className="flex items-center space-x-3 text-xs text-[#5E6C84] shrink-0">
              {/* Mobile Search Button */}
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className="sm:hidden p-2 text-[#5E6C84] hover:text-[#0652CC] hover:bg-[#F7F9FC] rounded-xl transition-colors cursor-pointer"
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
                  className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-[#F7F9FC] transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[#0652CC] text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
                    {getInitials(user?.fullName)}
                  </div>
                  <span className="hidden sm:inline font-semibold text-[#172B4D]">{displayName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#5E6C84]" />
                </button>

                {profileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-transparent"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-[#DFE3E8] rounded-xl shadow-lg py-1.5 z-50 text-xs">
                      <div className="px-3.5 py-2 border-b border-[#DFE3E8]">
                        <p className="font-semibold text-[#172B4D]">{displayName}</p>
                        <p className="text-[10px] text-[#5E6C84] truncate">{user?.email || 'admin@alsm.io'}</p>
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            navigate('/admin/web3');
                          }}
                          className="w-full text-left px-3.5 py-2 text-[#172B4D] hover:bg-[#F7F9FC] flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Wallet className="w-3.5 h-3.5 text-[#5E6C84]" />
                          <span>Web3 Administration</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            navigate('/admin/settings');
                          }}
                          className="w-full text-left px-3.5 py-2 text-[#172B4D] hover:bg-[#F7F9FC] flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5 text-[#5E6C84]" />
                          <span>Application Settings</span>
                        </button>
                      </div>

                      <div className="pt-1 border-t border-[#DFE3E8]">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
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
          <div className="sticky top-16 z-30 bg-[#FAFBFD] border-b border-[#DFE3E8] px-6 sm:px-8 py-2 flex items-center min-h-[38px]">
            <Breadcrumb />
          </div>

          {/* Content Area - Protected with ErrorBoundary */}
          <main className="flex-grow px-6 sm:px-8 py-6 w-full">
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
