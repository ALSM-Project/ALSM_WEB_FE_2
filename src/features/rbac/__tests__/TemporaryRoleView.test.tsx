import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemporaryRolesPage } from '../pages/TemporaryRolesPage';
import { temporaryRolesApi, TemporaryRoleDto } from '../api/temporary-roles.api';

let currentUser = {
  id: 'admin-1',
  email: 'admin@alsm.io',
  fullName: 'Platform Admin',
  isPlatformAdmin: true,
  effectivePermissions: ['roles.temporary.view', 'roles.temporary.grant', 'roles.temporary.revoke'],
};

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: currentUser,
    isLoading: false,
    hasPermission: (perm: string) =>
      currentUser.isPlatformAdmin || currentUser.effectivePermissions.includes(perm),
  }),
}));

vi.mock('@/features/partners/api/partners.api', () => ({
  partnersApi: {
    getProjects: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../api/rbac.api', () => ({
  rbacApi: {
    getRoles: vi.fn().mockResolvedValue([]),
    getAllUsers: vi.fn().mockResolvedValue([]),
  },
}));

const mockRecords: TemporaryRoleDto[] = [
  {
    id: 'tr-1',
    userId: 'u-1',
    userEmail: 'alice@alsm.io',
    userFullName: 'Alice Johnson',
    role: 'CONVERSION_STAFF',
    durationHours: 4,
    reason: 'Sprint migration coverage',
    grantedBy: 'Admin Supervisor',
    status: 'ACTIVE',
    expiresAt: new Date(Date.now() + 3600000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'tr-2',
    userId: 'u-2',
    userEmail: 'bob@alsm.io',
    userFullName: 'Bob Smith',
    role: 'SUPPORT_STAFF',
    durationHours: 8,
    reason: 'Emergency ticket handling',
    grantedBy: 'Admin Supervisor',
    status: 'EXPIRED',
    expiresAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 36000000).toISOString(),
  },
  {
    id: 'tr-3',
    userId: 'u-3',
    userEmail: 'charlie@alsm.io',
    userFullName: 'Charlie Brown',
    role: 'QA_STAFF',
    durationHours: 12,
    reason: 'Release regression testing',
    grantedBy: 'Admin Supervisor',
    status: 'REVOKED',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    revokedAt: new Date().toISOString(),
    revokedBy: 'Admin Supervisor',
    revokeReason: 'Testing completed early',
  },
];

vi.mock('../api/temporary-roles.api', () => ({
  temporaryRolesApi: {
    getTemporaryRoles: vi.fn(),
    getActiveRoles: vi.fn(),
    getHistory: vi.fn().mockResolvedValue([]),
    getMyRequests: vi.fn().mockResolvedValue([]),
    revokeRole: vi.fn(),
    grantRole: vi.fn(),
  },
}));

describe('UC-92 View Temporary Roles Frontend Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = {
      id: 'admin-1',
      email: 'admin@alsm.io',
      fullName: 'Platform Admin',
      isPlatformAdmin: true,
      effectivePermissions: ['roles.temporary.view', 'roles.temporary.grant', 'roles.temporary.revoke'],
    };

    (temporaryRolesApi.getTemporaryRoles as any).mockResolvedValue([...mockRecords]);
    (temporaryRolesApi.getActiveRoles as any).mockResolvedValue([...mockRecords]);
  });

  it('1. Loads and displays temporary role records', async () => {
    render(<TemporaryRolesPage />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    });
  });

  it('2. Displays all 6 required SRS columns in the table', async () => {
    render(<TemporaryRolesPage />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // SRS Columns: User, Role, Granted By, Granted At, Expires At, Status
    expect(screen.getByRole('columnheader', { name: /^user$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^role$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^granted by$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^granted at$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^expires at$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^status$/i })).toBeInTheDocument();
  });

  it('3. Filters records by status: Active, Expired, Revoked, and All', async () => {
    render(<TemporaryRolesPage />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Filter Active
    const activeBtn = screen.getByRole('button', { name: /^active$/i });
    fireEvent.click(activeBtn);

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();

    // Filter Expired
    const expiredBtn = screen.getByRole('button', { name: /^expired$/i });
    fireEvent.click(expiredBtn);

    expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();

    // Filter Revoked
    const revokedBtn = screen.getByRole('button', { name: /^revoked$/i });
    fireEvent.click(revokedBtn);

    expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();

    // Filter All
    const allBtn = screen.getByRole('button', { name: /^all$/i });
    fireEvent.click(allBtn);

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
  });

  it('4. Searches records by user name', async () => {
    render(<TemporaryRolesPage />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search active elevations|search by user name/i);
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
  });

  it('5. Searches records by role name', async () => {
    render(<TemporaryRolesPage />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search active elevations|search by user name/i);
    fireEvent.change(searchInput, { target: { value: 'SUPPORT_STAFF' } });

    expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
  });

  it('6. Combines status filter and search query together', async () => {
    render(<TemporaryRolesPage />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const activeBtn = screen.getByRole('button', { name: /^active$/i });
    fireEvent.click(activeBtn);

    const searchInput = screen.getByPlaceholderText(/search active elevations|search by user name/i);
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
  });

  it('7. Displays empty state when no matching records are returned', async () => {
    (temporaryRolesApi.getTemporaryRoles as any).mockResolvedValueOnce([]);
    (temporaryRolesApi.getActiveRoles as any).mockResolvedValueOnce([]);

    render(<TemporaryRolesPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/No temporary role elevations recorded in system|No temporary roles match/i),
      ).toBeInTheDocument();
    });
  });

  it('8. Displays error banner when API request fails', async () => {
    (temporaryRolesApi.getTemporaryRoles as any).mockRejectedValueOnce(
      new Error('Failed to fetch temporary role records from server'),
    );
    (temporaryRolesApi.getActiveRoles as any).mockRejectedValueOnce(
      new Error('Failed to fetch temporary role records from server'),
    );

    render(<TemporaryRolesPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to fetch temporary role records from server|Failed to load temporary role records/i),
      ).toBeInTheDocument();
    });
  });

  it('9. Handles records with missing user or grantor data gracefully', async () => {
    const corruptedRecord: TemporaryRoleDto = {
      id: 'tr-orphan',
      userId: '',
      userEmail: '',
      userFullName: undefined,
      role: 'SYSTEM_ANALYST',
      durationHours: 4,
      reason: 'Relic test',
      grantedBy: '',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    (temporaryRolesApi.getTemporaryRoles as any).mockResolvedValueOnce([corruptedRecord]);
    (temporaryRolesApi.getActiveRoles as any).mockResolvedValueOnce([corruptedRecord]);

    render(<TemporaryRolesPage />);

    await waitFor(() => {
      expect(screen.getByText('SYSTEM_ANALYST')).toBeInTheDocument();
      expect(screen.getByText('Unknown User')).toBeInTheDocument();
    });
  });
});
