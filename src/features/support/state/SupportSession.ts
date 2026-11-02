import { decodeContext, SupportApiError } from '../api/support.api';
import type {
  ContextScope,
  Diagnostic,
  OperationReference,
  OrganizationSearch,
  Page,
  ResourceKind,
  SupportAdapter,
  SupportContext,
  SupportOrganization,
  SupportProject,
  WorkspacePage,
  WorkspaceScope,
} from '../api/support.types';

const ABSOLUTE_MS = 30 * 60000,
  IDLE_MS = 15 * 60000;
export interface SupportNotice {
  code: string;
  message: string;
  reference?: OperationReference;
}
export interface SupportState {
  organizations: Page<SupportOrganization> | null;
  search: OrganizationSearch | null;
  organization: SupportOrganization | null;
  context: SupportContext | null;
  projects: WorkspacePage<SupportProject> | null;
  project: SupportProject | null;
  kind: ResourceKind;
  page: WorkspacePage<Diagnostic> | null;
  detail: Diagnostic | null;
  operationId: string | null;
  pending: string | null;
  blocked: boolean;
  notice: SupportNotice | null;
  absoluteDeadline: number | null;
  idleDeadline: number | null;
}
const empty = (): SupportState => ({
  organizations: null,
  search: null,
  organization: null,
  context: null,
  projects: null,
  project: null,
  kind: 'projects',
  page: null,
  detail: null,
  operationId: null,
  pending: null,
  blocked: false,
  notice: null,
  absoluteDeadline: null,
  idleDeadline: null,
});

function errorInfo(error: unknown) {
  const e = error as {
    code?: string;
    status?: number;
    response?: { status?: number; data?: { code?: string; details?: OperationReference[] } };
  };
  const body = e?.response?.data;
  return {
    code: body?.code ?? e?.code ?? 'CONNECTION_LOST',
    status: e?.response?.status ?? e?.status,
    reference: Array.isArray(body?.details) ? body.details[0] : undefined,
  };
}
const safeReference = (
  source: OperationReference | undefined,
  scope?: Partial<ContextScope>,
): OperationReference => {
  const matches = !scope?.contextId || !source?.contextId || source.contextId === scope.contextId;
  return {
    ...(scope?.organizationId ? { organizationId: scope.organizationId } : {}),
    ...(scope?.contextId ? { contextId: scope.contextId } : {}),
    ...(!scope?.contextId &&
    typeof source?.contextId === 'string' &&
    /^[a-f0-9-]{36}$/.test(source.contextId)
      ? { contextId: source.contextId }
      : {}),
    ...(matches &&
    typeof source?.operationId === 'string' &&
    /^[a-f0-9-]{36}$/.test(source.operationId)
      ? { operationId: source.operationId }
      : {}),
  };
};

