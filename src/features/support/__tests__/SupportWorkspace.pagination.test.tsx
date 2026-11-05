import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/features/auth/api/auth.api';
import { tokenStore } from '@/services/api/tokenStore';
import { createMockSupportAdapter, MOCK_ORGANIZATIONS } from '../api/support.mock';
import type {
  ResourceMap,
  SupportAdapter,
  SupportProject,
  SupportScreen,
  WorkspacePage,
} from '../api/support.types';
import { SupportPortalPage } from '../pages/SupportPortalPage';

const staff: UserProfile = {
  id: 'pagination-staff',
  email: 'pagination@example.invalid',
  fullName: 'Pagination fixture',
  isPlatformAdmin: false,
  isActive: true,
  roles: ['INTERNAL_SUPPORT'],
  effectivePermissions: ['organizations.impersonate'],
};
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: staff, isLoading: false, error: null }),
}));

beforeEach(() => {
  localStorage.clear();
  tokenStore.setTokens({
    accessToken: 'pagination-staff-access',
    refreshToken: 'pagination-staff-refresh',
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function fixture() {
  const foundation = createMockSupportAdapter();
  const projectsByOrganization = Object.fromEntries(
    MOCK_ORGANIZATIONS.map((organization, organizationIndex) => [
      organization.id,
      Array.from({ length: 25 }, (_, index): SupportProject => ({
        id: `a${organizationIndex + 1}${(index + 1).toString(16).padStart(22, '0')}`,
        name: `Organisation ${organizationIndex + 1} Project ${String(index + 1).padStart(2, '0')}`,
        status: 'ACTIVE',
        conversionType: 'COBOL_TO_JAVA',
        createdAt: null,
        updatedAt: null,
      })),
    ]),
  );
  const api: SupportAdapter = {
    ...foundation,
    async list(kind, scope, options, signal) {
      if (kind !== 'projects') return foundation.list(kind, scope, options, signal);
      // Validate/refresh the synthetic context locally; no HTTP/status request is sent.
      await foundation.context(scope);
      const remaining = projectsByOrganization[scope.organizationId].filter(
        (project) => !options?.afterId || project.id > options.afterId,
      );
      const limit = options?.limit ?? 10,
        items = remaining.slice(0, limit);
      return {
        items: structuredClone(items),
        nextAfterId: remaining.length > limit ? items[items.length - 1].id : null,
        operationId: crypto.randomUUID(),
      } as WorkspacePage<ResourceMap[typeof kind]>;
    },
    async detail(kind, scope, id, signal) {
      if (kind !== 'projects') return foundation.detail(kind, scope, id, signal);
      await foundation.context(scope);
      const project = projectsByOrganization[scope.organizationId].find((item) => item.id === id);
      if (!project)
        throw { response: { status: 404, data: { code: 'SUPPORT_RESOURCE_NOT_FOUND' } } };
      return {
        item: structuredClone(project) as ResourceMap[typeof kind],
        operationId: crypto.randomUUID(),
      };
    },
  };
  const list = vi.spyOn(api, 'list'),
    detail = vi.spyOn(api, 'detail');
  const enter = vi.spyOn(api, 'enter'),
    status = vi.spyOn(api, 'context');
  render(
    <StrictMode>
      <SupportPortalPage adapter={api} />
    </StrictMode>,
  );
  return { api, list, detail, enter, status, projectsByOrganization };
}

async function enterOrganization(index = 0) {
  fireEvent.change(screen.getByLabelText('Organisation search'), { target: { value: 'Example' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search Organisations' }));
  fireEvent.click(
    await screen.findByRole('button', {
      name: `Enter Organisation ${MOCK_ORGANIZATIONS[index].name}`,
    }),
  );
  await screen.findByRole('heading', { name: MOCK_ORGANIZATIONS[index].name });
}

async function expectProjectPage(projects: SupportProject[]) {
  const panel = within(screen.getByRole('tabpanel', { name: 'Projects' }));
  await panel.findByText(projects[0].name, { exact: true });
  for (const project of projects)
    expect(panel.getByText(project.name, { exact: true })).toBeInTheDocument();
  expect(panel.getAllByRole('button', { name: /^Inspect projects / })).toHaveLength(
    projects.length,
  );
}

async function openProject(project: SupportProject) {
  fireEvent.click(screen.getByRole('button', { name: `Open project ${project.name}` }));
  await screen.findByRole('region', { name: 'Diagnostic detail' });
  expect(screen.getByText('Selected Project')).toBeInTheDocument();
}

const nextPage = () => screen.getByRole('button', { name: 'Next page' });

describe('UC66-04 Project pagination across details and scopes', () => {
  it('keeps the cursor through open/close and browses all 25 Projects without reloading', async () => {
    const f = fixture(),
      projects = f.projectsByOrganization[MOCK_ORGANIZATIONS[0].id];
    await enterOrganization();
    const context = await f.enter.mock.results[0].value;
    const scope = { organizationId: context.organizationId, contextId: context.id };
    fireEvent.click(screen.getByRole('button', { name: 'Load Projects' }));
    await expectProjectPage(projects.slice(0, 10));
    expect(nextPage()).toBeEnabled();
    await openProject(projects[0]);
    expect(nextPage()).toBeEnabled();
    expect(f.list).toHaveBeenCalledTimes(1);

    fireEvent.click(nextPage());
    await expectProjectPage(projects.slice(10, 20));
    expect(f.list).toHaveBeenNthCalledWith(
      2,
      'projects',
      scope,
      { limit: 10, afterId: projects[9].id },
      expect.any(AbortSignal),
    );
    expect(screen.queryByRole('region', { name: 'Diagnostic detail' })).not.toBeInTheDocument();
    expect(nextPage()).toBeEnabled();

    await openProject(projects[10]);
    expect(nextPage()).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Close detail' }));
    expect(screen.queryByRole('region', { name: 'Diagnostic detail' })).not.toBeInTheDocument();
    await expectProjectPage(projects.slice(10, 20));
    expect(nextPage()).toBeEnabled();
    expect(f.list).toHaveBeenCalledTimes(2);

    fireEvent.click(nextPage());
    await expectProjectPage(projects.slice(20));
    expect(f.list).toHaveBeenNthCalledWith(
      3,
      'projects',
      scope,
      { limit: 10, afterId: projects[19].id },
      expect.any(AbortSignal),
    );
    expect(nextPage()).toBeDisabled();
    expect(f.list).toHaveBeenCalledTimes(3);
    expect(f.detail).toHaveBeenCalledTimes(2);
    expect(f.status).not.toHaveBeenCalled();
  });

  it('clears old Organisation/Context cursors and ignores a delayed page from the exited scope', async () => {
    const f = fixture(),
      oldProjects = f.projectsByOrganization[MOCK_ORGANIZATIONS[0].id];
    const newProjects = f.projectsByOrganization[MOCK_ORGANIZATIONS[1].id];
    await enterOrganization();
    const oldContext = await f.enter.mock.results[0].value;
    fireEvent.click(screen.getByRole('button', { name: 'Load Projects' }));
    await expectProjectPage(oldProjects.slice(0, 10));
    await openProject(oldProjects[0]);
    expect(nextPage()).toBeEnabled();

    const late = deferred<WorkspacePage<SupportProject>>();
    const oldOperationId = crypto.randomUUID();
    f.list.mockReturnValueOnce(late.promise);
    fireEvent.click(nextPage());
    expect(f.list).toHaveBeenNthCalledWith(
      2,
      'projects',
      { organizationId: oldContext.organizationId, contextId: oldContext.id },
      { limit: 10, afterId: oldProjects[9].id },
      expect.any(AbortSignal),
    );
    const oldSignal = f.list.mock.calls[1][3]!;
    fireEvent.click(screen.getByRole('button', { name: 'Exit Organisation' }));
    await screen.findByText('Exit confirmed. Returned to the Support Portal.');
    expect(oldSignal.aborted).toBe(true);
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();

    await enterOrganization(1);
    const newContext = await f.enter.mock.results[1].value;
    const newScope = { organizationId: newContext.organizationId, contextId: newContext.id };
    expect(newContext.id).not.toBe(oldContext.id);
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load Projects' }));
    await expectProjectPage(newProjects.slice(0, 10));
    expect(f.list).toHaveBeenNthCalledWith(
      3,
      'projects',
      newScope,
      { limit: 10 },
      expect.any(AbortSignal),
    );
    await openProject(newProjects[0]);

    // Simulate a transport that delivers old data despite AbortSignal cancellation.
    await act(async () => {
      late.resolve({
        items: oldProjects.slice(10, 20),
        nextAfterId: oldProjects[19].id,
        operationId: oldOperationId,
      });
      await late.promise;
    });
    await expectProjectPage(newProjects.slice(0, 10));
    expect(screen.queryByText(oldProjects[10].name, { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText(oldOperationId, { exact: true })).not.toBeInTheDocument();
    expect(nextPage()).toBeEnabled();
    fireEvent.click(nextPage());
    await expectProjectPage(newProjects.slice(10, 20));
    expect(f.list).toHaveBeenNthCalledWith(
      4,
      'projects',
      newScope,
      { limit: 10, afterId: newProjects[9].id },
      expect.any(AbortSignal),
    );
    expect(f.list).toHaveBeenCalledTimes(4);
    expect(f.status).not.toHaveBeenCalled();
  });

  it('uses the retained Project cursor after switching from a child collection to another Project detail', async () => {
    const f = fixture(),
      projects = f.projectsByOrganization[MOCK_ORGANIZATIONS[0].id];
    await enterOrganization();
    const context = await f.enter.mock.results[0].value;
    fireEvent.click(screen.getByRole('button', { name: 'Load Projects' }));
    await expectProjectPage(projects.slice(0, 10));
    await openProject(projects[0]);
    const childCursor = 'bbbbbbbbbbbbbbbbbbbbbbbb';
    const child: SupportScreen = {
      id: childCursor,
      name: 'Scoped Screen',
      sourceType: 'BMS',
      status: 'READY',
      dependencyStatus: 'NOT_ANALYZED',
      sizeBytes: 100,
      createdAt: null,
      updatedAt: null,
    };
    f.list.mockResolvedValueOnce({
      items: [child],
      nextAfterId: childCursor,
      operationId: crypto.randomUUID(),
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Screens' }));
    await screen.findByText(child.name, { exact: true });
    await openProject(projects[1]);
    expect(screen.queryByText(child.name, { exact: true })).not.toBeInTheDocument();
    expect(nextPage()).toBeEnabled();
    fireEvent.click(nextPage());
    await expectProjectPage(projects.slice(10, 20));
    expect(f.list).toHaveBeenNthCalledWith(
      3,
      'projects',
      { organizationId: context.organizationId, contextId: context.id },
      { limit: 10, afterId: projects[9].id },
      expect.any(AbortSignal),
    );
    expect(f.list.mock.calls[2][2]?.afterId).not.toBe(childCursor);
    expect(f.list).toHaveBeenCalledTimes(3);
    expect(f.status).not.toHaveBeenCalled();
  });
});
