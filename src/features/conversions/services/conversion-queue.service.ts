import { apiClient } from '@/services/api/apiClient';

export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD' | 'CANCELLED';
export interface QueueProject { id: string; name: string; organizationId: string }
export interface QueueJob {
  id: string;
  organizationId: string;
  projectId: string;
  screenId?: string;
  status: JobStatus;
  conversionType: string;
  priority: string;
  attemptCount: number;
  maxAttempts: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  toolVersion?: string;
}
export interface ConversionResult {
  conversionJobId: string;
  toolVersion?: string;
  files: { relativePath: string; content: string }[];
}

export interface FieldMappingEntry {
  sourceField: string;
  targetProperty: string;
  dataType?: string;
  transformRule?: string;
}

const organizationConfig = (organizationId?: string) => organizationId
  ? { headers: { 'x-organization-id': organizationId } } : {};

export const conversionQueueService = {
  listProjects: (signal?: AbortSignal) => apiClient.get<QueueProject[]>('/conversion-queue/projects', { signal }),
  listJobs: (projectId: string, signal?: AbortSignal, organizationId?: string) => apiClient.get<QueueJob[]>(`/projects/${encodeURIComponent(projectId)}/conversions`, { signal, ...organizationConfig(organizationId) }),
  getJob: (jobId: string, signal?: AbortSignal, organizationId?: string) => apiClient.get<QueueJob>(`/conversions/${encodeURIComponent(jobId)}`, { signal, ...organizationConfig(organizationId) }),
  getResult: (jobId: string, organizationId?: string) => apiClient.get<ConversionResult>(`/conversions/${encodeURIComponent(jobId)}/result`, organizationConfig(organizationId)),
  retryJob: (jobId: string, organizationId?: string) => apiClient.post<QueueJob>(`/conversions/${encodeURIComponent(jobId)}/retry`, undefined, organizationConfig(organizationId)),
  getFieldMapping: (projectId: string, screenId: string) =>
    apiClient.get<{ mappings: FieldMappingEntry[] }>(`/projects/${encodeURIComponent(projectId)}/screens/${encodeURIComponent(screenId)}/field-mapping`),
  applySupportPatch: async (projectId: string, screenId: string, jobId: string, mappings: FieldMappingEntry[]) => {
    await apiClient.put(`/projects/${encodeURIComponent(projectId)}/screens/${encodeURIComponent(screenId)}/field-mapping`, { mappings });
    return apiClient.post<QueueJob>(`/conversions/${encodeURIComponent(jobId)}/retry`);
  },
};

export function queueError(error: unknown): string {
  const candidate = error as { response?: { status?: number; data?: { message?: string | string[] } } };
  const status = candidate?.response?.status;
  if (!status || status >= 500) return 'Conversion service is unavailable. Please try again.';
  if (status === 401) return 'Your session is no longer authorized. Please sign in again.';
  const message = candidate?.response?.data?.message;
  return (Array.isArray(message) ? message.join('; ') : message) || 'Unable to load conversion data.';
}

// Keep the existing diagnostic contract for other conversion screens.
export function conversionError(error: unknown): string {
  const candidate = error as { response?: { data?: { message?: string | string[] } }; message?: string };
  const message = candidate?.response?.data?.message;
  return (Array.isArray(message) ? message.join('; ') : message) || candidate?.message || 'Unable to load conversion data.';
}
