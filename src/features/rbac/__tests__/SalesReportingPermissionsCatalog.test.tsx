import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { RolesPage } from '../pages/RolesPage';
import { rbacApi } from '../api/rbac.api';

// Mock rbacApi
vi.mock('../api/rbac.api', () => ({
  rbacApi: {
    getRoles: vi.fn(),
    getPermissions: vi.fn(),
    getRolePermissions: vi.fn(),
    updateRolePermissions: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    createPermission: vi.fn(),
    updatePermission: vi.fn(),
    deletePermission: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-1',
      fullName: 'System Administrator',
      email: 'admin@alsm.io',
      isPlatformAdmin: true,
      roles: ['ADMIN'],
    },
    hasPermission: () => true,
    isLoading: false,
  }),
}));

describe('Sales Reporting & Approval Permissions Catalog Integration', () => {
  let queryClient: QueryClient;

  const mockRoles = [
    {
      id: 'SALES_MANAGER',
      name: 'Sales Manager',
      description: 'Manages sales representatives, pipeline deals, and approves discounts',
      isSystem: true,
      userCount: 3,
    },
    {
      id: 'INTERNAL_SALES',
      name: 'Internal Sales Representative',
      description: 'Handles incoming leads, quote generation, and requests discounts',
      isSystem: true,
      userCount: 8,
    },
  ];

  const mockCatalogPermissions = [
    {
      key: 'sales.reports.view',
      label: 'View Sales Reports',
      group: 'sales',
      description: 'View comprehensive sales analytics and pipeline metrics',
    },
    {
      key: 'sales.team-performance.view',
      label: 'View Team Performance',
      group: 'sales',
      description: 'View sales team metrics and representative rankings',
    },
    {
      key: 'sales.discounts.view',
      label: 'View Discount Approval Queue',
      group: 'sales',
      description: 'View discount approval requests queue',
    },
    {
      key: 'sales.discounts.approve',
      label: 'Approve Discount Requests',
      group: 'sales',
      description: 'Authorize and approve requested sales discounts',
    },
    {
      key: 'sales.discounts.reject',
      label: 'Reject Discount Requests',
      group: 'sales',
      description: 'Reject sales representative discount requests with mandatory justification',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    vi.mocked(rbacApi.getRoles).mockResolvedValue(mockRoles as any);
    vi.mocked(rbacApi.getPermissions).mockResolvedValue(mockCatalogPermissions as any);
    vi.mocked(rbacApi.getRolePermissions).mockResolvedValue([
      'sales.reports.view',
      'sales.team-performance.view',
      'sales.discounts.view',
      'sales.discounts.approve',
      'sales.discounts.reject',
    ]);
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RolesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders all 5 Sales Reporting & Approval permissions under the sales module in the Permission UI', async () => {
    renderComponent();

    // Select the Sales Manager role
    await waitFor(() => {
      expect(screen.getByText('Sales Manager')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Sales Manager'));

    // Wait for the sales module card
    await waitFor(() => {
      expect(screen.getByText(/sales module/i)).toBeInTheDocument();
    });

    // Check all 5 permissions exist and are visible
    expect(screen.getByText('View Sales Reports')).toBeInTheDocument();
    expect(screen.getByText('sales.reports.view')).toBeInTheDocument();

    expect(screen.getByText('View Team Performance')).toBeInTheDocument();
    expect(screen.getByText('sales.team-performance.view')).toBeInTheDocument();

    expect(screen.getByText('View Discount Approval Queue')).toBeInTheDocument();
    expect(screen.getByText('sales.discounts.view')).toBeInTheDocument();

    expect(screen.getByText('Approve Discount Requests')).toBeInTheDocument();
    expect(screen.getByText('sales.discounts.approve')).toBeInTheDocument();

    expect(screen.getByText('Reject Discount Requests')).toBeInTheDocument();
    expect(screen.getByText('sales.discounts.reject')).toBeInTheDocument();

    // Verify all 5 are selected for Sales Manager
    expect(screen.getByText('5 / 5 SELECTED')).toBeInTheDocument();
  });

  it('allows administrator to toggle permissions and save updated role assignments', async () => {
    vi.mocked(rbacApi.updateRolePermissions).mockResolvedValue({ success: true } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Sales Manager')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Sales Manager'));

    await waitFor(() => {
      expect(screen.getByText('Reject Discount Requests')).toBeInTheDocument();
    });

    // Toggle off "Reject Discount Requests" checkbox
    const rejectCheckbox = screen.getByLabelText((content, element) => {
      return element?.closest('div')?.textContent?.includes('sales.discounts.reject') ?? false;
    });

    fireEvent.click(rejectCheckbox);

    // Should indicate 4 / 5 selected and show Save Permission Changes button
    expect(screen.getByText('4 / 5 SELECTED')).toBeInTheDocument();
    expect(screen.getByText('You have unsaved permission changes for this role.')).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /save permission changes/i });
    expect(saveButton).toBeInTheDocument();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(rbacApi.updateRolePermissions).toHaveBeenCalledWith(
        'SALES_MANAGER',
        expect.not.arrayContaining(['sales.discounts.reject'])
      );
    });
  });
});
