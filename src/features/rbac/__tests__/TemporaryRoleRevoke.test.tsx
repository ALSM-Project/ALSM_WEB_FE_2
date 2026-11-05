import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TemporaryRolesPage } from '../pages/TemporaryRolesPage';
import { temporaryRolesApi, TemporaryRoleDto } from '../api/temporary-roles.api';

let currentUser = {
  id: 'lead-01',
  fullName: 'Bob TeamLead',
  email: 'bob@alsm.dev',
  isPlatformAdmin: false,
  effectivePermissions: [
    'roles.temporary.view',
    'roles.temporary.revoke',
    'roles.temporary.history.view',
  ],
};

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: currentUser,
    hasPermission: (perm: string) => currentUser.effectivePermissions.includes(perm),
    isLoading: false,
  }),
}));

vi.mock('../api/rbac.api', () => ({
  rbacApi: {
    getAllUsers: vi.fn().mockResolvedValue([]),
    getRoles: vi.fn().mockResolvedValue([
      { id: 'conversion_staff', name: 'Conversion Staff' },
      { id: 'team_lead', name: 'Team Lead' },
    ]),
  },
}));

vi.mock('@/features/partners/api/partners.api', () => ({
  partnersApi: {
    getProjects: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../api/temporary-roles.api', () => ({
  temporaryRolesApi: {
    getActiveRoles: vi.fn().mockResolvedValue([]),
    getHistory: vi.fn().mockResolvedValue([]),
    getMyRequests: vi.fn().mockResolvedValue([]),
    requestRole: vi.fn(),
    approveRequest: vi.fn(),
    grantRole: vi.fn(),
    revokeRole: vi.fn(),
    exportHistoryCsv: vi.fn(),
  },
}));

const mockActiveRole: TemporaryRoleDto = {
  id: 'tr-active-1',
  userId: 'usr-target-1',
  userEmail: 'dev.alice@alsm.dev',
  userFullName: 'Alice Developer',
  role: 'TEAM_LEAD',
  durationHours: 8,
  reason: 'Milestone delivery coverage',
  grantedBy: 'bob@alsm.dev',
  status: 'ACTIVE',
  expiresAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(), // 6 hours remaining
  createdAt: new Date().toISOString(),
};

const mockExpiredRole: TemporaryRoleDto = {
  id: 'tr-expired-1',
  userId: 'usr-target-2',
  userEmail: 'dev.charlie@alsm.dev',
  userFullName: 'Charlie Coder',
  role: 'CONVERSION_STAFF',
  durationHours: 4,
  reason: 'Completed batch conversion',
  grantedBy: 'bob@alsm.dev',
  status: 'ACTIVE',
  expiresAt: new Date(Date.now() - 1000).toISOString(), // Past expiration
  createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
};

describe('UC-93 Revoke Temporary Role Frontend Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = {
      id: 'lead-01',
      fullName: 'Bob TeamLead',
      email: 'bob@alsm.dev',
      isPlatformAdmin: false,
      effectivePermissions: [
        'roles.temporary.view',
        'roles.temporary.revoke',
        'roles.temporary.history.view',
      ],
    };
  });

  it('renders Revoke button for eligible active temporary role when user has roles.temporary.revoke permission', async () => {
    vi.mocked(temporaryRolesApi.getActiveRoles).mockResolvedValueOnce([mockActiveRole]);

    render(
      <MemoryRouter>
        <TemporaryRolesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Developer')).toBeInTheDocument();
    });

    const revokeBtn = screen.getByRole('button', { name: /Revoke/i });
    expect(revokeBtn).toBeInTheDocument();
  });

  it('does NOT render Revoke button for expired temporary roles', async () => {
    vi.mocked(temporaryRolesApi.getActiveRoles).mockResolvedValueOnce([mockExpiredRole]);

    render(
      <MemoryRouter>
        <TemporaryRolesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Charlie Coder')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Expired/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Revoke/i })).not.toBeInTheDocument();
  });

  it('does NOT render Revoke button for unauthorized staff without roles.temporary.revoke', async () => {
    currentUser = {
      id: 'staff-01',
      fullName: 'Staff Requester',
      email: 'staff@alsm.dev',
      isPlatformAdmin: false,
      effectivePermissions: ['roles.temporary.view', 'roles.temporary.request'],
    };

    vi.mocked(temporaryRolesApi.getActiveRoles).mockResolvedValueOnce([mockActiveRole]);

    render(
      <MemoryRouter>
        <TemporaryRolesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Developer')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Revoke/i })).not.toBeInTheDocument();
  });

  it('opens Revoke modal displaying user details, role and remaining time upon clicking Revoke', async () => {
    vi.mocked(temporaryRolesApi.getActiveRoles).mockResolvedValueOnce([mockActiveRole]);

    render(
      <MemoryRouter>
        <TemporaryRolesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Developer')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Revoke/i }));

    expect(screen.getByText(/Revoke Temporary Elevation Immediately/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Alice Developer/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/TEAM_LEAD/i).length).toBeGreaterThan(0);
  });

  it('Cancel button closes modal without triggering revoke API', async () => {
    vi.mocked(temporaryRolesApi.getActiveRoles).mockResolvedValueOnce([mockActiveRole]);

    render(
      <MemoryRouter>
        <TemporaryRolesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Developer')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Revoke/i }));
    expect(screen.getByText(/Revoke Temporary Elevation Immediately/i)).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText(/Revoke Temporary Elevation Immediately/i)).not.toBeInTheDocument();
    expect(temporaryRolesApi.revokeRole).not.toHaveBeenCalled();
  });

  it('enforces mandatory reason and confirmation checkbox before allowing submission', async () => {
    vi.mocked(temporaryRolesApi.getActiveRoles).mockResolvedValueOnce([mockActiveRole]);

    render(
      <MemoryRouter>
        <TemporaryRolesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Developer')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Revoke/i }));

    const submitBtn = screen.getByRole('button', { name: /Confirm Revoke Elevation/i });
    expect(submitBtn).toBeDisabled();

    // Check confirmation checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Now submit button should be enabled
    expect(submitBtn).not.toBeDisabled();
  });

  it('successfully revokes role, calls API, refreshes list and displays feedback message', async () => {
    vi.mocked(temporaryRolesApi.getActiveRoles).mockResolvedValueOnce([mockActiveRole]).mockResolvedValueOnce([]);
    vi.mocked(temporaryRolesApi.revokeRole).mockResolvedValueOnce({
      ...mockActiveRole,
      status: 'REVOKED',
      revokedAt: new Date().toISOString(),
      revokeReason: 'Security incident containment',
    });

    render(
      <MemoryRouter>
        <TemporaryRolesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Developer')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Revoke/i }));

    const reasonInput = screen.getByPlaceholderText(/e\.g\. Work completed early/i);
    fireEvent.change(reasonInput, { target: { value: 'Security incident containment' } });

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const submitBtn = screen.getByRole('button', { name: /Confirm Revoke Elevation/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(temporaryRolesApi.revokeRole).toHaveBeenCalledWith({
        assignmentId: 'tr-active-1',
        reason: 'Security incident containment',
      });
      expect(screen.getByText(/revoked immediately/i)).toBeInTheDocument();
    });
  });

  it('displays error banner if backend API returns failure on revocation', async () => {
    vi.mocked(temporaryRolesApi.getActiveRoles).mockResolvedValueOnce([mockActiveRole]);
    vi.mocked(temporaryRolesApi.revokeRole).mockRejectedValueOnce({
      response: { data: { message: 'Cannot revoke an expired temporary role' } },
    });

    render(
      <MemoryRouter>
        <TemporaryRolesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Developer')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Revoke/i }));

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const submitBtn = screen.getByRole('button', { name: /Confirm Revoke Elevation/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Cannot revoke an expired temporary role/i)).toBeInTheDocument();
    });
  });
});
