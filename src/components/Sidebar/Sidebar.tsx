import React, { useMemo, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { QueryClientContext } from '@tanstack/react-query';
import { useNavigation } from '@/hooks/useNavigation';
import { SidebarItem } from './SidebarItem';
import { MenuItem } from '@/features/menus/types/menu';
import { ChevronLeft, ChevronRight, LogOut, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import logo from '@/assets/logo.png';

export interface SidebarUser {
  fullName?: string;
  roles?: (string | { name?: string; label?: string; id?: string; key?: string })[];
  isPlatformAdmin?: boolean;
}

export const SYSTEM_ROLE_DISPLAY_MAP: Record<string, string> = {
  SYSTEM_ADMIN: 'PLATFORM ADMIN',
  ADMIN: 'PLATFORM ADMIN',
  PLATFORM_ADMIN: 'PLATFORM ADMIN',
  TEAM_LEAD: 'TEAM LEAD',
  SALES_MANAGER: 'SALES MANAGER',
  SALES_VP: 'VP OF SALES',
  INTERNAL_SALES: 'INTERNAL SALES',
  SALES_REP: 'SALES REPRESENTATIVE',
  INTERNAL_SUPPORT: 'INTERNAL SUPPORT',
  SUPPORT: 'CUSTOMER SUPPORT',
  CONVERSION_STAFF: 'CONVERSION STAFF',
  STAFF: 'CONVERSION STAFF',
  ENTERPRISE_MEMBER: 'ENTERPRISE MEMBER',
  PARTNER: 'PARTNER USER',
  PARTNER_USER: 'PARTNER USER',
};

export const ROLE_PRIORITY_ORDER: string[] = [
  'SYSTEM_ADMIN',
  'ADMIN',
  'PLATFORM_ADMIN',
  'TEAM_LEAD',
  'SALES_MANAGER',
  'SALES_VP',
  'INTERNAL_SALES',
  'SALES_REP',
  'INTERNAL_SUPPORT',
  'SUPPORT',
  'CONVERSION_STAFF',
  'STAFF',
  'ENTERPRISE_MEMBER',
  'PARTNER',
  'PARTNER_USER',
];

/**
 * Dynamically resolves the primary or active role label of the user.
 * Reuses standard platform mappings while supporting dynamic custom roles,
 * multi-role hierarchy prioritization, and neutral fallback.
 */
export function resolveUserRoleLabel(user?: SidebarUser | null): string {
  if (!user) return 'PLATFORM USER';

  // 1. Explicit platform admin without overriding specific roles
  if (user.isPlatformAdmin && (!user.roles || user.roles.length === 0)) {
    return 'PLATFORM ADMIN';
  }

  const rawRoles = user.roles || [];
  if (rawRoles.length === 0) {
    return user.isPlatformAdmin ? 'PLATFORM ADMIN' : 'PLATFORM USER';
  }

  // Normalize each role entry to { key, display }
  const normalized = rawRoles
    .map((r) => {
      if (typeof r === 'string') {
        const trimmed = r.trim();
        const upperKey = trimmed.toUpperCase().replace(/\s+/g, '_');
        return {
          key: upperKey,
          display: SYSTEM_ROLE_DISPLAY_MAP[upperKey] || trimmed.replace(/[_-]+/g, ' ').toUpperCase(),
        };
      }
      if (r && typeof r === 'object') {
        const explicitName = r.name || r.label;
        const key = String(r.id || r.key || explicitName || '').trim().toUpperCase().replace(/\s+/g, '_');
        return {
          key,
          display: explicitName
            ? explicitName.trim().toUpperCase()
            : SYSTEM_ROLE_DISPLAY_MAP[key] || key.replace(/[_-]+/g, ' '),
        };
      }
      return { key: '', display: '' };
    })
    .filter((r) => r.display.length > 0);

  if (normalized.length === 0) {
    return user.isPlatformAdmin ? 'PLATFORM ADMIN' : 'PLATFORM USER';
  }

  // 2. High priority check for platform admin
  if (user.isPlatformAdmin) {
    const adminRole = normalized.find((r) =>
      ['SYSTEM_ADMIN', 'ADMIN', 'PLATFORM_ADMIN'].includes(r.key)
    );
    if (adminRole) return adminRole.display;
  }

  // 3. Resolve primary role based on system priority hierarchy
  for (const prioKey of ROLE_PRIORITY_ORDER) {
    const matched = normalized.find((r) => r.key === prioKey || r.key.includes(prioKey));
    if (matched) return matched.display;
  }

  // 4. Default to first assigned role if no priority match
  return normalized[0].display;
}

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  onLogout?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  user?: SidebarUser | null;
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
  user,
}) => {
  const location = useLocation();
  const { sidebarNav, loading, error, refreshNavigation } = useNavigation();

  // Safely resolve authenticated user from props or active QueryClient context
  const queryClient = useContext(QueryClientContext);
  const optionalAuthUser = queryClient?.getQueryData<SidebarUser>(['currentUser']) || null;
  const effectiveUser = user !== undefined ? user : optionalAuthUser;
  const roleSubtitle = useMemo(() => resolveUserRoleLabel(effectiveUser), [effectiveUser]);

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
      className={`bg-[#14263F] text-white flex flex-col h-screen sticky top-0 border-r border-[#203954] transition-all duration-200 z-30 shrink-0 select-none ${
        isCollapsed ? 'w-16' : 'w-[240px]'
      }`}
    >
      {/* Sidebar Header / Brand Area — Matches Global Header 56px (h-14) */}
      <div
        className={`h-14 px-3.5 border-b border-[#203954] flex items-center ${
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
              <span
                className="text-xs text-slate-300 font-medium tracking-wide uppercase mt-0.5 truncate max-w-[145px]"
                title={roleSubtitle}
              >
                {roleSubtitle}
              </span>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="p-1.5 rounded-md text-[#8491A3] hover:text-white hover:bg-[#203954] transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Dynamic Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
        {loading ? (
          <div className="p-4 text-xs text-[#8491A3] text-center flex flex-col items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#8491A3]" />
            {!isCollapsed && <span>Loading Menu...</span>}
          </div>
        ) : error ? (
          <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-lg text-xs text-rose-300 text-center space-y-2">
            <AlertTriangle className="w-4 h-4 mx-auto text-rose-400" />
            {!isCollapsed && (
              <>
                <p className="font-medium">Failed to load menu</p>
                <button
                  type="button"
                  onClick={() => refreshNavigation()}
                  className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </>
            )}
          </div>
        ) : filteredSidebarNav.length === 0 ? (
          <div className="p-4 text-xs text-[#8491A3] text-center flex flex-col items-center gap-2">
            <Layers className="w-4 h-4 text-[#8491A3]" />
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

      {/* Bottom Sidebar Footer — Logout Control */}
      <div className="p-2.5 border-t border-[#203954] bg-[#14263F]">
        <button
          type="button"
          onClick={onLogout}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center py-2' : 'space-x-2.5 px-3 py-2'
          } rounded-md text-xs font-semibold text-[#8491A3] hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer`}
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
            className="fixed inset-0 bg-[#14263F]/75 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-[260px] w-full bg-[#14263F] shadow-xl z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
