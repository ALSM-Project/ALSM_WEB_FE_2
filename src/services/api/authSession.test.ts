import { beforeEach, describe, expect, it, vi } from 'vitest';

const pair = (version: string) => ({ accessToken: 'access-' + version, refreshToken: 'refresh-' + version });
const deferred = <T,>() => { let resolve!: (value: T) => void; let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
let queue: Promise<unknown>;
class Channel {
  static peers: Channel[] = [];
  listeners = new Set<(event: { data: any }) => void>();
  constructor() { Channel.peers.push(this); }
  addEventListener(_name: string, listener: (event: any) => void) { this.listeners.add(listener); }
  removeEventListener(_name: string, listener: (event: any) => void) { this.listeners.delete(listener); }
  postMessage(data: unknown) { for (const peer of Channel.peers) if (peer !== this) queueMicrotask(() => peer.listeners.forEach((listener) => listener({ data }))); }
}
async function tab() { vi.resetModules(); return (await import('./authSession')).tokenStore; }
beforeEach(() => {
  localStorage.clear(); queue = Promise.resolve(); Channel.peers = [];
  vi.stubGlobal('BroadcastChannel', Channel);
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_name: string, work: () => Promise<unknown>) => {
    const result = queue.then(work); queue = result.catch(() => {}); return result;
  } } });
});

describe('refresh/logout coordination', () => {
  it('shares ten simultaneous refreshes in one tab', async () => {
    const store = await tab(); store.setTokens(pair('old'));
    const send = vi.fn().mockResolvedValue(pair('new'));
    const results = await Promise.all(Array.from({ length: 10 }, () => store.refresh(send)));
    expect(send).toHaveBeenCalledTimes(1);
    expect(results.every((tokens) => tokens?.refreshToken === 'refresh-new')).toBe(true);
    expect(store.getAccessToken()).toBe('access-new');
  });
  it('shares a winning generation across two tabs under the browser lock', async () => {
    const a = await tab(), b = await tab(); a.setTokens(pair('old'));
    const send = vi.fn().mockResolvedValue(pair('new'));
    const results = await Promise.all([a.refresh(send), b.refresh(send)]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(results.map((result) => result?.accessToken)).toEqual(['access-new', 'access-new']);
    expect(a.getAccessToken()).toBe('access-new'); expect(b.getAccessToken()).toBe('access-new');
  });
  it('does not let a stale failure erase newer credentials', async () => {
    const store = await tab(); store.setTokens(pair('old'));
    const response = deferred<ReturnType<typeof pair>>();
    const send = vi.fn(() => response.promise); const pending = store.refresh(send);
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    store.setTokens(pair('new-login'));
    response.reject({ response: { status: 401 } });
    await expect(pending).resolves.toEqual(expect.objectContaining(pair('new-login')));
    expect(store.getRefreshToken()).toBe('refresh-new-login');
  });
  it('fences a late refresh in both tabs and retains failed logout proof for retry', async () => {
    const a = await tab(), b = await tab(); a.setTokens(pair('old'));
    const response = deferred<ReturnType<typeof pair>>(); const send = vi.fn(() => response.promise);
    const pending = a.refresh(send); await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    const revoke = vi.fn().mockRejectedValue({ response: { status: 503 } });
    const logout = b.logout(revoke).catch((error) => error);
    expect(a.getAccessToken()).toBeNull(); expect(b.getRefreshToken()).toBeNull();
    response.resolve(pair('late')); await expect(pending).resolves.toBeNull(); await logout;
    expect(revoke).toHaveBeenCalledWith('refresh-old'); expect(a.isLogoutPending()).toBe(true);
    const reloaded = await tab(); const retry = vi.fn().mockResolvedValue(undefined);
    await reloaded.logout(retry);
    expect(retry).toHaveBeenCalledWith('refresh-old'); expect(reloaded.isLogoutPending()).toBe(false);
    expect(a.getAccessToken()).toBeNull(); expect(a.getRefreshToken()).toBeNull();
  });
  it('preserves the current credentials when refresh storage is unavailable', async () => {
    const store = await tab(); store.setTokens(pair('old'));
    await expect(store.refresh(async () => { throw { response: { status: 503 } }; })).rejects.toMatchObject({ response: { status: 503 } });
    expect(store.getRefreshToken()).toBe('refresh-old');
  });
  it('fails closed without cross-tab locking instead of racing the server', async () => {
    const store = await tab(); store.setTokens(pair('old'));
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
    const send = vi.fn(); await expect(store.refresh(send)).rejects.toThrow('coordination is unavailable');
    expect(send).not.toHaveBeenCalled(); expect(store.getRefreshToken()).toBe('refresh-old');
  });
  it('keeps password-remediation state until a confirmed password change', async () => {
    const store = await tab(); store.setTokens({ ...pair('forced'), mustChangePassword: true, hasPassword: false });
    expect(store.requiresPasswordChange()).toBe(true); expect(store.hasPassword()).toBe(false);
    await store.completePasswordChange(); expect(store.requiresPasswordChange()).toBe(false); expect(store.hasPassword()).toBe(true);
  });
  it("recovers from missed peer delivery using only a newer persisted proof", async () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    const a = await tab(),
      b = await tab();
    a.setTokens(pair("old"));
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: {
        request: (_name: string, work: () => Promise<unknown>) => work(),
      },
    });
    const response = deferred<ReturnType<typeof pair>>();
    const send = vi
      .fn()
      .mockImplementationOnce(() => response.promise)
      .mockResolvedValue(pair("recovered"));
    const pending = a.refresh(send);
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    await b.refresh(async () => pair("peer"));
    response.reject({ response: { status: 401 } });
    const result = await pending;
    expect(result?.refreshToken).not.toBe("refresh-old");
    expect(result?.accessToken).toBeTruthy();
    expect(
      send.mock.calls.filter(([proof]) => proof === "refresh-old"),
    ).toHaveLength(1);
    expect(send.mock.calls.length).toBeLessThanOrEqual(2);
  });
  it('retains this portal access-token storage policy', async () => {
    const store = await tab(); store.setTokens(pair('policy'));
    const persisted = Object.values(localStorage).join('');
    expect(persisted.includes('access-policy')).toBe(true);
    expect(persisted.includes('refresh-policy')).toBe(true);
  });
});
