import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UserOffboardPage } from '../UserOffboardPage';
import { usersApi } from '../../api/users.api';

vi.mock('../../api/users.api', () => ({
  usersApi: {
    getOffboardingSummary: vi.fn(),
    offboardUser: vi.fn(),
    transferResource: vi.fn(),
  },
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', fullName: 'System Administrator', email: 'admin@alsm.io', isPlatformAdmin: true },
    hasPermission: () => true,
  }),
}));

const mockSummary = {
  user: {
    id: 'user-phong',
    fullName: 'Phong Dang',
    email: 'phongx12dang@gmail.com',
    isActive: true,
    isLocked: false,
    roles: ['CONVERSION_STAFF'],
  },
  activeSessionsCount: 2,
  activeSessions: [
    { id: 'sess-1', deviceType: 'Web Browser', browser: 'Chrome 122', ipAddress: '192.168.1.10' },
  ],
  apiCredentialsCount: 1,
  assignedProjects: [
    { id: 'proj-bms', name: 'BMS Modernization', status: 'IN_PROGRESS', organizationId: 'org-1', assignedRole: 'CONVERSION_STAFF' as const, isTransferable: true },
  ],
  pendingJobsCount: 0,
  pendingJobs: [],
  eligibleStaff: [
    { id: 'staff-2', fullName: 'Van Tien', email: 'tien@alsm.io', roles: ['CONVERSION_STAFF'], activeWorkload: 1 },
  ],
};

describe('UserOffboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (usersApi.getOffboardingSummary as any).mockResolvedValue(mockSummary);
  });

  it('renders complete offboarding dossier including projects and security credentials', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/users/user-phong/offboard']}>
        <Routes>
          <Route path="/admin/users/:userId/offboard" element={<UserOffboardPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Staff Offboarding Dossier')).toBeInTheDocument();
      expect(screen.getAllByText('Phong Dang').length).toBeGreaterThan(0);
      expect(screen.getByText('BMS Modernization')).toBeInTheDocument();
    });

    expect(screen.getByText(/2 Session\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText('Van Tien (Workload: 1)')).toBeInTheDocument();
  });

  it('allows selecting a successor and executing immediate offboarding', async () => {
    (usersApi.offboardUser as any).mockResolvedValue({
      success: true,
      message: 'User successfully offboarded',
      operations: {
        projectsTransferred: 1,
        sessionsRevoked: 2,
        apiCredentialsRevoked: 1,
        rolesRemoved: 1,
      },
    });

    render(
      <MemoryRouter initialEntries={['/admin/users/user-phong/offboard']}>
        <Routes>
          <Route path="/admin/users/:userId/offboard" element={<UserOffboardPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Phong Dang').length).toBeGreaterThan(0);
    });

    // Fill justification reason
    const reasonInput = screen.getByPlaceholderText(/End of 12-month engineering assignment/i);
    fireEvent.change(reasonInput, { target: { value: 'Contract term completed, handing over BMS to Van Tien' } });

    // Check confirmation checkbox
    const confirmCheckbox = screen.getByRole('checkbox');
    fireEvent.click(confirmCheckbox);

    // Click execute
    const executeBtn = screen.getByRole('button', { name: /Execute Controlled Offboarding/i });
    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(usersApi.offboardUser).toHaveBeenCalledWith('user-phong', expect.objectContaining({
        transferToUserId: 'staff-2',
        confirmDeactivation: true,
      }));
      expect(screen.getByText('Controlled Staff Offboarding Completed Successfully')).toBeInTheDocument();
    });
  });
});
