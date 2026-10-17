// Refresh/logout coordination. Access credentials retain this portal's storage policy.
const PERSIST_ACCESS: boolean = true;
const LEGACY_REFRESH = "alsm_staff_refresh_token";
const LEGACY_ACCESS: string = "alsm_staff_access_token";
const PREFIX = "alsm.web2.auth";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  mustChangePassword?: boolean;
  hasPassword?: boolean;
}
interface StoredState {
  epoch: string;
  refreshToken: string | null;
  accessToken?: string | null;
  mustChangePassword?: boolean;
  hasPassword?: boolean;
}
interface Fence { epoch: string; blocked: boolean; proof?: string }
const STATE_KEY = PREFIX + '.state';
const FENCE_KEY = PREFIX + '.fence';
let memory: AuthTokens | null = null;
let flight: { epoch: string; promise: Promise<AuthTokens | null> } | null = null;
const listeners = new Set<() => void>();
const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(PREFIX);
const notify = () => listeners.forEach((listener) => listener());
function fence(): Fence {
  try { return JSON.parse(localStorage.getItem(FENCE_KEY) || 'null') || { epoch: 'legacy', blocked: false }; }
  catch { return { epoch: 'unavailable', blocked: true }; }
}
function raw(): StoredState {
  try {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) return JSON.parse(saved);
    return { epoch: 'legacy', refreshToken: localStorage.getItem(LEGACY_REFRESH), accessToken: LEGACY_ACCESS ? localStorage.getItem(LEGACY_ACCESS) : null };
  } catch { return { epoch: '', refreshToken: null }; }
}
function state(): StoredState {
  const current = raw(), barrier = fence();
  return !barrier.blocked && current.epoch === barrier.epoch ? current : { epoch: barrier.epoch, refreshToken: null };
}
function access(): string | null {
  const current = state();
  if (!current.refreshToken) return null;
  if (memory?.refreshToken === current.refreshToken) return memory.accessToken;
  return PERSIST_ACCESS ? current.accessToken || null : null;
}
function publish(tokens: AuthTokens, epoch: string): boolean {
  if (fence().epoch !== epoch || fence().blocked) return false;
  if (!tokens.accessToken || !tokens.refreshToken) throw new Error('Invalid authentication response');
  localStorage.setItem(STATE_KEY, JSON.stringify({ epoch, refreshToken: tokens.refreshToken,
    ...(PERSIST_ACCESS ? { accessToken: tokens.accessToken } : {}),
    mustChangePassword: tokens.mustChangePassword === true, hasPassword: tokens.hasPassword }));
  // A logout fence is separate from the credential write. Even an interleaved
  // stale write is unreadable after logout, including in another tab/process.
  if (fence().epoch !== epoch || fence().blocked) return false;
  memory = tokens;
  localStorage.removeItem(LEGACY_REFRESH);
  if (LEGACY_ACCESS) localStorage.removeItem(LEGACY_ACCESS);
  channel?.postMessage({ type: 'tokens', epoch, tokens });
  notify();
  return true;
}
function clear(): void {
  memory = null;
  const epoch = crypto.randomUUID();
  localStorage.setItem(FENCE_KEY, JSON.stringify({ epoch, blocked: false }));
  localStorage.setItem(STATE_KEY, JSON.stringify({ epoch, refreshToken: null }));
  localStorage.removeItem(LEGACY_REFRESH);
  if (LEGACY_ACCESS) localStorage.removeItem(LEGACY_ACCESS);
  channel?.postMessage({ type: 'changed' });
  notify();
}
function clearAtEpoch(epoch: string): void {
  // Called under the shared lock; never overwrite a concurrent logout fence.
  localStorage.setItem(STATE_KEY, JSON.stringify({ epoch, refreshToken: null }));
  memory = null;
  localStorage.removeItem(LEGACY_REFRESH);
  if (LEGACY_ACCESS) localStorage.removeItem(LEGACY_ACCESS);
  channel?.postMessage({ type: 'changed' });
  notify();
}
function currentPair(): AuthTokens | null {
  const current = state(), token = access();
  return current.refreshToken && token ? { accessToken: token, refreshToken: current.refreshToken,
    mustChangePassword: current.mustChangePassword, hasPassword: current.hasPassword } : null;
}
async function lock<T>(work: () => Promise<T>): Promise<T> {
  if (!navigator.locks) throw new Error('Secure browser coordination is unavailable. Use HTTPS and a supported browser.');
  return navigator.locks.request(PREFIX, work);
}
async function sharedPair(): Promise<AuthTokens | null> {
  if (currentPair()) return currentPair();
  if (!channel) return null;
  const nonce = crypto.randomUUID();
  return new Promise((resolve) => {
    const finish = () => { channel.removeEventListener('message', receive); clearTimeout(timer); resolve(currentPair()); };
    const receive = (event: MessageEvent) => { if (event.data?.type === 'tokens' && event.data?.nonce === nonce) finish(); };
    const timer = setTimeout(finish, 150);
    channel.addEventListener('message', receive);
    channel.postMessage({ type: 'request', nonce });
  });
}
channel?.addEventListener('message', (event) => {
  const message = event.data;
  if (message?.type === 'request') {
    const tokens = currentPair();
    if (tokens) channel.postMessage({ type: 'tokens', epoch: fence().epoch, tokens, nonce: message.nonce });
  } else if (message?.type === 'tokens') {
    if (!fence().blocked && message.epoch === fence().epoch && message.tokens?.refreshToken === state().refreshToken) memory = message.tokens;
    notify();
  } else notify();
});
if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
  if (event.key === FENCE_KEY || event.key === STATE_KEY) notify();
});

