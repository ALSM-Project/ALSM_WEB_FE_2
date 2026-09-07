import { MenuItem } from '@/features/menus/types/menu';

export interface BreadcrumbNode {
  label: string;
  path?: string;
}

function findMenuBreadcrumbPath(
  items: MenuItem[],
  currentPath: string,
  ancestors: MenuItem[] = []
): MenuItem[] | null {
  for (const item of items) {
    const currentAncestors = [...ancestors, item];

    if (item.path && (item.path === currentPath || (item.path !== '/' && currentPath.startsWith(item.path)))) {
      return currentAncestors;
    }

    if (item.children && item.children.length > 0) {
      const found = findMenuBreadcrumbPath(item.children, currentPath, currentAncestors);
      if (found) return found;
    }
  }

  return null;
}

export function getBreadcrumbsFromRoute(
  pathname: string,
  menuItems: MenuItem[] = []
): BreadcrumbNode[] {
  const menuMatch = findMenuBreadcrumbPath(menuItems, pathname);
  if (menuMatch && menuMatch.length > 0) {
    return menuMatch.map((item, index) => ({
      label: item.label,
      path: index < menuMatch.length - 1 ? item.path : undefined,
    }));
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return [{ label: 'Internal Dashboard' }];
  }

  const result: BreadcrumbNode[] = [];
  let accumulatedPath = '';

  const segmentLabels: Record<string, string> = {
    queue: 'Conversion Queue',
    validation: 'Rule & AI Validation',
    review: 'Review Workflows',
    organisations: 'Organisations & Partners',
    partners: 'Partners',
    departments: 'Departments',
    teams: 'Teams',
    diagnostics: 'System Diagnostics',
    admin: 'Administration',
    'menu-builder': 'Menu Builder',
    account: 'Account & Security',
    security: 'Security',
    password: 'Password',
  };

  segments.forEach((seg, index) => {
    accumulatedPath += `/${seg}`;
    const isLast = index === segments.length - 1;

    let label = segmentLabels[seg.toLowerCase()];
    if (!label) {
      label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
    }

    result.push({
      label,
      path: isLast ? undefined : accumulatedPath,
    });
  });

  return result;
}
