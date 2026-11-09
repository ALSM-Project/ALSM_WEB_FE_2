import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import UserRolesPage from '../pages/UserRolesPage';
import { rbacApi } from '../api/rbac.api';
import { useAuth } from '@/features/auth/hooks/useAuth';

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../api/rbac.api', () => ({
  rbacApi: {
    getAllUsers: vi.fn(),
    getRoles: vi.fn(),
    updateUserRoles: vi.fn(),
  },
}));

vi.mock('../../users/components/OffboardingWizardModal', () => ({
  OffboardingWizardModal: () => null,
}));

describe('UserRolesPage Navigation & Directory Suite', () => {
  const mockUsers = [
    {
      id: 'u-1',
      fullName: 'Van Tien',
      email: 'vantien@alsm.dev',
      isPlatformAdmin: true,
      isActive: true,
      isLocked: false,
      roles: ['ADMIN'],
    },
    {
      id: 'u-2',
      fullName: 'Tran Van Tien',
      email: 'tranvantien@alsm.dev',
      isPlatformAdmin: false,
      isActive: true,
      isLocked: true,
      lockReason: 'Suspicious login',
      roles: [],
    },
  ];

  const mockRoles = [
    { id: 'ADMIN', name: 'Platform Administrator', description: 'Full access' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { id: 'admin-1', isPlatformAdmin: true },
      hasPermission: vi.fn().mockReturnValue(true),
    });
    (rbacApi.getAllUsers as any).mockResolvedValue(mockUsers);
    (rbacApi.getRoles as any).mockResolvedValue(mockRoles);
  });

  it('renders users, supports clicking row to navigate to details, and shows details action', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route path="/admin/users" element={<UserRolesPage />} />
          <Route path="/admin/users/:id" element={<div data-testid="user-detail-route">Member Detail Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Van Tien')).toBeInTheDocument();
    });

    // Both users rendered
    expect(screen.getByText('Tran Van Tien')).toBeInTheDocument();

    // Details button exists
    const detailButtons = screen.getAllByRole('button', { name: /Details/i });
    expect(detailButtons.length).toBe(2);

    // Click Details button on first user
    fireEvent.click(detailButtons[0]);

    // Should navigate to Member Detail Page
    await waitFor(() => {
      expect(screen.getByTestId('user-detail-route')).toBeInTheDocument();
    });
  });
});
