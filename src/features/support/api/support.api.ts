import { apiClient, type ApiRequestConfig } from '@/services/api/apiClient';
import type {
  ContextScope,
  Diagnostic,
  OrganizationSearch,
  Page,
  PageOptions,
  ResourceKind,
  ResourceMap,
  SupportAdapter,
  SupportContext,
  SupportOrganization,
  WorkspaceScope,
} from './support.types';

export class SupportApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(code);
  }
}
const invalid = (): never => {
  throw new SupportApiError('INVALID_SUPPORT_RESPONSE');
};
const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : invalid();
export const objectId = (value: unknown): string =>
  typeof value === 'string' && /^[a-f0-9]{24}$/.test(value) ? value : invalid();
export const contextId = (value: unknown): string =>
  typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value)
    ? value
    : invalid();
const text = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/[\p{Cc}\p{Cf}]/gu, '').slice(0, 120) : invalid();
const date = (value: unknown): string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : invalid();
const nullableDate = (value: unknown): string | null => (value === null ? null : date(value));
const number = (value: unknown): number | null =>
  value === null
    ? null
    : typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? value
      : invalid();

export function decodeContext(
  value: unknown,
  organizationId: string,
  expectedId?: string,
): SupportContext {
  const row = object(value),
    id = contextId(row.id);
  if (
    objectId(row.organizationId) !== organizationId ||
    (expectedId && id !== expectedId) ||
    row.readOnly !== true ||
    !['ACTIVE', 'EXITED', 'EXPIRED', 'REVOKED'].includes(String(row.state))
  )
    invalid();
  return {
    id,
    organizationId,
    readOnly: true,
    state: row.state as SupportContext['state'],
    createdAt: date(row.createdAt),
    lastActivityAt: date(row.lastActivityAt),
    expiresAt: date(row.expiresAt),
    idleExpiresAt: date(row.idleExpiresAt),
    endedAt: nullableDate(row.endedAt),
  };
}

const fields: Record<ResourceKind, readonly string[]> = {
  projects: ['name', 'status', 'conversionType'],
  screens: ['name', 'sourceType', 'status', 'dependencyStatus', 'sizeBytes'],
  programs: ['name', 'sourceType', 'status', 'dependencyStatus', 'sizeBytes'],
  findings: [
    'source',
    'category',
    'severity',
    'status',
    'confidence',
    'conversionJobId',
    'validationRunId',
  ],
  'conversion-logs': ['status', 'conversionType', 'attemptCount', 'maxAttempts'],
  'error-logs': ['severity', 'status', 'lineNumber'],
};
const numeric = new Set(['sizeBytes', 'confidence', 'attemptCount', 'maxAttempts', 'lineNumber']);
export function decodeDiagnostic<K extends ResourceKind>(kind: K, value: unknown): ResourceMap[K] {
  const row = object(value);
  const safe: Record<string, string | number | null> = {
    id: objectId(row.id),
    createdAt: nullableDate(row.createdAt),
    updatedAt: nullableDate(row.updatedAt),
  };
  for (const key of fields[kind])
    safe[key] = numeric.has(key)
      ? number(row[key])
      : key.endsWith('Id')
        ? objectId(row[key])
        : text(row[key]);
  return safe as unknown as ResourceMap[K];
}
export function decodePage<T>(value: unknown, decode: (row: unknown) => T, limit = 10): Page<T> {
  const row = object(value);
  if (!Array.isArray(row.items) || row.items.length > limit) invalid();
  return {
    items: (row.items as unknown[]).map(decode),
    nextAfterId: row.nextAfterId === null ? null : objectId(row.nextAfterId),
  };
}
function organization(value: unknown): SupportOrganization {
  const row = object(value);
  if (
    !['SELF_SERVICE', 'ENTERPRISE'].includes(String(row.type)) ||
    !['ACTIVE', 'TRIAL'].includes(String(row.status))
  )
    invalid();
  return {
    id: objectId(row.id),
    name: text(row.name),
    type: row.type as SupportOrganization['type'],
    status: row.status as SupportOrganization['status'],
  };
}
export function pageOptions(page: PageOptions = {}): { limit: number; afterId?: string } {
  const limit = page.limit ?? 10;
  if (!Number.isInteger(limit) || limit < 1 || limit > 25)
    throw new SupportApiError('INVALID_SUPPORT_INPUT', 400);
  return { limit, ...(page.afterId ? { afterId: objectId(page.afterId) } : {}) };
}
export function searchOptions(input: OrganizationSearch) {
  const query = input.query.trim();
  if (
    query.length < 3 ||
    query.length > 120 ||
    /\p{Cc}/u.test(query) ||
    !['name', 'email'].includes(input.field)
  )
    throw new SupportApiError('INVALID_SUPPORT_INPUT', 400);
  return { ...pageOptions(input), query, field: input.field };
}
const contextPath = (scope: ContextScope) =>
  `/support/organizations/${objectId(scope.organizationId)}/contexts/${contextId(scope.contextId)}`;
