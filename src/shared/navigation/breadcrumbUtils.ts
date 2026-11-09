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

// Helper to determine if a string is a raw ID (UUID, MongoDB ObjectId, or hash)
export function isEntityId(val: string): boolean {
  if (!val) return false;
  // UUID (v4/general)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) return true;
  // MongoDB ObjectId (24 hex characters)
  if (/^[0-9a-f]{24}$/i.test(val)) return true;
  // Numeric ID
  if (/^\d+$/.test(val)) return true;
  // Mixed hex or slug containing mostly numbers/dashes
  if (val.length >= 8 && /^[a-z0-9_-]+$/i.test(val) && (val.match(/\d/g) || []).length >= 3) return true;
  return false;
}

export function findMenuAncestors(
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

export function findMenuAncestorsByPrefix(
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

/**
 * Known valid routes in FE2 that breadcrumb parent links can safely point to.
 * This prevents generating broken 404 links like /admin, /team-lead, /sales, etc.
 */
export const VALID_NAVIGABLE_ROUTES = new Set<string>([
  '/',
  '/dashboard',
  '/support',
  '/queue',
  '/system/queue',
  '/my-work',
  '/employee/work-queue',
  '/validation',
  '/review',
  '/team-lead/projects',
  '/team-lead/resource-transfers',
  '/team-lead/resource-transfers/new',
  '/team-lead/offboarding-approvals',
  '/team-lead/offboarding-approvals/create',
  '/admin/offboarding-approvals',
  '/admin/offboarding-approvals/create',
  '/team-performance',
  '/team-performance/monitor',
  '/sales/leads',
  '/crm/leads',
  '/leads',
  '/sales/pipeline',
  '/crm/pipeline',
  '/sales/reports',
  '/reports/sales',
  '/reports/team-performance',
  '/sales/discounts',
  '/admin/projects',
  '/admin/engagement-types',
  '/admin/organizations',
  '/organisations',
  '/admin/users',
  '/admin/roles',
  '/admin/temporary-roles',
  '/admin/temporary-roles/grant',
  '/rbac/temporary-roles/grant',
  '/rbac/temporary-roles',
  '/admin/menu-builder',
  '/admin/revenue',
  '/admin/finance/revenue',
  '/admin/bank-accounts',
  '/administration/finance/bank-accounts',
  '/admin/finance/bank-accounts',
  '/admin/audit-logs',
  '/admin/web3',
  '/admin/company-profile',
  '/admin/settings',
  '/diagnostics',
  '/billing/invoices',
  '/admin/billing/invoices',
  '/billing/usage',
  '/admin/billing/usage',
  '/billing/quotes',
  '/admin/billing/quotes',
  '/sales/meeting-requests',
  '/sales/meeting-requests/new',
  '/enterprise/meetings',
  '/meetings',
  '/enterprise/meetings/create',
  '/meetings/create',
  '/partners',
  '/partners/new',
  '/partners/projects',
  '/partners/projects/new',
  '/account/security/password',
  '/forbidden',
]);

/**
 * Checks whether a path is a valid navigable route (static or dynamic) in FE2.
 */
export function isValidNavigablePath(path: string): boolean {
  if (!path) return false;
  if (VALID_NAVIGABLE_ROUTES.has(path)) return true;
  // Dynamic routes in FE2
  if (/^\/admin\/organizations\/[^/]+$/.test(path)) return true;
  if (/^\/(?:sales|crm)\/leads\/[^/]+$/.test(path)) return true;
  if (/^\/partners\/[^/]+$/.test(path)) return true;
  if (/^\/partners\/projects\/[^/]+$/.test(path)) return true;
  if (/^\/partners\/projects\/[^/]+\/workspace$/.test(path)) return true;
  if (/^\/partners\/projects\/[^/]+\/upload$/.test(path)) return true;
  if (/^\/partners\/projects\/[^/]+\/items\/[^/]+\/review$/.test(path)) return true;
  if (/^\/admin\/projects\/[^/]+\/conversions\/[^/]+\/quality-review$/.test(path)) return true;
  return false;
}

/**
 * Resolves breadcrumb nodes, section title, and page title for any given route
 * across FE2 with enterprise hierarchy standardization and dynamic label resolution.
 */
export function resolveNavigationContext(
  sidebarNav: MenuItem[] = [],
  pathname: string = '/',
  search: string = '',
  dynamicLabels: Record<string, string> = {}
): NavigationContextResult {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const queryParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  // Helper to extract dynamic label with friendly fallback
  const getDynamic = (id: string | undefined, fallback: string): string => {
    if (!id) return fallback;
    if (dynamicLabels[id]) return dynamicLabels[id];
    // Check general fallback keys
    if (dynamicLabels['entity']) return dynamicLabels['entity'];
    return fallback;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. EXACT & DYNAMIC ROUTE HIERARCHY PATTERN MATCHING (Canonical Enterprise Specs)
  // ─────────────────────────────────────────────────────────────────────────────

  // 1. Dashboard
  if (cleanPath === '/' || cleanPath === '/dashboard') {
    return {
      sectionTitle: 'Dashboard',
      pageTitle: 'Dashboard',
      breadcrumbs: [{ label: 'Dashboard' }],
      currentItem: sidebarNav.find((g) => g.id === 'web2_group_dashboard')?.children?.[0] || null,
    };
  }

  // 2. Customer Support: Organisation Access
  if (cleanPath === '/support') {
    return {
      sectionTitle: 'Customer Support',
      pageTitle: 'Organisation Access',
      breadcrumbs: [{ label: 'Organisation Access' }],
      currentItem: null,
    };
  }

  // 3. Conversions & Operations
  if (cleanPath === '/queue' || cleanPath === '/system/queue') {
    return {
      sectionTitle: 'Operations',
      pageTitle: 'Conversion Queue',
      breadcrumbs: [{ label: 'Conversion Queue' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/validation') {
    return {
      sectionTitle: 'Operations',
      pageTitle: 'Rule & AI Validation',
      breadcrumbs: [{ label: 'Rule & AI Validation' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/my-work' || cleanPath === '/employee/work-queue') {
    return {
      sectionTitle: 'Conversions',
      pageTitle: 'My Assigned Work',
      breadcrumbs: [{ label: 'My Assigned Work' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/review') {
    return {
      sectionTitle: 'Conversions',
      pageTitle: 'Quality Review',
      breadcrumbs: [{ label: 'Quality Review' }],
      currentItem: null,
    };
  }

  // 4. Team Lead
  if (cleanPath === '/team-lead/projects') {
    return {
      sectionTitle: 'Team Lead',
      pageTitle: 'Employee Allocation',
      breadcrumbs: [{ label: 'Employee Allocation' }],
      currentItem: null,
    };
  }

  const projectTransferMatch = cleanPath.match(/^\/team-lead\/projects\/([^/]+)\/transfer$/);
  if (projectTransferMatch) {
    return {
      sectionTitle: 'Team Lead',
      pageTitle: 'Transfer Project Ownership',
      breadcrumbs: [
        { label: 'Employee Allocation', path: '/team-lead/projects' },
        { label: 'Transfer Ownership' },
      ],
      currentItem: null,
    };
  }

  const projectAllocateMatch = cleanPath.match(/^\/team-lead\/projects\/([^/]+)\/allocate$/);
  if (projectAllocateMatch) {
    return {
      sectionTitle: 'Team Lead',
      pageTitle: 'Staff Allocation Details',
      breadcrumbs: [
        { label: 'Employee Allocation', path: '/team-lead/projects' },
        { label: 'Staff Allocation' },
      ],
      currentItem: null,
    };
  }
  if (cleanPath === '/team-lead/resource-transfers/new') {
    return {
      sectionTitle: 'Team Lead',
      pageTitle: 'New Transfer Request',
      breadcrumbs: [
        { label: 'Transfer Approvals', path: '/team-lead/resource-transfers' },
        { label: 'New Transfer Request' },
      ],
      currentItem: null,
    };
  }

  const transferDetailMatch = cleanPath.match(/^\/team-lead\/resource-transfers\/([^\/]+)$/);
  if (transferDetailMatch && transferDetailMatch[1] !== 'new') {
    return {
      sectionTitle: 'Team Lead',
      pageTitle: 'Transfer Request Details',
      breadcrumbs: [
        { label: 'Transfer Approvals', path: '/team-lead/resource-transfers' },
        { label: 'Transfer Request Details' },
      ],
      currentItem: null,
    };
  }

  if (cleanPath === '/team-lead/resource-transfers') {
    return {
      sectionTitle: 'Team Lead',
      pageTitle: 'Transfer Approvals',
      breadcrumbs: [{ label: 'Transfer Approvals' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/team-lead/offboarding-approvals/create') {
    return {
      sectionTitle: 'Team Lead',
      pageTitle: 'Create Offboarding Request',
      breadcrumbs: [
        { label: 'Offboarding Approvals', path: '/team-lead/offboarding-approvals' },
        { label: 'Create Request' },
      ],
      currentItem: null,
    };
  }
  const teamLeadOffboardingDetailMatch = cleanPath.match(/^\/team-lead\/offboarding-approvals\/([^\/]+)$/);
  if (teamLeadOffboardingDetailMatch && teamLeadOffboardingDetailMatch[1] !== 'create') {
    return {
      sectionTitle: 'Team Lead',
      pageTitle: 'Request Details',
      breadcrumbs: [
        { label: 'Offboarding Approvals', path: '/team-lead/offboarding-approvals' },
        { label: 'Request Details' },
      ],
      currentItem: null,
    };
  }
  if (cleanPath === '/team-lead/offboarding-approvals') {
    return {
      sectionTitle: 'Team Lead',
      pageTitle: 'Offboarding Approvals',
      breadcrumbs: [{ label: 'Offboarding Approvals' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/admin/offboarding-approvals/create') {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Create Offboarding Request',
      breadcrumbs: [
        { label: 'Offboarding Approvals', path: '/admin/offboarding-approvals' },
        { label: 'Create Request' },
      ],
      currentItem: null,
    };
  }
  const adminOffboardingDetailMatch = cleanPath.match(/^\/admin\/offboarding-approvals\/([^\/]+)$/);
  if (adminOffboardingDetailMatch && adminOffboardingDetailMatch[1] !== 'create') {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Request Details',
      breadcrumbs: [
        { label: 'Offboarding Approvals', path: '/admin/offboarding-approvals' },
        { label: 'Request Details' },
      ],
      currentItem: null,
    };
  }
  if (cleanPath === '/admin/offboarding-approvals') {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Offboarding Approvals',
      breadcrumbs: [{ label: 'Offboarding Approvals' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/team-performance/monitor') {
    return {
      sectionTitle: 'Team Lead',
      pageTitle: 'Workload Monitor',
      breadcrumbs: [
        { label: 'Team Performance', path: '/team-performance' },
        { label: 'Workload Monitor' },
      ],
      currentItem: null,
    };
  }
  if (cleanPath === '/team-performance' || cleanPath === '/organisations/teams') {
    return {
      sectionTitle: 'Team Lead',
      pageTitle: 'Team Performance',
      breadcrumbs: [{ label: 'Team Performance' }],
      currentItem: null,
    };
  }

  // 5. CRM & Sales
  const leadDetailMatch = cleanPath.match(/^\/(?:sales|crm)\/leads\/([^/]+)$/);
  if (leadDetailMatch) {
    const leadId = leadDetailMatch[1];
    const leadName = getDynamic(leadId, dynamicLabels['lead'] || 'Lead Details');
    return {
      sectionTitle: 'CRM & Sales',
      pageTitle: leadName,
      breadcrumbs: [
        { label: 'Leads', path: '/sales/leads' },
        { label: leadName },
      ],
      currentItem: null,
    };
  }
  if (cleanPath === '/sales/leads' || cleanPath === '/crm/leads' || cleanPath === '/leads') {
    return {
      sectionTitle: 'CRM & Sales',
      pageTitle: 'Leads',
      breadcrumbs: [{ label: 'Leads' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/sales/pipeline' || cleanPath === '/crm/pipeline') {
    return {
      sectionTitle: 'CRM & Sales',
      pageTitle: 'Sales Pipeline',
      breadcrumbs: [{ label: 'Sales Pipeline' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/sales/reports' || cleanPath === '/reports/sales') {
    return {
      sectionTitle: 'CRM & Sales',
      pageTitle: 'Sales Reports',
      breadcrumbs: [{ label: 'Sales Reports' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/reports/team-performance') {
    return {
      sectionTitle: 'CRM & Sales',
      pageTitle: 'Team Performance',
      breadcrumbs: [{ label: 'Team Performance' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/sales/discounts') {
    return {
      sectionTitle: 'CRM & Sales',
      pageTitle: 'Discount Approvals',
      breadcrumbs: [{ label: 'Discount Approvals' }],
      currentItem: null,
    };
  }

  // 6. Partner Management (Nested & Dynamic routes)
  // Item Review: /partners/projects/:projectId/items/:itemId/review
  const itemReviewMatch = cleanPath.match(/^\/partners\/projects\/([^/]+)\/items\/([^/]+)\/review$/);
  if (itemReviewMatch) {
    const [, projectId, itemId] = itemReviewMatch;
    const projectName = getDynamic(projectId, dynamicLabels['project'] || 'Project Overview');
    const itemName = getDynamic(itemId, dynamicLabels['item'] || 'Item Review');
    return {
      sectionTitle: 'Partner Management',
      pageTitle: `Item Review: ${itemName}`,
      breadcrumbs: [
        { label: 'Partner Projects', path: '/partners/projects' },
        { label: projectName, path: `/partners/projects/${projectId}` },
        { label: 'Conversion Workspace', path: `/partners/projects/${projectId}/workspace` },
        { label: itemName },
      ],
      currentItem: null,
    };
  }

  // Workspace: /partners/projects/:projectId/workspace
  const workspaceMatch = cleanPath.match(/^\/partners\/projects\/([^/]+)\/workspace$/);
  if (workspaceMatch) {
    const projectId = workspaceMatch[1];
    const projectName = getDynamic(projectId, dynamicLabels['project'] || 'Project Overview');
    return {
      sectionTitle: 'Partner Management',
      pageTitle: 'Conversion Workspace',
      breadcrumbs: [
        { label: 'Partner Projects', path: '/partners/projects' },
        { label: projectName, path: `/partners/projects/${projectId}` },
        { label: 'Conversion Workspace' },
      ],
      currentItem: null,
    };
  }

  // Upload: /partners/projects/:projectId/upload
  const uploadMatch = cleanPath.match(/^\/partners\/projects\/([^/]+)\/upload$/);
  if (uploadMatch) {
    const projectId = uploadMatch[1];
    const projectName = getDynamic(projectId, dynamicLabels['project'] || 'Project Overview');
    return {
      sectionTitle: 'Partner Management',
      pageTitle: 'Upload Sources',
      breadcrumbs: [
        { label: 'Partner Projects', path: '/partners/projects' },
        { label: projectName, path: `/partners/projects/${projectId}` },
        { label: 'Upload Sources' },
      ],
      currentItem: null,
    };
  }

  // Create Partner Project: /partners/:partnerId/projects/new
  const createPartnerProjectMatch = cleanPath.match(/^\/partners\/([^/]+)\/projects\/new$/);
  if (createPartnerProjectMatch) {
    const partnerId = createPartnerProjectMatch[1];
    const partnerName = getDynamic(partnerId, dynamicLabels['partner'] || 'Partner Details');
    return {
      sectionTitle: 'Partner Management',
      pageTitle: 'Create Project',
      breadcrumbs: [
        { label: 'Partner Directory', path: '/partners' },
        { label: partnerName, path: `/partners/${partnerId}` },
        { label: 'Create Project' },
      ],
      currentItem: null,
    };
  }

  // Create Partner Project general: /partners/projects/new
  if (cleanPath === '/partners/projects/new') {
    return {
      sectionTitle: 'Partner Management',
      pageTitle: 'Create Project',
      breadcrumbs: [
        { label: 'Partner Projects', path: '/partners/projects' },
        { label: 'Create Project' },
      ],
      currentItem: null,
    };
  }

  // Project Overview: /partners/projects/:projectId
  const projectOverviewMatch = cleanPath.match(/^\/partners\/projects\/([^/]+)$/);
  if (projectOverviewMatch) {
    const projectId = projectOverviewMatch[1];
    const projectName = getDynamic(projectId, dynamicLabels['project'] || 'Project Overview');
    return {
      sectionTitle: 'Partner Management',
      pageTitle: projectName,
      breadcrumbs: [
        { label: 'Partner Projects', path: '/partners/projects' },
        { label: projectName },
      ],
      currentItem: null,
    };
  }

  // Partner Projects list: /partners/projects
  if (cleanPath === '/partners/projects') {
    const isDemo = queryParams.get('scope') === 'demo';
    const title = isDemo ? 'Demo Projects' : 'Partner Projects';
    return {
      sectionTitle: 'Partner Management',
      pageTitle: title,
      breadcrumbs: [{ label: title }],
      currentItem: null,
    };
  }

  // Partner Details: /partners/:partnerId
  const partnerDetailMatch = cleanPath.match(/^\/partners\/([^/]+)$/);
  if (partnerDetailMatch && partnerDetailMatch[1] !== 'new' && partnerDetailMatch[1] !== 'projects') {
    const partnerId = partnerDetailMatch[1];
    const partnerName = getDynamic(partnerId, dynamicLabels['partner'] || 'Partner Details');
    return {
      sectionTitle: 'Partner Management',
      pageTitle: partnerName,
      breadcrumbs: [
        { label: 'Partner Directory', path: '/partners' },
        { label: partnerName },
      ],
      currentItem: null,
    };
  }

  // Register Partner: /partners/new
  if (cleanPath === '/partners/new') {
    return {
      sectionTitle: 'Partner Management',
      pageTitle: 'Register Partner',
      breadcrumbs: [
        { label: 'Partner Directory', path: '/partners' },
        { label: 'Register Partner' },
      ],
      currentItem: null,
    };
  }

  // Partner Directory: /partners
  if (cleanPath === '/partners') {
    return {
      sectionTitle: 'Partner Management',
      pageTitle: 'Partner Directory',
      breadcrumbs: [{ label: 'Partner Directory' }],
      currentItem: null,
    };
  }

  // 7. Administration
  // Quality Review oversight: /admin/projects/:projectId/conversions/:conversionJobId/quality-review
  const adminQualityReviewMatch = cleanPath.match(
    /^\/admin\/projects\/([^/]+)\/conversions\/([^/]+)\/quality-review$/
  );
  if (adminQualityReviewMatch) {
    const [, projectId, conversionJobId] = adminQualityReviewMatch;
    const projectName = getDynamic(projectId, dynamicLabels['project'] || 'Project');
    const jobLabel = getDynamic(conversionJobId, dynamicLabels['job'] || 'Quality Review');
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Quality Review',
      breadcrumbs: [
        { label: 'Team Lead Assignment', path: '/admin/projects' },
        { label: `${projectName} - ${jobLabel}` },
      ],
      currentItem: null,
    };
  }

  // Organization Detail: /admin/organizations/:orgId
  const orgDetailMatch = cleanPath.match(/^\/admin\/organizations\/([^/]+)$/);
  if (orgDetailMatch) {
    const orgId = orgDetailMatch[1];
    const orgName = getDynamic(orgId, dynamicLabels['organization'] || dynamicLabels['org'] || 'Organization Details');
    return {
      sectionTitle: 'Administration',
      pageTitle: orgName,
      breadcrumbs: [
        { label: 'Organizations', path: '/admin/organizations' },
        { label: orgName },
      ],
      currentItem: null,
    };
  }

  if (
    cleanPath === '/admin/organizations' ||
    cleanPath === '/organisations' ||
    cleanPath === '/organisations/partners' ||
    cleanPath === '/organisations/departments'
  ) {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Organizations',
      breadcrumbs: [{ label: 'Organizations' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/admin/projects') {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Team Lead Assignment',
      breadcrumbs: [{ label: 'Team Lead Assignment' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/admin/engagement-types') {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Engagement Types',
      breadcrumbs: [{ label: 'Engagement Types' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/admin/users') {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'User Management',
      breadcrumbs: [{ label: 'User Management' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/admin/roles') {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Roles & Permissions',
      breadcrumbs: [{ label: 'Roles & Permissions' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/admin/temporary-roles/grant' || cleanPath === '/rbac/temporary-roles/grant') {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Grant Temporary Role',
      breadcrumbs: [
        { label: 'Temporary Roles', path: '/admin/temporary-roles' },
        { label: 'Grant Temporary Role' },
      ],
      currentItem: null,
    };
  }
  if (cleanPath === '/admin/temporary-roles' || cleanPath === '/rbac/temporary-roles') {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Temporary Roles',
      breadcrumbs: [{ label: 'Temporary Roles' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/admin/menu-builder') {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Menu Builder',
      breadcrumbs: [{ label: 'Menu Builder' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/admin/revenue' || cleanPath === '/admin/finance/revenue') {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Revenue Dashboard',
      breadcrumbs: [{ label: 'Revenue Dashboard' }],
      currentItem: null,
    };
  }
  if (
    cleanPath === '/administration/finance/bank-accounts' ||
    cleanPath === '/admin/finance/bank-accounts'
  ) {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Bank Accounts',
      breadcrumbs: [
        { label: 'Administration' },
        { label: 'Finance & Payments' },
        { label: 'Bank Accounts' },
      ],
      currentItem: null,
    };
  }
  if (cleanPath === '/admin/bank-accounts') {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Bank Accounts',
      breadcrumbs: [
        { label: 'Company Profile', path: '/admin/settings' },
        { label: 'Bank Accounts' },
      ],
      currentItem: null,
    };
  }
  if (cleanPath === '/admin/audit-logs') {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Audit Logs',
      breadcrumbs: [{ label: 'Audit Logs' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/admin/web3') {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Web3 Administration',
      breadcrumbs: [{ label: 'Web3 Administration' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/admin/company-profile' || cleanPath === '/admin/settings') {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'Company Profile',
      breadcrumbs: [{ label: 'Company Profile' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/diagnostics') {
    return {
      sectionTitle: 'Administration',
      pageTitle: 'System Diagnostics',
      breadcrumbs: [{ label: 'System Diagnostics' }],
      currentItem: null,
    };
  }

  // 8. Billing
  if (cleanPath === '/billing/invoices' || cleanPath === '/admin/billing/invoices') {
    return {
      sectionTitle: 'Billing',
      pageTitle: 'Invoices',
      breadcrumbs: [{ label: 'Invoices' }],
      currentItem: null,
    };
  }
  if (
    cleanPath === '/billing/usage' ||
    cleanPath === '/admin/billing/usage' ||
    cleanPath === '/admin/billing/service-usage' ||
    cleanPath === '/sales/service-usage'
  ) {
    return {
      sectionTitle: 'CRM & Sales',
      pageTitle: 'Service Usage & Quotas',
      breadcrumbs: [{ label: 'Service Usage & Quotas' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/sales/meeting-requests/new' || cleanPath === '/sales/consultations/new') {
    return {
      sectionTitle: 'CRM & Sales',
      pageTitle: 'New Consultation Request',
      breadcrumbs: [
        { label: 'Meeting Requests', path: '/sales/meeting-requests' },
        { label: 'New Consultation Request' },
      ],
      currentItem: null,
    };
  }
  if (cleanPath === '/sales/meeting-requests' || cleanPath === '/sales/consultations' || cleanPath === '/billing/quotes' || cleanPath === '/admin/billing/quotes') {
    return {
      sectionTitle: 'CRM & Sales',
      pageTitle: 'Meeting Requests',
      breadcrumbs: [{ label: 'Meeting Requests' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/sales/enterprise-quotes' || cleanPath === '/sales/quotes') {
    return {
      sectionTitle: 'CRM & Sales',
      pageTitle: 'Quotes & Contracts',
      breadcrumbs: [{ label: 'Quotes & Contracts' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/sales/contracts/new' || cleanPath === '/sales/enterprise-quotes/new-contract') {
    return {
      sectionTitle: 'CRM & Sales',
      pageTitle: 'New Enterprise Contract Wizard',
      breadcrumbs: [
        { label: 'Quotes & Contracts', path: '/sales/enterprise-quotes' },
        { label: 'New Contract Wizard' },
      ],
      currentItem: null,
    };
  }
  if (cleanPath.startsWith('/sales/contracts/') || cleanPath.startsWith('/sales/enterprise-contracts/')) {
    return {
      sectionTitle: 'CRM & Sales',
      pageTitle: 'Enterprise Contract Details',
      breadcrumbs: [
        { label: 'Quotes & Contracts', path: '/sales/enterprise-quotes' },
        { label: 'Contract Details' },
      ],
      currentItem: null,
    };
  }
  if (cleanPath === '/sales/contracts') {
    return {
      sectionTitle: 'CRM & Sales',
      pageTitle: 'Customer Contracts',
      breadcrumbs: [{ label: 'Customer Contracts' }],
      currentItem: null,
    };
  }

  // 9. Enterprise Collaboration (Online Meetings)
  if (cleanPath === '/enterprise/meetings/create' || cleanPath === '/meetings/create') {
    return {
      sectionTitle: 'Team Lead',
      pageTitle: 'Create Meeting Room',
      breadcrumbs: [
        { label: 'Online Meetings', path: '/enterprise/meetings' },
        { label: 'Create Meeting Room' },
      ],
      currentItem: null,
    };
  }
  if (cleanPath === '/enterprise/meetings' || cleanPath === '/meetings') {
    return {
      sectionTitle: 'Team Lead',
      pageTitle: 'Online Meetings',
      breadcrumbs: [{ label: 'Online Meetings' }],
      currentItem: null,
    };
  }

  // 10. Account Settings
  if (cleanPath === '/account/security/password') {
    return {
      sectionTitle: 'Account Settings',
      pageTitle: 'Password & Security',
      breadcrumbs: [{ label: 'Password & Security' }],
      currentItem: null,
    };
  }

  // 11. System & Miscellaneous
  if (cleanPath === '/forbidden') {
    return {
      sectionTitle: 'System',
      pageTitle: 'Access Restricted',
      breadcrumbs: [{ label: 'Access Restricted' }],
      currentItem: null,
    };
  }
  if (cleanPath === '/ci-status') {
    return {
      sectionTitle: 'Developer Tools',
      pageTitle: 'CI Status',
      breadcrumbs: [{ label: 'CI Status' }],
      currentItem: null,
    };
  }

  // 12. Generic Enterprise Entities (e.g. /users/:id, /organizations/:id, etc.)
  const userDetailMatch = cleanPath.match(/^\/users\/([^/]+)$/);
  if (userDetailMatch) {
    const userId = userDetailMatch[1];
    const userName = getDynamic(userId, dynamicLabels['user'] || 'User Details');
    return {
      sectionTitle: 'Administration',
      pageTitle: userName,
      breadcrumbs: [
        { label: 'User Management', path: '/admin/users' },
        { label: userName },
      ],
      currentItem: null,
    };
  }

  const genericOrgMatch = cleanPath.match(/^\/organizations\/([^/]+)$/);
  if (genericOrgMatch) {
    const orgId = genericOrgMatch[1];
    const orgName = getDynamic(orgId, dynamicLabels['organization'] || dynamicLabels['org'] || 'Organization Details');
    return {
      sectionTitle: 'Administration',
      pageTitle: orgName,
      breadcrumbs: [
        { label: 'Organizations', path: '/admin/organizations' },
        { label: orgName },
      ],
      currentItem: null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SIDEBAR NAVIGATION FALLBACK (Dynamic/Custom menu nodes configured in backend)
  // ─────────────────────────────────────────────────────────────────────────────
  let matchChain = findMenuAncestors(sidebarNav, cleanPath);
  if (!matchChain) {
    matchChain = findMenuAncestorsByPrefix(sidebarNav, cleanPath);
  }

  if (matchChain && matchChain.length > 0) {
    const rootParent = matchChain[0];
    const currentItem = matchChain[matchChain.length - 1];
    const sectionTitle = rootParent.label;
    const pageTitle = currentItem.label;

    const effectiveChain = matchChain.length > 1 ? matchChain.slice(1) : matchChain;
    const breadcrumbs: BreadcrumbNode[] = effectiveChain.map((item, index) => {
      const isLast = index === effectiveChain.length - 1;
      // Only attach path if it's a known valid route
      const safePath = item.path && VALID_NAVIGABLE_ROUTES.has(item.path) ? item.path : undefined;
      return {
        label: item.label,
        path: isLast ? undefined : safePath,
      };
    });

    return {
      sectionTitle,
      pageTitle,
      breadcrumbs,
      currentItem,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. SAFE GENERIC FALLBACK (Prevents 404 links, raw UUIDs, and undefined titles)
  // ─────────────────────────────────────────────────────────────────────────────
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
    'my-work': 'My Assigned Work',
    'team-lead': 'Team Lead',
    'work-queue': 'Work Queue',
    validation: 'Rule & AI Validation',
    review: 'Quality Review',
    organisations: 'Organizations',
    organizations: 'Organizations',
    partners: 'Partner Management',
    projects: 'Projects',
    new: 'Create',
    departments: 'Departments',
    teams: 'Teams',
    diagnostics: 'System Diagnostics',
    admin: 'Administration',
    administration: 'Administration',
    'menu-builder': 'Menu Builder',
    roles: 'Roles & Permissions',
    users: 'Users',
    account: 'Account Settings',
    security: 'Security',
    password: 'Password & Security',
    enterprise: 'Enterprise Collaboration',
    meetings: 'Online Meetings',
    sales: 'CRM & Sales',
    crm: 'CRM & Sales',
    leads: 'Leads',
    pipeline: 'Sales Pipeline',
    reports: 'Reports',
    discounts: 'Discount Approvals',
    billing: 'Billing',
    invoices: 'Invoices',
    usage: 'Organization Usage & Quotas',
    quotes: 'Meeting Requests',
  };

  const firstSeg = segments[0].toLowerCase();
  const sectionTitle = segmentLabels[firstSeg] || formatSegmentLabel(segments[0]);

  const fallbackBreadcrumbs: BreadcrumbNode[] = [];
  let accum = '';

  const ROOT_GROUPS = new Set(['admin', 'administration', 'crm', 'sales', 'operations', 'support', 'enterprise', 'billing', 'account', 'system', 'developer']);
  const effSegments = segments.length > 1 && ROOT_GROUPS.has(segments[0].toLowerCase()) ? segments.slice(1) : segments;
  effSegments.forEach((seg, idx) => {
    accum += `/${seg}`;
    const isLast = idx === effSegments.length - 1;

    let label: string;
    if (isEntityId(seg)) {
      label = getDynamic(seg, 'Details');
    } else {
      label = segmentLabels[seg.toLowerCase()] || formatSegmentLabel(seg);
    }

    // Only assign path if the route actually exists in VALID_NAVIGABLE_ROUTES
    const safePath = isLast ? undefined : (VALID_NAVIGABLE_ROUTES.has(accum) ? accum : undefined);

    fallbackBreadcrumbs.push({
      label,
      path: safePath,
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

function formatSegmentLabel(seg: string): string {
  return seg
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function getBreadcrumbsFromRoute(
  pathname: string,
  menuItems: MenuItem[] = [],
  search: string = '',
  dynamicLabels: Record<string, string> = {}
): BreadcrumbNode[] {
  return resolveNavigationContext(menuItems, pathname, search, dynamicLabels).breadcrumbs;
}
