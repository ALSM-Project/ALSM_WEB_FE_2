import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Settings, Wallet, LogOut, Menu } from 'lucide-react';
import { Breadcrumb } from '@/shared/navigation/Breadcrumb';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { authApi } from '@/features/auth/api/auth.api';

import { ImpersonationBanner } from '@/features/admin/components/ImpersonationBanner';
import { SupportViewProvider } from '@/features/admin/context/SupportViewContext';
import { NotificationCenterModal } from '@/shared/components/NotificationCenterModal';
import { CommandPaletteModal } from '@/shared/components/CommandPaletteModal';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { Toaster, toast } from '@/shared/ui';

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
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    } catch {
      toast.error('Sign out could not be confirmed. Please try Sign Out again.');
    }
  };

  const displayName = user?.fullName || 'System Admin';
  const userRole = (user?.roles && user.roles[0]) ? String(user.roles[0]) : 'Specialist';

  return (
    <SupportViewProvider>
      <div className="flex min-h-screen bg-[#EEF1F6] text-[#17263A] font-sans antialiased">
        {/* Responsive Sidebar */}
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onLogout={handleLogout}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
          user={user}
        />

        {/* Main Content Layout Container */}
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-200">
          {/* Support Impersonation Banner */}
          <ImpersonationBanner />

          {/* Global Header — Clean White, Compact 56px, Enterprise Grade */}
          <header className="sticky top-0 z-40 bg-white border-b border-[#DCE3EC] px-4 sm:px-6 h-14 flex items-center justify-between shadow-xs">
            {/* Left: Mobile Menu Toggle & Dynamic Breadcrumb */}
            <div className="flex items-center space-x-3 min-w-0 md:flex-1 overflow-hidden pr-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="md:hidden p-1.5 -ml-1 text-[#8491A3] hover:text-[#244A70] hover:bg-[#EEF1F6] rounded-md transition-colors cursor-pointer shrink-0"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0 overflow-hidden">
                <Breadcrumb />
              </div>
            </div>

            {/* Center: Global Search (Triggers Command Palette, Centered & Extended) */}
            <div
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex w-full max-w-[440px] lg:max-w-[500px] mx-auto items-center relative cursor-pointer group shrink-0"
            >
              <Search className="w-4 h-4 text-[#8491A3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-[#244A70] transition-colors" />
              <div className="w-full pl-9 pr-14 py-1 text-xs bg-[#F4F7FB] group-hover:bg-white border border-[#DCE3EC] group-hover:border-[#244A70] rounded-md text-[#8491A3] outline-none transition-all shadow-xs h-8 flex items-center">
                Search pages, actions, commands...
              </div>
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-[#8491A3] bg-white border border-[#DCE3EC] rounded shadow-2xs pointer-events-none select-none">
                {shortcutText}
              </kbd>
            </div>

            {/* Right: Web3 Wallet Connect, Notifications & User Account */}
            <div className="flex items-center justify-end space-x-2.5 sm:space-x-3 text-xs text-[#8491A3] shrink-0 md:flex-1 pl-2">
              {/* Mobile Search Button */}
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className="sm:hidden p-1.5 text-[#8491A3] hover:text-[#244A70] hover:bg-[#EEF1F6] rounded-md transition-colors cursor-pointer"
                aria-label="Open Command Palette"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Notifications Dropdown Drawer */}
              <NotificationCenterModal />

              {/* User Profile Avatar & Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  aria-label="User account menu"
                  className="flex items-center space-x-2 p-1 rounded-md hover:bg-[#EEF1F6] transition-colors cursor-pointer border border-transparent hover:border-[#DCE3EC]"
                >
                  <div className="w-7 h-7 rounded-md bg-[#244A70] text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                    {getInitials(user?.fullName)}
                  </div>
                  <div className="hidden sm:flex flex-col text-left leading-tight">
                    <span className="font-semibold text-xs text-[#17263A]">{displayName}</span>
                    <span className="text-[10px] text-[#8491A3] truncate">{userRole}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#8491A3]" />
                </button>

                {profileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-transparent"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-56 bg-white border border-[#DCE3EC] rounded-lg shadow-md py-1 z-50 text-xs animate-fade-in">
                      <div className="px-3.5 py-2.5 border-b border-[#EEF1F6]">
                        <p className="font-semibold text-[#17263A]">{displayName}</p>
                        <p className="text-[11px] text-[#8491A3] truncate mt-0.5">{user?.email || 'admin@alsm.io'}</p>
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EEF1F6] text-[#244A70] border border-[#DCE3EC]">
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
                          className="w-full text-left px-3.5 py-2 text-[#17263A] hover:bg-[#F4F7FB] flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Wallet className="w-4 h-4 text-[#8491A3]" />
                          <span>Web3 Administration</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            navigate('/admin/settings');
                          }}
                          className="w-full text-left px-3.5 py-2 text-[#17263A] hover:bg-[#F4F7FB] flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Settings className="w-4 h-4 text-[#8491A3]" />
                          <span>Application Settings</span>
                        </button>
                      </div>

                      <div className="pt-1 border-t border-[#DCE3EC]">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-rose-600" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Main Workspace Content Area */}
          <main className="flex-grow px-4 sm:px-6 lg:px-8 py-5 w-full bg-[#EEF1F6]">
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

      {/* Global Toaster */}
      <Toaster />
    </SupportViewProvider>
  );
};

export default AppLayout;
