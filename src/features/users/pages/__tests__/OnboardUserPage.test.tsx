import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OnboardUserPage } from '../OnboardUserPage';
import { rbacApi } from '@/features/rbac/api/rbac.api';
import { usersApi } from '@/features/users/api/users.api';

vi.mock('@/features/rbac/api/rbac.api', () => ({
  rbacApi: {
    getRoles: vi.fn(),
    getRolePermissions: vi.fn(),
  },
}));

vi.mock('@/features/users/api/users.api', () => ({
  usersApi: {
    onboardUser: vi.fn(),
  },
}));

describe('OnboardUserPage Dedicated Detail View Suite', () => {
  const mockRoles = [
    {
      id: 'conversion_staff',
      name: 'Conversion Staff',
      description: 'Executes AST transformations and code migrations',
      isSystem: false,
    },
    {
      id: 'team_lead',
      name: 'Team Lead',
      description: 'Supervises conversions and manages engineer allocations',
      isSystem: false,
    },
  ];

  const mockPermissions = ['web2:projects:read', 'web2:conversion:write', 'web2:ast:validate'];

  beforeEach(() => {
    vi.clearAllMocks();
    (rbacApi.getRoles as any).mockResolvedValue(mockRoles);
    (rbacApi.getRolePermissions as any).mockResolvedValue(mockPermissions);
    (usersApi.onboardUser as any).mockResolvedValue({
      id: 'usr-new-01',
      fullName: 'Alex Vance',
      email: 'alex.vance@acmecorp.com',
      role: 'conversion_staff',
      isActive: true,
    });
  });

  it('renders header, identity form, role selection, and live profile dossier', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/users/onboard']}>
        <Routes>
          <Route path="/admin/users/onboard" element={<OnboardUserPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Header & Badge
    expect(await screen.findByText('Onboard Staff Account')).toBeInTheDocument();
    expect(screen.getByText('INTERNAL WORKFORCE')).toBeInTheDocument();

    // Section 1: Identity & Coordinates
    expect(screen.getByPlaceholderText('Alex Vance')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('alex.vance@acmecorp.com')).toBeInTheDocument();
    expect(screen.getByText(/Department \/ Unit/i)).toBeInTheDocument();

    // Section 2: Roles
    await waitFor(() => {
      expect(screen.getAllByText('Conversion Staff').length).toBeGreaterThan(0);
      expect(screen.getByText('Team Lead')).toBeInTheDocument();
    });

    // Permission Preview
    await waitFor(() => {
      expect(screen.getByText(/Live Permission Preview/i)).toBeInTheDocument();
      expect(screen.getByText('web2:projects:read')).toBeInTheDocument();
    });

    // Right Column: Dossier
    expect(screen.getByText('Provisioning Profile Dossier')).toBeInTheDocument();
    expect(screen.getByText('New Staff Member')).toBeInTheDocument();
  });

  it('updates live profile dossier dynamically when inputs change', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/users/onboard']}>
        <Routes>
          <Route path="/admin/users/onboard" element={<OnboardUserPage />} />
        </Routes>
      </MemoryRouter>
    );

    const nameInput = await screen.findByPlaceholderText('Alex Vance');
    const emailInput = screen.getByPlaceholderText('alex.vance@acmecorp.com');

    fireEvent.change(nameInput, { target: { value: 'Tran Van Tien' } });
    fireEvent.change(emailInput, { target: { value: 'tranvantien@alsm.io' } });

    // Dossier should reflect updated values
    expect(screen.getAllByText('Tran Van Tien').length).toBeGreaterThan(0);
    expect(screen.getByText('tranvantien@alsm.io')).toBeInTheDocument();
  });

  it('validates required authorization confirmation and submits onboarding successfully', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/users/onboard']}>
        <Routes>
          <Route path="/admin/users/onboard" element={<OnboardUserPage />} />
          <Route path="/admin/users" element={<div data-testid="user-directory-page">User Directory</div>} />
        </Routes>
      </MemoryRouter>
    );

    const nameInput = await screen.findByPlaceholderText('Alex Vance');
    const emailInput = screen.getByPlaceholderText('alex.vance@acmecorp.com');

    fireEvent.change(nameInput, { target: { value: 'Alex Vance' } });
    fireEvent.change(emailInput, { target: { value: 'alex.vance@acmecorp.com' } });

    const submitBtn = screen.getByRole('button', { name: /Complete Onboarding/i });
    expect(submitBtn).toBeDisabled();

    // Check authorization confirmation
    const confirmCheckbox = screen.getByLabelText(/I confirm the creation of this staff account/i);
    fireEvent.click(confirmCheckbox);

    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(usersApi.onboardUser).toHaveBeenCalledWith({
        fullName: 'Alex Vance',
        email: 'alex.vance@acmecorp.com',
        role: 'conversion_staff',
      });
    });

    expect(await screen.findByText(/Staff account "Alex Vance" created successfully/i)).toBeInTheDocument();
  });
});
