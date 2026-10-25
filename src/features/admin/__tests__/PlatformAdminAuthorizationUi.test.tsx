import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PermissionGuard } from '@/app/guards';
import { UserRolesPage } from '@/features/rbac/pages/UserRolesPage';
import { rbacApi } from '@/features/rbac/api/rbac.api';
import { usersApi } from '@/features/users/api/users.api';

const authority = vi.hoisted(() => ({ admin: false, permissions: [] as string[] }));
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({
  user: { id: 'actor', isPlatformAdmin: authority.admin, roles: ['ADMIN'] },
  hasPermission: (key: string) => authority.permissions.includes(key),
}) }));
vi.mock('@/features/rbac/api/rbac.api', () => ({ rbacApi: {
  getAllUsers: vi.fn(), getRoles: vi.fn(),
} }));
vi.mock('@/features/users/api/users.api', () => ({ usersApi: {
  lockUser: vi.fn(), unlockUser: vi.fn(), offboardUser: vi.fn(),
} }));

beforeEach(() => {
  vi.clearAllMocks();
  authority.admin = false;
  authority.permissions = ['organizations.view', 'users.lock', 'users.offboard', 'resources.transfer', 'resources.transfer.confirm'];
  vi.mocked(rbacApi.getAllUsers).mockResolvedValue([{ id: 'target', email: 'target@example.test', fullName: 'Target Staff', isPlatformAdmin: false, isActive: true, isLocked: true, roles: [] }]);
  vi.mocked(rbacApi.getRoles).mockResolvedValue([]);
});

describe('global administration UI follows the persisted-admin API boundary', () => {
  it('denies a support/tenant/role-only reader despite organizations.view', () => {
    render(<PermissionGuard permission="organizations.view" platformAdminOnly><span>Customer members</span></PermissionGuard>);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Customer members')).not.toBeInTheDocument();
  });
  it('permits the admin page only with both the admin marker and operation permission', () => {
    authority.admin = true;
    const view = render(<PermissionGuard permission="organizations.view" platformAdminOnly><span>Customer members</span></PermissionGuard>);
    expect(screen.getByText('Customer members')).toBeInTheDocument();
    authority.permissions = [];
    view.rerender(<PermissionGuard permission="organizations.view" platformAdminOnly><span>Customer members</span></PermissionGuard>);
    expect(screen.queryByText('Customer members')).not.toBeInTheDocument();
  });
  it('preserves non-admin permission guards for existing scoped workflows', () => {
    render(<PermissionGuard permission="organizations.view"><span>Other authorized workflow</span></PermissionGuard>);
    expect(screen.getByText('Other authorized workflow')).toBeInTheDocument();
  });
  it('hides global lifecycle actions from team leads while retaining the existing role UI', async () => {
    render(<MemoryRouter><UserRolesPage /></MemoryRouter>);
    await screen.findByText('Target Staff');
    expect(screen.getByRole('button', { name: 'Roles' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unlock' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Offboard' })).not.toBeInTheDocument();
  });
  it('requires confirmation permission for the global offboard-with-transfer wizard', async () => {
    authority.admin = true;
    authority.permissions = authority.permissions.filter((key) => key !== 'resources.transfer.confirm');
    render(<MemoryRouter><UserRolesPage /></MemoryRouter>);
    await screen.findByText('Target Staff');
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Offboard' })).not.toBeInTheDocument();
  });
  it('does not report local unlock success when the backend rejects authorization', async () => {
    authority.admin = true;
    vi.mocked(usersApi.unlockUser).mockRejectedValue(new Error('Authorization denied'));
    render(<MemoryRouter><UserRolesPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Unlock' }));
    await screen.findByText('Authorization denied');
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
    expect(screen.queryByText(/successfully unlocked|restored to active state/i)).not.toBeInTheDocument();
  });
});
