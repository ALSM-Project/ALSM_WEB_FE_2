import { describe, expect, it, vi } from 'vitest';
import {
  createHttpSupportAdapter,
  unavailableSupportAdapter,
  workspacePath,
} from '../api/support.api';
import { createMockSupportAdapter, MOCK_ORGANIZATIONS } from '../api/support.mock';
import { RESOURCE_LABELS, type ResourceKind } from '../api/support.types';

describe('UC66-04 typed contract adapters', () => {
  it('maps the real search/Enter/status/Exit contracts and strips unapproved Organisation fields', async () => {
    const mock = createMockSupportAdapter(),
      org = MOCK_ORGANIZATIONS[0],
      context = await mock.enter(org.id);
    const client = { get: vi.fn(), post: vi.fn() },
      api = createHttpSupportAdapter(client);
    client.get.mockResolvedValueOnce({
      items: [{ ...org, contactEmail: 'PRIVATE', members: ['PRIVATE'] }],
      nextAfterId: null,
    });
    expect(
      await api.search({ query: '  manufacturing@example.invalid  ', field: 'email' }),
    ).toEqual({ items: [org], nextAfterId: null });
    expect(client.get).toHaveBeenLastCalledWith(
      '/support/organizations',
      expect.objectContaining({
        skipAuthReplay: true,
        params: { limit: 10, query: 'manufacturing@example.invalid', field: 'email' },
        headers: { 'Cache-Control': 'no-store' },
      }),
    );
    client.post.mockResolvedValueOnce({ ...context, token: 'PRIVATE' });
    expect(await api.enter(org.id)).toEqual(context);
    expect(client.post).toHaveBeenLastCalledWith(
      `/support/organizations/${org.id}/contexts`,
      {},
      expect.objectContaining({ skipAuthReplay: true }),
    );
    const scope = { organizationId: org.id, contextId: context.id };
    client.get.mockResolvedValueOnce(context);
    await api.context(scope);
    expect(client.get).toHaveBeenLastCalledWith(
      `/support/organizations/${org.id}/contexts/${context.id}`,
      expect.objectContaining({ skipAuthReplay: true }),
    );
    client.post.mockResolvedValueOnce({ ...context, state: 'EXITED' });
    await api.exit(scope);
    expect(client.post).toHaveBeenLastCalledWith(
      `/support/organizations/${org.id}/contexts/${context.id}/exit`,
      {},
      expect.objectContaining({ skipAuthReplay: true }),
    );
    expect(api).not.toHaveProperty('reconcile');
  });
  it.each(Object.keys(RESOURCE_LABELS) as ResourceKind[])(
    'implements the two exact %s workspace routes with safe projections',
    async (kind) => {
      const mock = createMockSupportAdapter(),
        org = MOCK_ORGANIZATIONS[0],
        context = await mock.enter(org.id);
      const parent = (
        await mock.list('projects', { organizationId: org.id, contextId: context.id })
      ).items[0];
      const scope = {
        organizationId: org.id,
        contextId: context.id,
        ...(kind !== 'projects' ? { projectId: parent.id } : {}),
      };
      const page = await mock.list(kind, scope),
        item = page.items[0];
      const client = { get: vi.fn(), post: vi.fn() },
        api = createHttpSupportAdapter(client);
      client.get.mockResolvedValueOnce({
        ...page,
        items: [
          {
            ...item,
            content: 'PRIVATE',
            errorMessage: 'PRIVATE',
            resultReference: 'PRIVATE',
            token: 'PRIVATE',
          },
        ],
      });
      const result = await api.list(kind, scope, { limit: 25, afterId: item.id });
      const suffix = kind === 'projects' ? '' : `/${parent.id}/${kind}`;
      const path = `/support/organizations/${org.id}/contexts/${context.id}/workspace/projects${suffix}`;
      expect(client.get).toHaveBeenLastCalledWith(
        path,
        expect.objectContaining({ skipAuthReplay: true, params: { limit: 25, afterId: item.id } }),
      );
      expect(result).toEqual({ ...page, items: [item] });
      expect(JSON.stringify(result)).not.toContain('PRIVATE');
      client.get.mockResolvedValueOnce({ item, operationId: page.operationId });
      expect((await api.detail(kind, scope, item.id)).item).toEqual(item);
      expect(client.get).toHaveBeenLastCalledWith(
        `${path}/${item.id}`,
        expect.objectContaining({ skipAuthReplay: true }),
      );
      expect(client.post).not.toHaveBeenCalled();
    },
  );
  it('rejects invalid IDs, page bounds and query fields before sending any request', async () => {
    const client = { get: vi.fn(), post: vi.fn() },
      api = createHttpSupportAdapter(client);
    const scope = { organizationId: MOCK_ORGANIZATIONS[0].id, contextId: crypto.randomUUID() };
    for (const limit of [0, 26, 1.5])
      await expect(api.list('projects', scope, { limit })).rejects.toThrow();
    await expect(api.list('projects', scope, { afterId: 'forged' })).rejects.toThrow();
    await expect(api.search({ query: 'ab', field: 'name' })).rejects.toThrow();
    expect(() => workspacePath('screens', scope)).toThrow();
    expect(() => workspacePath('projects', { ...scope, projectId: '1'.repeat(24) })).toThrow();
    expect(client.get).not.toHaveBeenCalled();
    expect(client.post).not.toHaveBeenCalled();
  });
  it('rejects context/resource identity mismatches and never invents success', async () => {
    const mock = createMockSupportAdapter(),
      org = MOCK_ORGANIZATIONS[0],
      context = await mock.enter(org.id);
    const client = { get: vi.fn(), post: vi.fn() },
      api = createHttpSupportAdapter(client);
    client.post.mockResolvedValueOnce({ ...context, organizationId: MOCK_ORGANIZATIONS[1].id });
    await expect(api.enter(org.id)).rejects.toThrow('INVALID_SUPPORT_RESPONSE');
    client.get.mockResolvedValueOnce({ ...context, id: crypto.randomUUID() });
    await expect(api.context({ organizationId: org.id, contextId: context.id })).rejects.toThrow(
      'INVALID_SUPPORT_RESPONSE',
    );
  });
  it('makes no live calls in the unavailable adapter and exposes no write/reconciliation capability', async () => {
    await expect(
      unavailableSupportAdapter.search({ query: 'Example', field: 'name' }),
    ).rejects.toMatchObject({ code: 'SUPPORT_HANDLERS_UNREGISTERED' });
    expect(Object.keys(unavailableSupportAdapter).sort()).toEqual(
      ['mode', 'search', 'enter', 'context', 'exit', 'list', 'detail'].sort(),
    );
  });
  it('isolates mock Organisation/project resources and enforces expiry', async () => {
    let now = 0;
    const mock = createMockSupportAdapter(() => now),
      org = MOCK_ORGANIZATIONS[0],
      context = await mock.enter(org.id);
    const scope = { organizationId: org.id, contextId: context.id };
    await expect(
      mock.list('projects', { ...scope, organizationId: MOCK_ORGANIZATIONS[1].id }),
    ).rejects.toMatchObject({ status: 404 });
    const projects = await mock.list('projects', scope);
    const screen = (await mock.list('screens', { ...scope, projectId: projects.items[0].id }))
      .items[0];
    await expect(
      mock.detail('screens', { ...scope, projectId: projects.items[1].id }, screen.id),
    ).rejects.toMatchObject({ status: 404 });
    now = 15 * 60000;
    await expect(mock.list('projects', scope)).rejects.toMatchObject({
      code: 'SUPPORT_CONTEXT_INACTIVE',
    });
  });
});