export function workspacePath(kind: ResourceKind, scope: WorkspaceScope, id?: string) {
  if (
    !Object.prototype.hasOwnProperty.call(fields, kind) ||
    (kind === 'projects' && scope.projectId)
  )
    throw new SupportApiError('INVALID_SUPPORT_INPUT', 400);
  return `${contextPath(scope)}/workspace/projects${kind === 'projects' ? '' : `/${objectId(scope.projectId)}/${kind}`}${id ? `/${objectId(id)}` : ''}`;
}
type Client = Pick<typeof apiClient, 'get' | 'post'>;
const config = (signal?: AbortSignal): ApiRequestConfig => ({
  signal,
  skipAuthReplay: true,
  timeout: 15000,
  headers: { 'Cache-Control': 'no-store' },
});

// Prepared for separately approved integration; never selected by the application today.
export function createHttpSupportAdapter(client: Client = apiClient): SupportAdapter {
  return {
    mode: 'http',
    async search(input, signal) {
      const params = searchOptions(input);
      return decodePage(
        await client.get('/support/organizations', { ...config(signal), params }),
        organization,
        params.limit,
      );
    },
    async enter(id, signal) {
      return decodeContext(
        await client.post(`/support/organizations/${objectId(id)}/contexts`, {}, config(signal)),
        id,
      );
    },
    async context(scope, signal) {
      return decodeContext(
        await client.get(contextPath(scope), config(signal)),
        scope.organizationId,
        scope.contextId,
      );
    },
    async exit(scope, signal) {
      return decodeContext(
        await client.post(`${contextPath(scope)}/exit`, {}, config(signal)),
        scope.organizationId,
        scope.contextId,
      );
    },
    async list(kind, scope, page, signal) {
      const params = pageOptions(page),
        path = workspacePath(kind, scope);
      const value = object(await client.get(path, { ...config(signal), params }));
      return {
        ...decodePage(value, (row) => decodeDiagnostic(kind, row), params.limit),
        operationId: contextId(value.operationId),
      };
    },
    async detail(kind, scope, id, signal) {
      const value = object(await client.get(workspacePath(kind, scope, id), config(signal)));
      const item = decodeDiagnostic(kind, value.item);
      if (item.id !== id) invalid();
      return { item, operationId: contextId(value.operationId) };
    },
  };
}

const unavailable = async (): Promise<never> => {
  throw new SupportApiError('SUPPORT_HANDLERS_UNREGISTERED', 503);
};
export const unavailableSupportAdapter: SupportAdapter = {
  mode: 'unavailable',
  search: unavailable,
  enter: unavailable,
  context: unavailable,
  exit: unavailable,
  list: unavailable,
  detail: unavailable,
};

// Rendering uses this same fixed field list; arbitrary payload keys are never displayed.
export const diagnosticFields = (kind: ResourceKind): readonly (keyof Diagnostic | string)[] => [
  'id',
  ...fields[kind],
  'createdAt',
  'updatedAt',
];
