import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UserDetailPage } from '../UserDetailPage';
import { rbacApi } from '@/features/rbac/api/rbac.api';
import { useAuth } from '@/features/auth/hooks/useAuth';

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/features/rbac/api/rbac.api', () => ({
  rbacApi: {
    getUserById: vi.fn(),
    getRoles: vi.fn(),
    getAllUsers: vi.fn(),
    updateUserRoles: vi.fn(),
  },
}));

vi.mock('@/features/partners/api/partners.api', () => ({
  partnersApi: {
    getProjects: vi.fn().mockResolvedValue([]),
  },
}));

describe('UserDetailPage Suite', () => {
  const mockUser = {
    id: 'user-tien-01',
    fullName: 'Van Tien',
    email: 'vantien@alsm.dev',
    isPlatformAdmin: true,
    isActive: true,
    isLocked: false,
    roles: ['ADMIN'],
  };

  const mockRoles = [
    {
      id: 'ADMIN',
      name: 'Platform Administrator',
      description: 'Superuser with full governance privileges.',
      isSystem: true,
    },
    {
      id: 'CONVERSION_STAFF',
      name: 'Conversion Engineer',
      description: 'Specialist managing legacy code conversions and AST validations.',
      isSystem: false,
    },
    {
      id: 'TEAM_LEAD',
      name: 'Team Lead',
      description: 'Technical lead managing project allocation and approval workflows.',
      isSystem: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { id: 'admin-1', isPlatformAdmin: true },
      hasPermission: vi.fn().mockReturnValue(true),
    });
    (rbacApi.getUserById as any).mockResolvedValue(mockUser);
    (rbacApi.getRoles as any).mockResolvedValue(mockRoles);
    (rbacApi.getAllUsers as any).mockResolvedValue([mockUser]);
    (rbacApi.updateUserRoles as any).mockResolvedValue(['ADMIN', 'CONVERSION_STAFF']);
  });

  it('renders user details, allows assigning new roles, and saves changes', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/users/user-tien-01']}>
        <Routes>
          <Route path="/admin/users/:id" element={<UserDetailPage />} />
          <Route path="/admin/users" element={<div>User Directory</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Verify user profile header
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Van Tien' })).toBeInTheDocument();
    });

    expect(screen.getByText('vantien@alsm.dev')).toBeInTheDocument();
    expect(screen.getByText('user-tien-01')).toBeInTheDocument();
    expect(screen.getByText('PLATFORM ADMIN')).toBeInTheDocument();
    expect(screen.getByText('Active Member')).toBeInTheDocument();

    // Verify system roles rendered
    expect(screen.getByText('Platform Administrator')).toBeInTheDocument();
    expect(screen.getByText('Conversion Engineer')).toBeInTheDocument();
    expect(screen.getByText('Team Lead')).toBeInTheDocument();

    // ADMIN is currently assigned
    expect(screen.getByText('Assigned')).toBeInTheDocument();

    // Toggle CONVERSION_STAFF role to assign it
    const staffRoleCard = screen.getByText('Conversion Engineer');
    fireEvent.click(staffRoleCard);

    // Save button should now be enabled and unsaved banner shown
    expect(screen.getByText(/You have unsaved role modifications/i)).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /Save Role Assignments/i });
    expect(saveBtn).not.toBeDisabled();

    // Commit changes
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(rbacApi.updateUserRoles).toHaveBeenCalledWith(
        'user-tien-01',
        ['ADMIN', 'CONVERSION_STAFF']
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Roles successfully updated for Van Tien/i)).toBeInTheDocument();
    });

    // Test back button
    const backBtn = screen.getByRole('button', { name: /Back to User Directory/i });
    fireEvent.click(backBtn);
    expect(screen.getByText('User Directory')).toBeInTheDocument();
  });
});
