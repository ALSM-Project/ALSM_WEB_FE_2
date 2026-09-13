import React from 'react';
import { useNavigation } from '@/hooks/useNavigation';
import { SidebarItem } from './SidebarItem';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import logo from '@/assets/logo.png';
interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggle,
  onLogout,
}) => {
  const { sidebarNav, loading } = useNavigation();

  return (
    <aside
      className={`bg-[#091E42] text-white flex flex-col h-screen sticky top-0 border-r border-[#020817]/40 transition-all duration-300 z-30 shrink-0 ${
        isCollapsed ? 'w-16' : 'w-[230px]'
      }`}
    >
      {/* Sidebar Header / Brand Area - Height 64px (h-16) to match Global Header */}
      <div
        className={`h-16 px-5 border-b border-[#020817]/60 flex items-center ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        {!isCollapsed && (
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <img
              src={logo}
              alt="ALSM"
              className="h-8 w-auto object-contain shrink-0"
            />
            <span className="font-extrabold text-lg tracking-tight text-white">
              ALSM
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Dynamic Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {loading ? (
          <div className="p-4 text-xs text-[#94A3B8] text-center">Loading Menu...</div>
        ) : (
          sidebarNav.map((item) => (
            <SidebarItem key={item.id} item={item} isCollapsed={isCollapsed} />
          ))
        )}
      </nav>

      {/* Bottom Sidebar Footer */}
      <div className="p-3 border-t border-[#020817]/60">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#94A3B8] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4 shrink-0 text-[#94A3B8]" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