export const tokenStore = {
  getAccessToken: access,
  getRefreshToken: () => state().refreshToken,
  isLogoutPending: () => fence().blocked && !(raw().epoch === fence().epoch && raw().refreshToken === null),
  requiresPasswordChange: () => state().mustChangePassword === true,
  hasPassword: () => state().hasPassword !== false,
  epoch: () => fence().epoch,
  snapshot: () => JSON.stringify([fence(), state().refreshToken]),
  clear,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  setTokens(tokens: AuthTokens) {
    const epoch = crypto.randomUUID();
    localStorage.setItem(FENCE_KEY, JSON.stringify({ epoch, blocked: false }));
    publish(tokens, epoch);
  },
  async acceptTokens(tokens: AuthTokens): Promise<void> {
    await lock(async () => { tokenStore.setTokens(tokens); });
  },
  async authenticate(send: () => Promise<AuthTokens>): Promise<AuthTokens> {
    const expected = tokenStore.snapshot();
    return lock(async () => {
      const tokens = await send();
      if (expected !== tokenStore.snapshot()) throw new Error('Authentication was superseded');
      tokenStore.setTokens(tokens);
      return tokens;
    });
  },
  refresh(send: (refreshToken: string) => Promise<AuthTokens>): Promise<AuthTokens | null> {
    const started = state();
    if (!started.refreshToken || fence().blocked) return Promise.resolve(null);
    if (flight?.epoch === started.epoch) return flight.promise;
    let sentToken: string | null = null;
    const rotate = () => lock(async () => {
      if (fence().epoch !== started.epoch || fence().blocked) return null;
      if (state().refreshToken !== started.refreshToken) {
        const shared = await sharedPair();
        if (shared) return shared;
      }
      const current = state();
      if (!current.refreshToken || fence().blocked) return null;
      try {
        sentToken = current.refreshToken;
        const tokens = await send(current.refreshToken);
        if (fence().epoch !== started.epoch || fence().blocked || state().refreshToken !== current.refreshToken) return sharedPair();
        return publish(tokens, started.epoch) ? tokens : null;
      } catch (error) {
        if (fence().epoch !== started.epoch || fence().blocked || state().refreshToken !== current.refreshToken) return sharedPair();
        const status = (error as { response?: { status?: number }; status?: number }).response?.status || (error as { status?: number }).status;
        if (status === 401 || status === 403) clearAtEpoch(started.epoch);
        throw error; // Connectivity/503 is never proof of revocation.
      }
    });
    const promise = (async () => {
      // A suspended/closing peer may miss BroadcastChannel delivery. Re-read a
      // genuinely newer proof under the lock; never replay a consumed proof.
      for (let attempt = 0; attempt < 3; attempt++) {
        const tokens = await rotate();
        if (tokens || fence().epoch !== started.epoch || fence().blocked || !state().refreshToken || state().refreshToken === sentToken) return tokens;
      }
      throw new Error('The session changed in another tab. Please retry.');
    })();
    const tracked = promise.finally(() => { if (flight?.promise === tracked) flight = null; });
    flight = { epoch: started.epoch, promise: tracked };
    return tracked;
  },
  async logout(send: (refreshToken: string) => Promise<void>): Promise<void> {
    const proof = tokenStore.isLogoutPending() ? fence().proof : raw().refreshToken;
    if (!proof) { clear(); return; }
    const epoch = crypto.randomUUID();
    memory = null;
    localStorage.setItem(FENCE_KEY, JSON.stringify({ epoch, blocked: true, proof }));
    channel?.postMessage({ type: 'changed' });
    notify();
    await lock(async () => {
      await send(proof); // Signed stale proof terminates the stable server lineage.
      if (fence().epoch === epoch) clearAtEpoch(epoch);
    }); // On failure retain the proof + fence so logout can be retried truthfully.
  },
  async handoff(navigate: (tokens: AuthTokens) => void): Promise<void> {
    const expected = tokenStore.snapshot();
    await lock(async () => {
      if (expected !== tokenStore.snapshot()) return;
      const tokens = currentPair();
      if (!tokens) return;
      clear();
      navigate(tokens);
    });
  },
  async completePasswordChange(): Promise<void> {
    await lock(async () => {
      const tokens = currentPair();
      if (tokens) publish({ ...tokens, mustChangePassword: false, hasPassword: true }, fence().epoch);
    });
  },
};
