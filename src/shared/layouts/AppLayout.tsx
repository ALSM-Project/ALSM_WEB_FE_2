import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, Settings, Sun, ChevronDown } from 'lucide-react';
import { Breadcrumb } from '@/shared/navigation/Breadcrumb';
import { Sidebar } from '@/components/Sidebar/Sidebar';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#091E42] flex font-sans">
      {/* Dynamic Dark Navy Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
      />

      {/* Main Container (Header + Content Area, NO FOOTER) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header matching exact screenshot */}
        <header className="sticky top-0 z-40 bg-white border-b border-[#E5EAF0] px-6 py-3.5 flex items-center justify-between shadow-2xs">
          {/* Left: Dynamic Breadcrumb */}
          <div className="flex items-center space-x-2">
            <Breadcrumb />
          </div>

          {/* Right: Status, Notifications (3), Settings, Avatar (JD John Doe), Sun icon */}
          <div className="flex items-center space-x-5 text-xs text-[#42526E]">
            {/* System Status indicator */}
            <div className="hidden sm:flex items-center space-x-2 bg-[#F7F9FC] px-3 py-1.5 rounded-full border border-[#E5EAF0]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-[#091E42]">System Status</span>
            </div>

            {/* Notifications with badge count 3 */}
            <button
              type="button"
              className="p-1.5 text-[#42526E] hover:text-[#0652CC] hover:bg-[#F7F9FC] rounded-lg transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                3
              </span>
            </button>

            {/* Settings button */}
            <button
              type="button"
              className="p-1.5 text-[#42526E] hover:text-[#0652CC] hover:bg-[#F7F9FC] rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* User Profile Avatar (JD John Doe) */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center space-x-2 p-1 rounded-lg hover:bg-[#F7F9FC] transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-[#0652CC] text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                  JD
                </div>
                <span className="hidden sm:inline font-semibold text-[#091E42]">John Doe</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#6B778C]" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-[#D9E2EC] rounded-xl shadow-lg py-1.5 z-50 text-xs">
                  <div className="px-3 py-1.5 border-b border-[#E5EAF0]">
                    <p className="font-semibold text-[#091E42]">John Doe</p>
                    <p className="text-[10px] text-[#6B778C]">john.doe@alsm.io</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Sun / Theme Toggle Icon */}
            <button
              type="button"
              className="p-1.5 text-[#42526E] hover:text-[#0652CC] hover:bg-[#F7F9FC] rounded-lg transition-colors"
              title="Toggle Theme"
            >
              <Sun className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-grow p-6 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
        {/* NO FOOTER AS REQUESTED */}
      </div>
    </div>
  );
};

export default AppLayout;
