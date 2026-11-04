import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OffboardingWizardModal } from '../components/OffboardingWizardModal';
import { usersApi } from '../api/users.api';

vi.mock('../api/users.api', () => ({
  usersApi: {
    getOffboardingSummary: vi.fn(),
    offboardUser: vi.fn(),
  },
}));

describe('OffboardingWizardModal (UC-83)', () => {
  const mockDepartingUser = {
    id: 'usr-100',
    email: 'departing@alsm.io',
    fullName: 'Alex Departing',
    isPlatformAdmin: false,
    isActive: true,
    roles: ['CONVERSION_STAFF'],
  };

  const mockActiveStaff = [
    mockDepartingUser,
    {
      id: 'usr-200',
      email: 'successor@alsm.io',
      fullName: 'Sam Successor',
      isPlatformAdmin: false,
      isActive: true,
      isLocked: false,
      roles: ['CONVERSION_STAFF'],
    },
  ];

  const mockSummary = {
    user: mockDepartingUser,
    activeSessionsCount: 2,
    activeSessions: [
      { id: 'sess-1', deviceType: 'Desktop', browser: 'Chrome' },
    ],
    apiCredentialsCount: 1,
    assignedProjects: [
      {
        id: 'proj-1',
        name: 'Core Banking Account Ledger',
        status: 'ACTIVE',
        organizationId: 'org-1',
        assignedRole: 'CONVERSION_STAFF' as const,
        isTransferable: true,
      },
    ],
    pendingJobsCount: 1,
    pendingJobs: [
      { id: 'job-1', projectId: 'proj-1', status: 'QUEUED', priority: 'HIGH', conversionType: 'COBOL_TO_JAVA' },
    ],
    eligibleStaff: [
      {
        id: 'usr-200',
        fullName: 'Sam Successor',
        email: 'successor@alsm.io',
        roles: ['CONVERSION_STAFF'],
        activeWorkload: 1,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (usersApi.getOffboardingSummary as any).mockResolvedValue(mockSummary);
    (usersApi.offboardUser as any).mockResolvedValue({
      success: true,
      message: 'Staff member offboarded successfully.',
      operations: {
        projectsTransferred: 1,
        sessionsRevoked: 2,
        apiCredentialsRevoked: 1,
        rolesRemoved: 1,
        accountDeactivated: true,
      },
      transferredProjects: [
        {
          projectId: 'proj-1',
          projectName: 'Core Banking Account Ledger',
          newOwnerId: 'usr-200',
          newOwnerName: 'Sam Successor',
        },
      ],
    });
  });

  it('renders Step 1 with departing staff dossier and associated transferable work resources', async () => {
    render(
      <OffboardingWizardModal
        isOpen={true}
        onClose={vi.fn()}
        userToOffboard={mockDepartingUser}
        activeStaffMembers={mockActiveStaff}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Controlled Staff Offboarding Wizard \(Step 1 of 4\)/i)).toBeInTheDocument();
    expect(screen.getByText('Departing Staff Dossier')).toBeInTheDocument();
    expect(screen.getByText('Alex Departing')).toBeInTheDocument();
    expect(screen.getByText('departing@alsm.io')).toBeInTheDocument();
    expect(screen.getByText(/Transferable Work Resources/i)).toBeInTheDocument();
  });

  it('navigates to Step 2, enforces successor selection for active projects, and advances', async () => {
    render(
      <OffboardingWizardModal
        isOpen={true}
        onClose={vi.fn()}
        userToOffboard={mockDepartingUser}
        activeStaffMembers={mockActiveStaff}
        onSuccess={vi.fn()}
      />
    );

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Next: Select Successor/i }));

    expect(screen.getByText(/Controlled Staff Offboarding Wizard \(Step 2 of 4\)/i)).toBeInTheDocument();

    // Trying to proceed without choosing a successor
    fireEvent.click(screen.getByRole('button', { name: /Next: Transfer Preview/i }));
    expect(screen.getByText(/Please select an active, authorized staff member/i)).toBeInTheDocument();

    // Select successor
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'usr-200' } });

    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Next: Transfer Preview/i }));

    await waitFor(() => {
      expect(screen.getByText(/Controlled Staff Offboarding Wizard \(Step 3 of 4\)/i)).toBeInTheDocument();
      expect(screen.getByText('Planned Action Plan')).toBeInTheDocument();
      expect(screen.getByText('Sam Successor')).toBeInTheDocument();
    });
  });

  it('executes the full offboarding workflow and renders final completion audit summary', async () => {
    const onSuccess = vi.fn();
    render(
      <OffboardingWizardModal
        isOpen={true}
        onClose={vi.fn()}
        userToOffboard={mockDepartingUser}
        activeStaffMembers={mockActiveStaff}
        onSuccess={onSuccess}
      />
    );

    // Step 1 -> 2
    fireEvent.click(screen.getByRole('button', { name: /Next: Select Successor/i }));

    // Choose successor
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'usr-200' } });

    // Step 2 -> 3
    fireEvent.click(screen.getByRole('button', { name: /Next: Transfer Preview/i }));

    // Step 3 -> 4
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Proceed to Confirmation/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Proceed to Confirmation/i }));

    // Step 4
    expect(screen.getByText(/Explicit Authorization Required/i)).toBeInTheDocument();
    const executeBtn = screen.getByRole('button', { name: /Confirm & Execute Offboarding/i });
    expect(executeBtn).toBeDisabled();

    // Check confirmation checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(executeBtn).not.toBeDisabled();

    // Execute
    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(usersApi.offboardUser).toHaveBeenCalledWith('usr-100', expect.objectContaining({
        transferToUserId: 'usr-200',
        confirmDeactivation: true,
      }));
      expect(screen.getByText(/Controlled Offboarding Successfully Completed/i)).toBeInTheDocument();
      expect(screen.getByText(/Execution Audit Log Summary/i)).toBeInTheDocument();
      expect(screen.getByText(/Deactivated & Locked/i)).toBeInTheDocument();
      expect(onSuccess).toHaveBeenCalledWith(1);
    });
  });
});
