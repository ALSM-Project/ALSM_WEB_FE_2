import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TemporaryRolesPage } from '../pages/TemporaryRolesPage';
import { temporaryRolesApi } from '../api/temporary-roles.api';

let currentUser = {
  id: 'staff-01',
  fullName: 'Alice Staff',
  email: 'alice@alsm.dev',
  isPlatformAdmin: false,
  effectivePermissions: ['roles.temporary.request', 'roles.temporary.view'],
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
    getProjects: vi.fn().mockResolvedValue([{ id: 'p-1', name: 'Core Banking' }]),
  },
}));

vi.mock('../api/temporary-roles.api', () => ({
  temporaryRolesApi: {
    getActiveRoles: vi.fn().mockResolvedValue([]),
    getHistory: vi.fn().mockResolvedValue([]),
    getMyRequests: vi.fn().mockResolvedValue([]),
    requestRole: vi.fn().mockResolvedValue({ id: 'tr-req-1' }),
    approveRequest: vi.fn().mockResolvedValue({ id: 'tr-req-1' }),
    grantRole: vi.fn(),
    revokeRole: vi.fn(),
    exportHistoryCsv: vi.fn(),
  },
}));

describe('UC-95 Request Temporary Role Frontend Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = {
      id: 'staff-01',
      fullName: 'Alice Staff',
      email: 'alice@alsm.dev',
      isPlatformAdmin: false,
      effectivePermissions: ['roles.temporary.request', 'roles.temporary.view'],
    };
  });

  it('renders Request Elevation button for authorized requester staff', async () => {
    render(
      <MemoryRouter>
        <TemporaryRolesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Request Elevation')).toBeInTheDocument();
    });
  });

  it('opens Request Modal and validates justification character limit', async () => {
    render(
      <MemoryRouter>
        <TemporaryRolesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Request Elevation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Request Elevation'));

    expect(screen.getByText(/Submit a temporary role delegation request/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Submit Elevation Request/i });
    expect(submitBtn).toBeDisabled();

    // Type a short reason
    const textarea = screen.getByPlaceholderText(/Explain why temporary elevated permissions/i);
    fireEvent.change(textarea, { target: { value: 'Too short' } });
    expect(submitBtn).toBeDisabled();

    // Type valid reason >= 10 chars
    fireEvent.change(textarea, { target: { value: 'Valid business reason for migration' } });
    expect(screen.getByText(/✓ Justification valid/i)).toBeInTheDocument();
  });

  it('warns and blocks submission when requester already has an active elevation', async () => {
    vi.mocked(temporaryRolesApi.getActiveRoles).mockResolvedValueOnce([
      {
        id: 'active-1',
        userId: 'staff-01',
        userEmail: 'alice@alsm.dev',
        role: 'team_lead',
        durationHours: 8,
        reason: 'Existing elevation',
        grantedBy: 'Lead Bob',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      },
    ]);

    render(
      <MemoryRouter>
        <TemporaryRolesPage />
      </MemoryRouter>,
    );

    // Active elevation banner should be visible
    await waitFor(() => {
      expect(screen.getByText(/Active Temporary Elevation:/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Request Elevation'));

    // Modal shows conflict alert
    expect(screen.getByText(/Active Elevation Conflict \(UC-95 Policy\)/i)).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /Submit Elevation Request/i });
    expect(submitBtn).toBeDisabled();
  });

  it('prevents self-approval on requester own pending requests', async () => {
    vi.mocked(temporaryRolesApi.getHistory).mockResolvedValueOnce([
      {
        id: 'pending-1',
        userId: 'staff-01',
        userEmail: 'alice@alsm.dev',
        userFullName: 'Alice Staff',
        role: 'team_lead',
        durationHours: 4,
        reason: 'Migration coverage',
        grantedBy: '',
        status: 'PENDING',
        expiresAt: '',
        createdAt: new Date().toISOString(),
      },
    ]);

    render(
      <MemoryRouter>
        <TemporaryRolesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Pending Requests \(1\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Pending Requests \(1\)/i));

    // Shows self-request badge instead of action buttons
    expect(screen.getByText('Self-Request (Awaiting Review)')).toBeInTheDocument();
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  });

  it('allows Team Lead to approve requests from other staff members', async () => {
    currentUser = {
      id: 'lead-01',
      fullName: 'Bob Lead',
      email: 'lead@alsm.dev',
      isPlatformAdmin: false,
      effectivePermissions: [
        'roles.temporary.view',
        'roles.temporary.requests.review',
        'roles.temporary.requests.approve',
      ],
    };

    vi.mocked(temporaryRolesApi.getHistory).mockResolvedValueOnce([
      {
        id: 'pending-2',
        userId: 'other-staff-99',
        userEmail: 'charlie@alsm.dev',
        userFullName: 'Charlie Conversion',
        role: 'team_lead',
        durationHours: 4,
        reason: 'Urgent queue unblocker',
        grantedBy: '',
        status: 'PENDING',
        expiresAt: '',
        createdAt: new Date().toISOString(),
      },
    ]);

    render(
      <MemoryRouter>
        <TemporaryRolesPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Pending Requests \(1\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Pending Requests \(1\)/i));

    expect(screen.getByText('Charlie Conversion')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reject/i })).toBeInTheDocument();
  });
});
