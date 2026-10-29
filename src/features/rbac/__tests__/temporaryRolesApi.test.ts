import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api/apiClient';
import { temporaryRolesApi, toTemporaryRole } from '../api/temporary-roles.api';

vi.mock('@/services/api/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const NOW = new Date('2026-10-29T10:00:00.000Z').getTime();
const iso = (hours: number) => new Date(NOW + hours * 3600 * 1000).toISOString();

type StoredRole = Parameters<typeof toTemporaryRole>[0];
const stored = (overrides: Record<string, unknown> = {}): StoredRole => ({
  id: 'tr-1',
  userId: { _id: 'u-1', fullName: 'David Kim', email: 'david@alsm.io' },
  roleId: 'TEAM_LEAD',
  grantedBy: { _id: 'a-1', fullName: 'System Admin', email: 'admin@alsm.io' },
  grantedAt: iso(-1),
  createdAt: iso(-1),
  expiresAt: iso(7),
  durationHours: 8,
  status: 'ACTIVE',
  requestStatus: 'APPROVED',
  reason: 'Covering the on-call rotation',
  ...overrides,
} as StoredRole);

describe('toTemporaryRole', () => {
  it('reads the populated user and grantor of a stored role', () => {
    expect(toTemporaryRole(stored(), NOW)).toMatchObject({
      id: 'tr-1',
      userId: 'u-1',
      userFullName: 'David Kim',
      userEmail: 'david@alsm.io',
      role: 'TEAM_LEAD',
      grantedBy: 'System Admin',
      status: 'ACTIVE',
    });
  });

  it('treats a request waiting for review as PENDING and a refused one as REJECTED', () => {
    expect(toTemporaryRole(stored({ status: 'REVOKED', requestStatus: 'PENDING' }), NOW).status).toBe('PENDING');
    expect(toTemporaryRole(stored({ status: 'REVOKED', requestStatus: 'PENDING' }), NOW).expiresAt).toBe('');
    expect(toTemporaryRole(stored({ status: 'REVOKED', requestStatus: 'REJECTED' }), NOW).status).toBe('REJECTED');
  });

  it('shows an elevation past its end time as EXPIRED even before the expiry job ran', () => {
    expect(toTemporaryRole(stored({ expiresAt: iso(-0.5) }), NOW).status).toBe('EXPIRED');
    expect(toTemporaryRole(stored({ expiresAt: iso(0.5) }), NOW).status).toBe('ACTIVE');
  });
});

describe('temporaryRolesApi talks to the routes the backend has', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(apiClient.post).mockResolvedValue(stored());
  });

  it('grants with roleId and the optional project', async () => {
    await temporaryRolesApi.grantRole({
      targetUserId: 'u-1',
      role: 'CONVERSION_STAFF',
      durationHours: 4,
      reason: 'Fixing the production incident',
      projectId: 'p-1',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/rbac/temporary-roles', {
      targetUserId: 'u-1',
      roleId: 'CONVERSION_STAFF',
      durationHours: 4,
      reason: 'Fixing the production incident',
      projectId: 'p-1',
    });
  });

  it('requests, reviews and revokes on the per-record routes', async () => {
    await temporaryRolesApi.requestRole({ role: 'TEAM_LEAD', durationHours: 2, reason: 'Sign-off while the lead is away' });
    expect(apiClient.post).toHaveBeenLastCalledWith('/rbac/temporary-roles/request', {
      roleId: 'TEAM_LEAD',
      durationHours: 2,
      reason: 'Sign-off while the lead is away',
    });

    await temporaryRolesApi.approveRequest({ requestId: 'r-1', approved: false, rejectionReason: 'No project context' });
    expect(apiClient.post).toHaveBeenLastCalledWith('/rbac/temporary-roles/requests/r-1/review', {
      approved: false,
      reason: 'No project context',
    });

    await temporaryRolesApi.revokeRole({ assignmentId: 'tr-1', reason: 'Work finished early' });
    expect(apiClient.post).toHaveBeenLastCalledWith('/rbac/temporary-roles/tr-1/revoke', {
      reason: 'Work finished early',
    });
  });

  it('lists only running elevations as active and keeps everything in the history', async () => {
    // getActiveRoles judges against the real clock, so these times are relative to it.
    const real = (hours: number) => new Date(Date.now() + hours * 3600 * 1000).toISOString();
    vi.mocked(apiClient.get).mockImplementation(async (url: string) =>
      url.endsWith('/history')
        ? [stored({ expiresAt: real(7) }), stored({ id: 'tr-2', status: 'REVOKED' })]
        : [stored({ expiresAt: real(7) }), stored({ id: 'tr-3', expiresAt: real(-1) })],
    );
    const active = await temporaryRolesApi.getActiveRoles();
    expect(active.map((r) => r.id)).toEqual(['tr-1']);
    const history = await temporaryRolesApi.getHistory();
    expect(history.map((r) => r.id)).toEqual(['tr-1', 'tr-2']);
  });

  it('lets a server failure through instead of inventing sample data', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('offline'));
    await expect(temporaryRolesApi.getActiveRoles()).rejects.toThrow('offline');
  });
});
