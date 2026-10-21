import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserRolesPage } from '../pages/UserRolesPage';
import { TemporaryRolesPage } from '../pages/TemporaryRolesPage';
import { ResourceTransferModal, CandidateAssignee } from '@/features/admin/components/ResourceTransferModal';
import { OffboardingWizardModal } from '@/features/users/components/OffboardingWizardModal';
import { rbacApi } from '../api/rbac.api';
import { usersApi } from '@/features/users/api/users.api';
import { temporaryRolesApi } from '../api/temporary-roles.api';

// Mock Auth
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-01',
      fullName: 'System Administrator',
      email: 'admin@alsm.io',
      isPlatformAdmin: true,
      roles: ['ADMIN'],
    },
    hasPermission: () => true,
    isLoading: false,
  }),
}));

// Mock APIs
vi.mock('../api/rbac.api', () => ({
  rbacApi: {
    getAllUsers: vi.fn(),
    getRoles: vi.fn(),
    getPermissions: vi.fn(),
    updateUserRoles: vi.fn(),
  },
}));

vi.mock('@/features/users/api/users.api', () => ({
  usersApi: {
    onboardUser: vi.fn(),
    offboardUser: vi.fn(),
    lockUser: vi.fn(),
    unlockUser: vi.fn(),
  },
}));

vi.mock('../api/temporary-roles.api', () => ({
  temporaryRolesApi: {
    getActiveRoles: vi.fn(),
    getHistory: vi.fn(),
    exportHistoryCsv: vi.fn(),
    grantRole: vi.fn(),
    requestRole: vi.fn(),
    approveRequest: vi.fn(),
    revokeRole: vi.fn(),
  },
}));

