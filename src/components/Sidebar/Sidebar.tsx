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
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
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
  mobileOpen = false,
  onCloseMobile,
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

  const sidebarContent = (
    <aside
      className={`bg-[#091E42] text-white flex flex-col h-screen sticky top-0 border-r border-[#020817]/40 transition-all duration-200 z-30 shrink-0 ${
        isCollapsed ? 'w-16' : 'w-[236px]'
      }`}
    >
      {/* Sidebar Header / Brand Area - Sleek 56px (h-14) to match Global Header */}
      <div
        className={`h-14 px-4 border-b border-white/10 flex items-center ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        {!isCollapsed && (
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <img
              src={logo}
              alt="ALSM"
              className="h-7 w-auto object-contain shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-white leading-none">
                ALSM
              </span>
              <span className="text-[10px] text-[#94A3B8] font-medium tracking-wide uppercase mt-0.5">
                Modernization
              </span>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="p-1.5 rounded-md text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Dynamic Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-0.5">
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
      <div className="p-2.5 border-t border-white/10 bg-[#091E42]/80">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-md text-xs font-semibold text-[#94A3B8] hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block">
        {sidebarContent}
      </div>

      {/* Mobile Drawer (with backdrop) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#091E42]/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-[260px] w-full bg-[#091E42] shadow-xl z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
