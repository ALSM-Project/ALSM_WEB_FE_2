import { describe, expect, it, vi } from 'vitest';
import { createMockSupportAdapter, MOCK_ORGANIZATIONS } from '../api/support.mock';
import { SupportApiError } from '../api/support.api';
import { RESOURCE_LABELS, type WorkspacePage, type SupportScreen } from '../api/support.types';
import { SupportSession } from '../state/SupportSession';

const operationId = '99999999-9999-4999-8999-999999999999';
const unknown = (id?: string, code = 'SUPPORT_CONTEXT_OUTCOME_UNCONFIRMED', status = 503) => ({
  response: {
    status,
    data: {
      code,
      details: [
        {
          contextId: id,
          operationId,
          mutationCommitted: 'unknown',
          ...(code === 'SUPPORT_WORKSPACE_DELIVERY_WITHHELD' ? { activityCommitted: true } : {}),
        },
      ],
    },
  },
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function fixture() {
  let time = Date.parse('2026-11-02T01:00:00Z'),
    allowed = true;
  const api = createMockSupportAdapter(() => time);
  const session = new SupportSession(
    api,
    () => allowed,
    () => time,
  );
  const enter = async () => {
    await session.search({ query: 'Example', field: 'name' });
    await session.enter(MOCK_ORGANIZATIONS[0].id);
  };
  const project = async () => {
    await session.list('projects');
    await session.detail('projects', session.snapshot().projects!.items[0].id);
  };
  return {
    api,
    session,
    enter,
    project,
    advance: (ms: number) => {
      time += ms;
    },
    revoke: () => {
      allowed = false;
    },
  };
}

describe('UC66-04 scoped activity lifecycle', () => {
  it('uses all twelve named list/detail contracts with exact context/project scope', async () => {
    const f = fixture();
    await f.enter();
    const list = vi.spyOn(f.api, 'list'),
      detail = vi.spyOn(f.api, 'detail');
    await f.project();
    const scope = {
      organizationId: MOCK_ORGANIZATIONS[0].id,
      contextId: f.session.snapshot().context!.id,
    };
    const projectId = f.session.snapshot().project!.id;
    for (const kind of Object.keys(RESOURCE_LABELS) as (keyof typeof RESOURCE_LABELS)[]) {
      if (kind === 'projects') continue;
      await f.session.list(kind);
      const id = f.session.snapshot().page!.items[0].id;
      await f.session.detail(kind, id);
      expect(list).toHaveBeenCalledWith(
        kind,
        { ...scope, projectId },
        { limit: 10 },
        expect.any(AbortSignal),
      );
      expect(detail).toHaveBeenCalledWith(
        kind,
        { ...scope, projectId },
        id,
        expect.any(AbortSignal),
      );
      expect(f.session.snapshot().detail!.id).toBe(id);
    }
    expect(list).toHaveBeenCalledTimes(6);
    expect(detail).toHaveBeenCalledTimes(6);
    expect(list.mock.calls[0][1]).toEqual(scope);
    expect(f.session.snapshot().operationId).toMatch(/^[a-f0-9-]{36}$/);
  });
  it('clears immediately on Exit and ignores a late committed resource response', async () => {
    const f = fixture();
    await f.enter();
    await f.project();
    const scope = {
      organizationId: MOCK_ORGANIZATIONS[0].id,
      contextId: f.session.snapshot().context!.id,
      projectId: f.session.snapshot().project!.id,
    };
    const result = await f.api.list('screens', scope),
      late = deferred<WorkspacePage<SupportScreen>>();
    vi.spyOn(f.api, 'list').mockReturnValueOnce(late.promise);
    const reading = f.session.list('screens');
    const exiting = f.session.exit();
    expect(f.session.snapshot()).toMatchObject({
      context: null,
      organization: null,
      project: null,
      projects: null,
      page: null,
      detail: null,
    });
    await exiting;
    late.resolve(result);
    await reading;
    expect(f.session.snapshot()).toMatchObject({
      context: null,
      page: null,
      detail: null,
      notice: { code: 'SUPPORT_EXIT_CONFIRMED' },
    });
  });
  it('clears child data and rejects a late response when a different Project is selected', async () => {
    const f = fixture();
    await f.enter();
    await f.project();
    const second = f.session.snapshot().projects!.items[1];
    const late = deferred<WorkspacePage<SupportScreen>>();
    vi.spyOn(f.api, 'list').mockReturnValueOnce(late.promise);
    const reading = f.session.list('screens');
    await f.session.detail('projects', second.id);
    late.resolve({ items: [], nextAfterId: null, operationId });
    await reading;
    expect(f.session.snapshot()).toMatchObject({
      project: { id: second.id },
      kind: 'projects',
      page: null,
    });
    await f.session.list('screens');
    expect(f.session.snapshot().page!.items).toEqual([]);
  });
  it('permits an Organisation switch only after confirmed Exit and drops old resources/cursors', async () => {
    const f = fixture();
    await f.enter();
    await f.project();
    const enter = vi.spyOn(f.api, 'enter');
    await f.session.enter(MOCK_ORGANIZATIONS[1].id);
    expect(enter).not.toHaveBeenCalled();
    await f.session.exit();
    await f.session.search({ query: 'Example', field: 'name' });
    await f.session.enter(MOCK_ORGANIZATIONS[1].id);
    expect(f.session.snapshot()).toMatchObject({
      organization: { id: MOCK_ORGANIZATIONS[1].id },
      project: null,
      projects: null,
      page: null,
      detail: null,
    });
  });
  it('prevents duplicate Enter while the original request is pending', async () => {
    const f = fixture();
    await f.session.search({ query: 'Example', field: 'name' });
    const original = f.api.enter.bind(f.api),
      result = await original(MOCK_ORGANIZATIONS[0].id),
      late = deferred<typeof result>();
    const enter = vi.spyOn(f.api, 'enter').mockReturnValueOnce(late.promise);
    const pending = f.session.enter(MOCK_ORGANIZATIONS[0].id);
    await f.session.enter(MOCK_ORGANIZATIONS[0].id);
    expect(enter).toHaveBeenCalledTimes(1);
    late.resolve(result);
    await pending;
  });
  it.each(['enter', 'read', 'exit'] as const)(
    'blocks replay and retains original references after uncertain %s',
    async (operation) => {
      const f = fixture();
      await f.session.search({ query: 'Example', field: 'name' });
      let id = '11111111-1111-4111-8111-111111111111';
      const context = vi.spyOn(f.api, 'context');
      if (operation === 'enter') {
        const spy = vi.spyOn(f.api, 'enter').mockRejectedValueOnce(unknown(id));
        await f.session.enter(MOCK_ORGANIZATIONS[0].id);
        expect(spy).toHaveBeenCalledTimes(1);
      } else {
        await f.session.enter(MOCK_ORGANIZATIONS[0].id);
        id = f.session.snapshot().context!.id;
        if (operation === 'read') {
          const spy = vi.spyOn(f.api, 'list').mockRejectedValueOnce(unknown(id));
          await f.session.list('projects');
          expect(spy).toHaveBeenCalledTimes(1);
        } else {
          const spy = vi.spyOn(f.api, 'exit').mockRejectedValueOnce(unknown(id));
          await f.session.exit();
          expect(spy).toHaveBeenCalledTimes(1);
        }
      }
      expect(f.session.snapshot()).toMatchObject({
        blocked: true,
        context: null,
        organization: null,
        projects: null,
        page: null,
        notice: {
          code: 'SUPPORT_CONTEXT_OUTCOME_UNCONFIRMED',
          reference: { contextId: id, operationId, mutationCommitted: 'unknown' },
        },
      });
      await f.session.enter(MOCK_ORGANIZATIONS[0].id);
      await f.session.list('projects');
      await f.session.checkContext();
      await f.session.exit();
      expect(context).not.toHaveBeenCalled();
    },
  );
  it('reports committed activity accurately when delivery is withheld and hides every scoped record', async () => {
    const f = fixture();
    await f.enter();
    await f.project();
    const id = f.session.snapshot().context!.id;
    vi.spyOn(f.api, 'list').mockRejectedValueOnce(
      unknown(id, 'SUPPORT_WORKSPACE_DELIVERY_WITHHELD', 403),
    );
    await f.session.list('findings');
    expect(f.session.snapshot()).toMatchObject({
      context: null,
      project: null,
      page: null,
      detail: null,
      blocked: true,
      notice: {
        code: 'SUPPORT_WORKSPACE_DELIVERY_WITHHELD',
        reference: { contextId: id, operationId, activityCommitted: true },
      },
    });
    expect(f.session.snapshot().notice!.message).toContain('already committed');
  });
  it.each([401, 403])('clears authority loss %s without another request', async (status) => {
    const f = fixture();
    await f.enter();
    await f.project();
    const list = vi.spyOn(f.api, 'list').mockRejectedValueOnce({ response: { status } });
    await f.session.list('screens');
    expect(f.session.snapshot()).toMatchObject({
      organizations: null,
      context: null,
      organization: null,
      project: null,
      projects: null,
      page: null,
      detail: null,
      blocked: true,
    });
    expect(list).toHaveBeenCalledTimes(1);
  });
  it('treats a lost connection as an uncertain activity outcome without inventing operation IDs', async () => {
    const f = fixture();
    await f.enter();
    const id = f.session.snapshot().context!.id;
    vi.spyOn(f.api, 'list').mockRejectedValueOnce(new Error('NETWORK_SECRET'));
    await f.session.list('projects');
    expect(f.session.snapshot()).toMatchObject({
      blocked: true,
      notice: { reference: { contextId: id, mutationCommitted: 'unknown' } },
    });
    expect(f.session.snapshot().notice!.reference).not.toHaveProperty('operationId');
    expect(JSON.stringify(f.session.snapshot())).not.toContain('NETWORK_SECRET');
  });
  it('keeps the requested context identity when an error contains conflicting references', async () => {
    const f = fixture();
    await f.enter();
    const id = f.session.snapshot().context!.id;
    vi.spyOn(f.api, 'list').mockRejectedValueOnce(unknown('11111111-1111-4111-8111-111111111111'));
    await f.session.list('projects');
    expect(f.session.snapshot().notice!.reference!.contextId).toBe(id);
    expect(f.session.snapshot().notice!.reference).not.toHaveProperty('operationId');
  });
  it('bounds idle refresh by immutable absolute expiry, using only confirmed activity', async () => {
    const f = fixture();
    await f.enter();
    const absolute = f.session.snapshot().absoluteDeadline;
    f.advance(14 * 60000);
    await f.session.list('projects');
    f.advance(14 * 60000);
    await f.session.list('projects');
    expect(f.session.snapshot().absoluteDeadline).toBe(absolute);
    expect(f.session.snapshot().idleDeadline).toBe(absolute);
    f.advance(2 * 60000);
    f.session.tick();
    expect(f.session.snapshot()).toMatchObject({ context: null, page: null, blocked: false });
  });
  it('expires at exact idle equality and denies late data even if transport ignores abort', async () => {
    const f = fixture();
    await f.enter();
    const late = deferred<WorkspacePage<ResourceMapProject>>();
    vi.spyOn(f.api, 'list').mockReturnValueOnce(late.promise);
    const reading = f.session.list('projects');
    f.advance(15 * 60000);
    f.session.tick();
    late.resolve({ items: [], nextAfterId: null, operationId });
    await reading;
    expect(f.session.snapshot()).toMatchObject({ context: null, page: null, projects: null });
  });
  it('fails closed on a backwards local clock', async () => {
    const f = fixture();
    await f.enter();
    f.advance(-1);
    f.session.tick();
    expect(f.session.snapshot().context).toBeNull();
  });
  it('treats a gateway delivery error as uncertain rather than a confirmed rollback', async () => {
    const f = fixture();
    await f.enter();
    vi.spyOn(f.api, 'list').mockRejectedValueOnce({
      response: { status: 502, data: { code: 'BAD_GATEWAY' } },
    });
    await f.session.list('projects');
    expect(f.session.snapshot()).toMatchObject({
      blocked: true,
      context: null,
      notice: { code: 'SUPPORT_CONTEXT_OUTCOME_UNCONFIRMED' },
    });
  });
  it('clears cached Project and child metadata when resource ownership becomes unavailable', async () => {
    const f = fixture();
    await f.enter();
    await f.project();
    vi.spyOn(f.api, 'list').mockRejectedValueOnce(
      new SupportApiError('SUPPORT_RESOURCE_NOT_FOUND', 404),
    );
    await f.session.list('screens');
    expect(f.session.snapshot()).toMatchObject({
      projects: null,
      project: null,
      page: null,
      detail: null,
      notice: { code: 'SUPPORT_RESOURCE_NOT_FOUND' },
    });
  });
  it('rejects late data after logout/authority change without relying on AbortController', async () => {
    const f = fixture();
    await f.enter();
    const late = deferred<WorkspacePage<ResourceMapProject>>();
    vi.spyOn(f.api, 'list').mockReturnValueOnce(late.promise);
    const reading = f.session.list('projects');
    f.revoke();
    late.resolve({ items: [], nextAfterId: null, operationId });
    await reading;
    expect(f.session.snapshot()).toMatchObject({ context: null, page: null, blocked: true });
  });
  it('clears all state on disposal and never restores a late Enter', async () => {
    const f = fixture();
    await f.session.search({ query: 'Example', field: 'name' });
    const result = await f.api.enter(MOCK_ORGANIZATIONS[0].id),
      late = deferred<typeof result>();
    vi.spyOn(f.api, 'enter').mockReturnValueOnce(late.promise);
    const entering = f.session.enter(MOCK_ORGANIZATIONS[0].id);
    f.session.dispose();
    late.resolve(result);
    await entering;
    expect(f.session.snapshot()).toMatchObject({
      context: null,
      organization: null,
      organizations: null,
    });
  });
  it('does not describe a definite rejected read as successful or refresh its idle time', async () => {
    const f = fixture();
    await f.enter();
    const idle = f.session.snapshot().idleDeadline;
    vi.spyOn(f.api, 'list').mockRejectedValueOnce(
      new SupportApiError('SUPPORT_CONTEXT_PERSISTENCE_UNAVAILABLE', 503),
    );
    f.advance(1000);
    await f.session.list('projects');
    expect(f.session.snapshot()).toMatchObject({
      idleDeadline: idle,
      page: null,
      notice: { code: 'SUPPORT_REQUEST_FAILED' },
    });
  });
});

type ResourceMapProject = import('../api/support.types').SupportProject;
