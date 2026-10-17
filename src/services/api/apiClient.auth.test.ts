import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';

const mocks = vi.hoisted(() => ({
  handoff: vi.fn(async (navigate: (tokens: { accessToken: string; refreshToken: string }) => void) => navigate({ accessToken: 'fixture-access', refreshToken: 'fixture-refresh' })),
  logout: vi.fn(async (send: (proof: string) => Promise<void>) => send('fixture-proof')),
}));
vi.mock('./tokenStore', () => ({ tokenStore: { hasPassword: () => false, handoff: mocks.handoff, logout: mocks.logout } }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('staff credential remediation and public logout', () => {
  it('hands restricted credentials to the Web 1 password callback in a URL fragment', async () => {
    const location = { href: '' };
    vi.stubGlobal('window', { location });
    apiClient.routePasswordChange();
    await Promise.resolve();
    const destination = new URL(location.href);
    expect(destination.pathname).toBe('/auth/password-callback');
    expect(destination.search).toBe('');
    const credentials = new URLSearchParams(destination.hash.slice(1));
    expect(credentials.get('access_token')).toBe('fixture-access');
    expect(credentials.get('refresh_token')).toBe('fixture-refresh');
    expect(credentials.get('has_password')).toBe('false');
    expect(mocks.handoff).toHaveBeenCalledTimes(1);
  });
  it('propagates logout storage failures without refreshing or claiming success', async () => {
    const failure = { response: { status: 503 } };
    const post = vi.spyOn(axios, 'post').mockRejectedValueOnce(failure);
    await expect(apiClient.logout()).rejects.toBe(failure);
    expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/logout$/), { refreshToken: 'fixture-proof' }, { timeout: 30000 });
    expect(post).toHaveBeenCalledTimes(1);
  });
});
