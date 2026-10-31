import React, { createContext, useContext, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { MenuItem, NavigationData } from '@/features/menus/types/menu';
import { resolveNavigationContext, BreadcrumbNode } from '@/shared/navigation/breadcrumbUtils';
import { useNavigationQuery } from '@/features/navigation/hooks/useNavigationQuery';
import { BackendNavItem } from '@/features/navigation/api/navigation.api';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface NavigationContextType {
  sidebarNav: MenuItem[];
  navigation: NavigationData | null;
  loading: boolean;
  error: Error | null;
  refreshNavigation: () => Promise<void>;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  addItem: (itemData: Partial<MenuItem>, parentId?: string | null) => MenuItem;
  updateItem: (id: string, updates: Partial<MenuItem>) => void;
  deleteItem: (id: string) => { success: boolean; error?: string };
  moveItem: (id: string, newParentId: string | null) => { success: boolean; error?: string };
  reorderSibling: (id: string, direction: 'up' | 'down') => void;
  duplicateItem: (id: string) => MenuItem | null;
  resetToDefault: () => void;
  saveChanges: () => Promise<void>;
  isDirty: boolean;
  sectionTitle: string;
  pageTitle: string;
  breadcrumbs: BreadcrumbNode[];
  currentItem: MenuItem | null;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

function mapBackendNodeToMenuItem(node: BackendNavItem): MenuItem {
  return {
    id: node.id,
    label: node.label,
    icon: node.icon,
    path: node.route || undefined,
    parentId: node.parentId || undefined,
    order: node.order,
    isVisible: node.visibility,
    permissions: node.requiredPermissions,
    openInNewTab: node.openInNewTab ?? false,
    hideParentLabel: node.hideParentLabel ?? false,
    children: node.children
      ?.filter((c) => c.id !== 'web2_partner_create' && c.route !== '/partners/new')
      ?.map(mapBackendNodeToMenuItem),
  };
}

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: backendNavNodes = [], isLoading, error, refetch } = useNavigationQuery('WEB_2');
  const { user, hasPermission } = useAuth();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const sidebarNav = useMemo(() => {
    let mapped = backendNavNodes
      .filter((n) => n.id !== 'web2_partner_create' && n.route !== '/partners/new')
      .map(mapBackendNodeToMenuItem);

    // If backend returned empty nodes (offline or dev fallback), supply default groups
    if (mapped.length === 0) {
      mapped = [
        {
          id: 'web2_group_dashboard',
          label: 'Dashboard',
          icon: 'LayoutDashboard',
          order: 1,
          isVisible: true,
          children: [
            {
              id: 'web2_dashboard',
              label: 'Dashboard',
              icon: 'LayoutDashboard',
              path: '/',
              order: 1,
              isVisible: true,
              permissions: [],
              openInNewTab: false,
            },
          ],
        },
        {
          id: 'web2_group_partners',
          label: 'Partner Management',
          icon: 'Building2',
          order: 2,
          isVisible: true,
          children: [],
        },
        {
          id: 'web2_group_operations',
          label: 'Operations',
          icon: 'Activity',
          order: 3,
          isVisible: true,
          children: [],
        },
        {
          id: 'web2_group_support',
          label: 'Customer Support',
          icon: 'Headphones',
          order: 4,
          isVisible: true,
          children: [],
        },
        {
          id: 'web2_group_team_lead',
          label: 'Team Lead',
          icon: 'Users',
          order: 5,
          isVisible: true,
          children: [],
        },
        {
          id: 'web2_group_conversions',
          label: 'Conversions',
          icon: 'Cpu',
          order: 6,
          isVisible: true,
          children: [
            {
              id: 'web2_my_assigned_work',
              label: 'My Assigned Work',
              icon: 'Briefcase',
              path: '/my-work',
              order: 1,
              isVisible: true,
              permissions: ['conversions.view'],
              openInNewTab: false,
            },
            {
              id: 'web2_quality_review',
              label: 'Quality Review',
              icon: 'ShieldCheck',
              path: '/review',
              order: 2,
              isVisible: true,
              permissions: ['quality-review.manage'],
              openInNewTab: false,
            },
          ],
        },
        {
          id: 'web2_group_administration',
          label: 'Administration',
          icon: 'Settings2',
          order: 7,
          isVisible: true,
          children: [],
        },
      ];
    }

    // Ensure Operations group exists with Conversion Queue
    let opsGroup = mapped.find((g) => g.id === 'web2_group_operations' || g.label?.toLowerCase() === 'operations');
    if (!opsGroup) {
      opsGroup = {
        id: 'web2_group_operations',
        label: 'Operations',
        icon: 'Activity',
        order: 3,
        isVisible: true,
        children: [],
      };
      mapped.push(opsGroup);
    }
    const hasQueue = opsGroup.children?.some((c) => c.path === '/queue');
    if (!hasQueue) {
      opsGroup.children = [
        ...(opsGroup.children || []),
        {
          id: 'web2_conversion_queue',
          label: 'Conversion Queue',
          icon: 'Activity',
          path: '/queue',
          order: 1,
          isVisible: true,
          permissions: ['conversions.queue.view'],
          openInNewTab: false,
        },
      ];
    }

    // Ensure Customer Support group exists with Organisation Access and Conversion Support
    let supportGroup = mapped.find((g) => g.id === 'web2_group_support' || g.label?.toLowerCase() === 'customer support');
    if (!supportGroup) {
      supportGroup = {
        id: 'web2_group_support',
        label: 'Customer Support',
        icon: 'Headphones',
        order: 4,
        isVisible: true,
        children: [],
      };
      mapped.push(supportGroup);
    }
    const hasOrgAccess = supportGroup.children?.some((c) => c.path === '/admin/organizations');
    if (!hasOrgAccess) {
      supportGroup.children = [
        ...(supportGroup.children || []),
        {
          id: 'web2_support_org_access',
          label: 'Organisation Access',
          icon: 'Building2',
          path: '/admin/organizations',
          order: 1,
          isVisible: true,
          permissions: ['organizations.impersonate'],
          openInNewTab: false,
        },
      ];
    }
    const hasTroubleshoot = supportGroup.children?.some((c) => c.path === '/queue?tab=troubleshoot');
    if (!hasTroubleshoot) {
      supportGroup.children = [
        ...(supportGroup.children || []),
        {
          id: 'web2_support_troubleshooting',
          label: 'Conversion Support',
          icon: 'Wrench',
          path: '/queue?tab=troubleshoot',
          order: 2,
          isVisible: true,
          permissions: ['conversions.troubleshoot.view'],
          openInNewTab: false,
        },
      ];
    }

    const processed = mapped.map((group) => {
      // 1. Ensure Partner Management has Partner Directory, Partner Projects, and Demo Projects
      if (group.id === 'web2_group_partners' || group.label?.toLowerCase() === 'partner management') {
        const hasDirectory = group.children?.some((c) => c.path === '/partners');
        const hasProjects = group.children?.some((c) => c.path === '/partners/projects');
        const hasDemoProjects = group.children?.some((c) => c.path === '/partners/projects?scope=demo');
        let children = [...(group.children || [])];

        if (!hasDirectory) {
          children.unshift({
            id: 'web2_partner_list',
            label: 'Partner Directory',
            icon: 'Building2',
            path: '/partners',
            order: 1,
            isVisible: true,
            permissions: ['partner.view'],
            openInNewTab: false,
          });
        }

        if (!hasProjects) {
          children.push({
            id: 'web2_partner_projects',
            label: 'Partner Projects',
            icon: 'FolderKanban',
            path: '/partners/projects',
            order: 2,
            isVisible: true,
            permissions: ['partner.view'],
            openInNewTab: false,
          });
        }

        if (!hasDemoProjects) {
          children.push({
            id: 'web2_demo_projects',
            label: 'Demo Projects',
            icon: 'Sparkles',
            path: '/partners/projects?scope=demo',
            order: 3,
            isVisible: true,
            permissions: ['projects.demo.view'],
            openInNewTab: false,
          });
        }

        return { ...group, children };
      }

      // 2. Ensure Team Lead has dedicated Employee Allocation route
      if (group.id === 'web2_group_team_lead' || group.label?.toLowerCase() === 'team lead') {
        const hasTeamProjects = group.children?.some((c) => c.path === '/team-lead/projects');
        let children = [...(group.children || [])];

        if (!hasTeamProjects) {
          children.splice(1, 0, {
            id: 'web2_tl_staff_allocation',
            label: 'Employee Allocation',
            icon: 'Users',
            path: '/team-lead/projects',
            order: 1.5,
            isVisible: true,
            permissions: ['teams.manage'],
            openInNewTab: false,
          });
        } else {
          children = children.map((c) =>
            c.path === '/team-lead/projects' ? { ...c, label: 'Employee Allocation' } : c
          );

        const hasTransferApprovals = children.some((c) => c.path === '/team-lead/resource-transfers');
        if (!hasTransferApprovals) {
          children.push({
            id: 'web2_tl_transfer_approvals',
            label: 'Transfer Approvals',
            icon: 'ArrowRightLeft',
            path: '/team-lead/resource-transfers',
            order: 2.5,
            isVisible: true,
            permissions: ['teams.manage'],
            openInNewTab: false,
          });
        }
        }
        return { ...group, children };
      }

      // 3. Ensure Administration displays Team Lead Assignment for project allocation
      if (group.id === 'web2_group_administration' || group.label?.toLowerCase() === 'administration') {
        const children = group.children?.map((c) =>
          c.path === '/admin/projects' ? { ...c, label: 'Team Lead Assignment' } : c
        );
        return { ...group, children };
      }

      // 4. Ensure Conversions has My Assigned Work for employees
      if (group.id === 'web2_group_conversions' || group.label?.toLowerCase() === 'conversions') {
        const hasMyWork = group.children?.some((c) => c.path === '/my-work');
        if (!hasMyWork) {
          const children = [...(group.children || [])];
          children.unshift({
            id: 'web2_my_assigned_work',
            label: 'My Assigned Work',
            icon: 'Briefcase',
            path: '/my-work',
            order: 1,
            isVisible: true,
            permissions: ['conversions.view'],
            openInNewTab: false,
          });
          return { ...group, children };
        }
      }

      return group;
    });

    // Permission filtering & empty parent group pruning
    const isPermitted = (item: MenuItem): boolean => {
      if (!user) return true; // If user profile is not yet loaded, avoid blanking during initial load
      if (user.isPlatformAdmin) return true;
      if (!item.permissions || item.permissions.length === 0) return true;
      return item.permissions.some((perm) => hasPermission(perm));
    };

    const filterTree = (items: MenuItem[]): MenuItem[] => {
      return items
        .filter(isPermitted)
        .map((item) => {
          if (item.children && item.children.length > 0) {
            const filteredChildren = filterTree(item.children);
            return { ...item, children: filteredChildren };
          }
          return item;
        })
        .filter((item) => {
          if (!item.path) {
            return Boolean(item.children && item.children.length > 0);
          }
          return true;
        });
    };

    const filtered = filterTree(processed);
    filtered.sort((a, b) => (a.order || 0) - (b.order || 0));

    return filtered;
  }, [backendNavNodes, user, hasPermission]);

  const navigationData: NavigationData = useMemo(() => ({
    topNav: [],
    sidebarNav,
    secondaryNav: {},
    contextualNav: [],
    personalization: {
      pinnedItems: [],
      recentItems: [],
      suggestedItems: [],
    },
    metadata: {
      totalItems: sidebarNav.length,
      isDefault: false,
      lastUpdated: new Date().toISOString(),
    },
  }), [sidebarNav]);

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <NavigationContext.Provider
      value={{
        sidebarNav,
        navigation: navigationData,
        loading: isLoading,
        error: (error as Error) || null,
        refreshNavigation: handleRefresh,
        selectedItemId,
        setSelectedItemId,
        addItem: () => ({ id: '', label: '', icon: '', path: '', isVisible: true, order: 0 }),
        updateItem: () => {},
        deleteItem: () => ({ success: true }),
        moveItem: () => ({ success: true }),
        reorderSibling: () => {},
        duplicateItem: () => null,
        resetToDefault: () => {},
        saveChanges: handleRefresh,
        isDirty: false,
        sectionTitle: 'Dashboard',
        pageTitle: 'Dashboard',
        breadcrumbs: [{ label: 'Dashboard' }],
        currentItem: null,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

const defaultContextValue: NavigationContextType = {
  sidebarNav: [],
  navigation: {
    topNav: [],
    sidebarNav: [],
    secondaryNav: {},
    contextualNav: [],
    personalization: { pinnedItems: [], recentItems: [], suggestedItems: [] },
    metadata: { totalItems: 0, isDefault: true, lastUpdated: new Date().toISOString() },
  },
  loading: false,
  error: null,
  refreshNavigation: async () => {},
  selectedItemId: null,
  setSelectedItemId: () => {},
  addItem: () => ({ id: '', label: '', icon: '', path: '', isVisible: true, order: 0 }),
  updateItem: () => {},
  deleteItem: () => ({ success: false }),
  moveItem: () => ({ success: false }),
  reorderSibling: () => {},
  duplicateItem: () => null,
  resetToDefault: () => {},
  saveChanges: async () => {},
  isDirty: false,
  sectionTitle: 'Dashboard',
  pageTitle: 'Dashboard',
  breadcrumbs: [{ label: 'Dashboard' }],
  currentItem: null,
};

function useSafePathname(): string {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const location = useLocation();
    return location.pathname;
  } catch {
    return typeof window !== 'undefined' ? window.location.pathname : '/';
  }
}

export const useNavigationContext = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  const pathname = useSafePathname();
  const base = context || defaultContextValue;

  const { sectionTitle, pageTitle, breadcrumbs, currentItem } = useMemo(() => {
    return resolveNavigationContext(base.sidebarNav, pathname);
  }, [base.sidebarNav, pathname]);

  return {
    ...base,
    sectionTitle,
    pageTitle,
    breadcrumbs,
    currentItem,
  };
};
