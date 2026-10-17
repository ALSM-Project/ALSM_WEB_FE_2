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

export const conversionQueueService = {
  listProjects: () => apiClient.get<QueueProject[]>('/projects'),
  listJobs: (projectId: string) => apiClient.get<QueueJob[]>(`/projects/${encodeURIComponent(projectId)}/conversions`),
  getJob: (jobId: string) => apiClient.get<QueueJob>(`/conversions/${encodeURIComponent(jobId)}`),
  getResult: (jobId: string) => apiClient.get<ConversionResult>(`/conversions/${encodeURIComponent(jobId)}/result`),
};

export function conversionError(error: unknown): string {
  const candidate = error as { response?: { data?: { message?: string | string[] } }; message?: string };
  const message = candidate?.response?.data?.message;
  return (Array.isArray(message) ? message.join('; ') : message) || candidate?.message || 'Unable to load conversion data.';
}
