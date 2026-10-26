import { describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';

const mocks = vi.hoisted(() => ({ epoch: 'old-login', access: 'old-access', adapter: vi.fn(), refresh: vi.fn() }));
vi.mock('axios', async (original) => {
  const actual = await original<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, create: (config: object) => actual.default.create({ ...config, adapter: mocks.adapter }) } };
});
vi.mock('./tokenStore', () => ({ tokenStore: {
  epoch: () => mocks.epoch, getAccessToken: () => mocks.access, getRefreshToken: () => 'current-refresh',
  requiresPasswordChange: () => false, isLogoutPending: () => false, refresh: mocks.refresh,
} }));

describe('stale authenticated request admission', () => {
  it('does not replay a previous login request or clear identity after a newer login wins', async () => {
    let finish!: (tokens: { accessToken: string; refreshToken: string }) => void;
    const delayed = new Promise((resolve) => { finish = resolve; });
    mocks.refresh.mockReturnValueOnce(delayed);
    mocks.adapter.mockImplementation(async (config) => { throw { config, response: { status: 401, data: { message: 'fixture rejection' } } }; });
    const failedIdentity = vi.fn(); apiClient.setAuthFailureHandler(failedIdentity);
    const result = apiClient.post('/fixture-protected-action', {}).catch((error) => error);
    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    mocks.epoch = 'new-login'; mocks.access = 'new-access';
    finish({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    const error = await result as { status?: number; response?: { status?: number } };
    expect(error.status || error.response?.status).toBe(401);
    expect(mocks.adapter).toHaveBeenCalledTimes(1);
    expect(failedIdentity).not.toHaveBeenCalled();
    expect(mocks.access).toBe('new-access');
  });
});
