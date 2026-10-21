import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigation } from '@/hooks/useNavigation';
import { SidebarItem } from './SidebarItem';
import { MenuItem } from '@/features/menus/types/menu';
import { ChevronLeft, ChevronRight, LogOut, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import logo from '@/assets/logo.png';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  onLogout?: () => void;
}

export function findActiveMenuItemId(items: MenuItem[], pathname: string): string | null {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  const leafNodes: { id: string; path: string }[] = [];
  const collectLeaves = (nodes: MenuItem[]) => {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        collectLeaves(node.children);
      } else if (node.path) {
        leafNodes.push({ id: node.id, path: node.path.replace(/\/+$/, '') || '/' });
      }
    }
  };
  collectLeaves(items);

  // 1. Exact match has highest priority
  const exact = leafNodes.find((n) => n.path === cleanPath);
  if (exact) return exact.id;

  // 2. Longest prefix match for sub-paths (excluding root '/')
  let bestMatch: { id: string; path: string } | null = null;
  let maxLen = 0;

  for (const node of leafNodes) {
    if (node.path === '/') continue;
    if (cleanPath.startsWith(node.path + '/') && node.path.length > maxLen) {
      bestMatch = node;
      maxLen = node.path.length;
    }
  }

  return bestMatch ? bestMatch.id : null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggle,
  onLogout,
}) => {
  const location = useLocation();
  const { sidebarNav, loading, error, refreshNavigation } = useNavigation();

  const filteredSidebarNav = useMemo(() => {
    return sidebarNav
      .filter((item) => item.id !== 'web2_partner_create' && item.path !== '/partners/new')
      .map((item) => ({
        ...item,
        children: item.children?.filter(
          (c) => c.id !== 'web2_partner_create' && c.path !== '/partners/new'
        ),
      }));
  }, [sidebarNav]);

  const activeItemId = useMemo(() => {
    return findActiveMenuItemId(filteredSidebarNav, location.pathname);
  }, [filteredSidebarNav, location.pathname]);

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
          <div className="p-4 text-xs text-[#94A3B8] text-center flex flex-col items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#388BFF]" />
            {!isCollapsed && <span>Loading Menu...</span>}
          </div>
        ) : error ? (
          <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-lg text-xs text-rose-300 text-center space-y-2">
            <AlertTriangle className="w-5 h-5 mx-auto text-rose-400" />
            {!isCollapsed && (
              <>
                <p className="font-medium">Failed to load menu</p>
                <button
                  type="button"
                  onClick={() => refreshNavigation()}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </>
            )}
          </div>
        ) : filteredSidebarNav.length === 0 ? (
          <div className="p-4 text-xs text-[#64748B] text-center flex flex-col items-center gap-2">
            <Layers className="w-5 h-5 text-[#64748B]" />
            {!isCollapsed && <span>No menu items available.</span>}
          </div>
        ) : (
          filteredSidebarNav.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isCollapsed={isCollapsed}
              activeItemId={activeItemId}
            />
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
