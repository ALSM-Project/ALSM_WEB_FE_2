import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '@/services/api/tokenStore';
import { createHttpSupportAdapter } from '../api/support.api';
import { createMockSupportAdapter, MOCK_ORGANIZATIONS } from '../api/support.mock';
import type { SupportAdapter, SupportRecovery } from '../api/support.types';
import { SupportSession } from '../state/SupportSession';
import { SupportPortalPage } from '../pages/SupportPortalPage';

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'recovery-staff',
      email: 'recovery@example.invalid',
      fullName: 'Recovery staff',
      isPlatformAdmin: false,
      isActive: true,
      roles: ['INTERNAL_SUPPORT'],
      effectivePermissions: ['organizations.impersonate'],
    },
    isLoading: false,
    error: null,
  }),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const org = MOCK_ORGANIZATIONS[0];
const operationId = '99999999-9999-4999-8999-999999999999';
async function fixture() {
  let time = Date.now(),
    allowed = true;
  const foundation = createMockSupportAdapter(() => time);
  const context = await foundation.enter(org.id);
  let result: SupportRecovery = {
    outcome: 'FOUND',
    context,
    organization: org,
    usable: true,
    operation: null,
    observedAt: new Date(time).toISOString(),
  };
  const recover = vi.fn(async () => ({ ...result, observedAt: new Date(time).toISOString() }));
  const api: SupportAdapter = { ...foundation, mode: 'http', recover };
  const calls = {
    enter: vi.spyOn(api, 'enter'),
    exit: vi.spyOn(api, 'exit'),
    list: vi.spyOn(api, 'list'),
    context: vi.spyOn(api, 'context'),
  };
  const newSession = () =>
    new SupportSession(
      api,
      () => allowed,
      () => time,
    );
  return {
    api,
    context,
    recover,
    calls,
    newSession,
    session: newSession(),
    advance: (ms: number) => {
      time += ms;
    },
    revoke: () => {
      allowed = false;
    },
    setResult: (value: SupportRecovery) => {
      result = value;
    },
    result: () => result,
  };
}
function noActivities(f: Awaited<ReturnType<typeof fixture>>) {
  for (const spy of Object.values(f.calls)) expect(spy).not.toHaveBeenCalled();
}
describe('UC66-05A pure recovery and explicit resume', () => {
  it('clears previously recovered metadata if authority is lost before explicit resume', async () => {
    const f = await fixture();
    await f.session.recover(org.id);
    f.revoke();
    f.session.resumeRecovered();
    expect(f.session.snapshot()).toMatchObject({ context: null, recovery: null, blocked: true });
    noActivities(f);
  });
  it('recovers after disposal/reload without automatic resume or activity, preserving original deadlines', async () => {
    const f = await fixture();
    f.session.dispose();
    const fresh = f.newSession();
    f.advance(14 * 60000);
    await fresh.recover(org.id);
    expect(fresh.snapshot().context).toBeNull();
    noActivities(f);
    fresh.resumeRecovered();
    expect(fresh.snapshot().context?.id).toBe(f.context.id);
    expect(fresh.snapshot().absoluteDeadline).toBe(Date.parse(f.context.expiresAt));
    expect(fresh.snapshot().idleDeadline).toBe(Date.parse(f.context.idleExpiresAt));
    f.advance(60000);
    fresh.tick();
    expect(fresh.snapshot().context).toBeNull();
    noActivities(f);
  });
  it('reconciles uncertain Enter with its original references without another Enter or status call', async () => {
    const f = await fixture();
    f.calls.enter.mockRejectedValueOnce({
      response: {
        status: 503,
        data: {
          code: 'SUPPORT_CONTEXT_OUTCOME_UNCONFIRMED',
          details: [{ contextId: f.context.id, operationId }],
        },
      },
    });
    await f.session.search({ query: 'Example', field: 'name' });
    await f.session.enter(org.id);
    const reference = f.session.snapshot().notice!.reference!;
    f.setResult({
      ...f.result(),
      operation: { id: operationId, state: 'COMMITTED', kind: 'ENTER' },
    });
    await f.session.recover(org.id, reference);
    expect(f.recover).toHaveBeenCalledWith(org.id, reference, expect.any(AbortSignal));
    f.session.resumeRecovered();
    expect(f.session.snapshot().context?.id).toBe(f.context.id);
    expect(f.calls.enter).toHaveBeenCalledTimes(1);
    expect(f.calls.context).not.toHaveBeenCalled();
    expect(f.calls.list).not.toHaveBeenCalled();
  });
  it('leaves unknown original operation evidence blocked without guessing rollback or replaying activity', async () => {
    const f = await fixture();
    f.setResult({ ...f.result(), operation: { id: operationId, state: 'UNRESOLVED', kind: null } });
    await f.session.recover(org.id, { contextId: f.context.id, operationId });
    f.session.resumeRecovered();
    expect(f.session.snapshot().context).toBeNull();
    expect(f.session.snapshot().blocked).toBe(true);
    noActivities(f);
  });
  it.each(['EXITED', 'EXPIRED'] as const)(
    'does not resume a recovered %s context or renew its deadlines',
    async (state) => {
      const f = await fixture();
      f.setResult({
        ...f.result(),
        usable: false,
        context: { ...f.context, state },
        operation: { id: operationId, state: 'COMMITTED', kind: 'EXIT' },
      });
      await f.session.recover(org.id, { contextId: f.context.id, operationId });
      f.session.resumeRecovered();
      expect(f.session.snapshot()).toMatchObject({
        context: null,
        blocked: false,
        absoluteDeadline: null,
        idleDeadline: null,
      });
      noActivities(f);
    },
  );
  it.each(['logout', 'dispose'] as const)(
    'ignores late recovery after %s even if the transport ignores abort',
    async (kind) => {
      const f = await fixture();
      let resolve!: (value: SupportRecovery) => void;
      f.recover.mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolve = done;
          }),
      );
      const pending = f.session.recover(org.id);
      if (kind === 'logout') f.revoke();
      else f.session.dispose();
      resolve(f.result());
      await pending;
      expect(f.session.snapshot().context).toBeNull();
      expect(f.session.snapshot().recovery).toBeNull();
      noActivities(f);
    },
  );
  it('does not revive a context that expires while its recovery response is in transit', async () => {
    const f = await fixture();
    f.recover.mockImplementationOnce(async () => {
      const response = f.result();
      f.advance(15 * 60000);
      return response;
    });
    await f.session.recover(org.id);
    f.session.resumeRecovered();
    expect(f.session.snapshot().context).toBeNull();
    noActivities(f);
  });
  it('calls the pure HTTP endpoint with exact original references and no authentication replay', async () => {
    const f = await fixture();
    const response = {
      ...f.result(),
      operation: { id: operationId, state: 'COMMITTED', kind: 'WORKSPACE_PROJECT_LIST' },
    };
    const client = { get: vi.fn().mockResolvedValue(response), post: vi.fn() };
    const api = createHttpSupportAdapter(client);
    expect(await api.recover!(org.id, { contextId: f.context.id, operationId })).toEqual(response);
    expect(client.get).toHaveBeenCalledWith(
      `/support/organizations/${org.id}/recovery`,
      expect.objectContaining({
        skipAuthReplay: true,
        params: { contextId: f.context.id, operationId },
        headers: { 'Cache-Control': 'no-store' },
      }),
    );
    expect(client.post).not.toHaveBeenCalled();
    client.get.mockResolvedValueOnce({ ...response, organization: MOCK_ORGANIZATIONS[1] });
    await expect(api.recover!(org.id, { contextId: f.context.id, operationId })).rejects.toThrow(
      'INVALID_SUPPORT_RESPONSE',
    );
    await expect(api.recover!(org.id, { operationId })).rejects.toThrow('INVALID_SUPPORT_INPUT');
  });
  it('requires explicit recovery and explicit resume in the StrictMode UI', async () => {
    const f = await fixture();
    tokenStore.setTokens({ accessToken: 'recovery-test', refreshToken: 'recovery-test' });
    render(
      <StrictMode>
        <SupportPortalPage adapter={f.api} />
      </StrictMode>,
    );
    expect(f.recover).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Recovery Organisation ID'), {
      target: { value: org.id },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Inspect recovery' }));
    await screen.findByRole('region', { name: 'Recovery result' });
    expect(screen.queryByText('Read-only Support View')).not.toBeInTheDocument();
    noActivities(f);
    fireEvent.click(screen.getByRole('button', { name: 'Resume recovered context' }));
    await screen.findByText('Read-only Support View');
    noActivities(f);
  });
});
