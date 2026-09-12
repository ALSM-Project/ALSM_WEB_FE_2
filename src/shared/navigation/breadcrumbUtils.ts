import { MenuItem } from '@/features/menus/types/menu';

export interface BreadcrumbNode {
  label: string;
  path?: string;
}

export interface NavigationContextResult {
  sectionTitle: string;
  pageTitle: string;
  breadcrumbs: BreadcrumbNode[];
  currentItem: MenuItem | null;
}

function findMenuAncestors(
  items: MenuItem[],
  targetPath: string,
  ancestors: MenuItem[] = []
): MenuItem[] | null {
  for (const item of items) {
    const currentAncestors = [...ancestors, item];

    if (item.path) {
      const itemClean = item.path.replace(/\/+$/, '') || '/';
      const targetClean = targetPath.replace(/\/+$/, '') || '/';
      if (itemClean === targetClean) {
        return currentAncestors;
      }
    }

    if (item.children && item.children.length > 0) {
      const found = findMenuAncestors(item.children, targetPath, currentAncestors);
      if (found) return found;
    }
  }

  return null;
}

function findMenuAncestorsByPrefix(
  items: MenuItem[],
  targetPath: string,
  ancestors: MenuItem[] = []
): MenuItem[] | null {
  let bestMatch: MenuItem[] | null = null;
  let maxMatchLength = 0;

  for (const item of items) {
    const currentAncestors = [...ancestors, item];

    if (item.path && item.path !== '/') {
      const itemClean = item.path.replace(/\/+$/, '');
      const targetClean = targetPath.replace(/\/+$/, '');
      if (targetClean.startsWith(itemClean) && itemClean.length > maxMatchLength) {
        bestMatch = currentAncestors;
        maxMatchLength = itemClean.length;
      }
    }

    if (item.children && item.children.length > 0) {
      const childMatch = findMenuAncestorsByPrefix(item.children, targetPath, currentAncestors);
      if (childMatch && childMatch.length > 0) {
        const lastChild = childMatch[childMatch.length - 1];
        if (lastChild.path) {
          const childClean = lastChild.path.replace(/\/+$/, '');
          if (childClean.length > maxMatchLength) {
            bestMatch = childMatch;
            maxMatchLength = childClean.length;
          }
        }
      }
    }
  }

  return bestMatch;
}

export function resolveNavigationContext(
  sidebarNav: MenuItem[] = [],
  pathname: string = '/'
): NavigationContextResult {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  let matchChain = findMenuAncestors(sidebarNav, cleanPath);
  if (!matchChain) {
    matchChain = findMenuAncestorsByPrefix(sidebarNav, cleanPath);
  }

  if (matchChain && matchChain.length > 0) {
    const rootParent = matchChain[0];
    const currentItem = matchChain[matchChain.length - 1];
    const sectionTitle = rootParent.label;
    const pageTitle = currentItem.label;

    const breadcrumbs: BreadcrumbNode[] = matchChain.map((item, index) => ({
      label: item.label,
      path: index < matchChain.length - 1 ? item.path : undefined,
    }));

    return {
      sectionTitle,
      pageTitle,
      breadcrumbs,
      currentItem,
    };
  }

  // Fallback for non-menu routes
  const segments = cleanPath.split('/').filter(Boolean);
  if (segments.length === 0) {
    return {
      sectionTitle: 'Dashboard',
      pageTitle: 'Dashboard',
      breadcrumbs: [{ label: 'Dashboard' }],
      currentItem: null,
    };
  }

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
    administration: 'Administration',
    'menu-builder': 'Menu Builder',
    roles: 'Roles & Permissions',
    users: 'Users',
    account: 'Staff Settings',
    security: 'Security',
    password: 'Password',
  };

  const firstSeg = segments[0].toLowerCase();
  const sectionTitle =
    segmentLabels[firstSeg] ||
    segments[0].charAt(0).toUpperCase() + segments[0].slice(1).replace(/-/g, ' ');

  const fallbackBreadcrumbs: BreadcrumbNode[] = [];
  let accum = '';
  segments.forEach((seg, idx) => {
    accum += `/${seg}`;
    const isLast = idx === segments.length - 1;
    const label =
      segmentLabels[seg.toLowerCase()] ||
      seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');

    fallbackBreadcrumbs.push({
      label,
      path: isLast ? undefined : accum,
    });
  });

  const lastNode = fallbackBreadcrumbs[fallbackBreadcrumbs.length - 1];
  const pageTitle = lastNode ? lastNode.label : sectionTitle;

  return {
    sectionTitle,
    pageTitle,
    breadcrumbs: fallbackBreadcrumbs,
    currentItem: null,
  };
}

export function getBreadcrumbsFromRoute(
  pathname: string,
  menuItems: MenuItem[] = []
): BreadcrumbNode[] {
  return resolveNavigationContext(menuItems, pathname).breadcrumbs;
}

