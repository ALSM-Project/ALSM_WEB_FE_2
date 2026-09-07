import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MenuItem, NavigationData } from '@/features/menus/types/menu';
import {
  DEFAULT_STAFF_SIDEBAR_NAV,
  findMenuItemInTree,
  isDescendant,
  removeItemFromTree,
  insertItemInTree,
} from '@/features/menus/utils/navigationTreeUtils';
import { apiClient } from '@/services/api/apiClient';

const LOCAL_STORAGE_KEY = 'alsm_staff_navigation_tree_v1';

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
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

function loadInitialTree(): MenuItem[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load navigation tree from storage:', e);
  }
  return DEFAULT_STAFF_SIDEBAR_NAV;
}

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarNav, setSidebarNav] = useState<MenuItem[]>(loadInitialTree);
  const [selectedItemId, setSelectedItemId] = useState<string | null>('dashboard');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sidebarNav));
    } catch (e) {
      console.error('Failed to persist staff navigation tree:', e);
    }
  }, [sidebarNav]);

  const addItem = useCallback((itemData: Partial<MenuItem>, parentId?: string | null): MenuItem => {
    const newId = itemData.id || `menu-${Date.now()}`;
    const newItem: MenuItem = {
      id: newId,
      label: itemData.label || 'New Menu Item',
      icon: itemData.icon || 'FileText',
      path: itemData.path || '/new-page',
      parentId: parentId || undefined,
      isVisible: itemData.isVisible !== undefined ? itemData.isVisible : true,
      order: itemData.order || 99,
      badge: itemData.badge,
      badgeColor: itemData.badgeColor,
    };

    setSidebarNav((prev) => insertItemInTree(prev, newItem, parentId));
    setSelectedItemId(newId);
    setIsDirty(true);
    return newItem;
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<MenuItem>) => {
    setSidebarNav((prev) => {
      const updateRecursive = (items: MenuItem[]): MenuItem[] => {
        return items.map((item) => {
          if (item.id === id) {
            return { ...item, ...updates };
          }
          if (item.children && item.children.length > 0) {
            return { ...item, children: updateRecursive(item.children) };
          }
          return item;
        });
      };
      return updateRecursive(prev);
    });
    setIsDirty(true);
  }, []);

  const deleteItem = useCallback((id: string): { success: boolean; error?: string } => {
    let checkError: string | undefined = undefined;

    setSidebarNav((prev) => {
      const itemToDelete = findMenuItemInTree(prev, id);
      if (itemToDelete && itemToDelete.children && itemToDelete.children.length > 0) {
        checkError = 'Cannot delete a menu item with children.';
        return prev;
      }
      return removeItemFromTree(prev, id);
    });

    if (checkError) {
      return { success: false, error: checkError };
    }

    setSelectedItemId(null);
    setIsDirty(true);
    return { success: true };
  }, []);

  const moveItem = useCallback((id: string, newParentId: string | null): { success: boolean; error?: string } => {
    if (id === newParentId) {
      return { success: false, error: 'An item cannot be its own parent.' };
    }

    let validationError: string | undefined = undefined;

    setSidebarNav((prev) => {
      if (newParentId && isDescendant(prev, id, newParentId)) {
        validationError = 'An item cannot be moved under its own descendant.';
        return prev;
      }

      const itemToMove = findMenuItemInTree(prev, id);
      if (!itemToMove) {
        validationError = 'Item not found.';
        return prev;
      }

      const cleanedTree = removeItemFromTree(prev, id);
      return insertItemInTree(cleanedTree, itemToMove, newParentId);
    });

    if (validationError) {
      return { success: false, error: validationError };
    }

    setIsDirty(true);
    return { success: true };
  }, []);

  const reorderSibling = useCallback((id: string, direction: 'up' | 'down') => {
    setSidebarNav((prev) => {
      const reorderInList = (list: MenuItem[]): MenuItem[] => {
        const index = list.findIndex((item) => item.id === id);
        if (index === -1) {
          return list.map((item) => ({
            ...item,
            children: item.children ? reorderInList(item.children) : undefined,
          }));
        }

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= list.length) return list;

        const updated = [...list];
        const temp = updated[index];
        updated[index] = updated[newIndex];
        updated[newIndex] = temp;
        return updated;
      };

      return reorderInList(prev);
    });
    setIsDirty(true);
  }, []);

  const duplicateItem = useCallback((id: string): MenuItem | null => {
    let duplicated: MenuItem | null = null;

    setSidebarNav((prev) => {
      const target = findMenuItemInTree(prev, id);
      if (!target) return prev;

      const copy: MenuItem = {
        ...JSON.parse(JSON.stringify(target)),
        id: `${target.id}-copy-${Date.now()}`,
        label: `${target.label} (Copy)`,
      };
      duplicated = copy;

      return insertItemInTree(prev, copy, target.parentId || null);
    });

    if (duplicated) {
      setSelectedItemId((duplicated as MenuItem).id);
      setIsDirty(true);
    }
    return duplicated;
  }, []);

  const resetToDefault = useCallback(() => {
    setSidebarNav(DEFAULT_STAFF_SIDEBAR_NAV);
    setSelectedItemId('dashboard');
    setIsDirty(true);
  }, []);

  const saveChanges = useCallback(async () => {
    try {
      setLoading(true);
      await apiClient.post('/menus/save-staff', { sidebarNav });
      setIsDirty(false);
    } catch (e) {
      console.warn('Backend staff menu save failed, saved locally:', e);
      setIsDirty(false);
    } finally {
      setLoading(false);
    }
  }, [sidebarNav]);

  const navigationData: NavigationData = {
    topNav: [],
    sidebarNav,
    secondaryNav: {},
    contextualNav: [],
    personalization: {
      pinnedItems: sidebarNav.filter((i) => i.isPinned),
      recentItems: [],
      suggestedItems: [],
    },
    metadata: {
      totalItems: sidebarNav.length,
      isDefault: false,
      lastUpdated: new Date().toISOString(),
    },
  };

  return (
    <NavigationContext.Provider
      value={{
        sidebarNav,
        navigation: navigationData,
        loading,
        selectedItemId,
        setSelectedItemId,
        addItem,
        updateItem,
        deleteItem,
        moveItem,
        reorderSibling,
        duplicateItem,
        resetToDefault,
        saveChanges,
        isDirty,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigationContext = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within NavigationProvider');
  }
  return context;
};
