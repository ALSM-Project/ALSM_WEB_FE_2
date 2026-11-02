export interface SupportOrganization {
  id: string;
  name: string;
  type: 'SELF_SERVICE' | 'ENTERPRISE';
  status: 'ACTIVE' | 'TRIAL';
}

export interface SupportContext {
  id: string;
  organizationId: string;
  readOnly: true;
  state: 'ACTIVE' | 'EXITED' | 'EXPIRED' | 'REVOKED';
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  idleExpiresAt: string;
  endedAt: string | null;
}

export interface Page<T> {
  items: T[];
  nextAfterId: string | null;
}
export interface WorkspacePage<T> extends Page<T> {
  operationId: string;
}
export interface WorkspaceDetail<T> {
  item: T;
  operationId: string;
}
export interface PageOptions {
  limit?: number;
  afterId?: string;
}
export interface OrganizationSearch extends PageOptions {
  query: string;
  field: 'name' | 'email';
}
export interface ContextScope {
  organizationId: string;
  contextId: string;
}
export interface WorkspaceScope extends ContextScope {
  projectId?: string;
}
export interface DiagnosticBase {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
}
export interface SupportProject extends DiagnosticBase {
  name: string;
  status: string;
  conversionType: string;
}
export interface SupportScreen extends DiagnosticBase {
  name: string;
  sourceType: string;
  status: string;
  dependencyStatus: string;
  sizeBytes: number | null;
}
export interface SupportFinding extends DiagnosticBase {
  source: string;
  category: string;
  severity: string;
  status: string;
  confidence: number | null;
  conversionJobId: string;
  validationRunId: string;
}
export interface SupportConversionLog extends DiagnosticBase {
  status: string;
  conversionType: string;
  attemptCount: number | null;
  maxAttempts: number | null;
}
export interface SupportErrorLog extends DiagnosticBase {
  severity: string;
  status: string;
  lineNumber: number | null;
}
export interface ResourceMap {
  projects: SupportProject;
  screens: SupportScreen;
  programs: SupportScreen;
  findings: SupportFinding;
  'conversion-logs': SupportConversionLog;
  'error-logs': SupportErrorLog;
}
export type ResourceKind = keyof ResourceMap;
export type Diagnostic = ResourceMap[ResourceKind];
export const RESOURCE_LABELS: Record<ResourceKind, string> = {
  projects: 'Projects',
  screens: 'Screens',
  programs: 'Programs',
  findings: 'Findings',
  'conversion-logs': 'Conversion Logs',
  'error-logs': 'Error Logs',
};

// There is deliberately no reconciliation method: no pure read-only endpoint exists at ba9f91e.
export interface SupportAdapter {
  mode: 'mock' | 'unavailable' | 'http';
  search(input: OrganizationSearch, signal?: AbortSignal): Promise<Page<SupportOrganization>>;
  enter(organizationId: string, signal?: AbortSignal): Promise<SupportContext>;
  context(scope: ContextScope, signal?: AbortSignal): Promise<SupportContext>; // Audited activity, not reconciliation.
  exit(scope: ContextScope, signal?: AbortSignal): Promise<SupportContext>;
  list<K extends ResourceKind>(
    kind: K,
    scope: WorkspaceScope,
    page?: PageOptions,
    signal?: AbortSignal,
  ): Promise<WorkspacePage<ResourceMap[K]>>;
  detail<K extends ResourceKind>(
    kind: K,
    scope: WorkspaceScope,
    id: string,
    signal?: AbortSignal,
  ): Promise<WorkspaceDetail<ResourceMap[K]>>;
}

export interface OperationReference extends Partial<ContextScope> {
  operationId?: string;
  mutationCommitted?: 'unknown' | false;
  activityCommitted?: true;
}
