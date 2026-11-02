import { describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';

const mocks = vi.hoisted(() => ({ adapter: vi.fn(), refresh: vi.fn() }));
vi.mock('axios', async (original) => {
  const actual = await original<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      create: (config: object) => actual.default.create({ ...config, adapter: mocks.adapter }),
    },
  };
});
vi.mock('./tokenStore', () => ({
  tokenStore: {
    epoch: () => 'staff-login',
    getAccessToken: () => 'original-staff-access',
    getRefreshToken: () => 'original-staff-refresh',
    requiresPasswordChange: () => false,
    isLogoutPending: () => false,
    refresh: mocks.refresh,
  },
}));

describe('Support request authentication replay exclusion', () => {
  it.each(['get', 'post'] as const)(
    'never refreshes/replays an audited Support %s on 401',
    async (method) => {
      mocks.adapter.mockClear();
      mocks.adapter.mockImplementation(async (config) => {
        throw { config, response: { status: 401, data: { code: 'CURRENT_SESSION_REQUIRED' } } };
      });
      const request =
        method === 'get'
          ? apiClient.get('/support/organizations/fixture', { skipAuthReplay: true })
          : apiClient.post('/support/organizations/fixture/contexts', {}, { skipAuthReplay: true });
      await expect(request).rejects.toMatchObject({ response: { status: 401 } });
      expect(mocks.refresh).not.toHaveBeenCalled();
      expect(mocks.adapter).toHaveBeenCalledTimes(1);
      expect(mocks.adapter.mock.calls[0][0].headers.Authorization).toBe(
        'Bearer original-staff-access',
      );
    },
  );
});