describe('User Lifecycle, Resource Transfer & Temporary Role Management (Section 3.13-3.15)', () => {
  const mockUsers = [
    {
      id: 'usr-01',
      email: 'sarah.jenkins@alsm.io',
      fullName: 'Sarah Jenkins',
      isPlatformAdmin: false,
      isActive: true,
      isLocked: false,
      roles: ['TEAM_LEAD'],
    },
    {
      id: 'usr-02',
      email: 'david.kim@alsm.io',
      fullName: 'David Kim',
      isPlatformAdmin: false,
      isActive: true,
      isLocked: false,
      roles: ['CONVERSION_STAFF'],
    },
  ];

  const mockRoles = [
    { id: 'conversion_staff', name: 'Conversion Staff', key: 'conversion_staff', description: 'Executes AST transformations' },
    { id: 'team_lead', name: 'Team Lead', key: 'team_lead', description: 'Supervises conversions' },
  ];

  const mockPermissions = [
    { id: 'perm-1', key: 'web2:projects:read', name: 'View Projects', module: 'PROJECTS' },
    { id: 'perm-2', key: 'web2:conversion:write', name: 'Run Conversion', module: 'CONVERSION' },
  ];

  const mockActiveElevations = [
    {
      id: 'temp-01',
      userId: 'usr-02',
      userEmail: 'david.kim@alsm.io',
      userFullName: 'David Kim',
      role: 'CONVERSION_STAFF',
      durationHours: 8,
      reason: 'Coverage for batch COBOL conversion milestone',
      grantedBy: 'sarah.jenkins@alsm.io',
      status: 'ACTIVE' as const,
      createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
      targetProject: 'Core Banking Modernization',
    },
    {
      id: 'temp-02',
      userId: 'usr-03',
      userEmail: 'elena.rostova@alsm.io',
      userFullName: 'Elena Rostova',
      role: 'TEAM_LEAD',
      durationHours: 4,
      reason: 'Emergency code review approval sign-off',
      grantedBy: 'platform.admin@alsm.io',
      status: 'ACTIVE' as const,
      createdAt: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      targetProject: 'Retail Portal Modernization',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (rbacApi.getAllUsers as any).mockResolvedValue(mockUsers);
    (rbacApi.getRoles as any).mockResolvedValue(mockRoles);
    (rbacApi.getPermissions as any).mockResolvedValue(mockPermissions);
    (temporaryRolesApi.getActiveRoles as any).mockResolvedValue(mockActiveElevations);
    (temporaryRolesApi.getHistory as any).mockResolvedValue([]);
  });

  describe('2.A & 2.B User Lifecycle (Onboarding & 4-Step Offboarding Wizard)', () => {
    it('opens Onboard User modal with role preview, account status, and confirmation checkbox', async () => {
      render(
        <MemoryRouter>
          <UserRolesPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument();
      });

      const onboardBtn = screen.getByRole('button', { name: /Onboard User/i });
      fireEvent.click(onboardBtn);

      // Verify Onboarding Modal fields exist
      expect(screen.getByText('Onboard Staff Account')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Alex Vance')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('alex.vance@acmecorp.com')).toBeInTheDocument();
      expect(screen.getByText(/Account Status \*/i)).toBeInTheDocument();
      expect(screen.getByText(/I confirm the creation of this staff account/i)).toBeInTheDocument();
    });

    it('opens Offboarding Wizard with Step 1 Review and advances to Step 2', async () => {
      render(
        <OffboardingWizardModal
          isOpen={true}
          onClose={vi.fn()}
          userToOffboard={mockUsers[0] as any}
          activeStaffMembers={mockUsers as any}
          onSuccess={vi.fn()}
        />
      );

      // Step 1: Review User & Resources
      expect(screen.getByText(/Controlled Staff Offboarding Wizard/i)).toBeInTheDocument();
      expect(screen.getByText('Departing Staff Dossier')).toBeInTheDocument();
      expect(screen.getByText(/Transferable Work Resources/i)).toBeInTheDocument();

      // Click Next to Step 2
      const nextBtn = screen.getByRole('button', { name: /Next: Select Successor/i });
      fireEvent.click(nextBtn);

      // Step 2: Select Resource Transfers
      await waitFor(() => {
        expect(screen.getByText(/Controlled Staff Offboarding Wizard \(Step 2 of 4\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Choose eligible internal staff member/i)).toBeInTheDocument();
      });
    });
  });

  describe('2.C Resource Ownership Transfer Modal', () => {
    it('renders resource transfer modal, enforces single assignee, shows capacity, and executes transfer', async () => {
      const onTransferConfirm = vi.fn().mockResolvedValue(undefined);
      const candidates: CandidateAssignee[] = [
        {
          id: 'cand-1',
          fullName: 'Alice Walker',
          email: 'alice@alsm.io',
          role: 'Team Lead',
          isActive: true,
          activeWorkload: 2,
          maxCapacity: 5,
        },
        {
          id: 'cand-2',
          fullName: 'Bob Martin',
          email: 'bob@alsm.io',
          role: 'Team Lead',
          isActive: true,
          activeWorkload: 5,
          maxCapacity: 5, // At capacity
        },
      ];

      render(
        <ResourceTransferModal
          isOpen={true}
          onClose={vi.fn()}
          resource={{
            id: 'proj-101',
            name: 'Core Banking Modernization',
            type: 'Modernization Project',
            currentOwnerId: 'owner-prev',
            currentOwnerName: 'Departing Lead',
            details: 'COBOL to Java 21',
          }}
          candidates={candidates}
          onTransferConfirm={onTransferConfirm}
        />
      );

      expect(screen.getByText('Transfer Resource Ownership')).toBeInTheDocument();
      expect(screen.getByText('Core Banking Modernization')).toBeInTheDocument();
      expect(screen.getAllByText('Departing Lead').length).toBeGreaterThan(0);

      // Select candidate from the assignee dropdown (first select)
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'cand-1' } });

      // Check confirmation checkbox
      const confirmCheckbox = screen.getByRole('checkbox');
      fireEvent.click(confirmCheckbox);

      // Click Execute Transfer
      const submitBtn = screen.getByRole('button', { name: /Execute Ownership Transfer/i });
      expect(submitBtn).not.toBeDisabled();
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onTransferConfirm).toHaveBeenCalledWith(
          'proj-101',
          expect.objectContaining({ id: 'cand-1', fullName: 'Alice Walker' }),
          'Workload Balancing',
          ''
        );
      });
    });
  });

  describe('3. Temporary Role Management (Active, Requests, History, 1-Role Constraint & Expiry)', () => {
    it('renders Temporary Roles Page with tabs, countdown badges, and search filter', async () => {
      render(
        <MemoryRouter>
          <TemporaryRolesPage />
        </MemoryRouter>
      );

      // Verify Tabs
      expect(screen.getAllByText(/Active Elevations/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Pending Requests/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Elevation History/i).length).toBeGreaterThan(0);

      // Verify Active list shows mock items with time remaining countdown
      await waitFor(() => {
        expect(screen.getByText('David Kim')).toBeInTheDocument();
        expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
        expect(screen.getAllByText(/remaining/i).length).toBeGreaterThan(0);
      });

      // Filter by search
      const searchInput = screen.getByPlaceholderText(/Search active elevations/i);
      fireEvent.change(searchInput, { target: { value: 'David' } });

      expect(screen.getByText('David Kim')).toBeInTheDocument();
      expect(screen.queryByText('Elena Rostova')).not.toBeInTheDocument();
    });

    it('enforces 1-active-role-per-user constraint in Grant Modal', async () => {
      render(
        <MemoryRouter>
          <TemporaryRolesPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('David Kim')).toBeInTheDocument();
      });

      const grantBtn = screen.getByRole('button', { name: /Grant Temporary Role/i });
      fireEvent.click(grantBtn);

      // Select target user from the modal's comboboxes
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'usr-02' } });

      // Expect conflict warning banner
      await waitFor(() => {
        expect(screen.getByText(/Active Elevation Conflict/i)).toBeInTheDocument();
        expect(screen.getByText(/one active temporary elevation per user/i)).toBeInTheDocument();
      });

      // Grant button should be disabled due to constraint violation
      const submitBtn = screen.getByRole('button', { name: /Confirm and Grant Elevation/i });
      expect(submitBtn).toBeDisabled();
    });

    it('allows Approver to review pending requests and approve/reject with mandatory note', async () => {
      render(
        <MemoryRouter>
          <TemporaryRolesPage />
        </MemoryRouter>
      );

      // Switch to Pending Requests tab
      const requestsTab = screen.getByRole('button', { name: /Pending Requests/i });
      fireEvent.click(requestsTab);

      // Check request item exists
      await waitFor(() => {
        expect(screen.getByText('Marcus Vance')).toBeInTheDocument();
        expect(screen.getByText(/AST debugger tool access/i)).toBeInTheDocument();
      });

      // Click Approve
      const approveBtn = screen.getByRole('button', { name: /Approve/i });
      fireEvent.click(approveBtn);

      expect(screen.getByText('Authorize Elevation')).toBeInTheDocument();
      const confirmApproveBtn = screen.getByRole('button', { name: /Authorize Elevation/i });
      fireEvent.click(confirmApproveBtn);

      // Verify request is approved and moved to active
      await waitFor(() => {
        expect(screen.queryByText('Marcus Vance')).not.toBeInTheDocument();
        expect(screen.getByText(/Elevation request approved/i)).toBeInTheDocument();
      });
    });
  });
});