/** One volatile workspace per mounted portal. No query cache, persistence, polling or retries. */
export class SupportSession {
  private state = empty();
  private listeners = new Set<() => void>();
  private generation = 0;
  private controller?: AbortController;
  private lastClock: number;
  constructor(
    private readonly api: SupportAdapter,
    private readonly authorized = () => true,
    private readonly now = () => Date.now(),
  ) {
    this.lastClock = now();
  }
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<SupportState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private invalidate() {
    this.generation++;
    this.controller?.abort();
    this.controller = undefined;
  }
  clear(message?: string, blocked = false) {
    this.invalidate();
    this.state = empty();
    this.update({ blocked, notice: message ? { code: 'SUPPORT_VIEW_CLEARED', message } : null });
  }
  dispose = () => {
    this.invalidate();
    this.state = empty();
    this.listeners.clear();
  };
  private begin(pending: string) {
    this.invalidate();
    this.controller = new AbortController();
    this.update({ pending, notice: null });
    return { generation: this.generation, signal: this.controller.signal, started: this.now() };
  }
  private current(request: { generation: number }, needsContext = false) {
    if (request.generation !== this.generation) return false;
    if (!this.authorized()) {
      this.clear('Support authority or the original login changed. Sign in again.', true);
      return false;
    }
    if (needsContext && !this.tick()) return false;
    return true;
  }
  tick = () => {
    if (!this.authorized()) {
      this.clear('Support authority or the original login changed.', true);
      return false;
    }
    const time = this.now();
    const backwards = time < this.lastClock;
    this.lastClock = time;
    if (
      this.state.context &&
      (backwards || time >= this.state.absoluteDeadline! || time >= this.state.idleDeadline!)
    ) {
      this.clear(
        backwards
          ? 'The local clock changed. Data is cleared; the backend remains authoritative for context expiry.'
          : 'Support View timed out locally. Data is cleared; the backend remains authoritative for context expiry.',
      );
      return false;
    }
    return true;
  };
  private scope(): WorkspaceScope | null {
    if (!this.authorized()) {
      this.clear('Support authority or the original login changed.', true);
      return null;
    }
    if (!this.tick() || this.state.blocked || !this.state.context || !this.state.organization)
      return null;
    return {
      organizationId: this.state.organization.id,
      contextId: this.state.context.id,
      ...(this.state.project ? { projectId: this.state.project.id } : {}),
    };
  }
  private activity(started: number) {
    this.update({
      pending: null,
      idleDeadline: Math.min(this.state.absoluteDeadline!, started + IDLE_MS),
    });
    this.tick();
  }
  private failure(error: unknown, scope?: Partial<ContextScope>, activity = true) {
    const info = errorInfo(error);
    const reference = safeReference(info.reference, scope);
    if (info.code === 'SUPPORT_WORKSPACE_DELIVERY_WITHHELD') {
      this.clear(undefined, true);
      this.update({
        notice: {
          code: info.code,
          reference: { ...reference, activityCommitted: true },
          message:
            'Resource delivery was withheld. The activity and audit already committed; they were not rolled back. Access is closed.',
        },
      });
    } else if (info.status === 401 || info.status === 403) {
      this.clear(
        'Support authority was lost or the original session is no longer current. Sign in again.',
        true,
      );
    } else if (
      info.code === 'SUPPORT_CONTEXT_OUTCOME_UNCONFIRMED' ||
      (activity &&
        (!info.status ||
          info.code === 'INVALID_SUPPORT_RESPONSE' ||
          (info.status >= 500 &&
            info.reference?.mutationCommitted !== false &&
            ![
              'SUPPORT_CONTEXT_PERSISTENCE_UNAVAILABLE',
              'SUPPORT_CONTEXT_INDEX_UNAVAILABLE',
              'MONGO_TRANSACTIONS_REQUIRED',
              'SUPPORT_READ_TRANSACTION_REQUIRED',
              'SUPPORT_HANDLERS_UNREGISTERED',
            ].includes(info.code))))
    ) {
      this.clear(undefined, true);
      this.update({
        notice: {
          code: 'SUPPORT_CONTEXT_OUTCOME_UNCONFIRMED',
          reference: { ...reference, mutationCommitted: 'unknown' },
          message:
            'Outcome unconfirmed. The operation may have committed. Data is hidden and the operation will not be repeated. No read-only reconciliation endpoint is available.',
        },
      });
    } else if (info.code === 'SUPPORT_CONTEXT_INACTIVE') {
      this.clear(
        'Support Context is inactive. Enter an Organisation again to start a new context.',
      );
    } else if (info.code === 'SUPPORT_CONTEXT_CONFLICT') {
      this.clear(undefined, true);
      this.update({
        notice: {
          code: info.code,
          reference,
          message:
            'The context changed concurrently. Access is closed pending authorized review; no operation was repeated.',
        },
      });
    } else if (info.code === 'SUPPORT_CONTEXT_NOT_FOUND') {
      this.clear(
        'The original Support Context is unavailable. Access is closed pending authorized review.',
        true,
      );
    } else if (info.status === 404) {
      this.update({
        pending: null,
        projects: null,
        project: null,
        kind: 'projects',
        page: null,
        detail: null,
        operationId: null,
        notice: {
          code: 'SUPPORT_RESOURCE_NOT_FOUND',
          message:
            'Resource unavailable in this scope. Load Projects again to inspect current metadata.',
        },
      });
    } else {
      this.update({
        pending: null,
        page: null,
        detail: null,
        notice: {
          code: 'SUPPORT_REQUEST_FAILED',
          message:
            info.code === 'INVALID_SUPPORT_INPUT'
              ? 'Enter 3–120 characters and use a bounded page.'
              : 'Support request failed. No success or rollback is assumed; no automatic retry was made.',
        },
      });
    }
  }
  clearSearch = () => {
    if (
      !this.state.context &&
      (!this.state.pending || this.state.pending === 'Searching Organisations')
    ) {
      this.invalidate();
      this.update({ organizations: null, search: null, pending: null });
    }
  };
  closeDetail = () => this.update({ detail: null });
  async search(input: OrganizationSearch) {
    if (!this.authorized()) {
      this.clear('Support authority or the original login changed.', true);
      return;
    }
    if (
      this.state.context ||
      this.state.blocked ||
      (this.state.pending && this.state.pending !== 'Searching Organisations') ||
      !this.authorized()
    )
      return;
    const request = this.begin('Searching Organisations');
    this.update({ organizations: null, search: { ...input } });
    try {
      const organizations = await this.api.search(input, request.signal);
      if (this.current(request)) this.update({ organizations, pending: null });
    } catch (error) {
      if (this.current(request)) this.failure(error, undefined, false);
    }
  }
  async enter(organizationId: string) {
    if (!this.authorized()) {
      this.clear('Support authority or the original login changed.', true);
      return;
    }
    if (this.state.context || this.state.blocked || this.state.pending || !this.authorized())
      return;
    const organization = this.state.organizations?.items.find((row) => row.id === organizationId);
    if (!organization) return;
    const request = this.begin('Entering Organisation');
    this.update({ organizations: null, projects: null, page: null, detail: null });
    try {
      const context = decodeContext(
        await this.api.enter(organizationId, request.signal),
        organizationId,
      );
      if (!this.current(request)) return;
      if (context.state !== 'ACTIVE' || context.endedAt !== null)
        throw new SupportApiError('INVALID_SUPPORT_RESPONSE');
      const absolute = Math.min(
        ABSOLUTE_MS,
        Date.parse(context.expiresAt) - Date.parse(context.createdAt),
      );
      const idle = Math.min(
        IDLE_MS,
        Date.parse(context.idleExpiresAt) - Date.parse(context.lastActivityAt),
      );
      if (absolute <= 0 || idle <= 0) throw new SupportApiError('SUPPORT_CONTEXT_INACTIVE', 409);
      this.update({
        context,
        organization,
        pending: null,
        search: null,
        absoluteDeadline: request.started + absolute,
        idleDeadline: request.started + Math.min(idle, absolute),
      });
      this.tick();
    } catch (error) {
      if (this.current(request)) this.failure(error, { organizationId });
    }
  }
  async checkContext() {
    const workspace = this.scope();
    if (!workspace || this.state.pending) return;
    const scope: ContextScope = {
      organizationId: workspace.organizationId,
      contextId: workspace.contextId,
    };
    const request = this.begin('Checking Context');
    try {
      const context = decodeContext(
        await this.api.context(scope, request.signal),
        scope.organizationId,
        scope.contextId,
      );
      if (!this.current(request, true)) return;
      if (context.state !== 'ACTIVE' || context.endedAt !== null)
        throw new SupportApiError('SUPPORT_CONTEXT_INACTIVE', 409);
      this.update({
        context,
        absoluteDeadline: Math.min(
          this.state.absoluteDeadline!,
          request.started + Date.parse(context.expiresAt) - Date.parse(context.lastActivityAt),
        ),
        idleDeadline: Math.min(
          this.state.absoluteDeadline!,
          request.started +
            Math.min(
              IDLE_MS,
              Date.parse(context.idleExpiresAt) - Date.parse(context.lastActivityAt),
            ),
        ),
        pending: null,
      });
      this.tick();
    } catch (error) {
      if (this.current(request, true)) this.failure(error, scope);
    }
  }
  async list(kind: ResourceKind, afterId?: string) {
    const scope = this.scope();
    if (!scope || (kind !== 'projects' && !scope.projectId)) return;
    if (kind === 'projects') delete scope.projectId;
    const request = this.begin(`Loading ${kind}`);
    this.update({
      kind,
      page: null,
      detail: null,
      operationId: null,
      ...(kind === 'projects' ? { project: null, projects: null } : {}),
    });
    try {
      const result = await this.api.list(
        kind,
        scope,
        { limit: 10, ...(afterId ? { afterId } : {}) },
        request.signal,
      );
      if (!this.current(request, true)) return;
      this.update({
        page: result,
        operationId: result.operationId,
        ...(kind === 'projects' ? { projects: result as WorkspacePage<SupportProject> } : {}),
      });
      this.activity(request.started);
    } catch (error) {
      if (this.current(request, true)) this.failure(error, scope);
    }
  }
  async detail(kind: ResourceKind, id: string) {
    const scope = this.scope();
    if (!scope) return;
    const rows =
      kind === 'projects'
        ? this.state.projects?.items
        : this.state.kind === kind
          ? this.state.page?.items
          : undefined;
    if (!rows?.some((row) => row.id === id) || (kind !== 'projects' && !scope.projectId)) return;
    if (kind === 'projects') delete scope.projectId;
    const request = this.begin(`Inspecting ${kind}`);
    this.update({
      detail: null,
      operationId: null,
      ...(kind === 'projects' ? { project: null, page: null, kind: 'projects' } : {}),
    });
    try {
      const result = await this.api.detail(kind, scope, id, request.signal);
      if (!this.current(request, true)) return;
      if (result.item.id !== id) throw new SupportApiError('INVALID_SUPPORT_RESPONSE');
      this.update({
        detail: result.item,
        operationId: result.operationId,
        ...(kind === 'projects' ? { project: result.item as SupportProject } : {}),
      });
      this.activity(request.started);
    } catch (error) {
      if (this.current(request, true)) this.failure(error, scope);
    }
  }
  async exit() {
    const workspace = this.scope();
    if (!workspace) return;
    const scope: ContextScope = {
      organizationId: workspace.organizationId,
      contextId: workspace.contextId,
    };
    // Clear before awaiting acknowledgement; abort is not a claim that server work rolled back.
    this.clear();
    const request = this.begin('Exiting Organisation');
    try {
      const context = decodeContext(
        await this.api.exit(scope, request.signal),
        scope.organizationId,
        scope.contextId,
      );
      if (!this.current(request)) return;
      if (context.state !== 'EXITED') throw new SupportApiError('INVALID_SUPPORT_RESPONSE');
      this.update({
        pending: null,
        notice: {
          code: 'SUPPORT_EXIT_CONFIRMED',
          message: 'Exit confirmed. Returned to the Support Portal.',
        },
      });
    } catch (error) {
      if (!this.current(request)) return;
      this.failure(error, scope);
      // Even a definite failed Exit leaves an unresolved server context, never silently re-enter.
      if (!this.state.blocked)
        this.update({
          blocked: true,
          notice: {
            code: 'SUPPORT_EXIT_NOT_CONFIRMED',
            reference: scope,
            message:
              'Exit was not confirmed. Local data is cleared; do not enter another Organisation until the original context is resolved.',
          },
        });
    }
  }
}
