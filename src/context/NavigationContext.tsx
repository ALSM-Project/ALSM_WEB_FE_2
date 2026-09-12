import React, { createContext, useContext, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { MenuItem, NavigationData } from '@/features/menus/types/menu';
import { resolveNavigationContext, BreadcrumbNode } from '@/shared/navigation/breadcrumbUtils';
import { useNavigationQuery } from '@/features/navigation/hooks/useNavigationQuery';
import { BackendNavItem } from '@/features/navigation/api/navigation.api';

export interface NavigationContextType {
  sidebarNav: MenuItem[];
  navigation: NavigationData | null;
  loading: boolean;
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
    children: node.children?.map(mapBackendNodeToMenuItem),
  };
}

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: backendNavNodes = [], isLoading } = useNavigationQuery('WEB_2');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const sidebarNav = useMemo(() => {
    return backendNavNodes.map(mapBackendNodeToMenuItem);
  }, [backendNavNodes]);

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

  return (
    <NavigationContext.Provider
      value={{
        sidebarNav,
        navigation: navigationData,
        loading: isLoading,
        selectedItemId,
        setSelectedItemId,
        addItem: () => ({ id: '', label: '', icon: '', path: '', isVisible: true, order: 0 }),
        updateItem: () => {},
        deleteItem: () => ({ success: true }),
        moveItem: () => ({ success: true }),
        reorderSibling: () => {},
        duplicateItem: () => null,
        resetToDefault: () => {},
        saveChanges: async () => {},
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

