import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationProvider, useNavigationContext } from '@/context/NavigationContext';
import { OrganizationsPage } from '@/features/admin/pages/OrganizationsPage';
import { PartnerProjectsPage } from '@/features/partners/pages/staff/PartnerProjectsPage';
import { SupportViewProvider } from '@/features/admin/context/SupportViewContext';
import { adminApi } from '@/features/admin/api/admin.api';
import { partnersApi } from '@/features/partners/api/partners.api';

// Mock admin and partner APIs
vi.mock('@/features/admin/api/admin.api', () => ({
  adminApi: {
    getOrganizations: vi.fn(),
    getEngagementTypes: vi.fn(),
  },
}));

vi.mock('@/features/partners/api/partners.api', () => ({
  partnersApi: {
    getProjects: vi.fn(),
    getPartners: vi.fn(),
  },
}));

// Test Consumer to inspect filtered sidebar items
const NavInspector: React.FC = () => {
  const { sidebarNav } = useNavigationContext();
  return (
    <div data-testid="nav-inspector">
      {sidebarNav.map((group) => (
        <div key={group.id} data-testid={`group-${group.id}`}>
          <span data-testid={`label-${group.id}`}>{group.label}</span>
          {group.children?.map((child) => (
            <div key={child.id} data-testid={`child-${child.id}`}>
              {child.label}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const setupTestContext = (permissions: string[], isPlatformAdmin: boolean = false) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  queryClient.setQueryData(['currentUser'], {
    id: 'test-user',
    email: 'user@alsm.io',
    isPlatformAdmin,
    effectivePermissions: permissions,
  });

  // Provide mock backendNavNodes that mirror the seeded database items
  queryClient.setQueryData(['navigation', 'WEB_2'], [
    {
      id: 'web2_group_dashboard',
      key: 'group.dashboard',
      label: 'Dashboard',
      icon: 'LayoutDashboard',
      order: 1,
      visibility: true,
      requiredPermissions: [],
      children: [
        {
          id: 'web2_dashboard',
          key: 'dashboard.overview',
          label: 'Dashboard',
          icon: 'LayoutDashboard',
          route: '/',
          order: 1,
          visibility: true,
          requiredPermissions: [],
        },
      ],
    },
    {
      id: 'web2_group_conversions',
      key: 'group.conversions',
      label: 'Conversions',
      icon: 'Cpu',
      order: 2,
      visibility: true,
      requiredPermissions: [],
      children: [
        {
          id: 'web2_my_assigned_work',
          key: 'conversions.my_work',
          label: 'My Assigned Work',
          icon: 'Briefcase',
          route: '/my-work',
          order: 1,
          visibility: true,
          requiredPermissions: ['conversions.view'],
        },
        {
          id: 'web2_quality_review',
          key: 'conversions.quality_review',
          label: 'Quality Review',
          icon: 'ShieldCheck',
          route: '/review',
          order: 2,
          visibility: true,
          requiredPermissions: ['quality-review.manage'],
        },
      ],
    },
    {
      id: 'web2_group_commercial',
      key: 'group.commercial',
      label: 'CRM & Sales',
      icon: 'Zap',
      order: 4,
      visibility: true,
      requiredPermissions: [],
      children: [
        {
          id: 'web2_leads',
          key: 'commercial.leads',
          label: 'Leads (CRM)',
          icon: 'Users',
          route: '/sales/leads',
          order: 1,
          visibility: true,
          requiredPermissions: ['sales.leads.view'],
        },
        {
          id: 'web2_sales_reports',
          key: 'commercial.reports',
          label: 'Sales Reports',
          icon: 'BarChart3',
          route: '/sales/reports',
          order: 3,
          visibility: true,
          requiredPermissions: ['sales.reports.view'],
        },
        {
          id: 'web2_sales_team_perf',
          key: 'commercial.team_perf',
          label: 'Team Performance',
          icon: 'TrendingUp',
          route: '/reports/team-performance',
          order: 4,
          visibility: true,
          requiredPermissions: ['sales.team-performance.view'],
        },
        {
          id: 'web2_discounts',
          key: 'commercial.discounts',
          label: 'Discount Approvals',
          icon: 'FileCheck',
          route: '/sales/discounts',
          order: 5,
          visibility: true,
          requiredPermissions: ['sales.discounts.view'],
        },
      ],
    },
    {
      id: 'web2_group_partners',
      key: 'group.partners',
      label: 'Partner Management',
      icon: 'Building2',
      order: 2,
      visibility: true,
      requiredPermissions: [],
      children: [
        {
          id: 'web2_partner_list',
          key: 'partner.directory',
          label: 'Partner Directory',
          icon: 'Building2',
          route: '/partners',
          order: 1,
          visibility: true,
          requiredPermissions: ['partner.view'],
        },
        {
          id: 'web2_partner_projects',
          key: 'partner.projects',
          label: 'Partner Projects',
          icon: 'FolderKanban',
          route: '/partners/projects',
          order: 2,
          visibility: true,
          requiredPermissions: ['partner.view'],
        },
        {
          id: 'web2_demo_projects',
          key: 'projects.demo',
          label: 'Demo Projects',
          icon: 'Sparkles',
          route: '/partners/projects?scope=demo',
          order: 3,
          visibility: true,
          requiredPermissions: ['projects.demo.view'],
        },
      ],
    },
    {
      id: 'web2_group_operations',
      key: 'group.operations',
      label: 'Operations',
      icon: 'Activity',
      order: 3,
      visibility: true,
      requiredPermissions: [],
      children: [
        {
          id: 'web2_conversion_queue',
          key: 'operations.queue',
          label: 'Conversion Queue',
          icon: 'Activity',
          route: '/queue',
          order: 1,
          visibility: true,
          requiredPermissions: ['conversions.queue.view'],
        },
      ],
    },
    {
      id: 'web2_group_support',
      key: 'group.support',
      label: 'Customer Support',
      icon: 'Headphones',
      order: 4,
      visibility: true,
      requiredPermissions: [],
      children: [
        {
          id: 'web2_support_org_access',
          key: 'support.org_access',
          label: 'Organisation Access',
          icon: 'Building2',
          route: '/admin/organizations',
          order: 1,
          visibility: true,
          requiredPermissions: ['organizations.impersonate'],
        },
        {
          id: 'web2_support_troubleshooting',
          key: 'support.troubleshooting',
          label: 'Conversion Support',
          icon: 'Wrench',
          route: '/queue?tab=troubleshoot',
          order: 2,
          visibility: true,
          requiredPermissions: ['conversions.troubleshoot.view'],
        },
      ],
    },
    {
      id: 'web2_group_administration',
      key: 'group.administration',
      label: 'Administration',
      icon: 'Settings2',
      order: 7,
      visibility: true,
      requiredPermissions: [],
      children: [
        {
          id: 'web2_admin_projects',
          key: 'admin.projects',
          label: 'Team Lead Assignment',
          icon: 'FolderKanban',
          route: '/admin/projects',
          order: 1,
          visibility: true,
          requiredPermissions: ['admin.manage'],
        },
      ],
    },
  ]);

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NavigationProvider>
          {children}
        </NavigationProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Database-Driven Navigation & Role-Based Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(adminApi.getOrganizations).mockResolvedValue([
      {
        id: 'org-test',
        name: 'Test Partner Org',
        domain: 'test.io',
        contactEmail: 'partner@test.io',
        type: 'ENTERPRISE',
        status: 'ACTIVE',
        engagementType: 'ENTERPRISE_T1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]);
    vi.mocked(adminApi.getEngagementTypes).mockResolvedValue([]);
    vi.mocked(partnersApi.getProjects).mockResolvedValue([]);
    vi.mocked(partnersApi.getPartners).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Customer Support, Operations, and Demo Projects for INTERNAL_SUPPORT', () => {
    const supportPermissions = [
      'conversions.queue.view',
      'conversions.troubleshoot.view',
      'conversions.mapping.validate',
      'conversions.support_patch.apply',
      'organizations.impersonate',
      'projects.demo.view',
      'projects.demo.create',
      'partner.view',
    ];

    render(<NavInspector />, {
      wrapper: setupTestContext(supportPermissions),
    });

    // Customer Support group should be visible with both children
    expect(screen.getByTestId('group-web2_group_support')).toBeInTheDocument();
    expect(screen.getByText('Organisation Access')).toBeInTheDocument();
    expect(screen.getByText('Conversion Support')).toBeInTheDocument();

    // Operations group should be visible with Conversion Queue
    expect(screen.getByTestId('group-web2_group_operations')).toBeInTheDocument();
    expect(screen.getByText('Conversion Queue')).toBeInTheDocument();

    // Demo Projects should be visible under Partner Management
    expect(screen.getByText('Demo Projects')).toBeInTheDocument();

    // Administration group has no allowed children for INTERNAL_SUPPORT and MUST be pruned
    expect(screen.queryByTestId('group-web2_group_administration')).not.toBeInTheDocument();
  });

  it('prunes Customer Support and Administration groups for CONVERSION_STAFF', () => {
    const staffPermissions = [
      'conversions.execute',
      'partner.view',
    ];

    render(<NavInspector />, {
      wrapper: setupTestContext(staffPermissions),
    });

    // Customer Support should be pruned because all children are unauthorized
    expect(screen.queryByTestId('group-web2_group_support')).not.toBeInTheDocument();
    expect(screen.queryByText('Customer Support')).not.toBeInTheDocument();

    // Administration should be pruned
    expect(screen.queryByTestId('group-web2_group_administration')).not.toBeInTheDocument();

    // Operations should be pruned (no conversions.queue.view)
    expect(screen.queryByTestId('group-web2_group_operations')).not.toBeInTheDocument();

    // Partner Directory & Projects should remain visible
    expect(screen.getByText('Partner Directory')).toBeInTheDocument();
    expect(screen.getByText('Partner Projects')).toBeInTheDocument();

    // Demo Projects should NOT be visible
    expect(screen.queryByText('Demo Projects')).not.toBeInTheDocument();
  });

  it('renders all groups and authorized children when user is Platform Admin', () => {
    render(<NavInspector />, {
      wrapper: setupTestContext([], true),
    });

    expect(screen.getByTestId('group-web2_group_support')).toBeInTheDocument();
    expect(screen.getByTestId('group-web2_group_operations')).toBeInTheDocument();
    expect(screen.getByTestId('group-web2_group_administration')).toBeInTheDocument();
    expect(screen.getByTestId('group-web2_group_conversions')).toBeInTheDocument();
    expect(screen.getByTestId('group-web2_group_commercial')).toBeInTheDocument();
    expect(screen.getByText('Demo Projects')).toBeInTheDocument();
  });

  it('renders Conversions group with My Assigned Work for CONVERSION_STAFF, and prunes it for roles lacking conversions.view', () => {
    // 1. Permitted user with conversions.view
    const staffPermissions = ['conversions.view', 'partner.view'];
    const { unmount } = render(<NavInspector />, {
      wrapper: setupTestContext(staffPermissions),
    });

    expect(screen.getByTestId('group-web2_group_conversions')).toBeInTheDocument();
    expect(screen.getByText('My Assigned Work')).toBeInTheDocument();
    // Quality Review requires quality-review.manage, so it is hidden
    expect(screen.queryByText('Quality Review')).not.toBeInTheDocument();
    unmount();

    // 2. User lacking conversions.view (e.g. general guest or partner)
    render(<NavInspector />, {
      wrapper: setupTestContext(['partner.view']),
    });

    // Entire Conversions group must be pruned because none of its children are authorized
    expect(screen.queryByTestId('group-web2_group_conversions')).not.toBeInTheDocument();
    expect(screen.queryByText('My Assigned Work')).not.toBeInTheDocument();
  });

  it('renders CRM & Sales group with Sales Reports, Team Performance, and Discount Approvals for SALES_MANAGER, and prunes it for CONVERSION_STAFF', () => {
    // 1. Sales Manager with full commercial authorization
    const salesManagerPermissions = [
      'sales.leads.view',
      'sales.reports.view',
      'sales.team-performance.view',
      'sales.discounts.view',
      'sales.discounts.approve',
      'sales.discounts.reject',
      'partner.view',
    ];

    const { unmount } = render(<NavInspector />, {
      wrapper: setupTestContext(salesManagerPermissions),
    });

    expect(screen.getByTestId('group-web2_group_commercial')).toBeInTheDocument();
    expect(screen.getByText('Leads (CRM)')).toBeInTheDocument();
    expect(screen.getByText('Sales Reports')).toBeInTheDocument();
    expect(screen.getByText('Team Performance')).toBeInTheDocument();
    expect(screen.getByText('Discount Approvals')).toBeInTheDocument();
    unmount();

    // 2. Sales Rep with only sales.discounts.view (can see queue but not reports)
    const salesRepPermissions = [
      'sales.leads.view',
      'sales.discounts.view',
      'partner.view',
    ];
    const { unmount: unmountRep } = render(<NavInspector />, {
      wrapper: setupTestContext(salesRepPermissions),
    });
    expect(screen.getByTestId('group-web2_group_commercial')).toBeInTheDocument();
    expect(screen.getByText('Discount Approvals')).toBeInTheDocument();
    expect(screen.queryByText('Sales Reports')).not.toBeInTheDocument();
    expect(screen.queryByText('Team Performance')).not.toBeInTheDocument();
    unmountRep();

    // 3. Conversion staff lacking sales permissions
    render(<NavInspector />, {
      wrapper: setupTestContext(['conversions.view', 'conversions.queue.view']),
    });

    // Entire CRM & Sales group must be pruned because no commercial permissions exist
    expect(screen.queryByTestId('group-web2_group_commercial')).not.toBeInTheDocument();
    expect(screen.queryByText('CRM & Sales')).not.toBeInTheDocument();
    expect(screen.queryByText('Sales Reports')).not.toBeInTheDocument();
  });

  describe('Action-Level Permission Guards', () => {
    it('hides Support View button in OrganizationsPage when user lacks organizations.impersonate', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(['currentUser'], {
        id: 'staff-no-impersonate',
        email: 'staff@alsm.io',
        isPlatformAdmin: false,
        effectivePermissions: ['partner.view'],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <SupportViewProvider>
              <OrganizationsPage />
            </SupportViewProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Wait for table to load
      expect(await screen.findByText('Test Partner Org')).toBeInTheDocument();

      // Support View button should NOT be rendered
      expect(screen.queryByRole('button', { name: /Support View/i })).not.toBeInTheDocument();

      // Details button should still be rendered
      expect(screen.getByRole('button', { name: /Details/i })).toBeInTheDocument();
    });

    it('hides Create Demo Project button in PartnerProjectsPage when user lacks projects.demo.create', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      queryClient.setQueryData(['currentUser'], {
        id: 'user-no-demo-create',
        email: 'user@alsm.io',
        isPlatformAdmin: false,
        effectivePermissions: ['partner.view'], // lacks projects.demo.create & projects.demo.view
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <SupportViewProvider>
              <PartnerProjectsPage />
            </SupportViewProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Create Demo Project should NOT be rendered
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Create Demo Project/i })).not.toBeInTheDocument();
      });

      // Demo Sandboxes scope tab should NOT be rendered
      expect(screen.queryByRole('button', { name: /Demo Sandboxes/i })).not.toBeInTheDocument();
    });
  });
});
