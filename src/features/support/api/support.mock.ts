import { SupportApiError, pageOptions, searchOptions, workspacePath } from './support.api';
import type {
  ContextScope,
  Page,
  ResourceKind,
  ResourceMap,
  SupportAdapter,
  SupportContext,
  SupportOrganization,
} from './support.types';

export const MOCK_ORGANIZATIONS: readonly SupportOrganization[] = [
  {
    id: '100000000000000000000001',
    name: 'Example Manufacturing',
    type: 'ENTERPRISE',
    status: 'ACTIVE',
  },
  {
    id: '100000000000000000000002',
    name: 'Example Services',
    type: 'SELF_SERVICE',
    status: 'TRIAL',
  },
];
const contactEmails = ['manufacturing@example.invalid', 'services@example.invalid'];
const missing = (): never => {
  throw new SupportApiError('SUPPORT_RESOURCE_NOT_FOUND', 404);
};
const timestamp = '2026-11-01T00:00:00.000Z';
const base = (id: string) => ({ id, createdAt: timestamp, updatedAt: timestamp });

// Synthetic metadata only. Instances isolate contexts; no browser storage or credentials.
export function createMockSupportAdapter(now = () => Date.now()): SupportAdapter {
  const contexts = new Map<string, SupportContext>();
  const resources = (organizationId: string): { [K in ResourceKind]: ResourceMap[K][] } => {
    const suffix = organizationId.endsWith('1') ? '1' : '2';
    return {
      projects: [
        {
          ...base(`20000000000000000000000${suffix}`),
          name: `Sample ${suffix} modernization`,
          status: 'ACTIVE',
          conversionType: 'COBOL_TO_JAVA',
        },
        {
          ...base(`20000000000000000000001${suffix}`),
          name: `Sample ${suffix} archive`,
          status: 'ACTIVE',
          conversionType: 'BMS_DSPF_TO_FRONTEND',
        },
      ],
      screens: [
        {
          ...base(`30000000000000000000000${suffix}`),
          name: 'ACCOUNT.bms',
          status: 'READY',
          sourceType: 'BMS',
          dependencyStatus: 'NOT_ANALYZED',
          sizeBytes: 2400,
        },
      ],
      programs: [
        {
          ...base(`40000000000000000000000${suffix}`),
          name: 'ACCOUNT.cbl',
          status: 'READY',
          sourceType: 'COBOL',
          dependencyStatus: 'BLOCKED',
          sizeBytes: 4800,
        },
      ],
      findings: [
        {
          ...base(`50000000000000000000000${suffix}`),
          source: 'RULE',
          category: 'LOGIC_MISMATCH',
          severity: 'HIGH',
          status: 'PENDING',
          confidence: 0.8,
          conversionJobId: `60000000000000000000000${suffix}`,
          validationRunId: `80000000000000000000000${suffix}`,
        },
      ],
      'conversion-logs': [
        {
          ...base(`60000000000000000000000${suffix}`),
          status: 'FAILED',
          conversionType: 'COBOL_TO_JAVA',
          attemptCount: 1,
          maxAttempts: 3,
        },
      ],
      'error-logs': [
        {
          ...base(`70000000000000000000000${suffix}`),
          severity: 'ERROR',
          status: 'UNRESOLVED',
          lineNumber: 42,
        },
      ],
    };
  };
  const active = (scope: ContextScope): SupportContext => {
    const context = contexts.get(scope.contextId);
    if (!context || context.organizationId !== scope.organizationId) return missing();
    if (
      context.state !== 'ACTIVE' ||
      now() >= Date.parse(context.expiresAt) ||
      now() >= Date.parse(context.idleExpiresAt)
    )
      throw new SupportApiError('SUPPORT_CONTEXT_INACTIVE', 409);
    return context;
  };
  const activity = (scope: ContextScope) => {
    const context = active(scope),
      time = new Date(now()).toISOString();
    const updated = {
      ...context,
      lastActivityAt: time,
      idleExpiresAt: new Date(
        Math.min(now() + 15 * 60000, Date.parse(context.expiresAt)),
      ).toISOString(),
    };
    contexts.set(context.id, updated);
    return { ...updated };
  };
  const page = <T extends { id: string }>(rows: readonly T[], options = {}): Page<T> => {
    const { limit, afterId } = pageOptions(options);
    const items = rows
      .filter((row) => !afterId || row.id > afterId)
      .sort((a, b) => a.id.localeCompare(b.id));
    return {
      items: structuredClone(items.slice(0, limit)),
      nextAfterId: items.length > limit ? items[limit - 1].id : null,
    };
  };
  return {
    mode: 'mock',
    async search(input) {
      const query = searchOptions(input);
      const rows = MOCK_ORGANIZATIONS.filter((org, index) =>
        query.field === 'email'
          ? contactEmails[index] === query.query.toLowerCase()
          : org.name.toLowerCase().startsWith(query.query.toLowerCase()),
      );
      return page(rows, query);
    },
    async enter(organizationId) {
      if (!MOCK_ORGANIZATIONS.some((org) => org.id === organizationId)) return missing();
      if (
        [...contexts.values()].some(
          (row) =>
            row.state === 'ACTIVE' &&
            now() < Date.parse(row.expiresAt) &&
            now() < Date.parse(row.idleExpiresAt),
        )
      )
        throw new SupportApiError('SUPPORT_CONTEXT_CONFLICT', 409);
      const time = now();
      const context: SupportContext = {
        id: crypto.randomUUID(),
        organizationId,
        readOnly: true,
        state: 'ACTIVE',
        createdAt: new Date(time).toISOString(),
        lastActivityAt: new Date(time).toISOString(),
        expiresAt: new Date(time + 30 * 60000).toISOString(),
        idleExpiresAt: new Date(time + 15 * 60000).toISOString(),
        endedAt: null,
      };
      contexts.set(context.id, context);
      return { ...context };
    },
    async context(scope) {
      return activity(scope);
    },
    async exit(scope) {
      const current = contexts.get(scope.contextId);
      if (!current || current.organizationId !== scope.organizationId) return missing();
      const context: SupportContext =
        current.state === 'EXITED'
          ? current
          : { ...current, state: 'EXITED', endedAt: new Date(now()).toISOString() };
      contexts.set(context.id, context);
      return { ...context };
    },
    async list(kind, scope, options) {
      workspacePath(kind, scope);
      active(scope);
      const data = resources(scope.organizationId);
      if (kind !== 'projects' && !data.projects.some((row) => row.id === scope.projectId))
        return missing();
      const result = page(
        kind !== 'projects' && scope.projectId !== data.projects[0].id ? [] : data[kind],
        options,
      );
      activity(scope);
      return { ...result, operationId: crypto.randomUUID() };
    },
    async detail(kind, scope, id) {
      workspacePath(kind, scope, id);
      active(scope);
      const data = resources(scope.organizationId);
      if (kind !== 'projects' && !data.projects.some((row) => row.id === scope.projectId))
        return missing();
      if (kind !== 'projects' && scope.projectId !== data.projects[0].id) return missing();
      const item = data[kind].find((row) => row.id === id);
      if (!item) return missing();
      activity(scope);
      return { item: structuredClone(item), operationId: crypto.randomUUID() };
    },
  };
}
