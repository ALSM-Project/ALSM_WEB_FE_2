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

describe('User Lifecycle, Resource Transfer & Temporary Role Permissions Catalog Integration', () => {
  let queryClient: QueryClient;

  const mockRoles = [
    {
      id: 'TEAM_LEAD',
      name: 'Team Lead',
      description: 'Internal team lead managing staff, conversions, and operations',
      isSystem: true,
      userCount: 2,
    },
    {
      id: 'CUSTOM_OPS_LEAD',
      name: 'Custom Operations Lead',
      description: 'Delegated staff supervisor for regional conversion queue',
      isSystem: false,
      userCount: 4,
    },
  ];

  const mockCatalogPermissions = [
    // User Lifecycle & Resource Transfer
    {
      key: 'users.onboard',
      label: 'Onboard users',
      group: 'users',
      description: 'Create internal staff accounts',
    },
    {
      key: 'users.view',
      label: 'View users',
      group: 'users',
      description: 'View user accounts',
    },
    {
      key: 'users.offboard',
      label: 'Offboard Users',
      group: 'admin',
      description: 'Initiate controlled user offboarding workflows',
    },
    {
      key: 'users.offboard.review',
      label: 'Review Departing Staff Resources',
      group: 'admin',
      description: 'Review work resources, queue jobs, and security credentials assigned to departing staff',
    },
    {
      key: 'resources.assignment.view',
      label: 'View Resource Assignments',
      group: 'admin',
      description: 'View resource ownership, team lead allocations, and staff assignments',
    },
    {
      key: 'resources.transfer',
      label: 'Transfer Resource Ownership',
      group: 'admin',
      description: 'Transfer or reassign resource ownership between staff',
    },
    {
      key: 'resources.transfer.confirm',
      label: 'Confirm Resource Transfers',
      group: 'admin',
      description: 'Explicitly confirm and execute resource ownership transfer to successor staff',
    },

    // Temporary Role Management
    {
      key: 'roles.temporary.view',
      label: 'View Temporary Roles',
      group: 'rbac',
      description: 'View currently active temporary role elevations and time remaining',
    },
    {
      key: 'roles.temporary.grant',
      label: 'Grant Temporary Role',
      group: 'rbac',
      description: 'Authorize and grant time-bound temporary role elevations (strictly max 24h)',
    },
    {
      key: 'roles.temporary.revoke',
      label: 'Revoke Temporary Role',
      group: 'rbac',
      description: 'Immediately terminate active temporary role elevations',
    },
    {
      key: 'roles.temporary.history.view',
      label: 'View Temporary Role History',
      group: 'rbac',
      description: 'View historical elevation audit trail, termination reasons, and export reports',
    },
    {
      key: 'roles.temporary.request',
      label: 'Request Temporary Role',
      group: 'rbac',
      description: 'Submit request for self-service temporary role elevation',
    },
    {
      key: 'roles.temporary.requests.review',
      label: 'Review Temporary Role Requests',
      group: 'rbac',
      description: 'Inspect and review incoming temporary elevation requests from team members',
    },
    {
      key: 'roles.temporary.requests.approve',
      label: 'Approve Temporary Role Requests',
      group: 'rbac',
      description: 'Authorize and approve incoming temporary elevation requests with specified duration',
    },
    {
      key: 'roles.temporary.requests.reject',
      label: 'Reject Temporary Role Requests',
      group: 'rbac',
      description: 'Reject temporary elevation requests with mandatory justification',
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
    vi.mocked(rbacApi.getRolePermissions).mockImplementation(async (roleId: string) => {
      if (roleId === 'TEAM_LEAD') {
        return [
          'users.onboard',
          'users.view',
          'users.offboard',
          'users.offboard.review',
          'resources.assignment.view',
          'resources.transfer',
          'resources.transfer.confirm',
          'roles.temporary.view',
          'roles.temporary.grant',
          'roles.temporary.revoke',
          'roles.temporary.history.view',
          'roles.temporary.request',
          'roles.temporary.requests.review',
          'roles.temporary.requests.approve',
          'roles.temporary.requests.reject',
        ];
      }
      return [
        'users.view',
        'roles.temporary.request',
      ];
    });
    vi.mocked(rbacApi.updateRolePermissions).mockResolvedValue([] as any);
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RolesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders all User Lifecycle, Resource Transfer, and Temporary Role permissions grouped by module', async () => {
    renderComponent();

    // Verify loading completes
    await waitFor(() => {
      expect(screen.getByText('Roles & Permissions Management')).toBeInTheDocument();
    });

    // Verify Module Groups are rendered
    await waitFor(() => {
      expect(screen.getByText(/users Module/i)).toBeInTheDocument();
      expect(screen.getByText(/admin Module/i)).toBeInTheDocument();
      expect(screen.getByText(/rbac Module/i)).toBeInTheDocument();
    });

    // Verify User Lifecycle Permissions in the UI
    expect(screen.getByText('Onboard users')).toBeInTheDocument();
    expect(screen.getByText('Offboard Users')).toBeInTheDocument();
    expect(screen.getByText('Review Departing Staff Resources')).toBeInTheDocument();
    expect(screen.getByText('View Resource Assignments')).toBeInTheDocument();
    expect(screen.getByText('Transfer Resource Ownership')).toBeInTheDocument();
    expect(screen.getByText('Confirm Resource Transfers')).toBeInTheDocument();

    // Verify Temporary Role Permissions in the UI
    expect(screen.getByText('View Temporary Roles')).toBeInTheDocument();
    expect(screen.getByText('Grant Temporary Role')).toBeInTheDocument();
    expect(screen.getByText('Revoke Temporary Role')).toBeInTheDocument();
    expect(screen.getByText('View Temporary Role History')).toBeInTheDocument();
    expect(screen.getByText('Request Temporary Role')).toBeInTheDocument();
    expect(screen.getByText('Review Temporary Role Requests')).toBeInTheDocument();
    expect(screen.getByText('Approve Temporary Role Requests')).toBeInTheDocument();
    expect(screen.getByText('Reject Temporary Role Requests')).toBeInTheDocument();
  });

  it('displays active permissions for Team Lead role', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Team Lead')).toBeInTheDocument();
    });

    // Click on Team Lead role
    fireEvent.click(screen.getByText('Team Lead'));

    // Verify active permissions count reflects full capability grants
    await waitFor(() => {
      expect(screen.getByText('15 Active Permissions')).toBeInTheDocument();
    });
  });

  it('allows custom role to be assigned new permissions and persist updates', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Custom Operations Lead')).toBeInTheDocument();
    });

    // Select custom role
    fireEvent.click(screen.getByText('Custom Operations Lead'));

    await waitFor(() => {
      expect(screen.getByText('2 Active Permissions')).toBeInTheDocument();
    });

    // Find and check 'Review Temporary Role Requests' permission
    const checkbox = screen.getByLabelText(/Review Temporary Role Requests/i);
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Save changes
    const saveButton = screen.getByRole('button', { name: /Save Permission Changes/i });
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(rbacApi.updateRolePermissions).toHaveBeenCalledWith(
        'CUSTOM_OPS_LEAD',
        expect.arrayContaining(['users.view', 'roles.temporary.request', 'roles.temporary.requests.review'])
      );
    });
  });
});
