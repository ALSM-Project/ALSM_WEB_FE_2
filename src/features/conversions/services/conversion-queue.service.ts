import { apiClient } from '@/services/api/apiClient';
import type { SupportPatchRule } from '../utils/supportPatchRules';

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

export interface SupportPatchHistoryEntry {
  id: string;
  rules: SupportPatchRule[];
  note: string;
  changedRuleCount: number;
  appliedBy: string;
  appliedAt: string;
}

/** The mapping rules saved for a job and every patch applied to it (newest first). */
export interface SupportPatchView {
  job: QueueJob;
  rules: SupportPatchRule[];
  history: SupportPatchHistoryEntry[];
}

export interface ApplySupportPatchResult {
  job: QueueJob;
  patch: SupportPatchHistoryEntry;
  warnings: string[];
}

const organizationConfig = (organizationId?: string) => organizationId
  ? { headers: { 'x-organization-id': organizationId } } : {};

export const conversionQueueService = {
  listProjects: (signal?: AbortSignal) => apiClient.get<QueueProject[]>('/conversion-queue/projects', { signal }),
  listJobs: (projectId: string, signal?: AbortSignal, organizationId?: string) => apiClient.get<QueueJob[]>(`/projects/${encodeURIComponent(projectId)}/conversions`, { signal, ...organizationConfig(organizationId) }),
  getJob: (jobId: string, signal?: AbortSignal, organizationId?: string) => apiClient.get<QueueJob>(`/conversions/${encodeURIComponent(jobId)}`, { signal, ...organizationConfig(organizationId) }),
  getResult: (jobId: string, organizationId?: string) => apiClient.get<ConversionResult>(`/conversions/${encodeURIComponent(jobId)}/result`, organizationConfig(organizationId)),
  retryJob: (jobId: string, organizationId?: string) => apiClient.post<QueueJob>(`/conversions/${encodeURIComponent(jobId)}/retry`, undefined, organizationConfig(organizationId)),
  getSupportPatch: (jobId: string, organizationId?: string, signal?: AbortSignal) =>
    apiClient.get<SupportPatchView>(`/conversions/${encodeURIComponent(jobId)}/support-patch`, { signal, ...organizationConfig(organizationId) }),
  /** Saves the rules and note, resets the job to QUEUED (attempts 0, HIGH priority) and enqueues it. */
  applySupportPatch: (jobId: string, patch: { rules: SupportPatchRule[]; note: string }, organizationId?: string) =>
    apiClient.post<ApplySupportPatchResult>(`/conversions/${encodeURIComponent(jobId)}/support-patch`, patch, organizationConfig(organizationId)),
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
