import { MenuItem } from '../types/menu';

export const DEFAULT_STAFF_SIDEBAR_NAV: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Internal Dashboard',
    icon: 'LayoutDashboard',
    path: '/',
    isVisible: true,
    order: 1,
  },
  {
    id: 'conversion-queue',
    label: 'Conversion Queue',
    icon: 'Cpu',
    path: '/queue',
    isVisible: true,
    order: 2,
    badge: '12 Pending',
    badgeColor: '#0652CC',
  },
  {
    id: 'validation-ops',
    label: 'Rule & AI Validation',
    icon: 'ShieldCheck',
    path: '/validation',
    isVisible: true,
    order: 3,
  },
  {
    id: 'review-queue',
    label: 'Review Workflows',
    icon: 'ClipboardCheck',
    path: '/review',
    isVisible: true,
    order: 4,
  },
  {
    id: 'organisations',
    label: 'Organisations & Partners',
    icon: 'Building2',
    path: '/organisations',
    isVisible: true,
    order: 5,
    children: [
      {
        id: 'partners',
        label: 'Partners',
        icon: 'Handshake',
        path: '/organisations/partners',
        parentId: 'organisations',
        isVisible: true,
        order: 1,
        children: [
          {
            id: 'all-partners',
            label: 'All Partners',
            icon: 'List',
            path: '/organisations/partners',
            parentId: 'partners',
            isVisible: true,
            order: 1,
          },
          {
            id: 'create-partner',
            label: 'Create Partner',
            icon: 'UserPlus',
            path: '/organisations/partners/new',
            parentId: 'partners',
            isVisible: true,
            order: 2,
          },
        ],
      },
      {
        id: 'departments',
        label: 'Departments',
        icon: 'Layers',
        path: '/organisations/departments',
        parentId: 'organisations',
        isVisible: true,
        order: 2,
      },
      {
        id: 'teams',
        label: 'Teams',
        icon: 'Users',
        path: '/organisations/teams',
        parentId: 'organisations',
        isVisible: true,
        order: 3,
      },
    ],
  },
  {
    id: 'diagnostics',
    label: 'System Diagnostics',
    icon: 'Activity',
    path: '/diagnostics',
    isVisible: true,
    order: 6,
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: 'Workflow',
    path: '/admin/menu-builder',
    isVisible: true,
    order: 7,
    children: [
      {
        id: 'menu-builder',
        label: 'Menu Builder',
        icon: 'Workflow',
        path: '/admin/menu-builder',
        parentId: 'admin',
        isVisible: true,
        order: 1,
        badge: 'Admin Tool',
        badgeColor: '#8B5CF6',
      },
      {
        id: 'roles',
        label: 'Roles',
        icon: 'Shield',
        path: '/admin/roles',
        parentId: 'admin',
        isVisible: true,
        order: 2,
      },
      {
        id: 'users',
        label: 'Users',
        icon: 'Users',
        path: '/admin/users',
        parentId: 'admin',
        isVisible: true,
        order: 3,
      },
    ],
  },
  {
    id: 'settings',
    label: 'Staff Settings',
    icon: 'Settings',
    path: '/account/security/password',
    isVisible: true,
    order: 8,
  },
];

export function findMenuItemInTree(items: MenuItem[], id: string): MenuItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children && item.children.length > 0) {
      const found = findMenuItemInTree(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function isDescendant(items: MenuItem[], targetId: string, candidateId: string): boolean {
  if (targetId === candidateId) return true;
  const targetItem = findMenuItemInTree(items, targetId);
  if (!targetItem || !targetItem.children) return false;

  for (const child of targetItem.children) {
    if (child.id === candidateId || isDescendant([child], child.id, candidateId)) {
      return true;
    }
  }
  return false;
}

export function flattenMenuItems(items: MenuItem[], depth = 0, prefix = ''): Array<{ item: MenuItem; depth: number; label: string }> {
  let result: Array<{ item: MenuItem; depth: number; label: string }> = [];

  for (const item of items) {
    const displayLabel = prefix ? `${prefix} > ${item.label}` : item.label;
    result.push({ item, depth, label: displayLabel });
    if (item.children && item.children.length > 0) {
      result = result.concat(flattenMenuItems(item.children, depth + 1, displayLabel));
    }
  }

  return result;
}

export function removeItemFromTree(items: MenuItem[], id: string): MenuItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      children: item.children ? removeItemFromTree(item.children, id) : undefined,
    }));
}

export function insertItemInTree(items: MenuItem[], itemToInsert: MenuItem, parentId?: string | null): MenuItem[] {
  if (!parentId) {
    return [...items, { ...itemToInsert, parentId: undefined }];
  }

  return items.map((item) => {
    if (item.id === parentId) {
      const updatedChildren = item.children ? [...item.children, { ...itemToInsert, parentId }] : [{ ...itemToInsert, parentId }];
      return { ...item, children: updatedChildren };
    }

    if (item.children && item.children.length > 0) {
      return { ...item, children: insertItemInTree(item.children, itemToInsert, parentId) };
    }

    return item;
  });
}

export function findSiblingsOfItem(items: MenuItem[], id: string): { siblings: MenuItem[]; index: number } | null {
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === id) {
      return { siblings: items, index: i };
    }
    const children = items[i].children;
    if (children && children.length > 0) {
      const found = findSiblingsOfItem(children, id);
      if (found) return found;
    }
  }
  return null;
}
