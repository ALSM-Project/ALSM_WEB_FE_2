import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { MenuItem, NavigationData } from '@/features/menus/types/menu';
import { resolveNavigationContext, BreadcrumbNode } from '@/shared/navigation/breadcrumbUtils';
import { useNavigationQuery } from '@/features/navigation/hooks/useNavigationQuery';
import { BackendNavItem } from '@/features/navigation/api/navigation.api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { canUseSupport } from '@/features/support/state/supportAccess';

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
  dynamicLabels: Record<string, string>;
  setDynamicLabel: (key: string, label: string) => void;
  removeDynamicLabel: (key: string) => void;
  customBreadcrumbs: BreadcrumbNode[] | null;
  setCustomBreadcrumbs: (crumbs: BreadcrumbNode[] | null) => void;
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
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({});
  const [customBreadcrumbs, setCustomBreadcrumbsState] = useState<BreadcrumbNode[] | null>(null);

  const setDynamicLabel = useCallback((key: string, label: string) => {
    if (!key || !label) return;
    setDynamicLabels((prev) => {
      if (prev[key] === label) return prev;
      return { ...prev, [key]: label };
    });
  }, []);

  const removeDynamicLabel = useCallback((key: string) => {
    if (!key) return;
    setDynamicLabels((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const setCustomBreadcrumbs = useCallback((crumbs: BreadcrumbNode[] | null) => {
    setCustomBreadcrumbsState(crumbs);
  }, []);

  const sidebarNav = useMemo(() => {
    const EXCLUDED_IDS = new Set([
      'web2_partner_create',
      'web2_group_organization',
      'web2_conv_temporary_roles',
      'web2_tl_temporary_roles',
      'web2_ops_temporary_roles',
      'web2_tl_members',
      'web2_online_meetings',
    ]);

    let mapped = backendNavNodes
      .filter((n) => !EXCLUDED_IDS.has(n.id) && n.route !== '/partners/new' && n.parentId !== 'web2_group_organization')
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
    // The Support directory is independent from the Platform Admin Organisation directory.
    supportGroup.children = supportGroup.children?.map((child) =>
      child.path === '/admin/organizations'
        ? { ...child, path: '/support', permissions: ['organizations.impersonate'] }
        : child
    );
    const hasOrgAccess = supportGroup.children?.some((c) => c.path === '/support');
    if (!hasOrgAccess) {
      supportGroup.children = [
        ...(supportGroup.children || []),
        {
          id: 'web2_support_org_access',
          label: 'Organisation Access',
          icon: 'Building2',
          path: '/support',
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

    const processed = mapped
      .filter((g) => g.id !== 'web2_group_conversions' && g.label?.toLowerCase() !== 'conversions')
      .map((group) => {
      // 1. Ensure Partner Management has Partner Projects, Partner Directory, and Demo Projects
      if (group.id === 'web2_group_partners' || group.label?.toLowerCase() === 'partner management') {
        const hasDirectory = group.children?.some((c) => c.path === '/partners');
        const hasProjects = group.children?.some((c) => c.path === '/partners/projects');
        const hasDemoProjects = group.children?.some((c) => c.path === '/partners/projects?scope=demo');
        let children = [...(group.children || [])];

        if (!hasProjects) {
          children.unshift({
            id: 'web2_partner_projects',
            label: 'Partner Projects',
            icon: 'FolderKanban',
            path: '/partners/projects',
            order: 1,
            isVisible: true,
            permissions: ['partner.view'],
            openInNewTab: false,
          });
        }

        if (!hasDirectory) {
          children.push({
            id: 'web2_partner_list',
            label: 'Partner Directory',
            icon: 'Building2',
            path: '/partners',
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
          children = children
            .filter(
              (c) =>
                c.id !== 'web2_tl_members' &&
                c.id !== 'web2_tl_temporary_roles' &&
                c.path !== '/admin/users' &&
                c.path !== '/admin/temporary-roles'
            )
            .map((c) =>
              c.path === '/team-lead/projects' ? { ...c, label: 'Employee Allocation' } : c
            );

        const hasMeetings = children.some((c) => c.path === '/enterprise/meetings');
        if (!hasMeetings) {
          children.push({
            id: 'web2_tl_meetings',
            label: 'Online Meetings',
            icon: 'Video',
            path: '/enterprise/meetings',
            order: 3,
            isVisible: true,
            permissions: ['meetings.view', 'meetings.create', 'teams.manage'],
            openInNewTab: false,
          });
        }

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

        const hasOffboardingApprovals = children.some((c) => c.path === '/team-lead/offboarding-approvals');
        if (!hasOffboardingApprovals) {
          children.push({
            id: 'web2_tl_offboarding_approvals',
            label: 'Offboarding Approvals',
            icon: 'UserMinus',
            path: '/team-lead/offboarding-approvals',
            order: 2.6,
            isVisible: true,
            permissions: ['users.offboard'],
            openInNewTab: false,
          });
        }

        }
        return { ...group, children };
      }

      // 3. Ensure Administration displays Team Lead Assignment for project allocation and Bank Accounts
      if (group.id === 'web2_group_administration' || group.label?.toLowerCase() === 'administration') {
        let children = group.children?.map((c) =>
          c.path === '/admin/projects' ? { ...c, label: 'Team Lead Assignment' } : c
        ) || [];

        // Flatten any nested subgroups (such as Finance & Payments) to expose their pages directly
        const flattenedChildren: MenuItem[] = [];
        for (const child of children) {
          if (child.children && child.children.length > 0 && !child.path) {
            flattenedChildren.push(...child.children);
          } else if (child.path) {
            flattenedChildren.push(child);
          }
        }
        children = flattenedChildren.filter(
          (c) =>
            c.path !== '/admin/bank-accounts' &&
            c.path !== '/administration/finance/bank-accounts' &&
            c.path !== '/admin/finance/bank-accounts'
        );

        return { ...group, children };
      }

      // 4. Ensure CRM & Sales has Meeting Requests, Quotes & Contracts, and Service Usage & Quotas
      if (group.id === 'web2_group_commercial' || group.label?.toLowerCase() === 'crm & sales') {
        let children = [...(group.children || [])];

        // Ensure Meeting Requests item
        const meetingIdx = children.findIndex(
          (c) =>
            c.id === 'web2_customer_meetings' ||
            c.id === 'web2_meeting_requests' ||
            c.path === '/sales/meeting-requests' ||
            c.path === '/admin/billing/quotes'
        );
        if (meetingIdx !== -1) {
          children[meetingIdx] = {
            ...children[meetingIdx],
            id: 'web2_meeting_requests',
            label: 'Meeting Requests',
            path: '/sales/meeting-requests',
            icon: 'Calendar',
            order: 6,
          };
        } else {
          children.push({
            id: 'web2_meeting_requests',
            label: 'Meeting Requests',
            icon: 'Calendar',
            path: '/sales/meeting-requests',
            order: 6,
            isVisible: true,
            permissions: ['billing.quotes.manage', 'sales.leads.view'],
            openInNewTab: false,
          });
        }

        // Ensure Service Usage & Quotas item
        const usageIdx = children.findIndex(
          (c) =>
            c.id === 'web2_service_usage' ||
            c.path === '/admin/billing/usage' ||
            c.path === '/billing/usage'
        );
        if (usageIdx !== -1) {
          children[usageIdx] = {
            ...children[usageIdx],
            label: 'Service Usage & Quotas',
            path: '/admin/billing/usage',
            icon: 'CreditCard',
            order: 7,
          };
        }

        // Ensure Quotes & Contracts item
        const hasQuotesAndContracts = children.some(
          (c) => c.id === 'web2_enterprise_quotes' && c.path === '/sales/enterprise-quotes'
        );
        if (!hasQuotesAndContracts) {
          children.push({
            id: 'web2_enterprise_quotes',
            label: 'Quotes & Contracts',
            icon: 'FileText',
            path: '/sales/enterprise-quotes',
            order: 8,
            isVisible: true,
            permissions: ['billing.quotes.manage', 'sales.leads.manage'],
            openInNewTab: false,
          });
        }

        return { ...group, children };
      }

      return group;
    });

    // Permission filtering & empty parent group pruning
    const isPermitted = (item: MenuItem): boolean => {
      if (item.path === '/support') return canUseSupport(user);
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
            filteredChildren.sort((a, b) => (a.order || 0) - (b.order || 0));
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
        dynamicLabels,
        setDynamicLabel,
        removeDynamicLabel,
        customBreadcrumbs,
        setCustomBreadcrumbs,
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
  dynamicLabels: {},
  setDynamicLabel: () => {},
  removeDynamicLabel: () => {},
  customBreadcrumbs: null,
  setCustomBreadcrumbs: () => {},
};

function useSafeLocation(): { pathname: string; search: string } {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const location = useLocation();
    return { pathname: location.pathname, search: location.search };
  } catch {
    if (typeof window !== 'undefined') {
      return { pathname: window.location.pathname, search: window.location.search };
    }
    return { pathname: '/', search: '' };
  }
}

export const useNavigationContext = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  const { pathname, search } = useSafeLocation();
  const base = context || defaultContextValue;

  const { sectionTitle, pageTitle, breadcrumbs, currentItem } = useMemo(() => {
    if (base.customBreadcrumbs) {
      const last = base.customBreadcrumbs[base.customBreadcrumbs.length - 1];
      return {
        sectionTitle: base.customBreadcrumbs[0]?.label || 'Dashboard',
        pageTitle: last?.label || 'Dashboard',
        breadcrumbs: base.customBreadcrumbs,
        currentItem: null,
      };
    }
    return resolveNavigationContext(base.sidebarNav, pathname, search, base.dynamicLabels);
  }, [base.sidebarNav, pathname, search, base.dynamicLabels, base.customBreadcrumbs]);

  return {
    ...base,
    sectionTitle,
    pageTitle,
    breadcrumbs,
    currentItem,
  };
};

export const useNavigation = useNavigationContext;
