import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api/apiClient';
import { conversionQueueService, queueError as conversionError } from './conversion-queue.service';
vi.mock('@/services/api/apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
describe('conversion queue HTTP contracts', () => {
  it('uses authorized routes, escapes segments, and forwards cancellation', async () => {
    const signal = new AbortController().signal;
    await conversionQueueService.listProjects(signal);
    await conversionQueueService.listJobs('project/id', signal);
    await conversionQueueService.getJob('job/id', signal);
    await conversionQueueService.getResult('job/id');
    await conversionQueueService.retryJob('job/id');
    expect(vi.mocked(apiClient.get).mock.calls).toEqual([
      ['/conversion-queue/projects', { signal }], ['/projects/project%2Fid/conversions', { signal }], ['/conversions/job%2Fid', { signal }], ['/conversions/job%2Fid/result', {}],
    ]);
    expect(apiClient.post).toHaveBeenCalledWith('/conversions/job%2Fid/retry', undefined, {});
  });
  it('propagates server failures and keeps appropriate validation feedback', async () => {
    const failure = { response: { status: 403, data: { message: 'Organization access denied' } } };
    vi.mocked(apiClient.get).mockRejectedValue(failure);
    vi.mocked(apiClient.post).mockRejectedValue(failure);
    await expect(conversionQueueService.listProjects()).rejects.toBe(failure);
    await expect(conversionQueueService.retryJob('job')).rejects.toBe(failure);
    expect(conversionError(failure)).toBe('Organization access denied');
  });
  it('does not expose dependency errors or internal diagnostics', () => {
    expect(conversionError({ response: { status: 503, data: { message: 'secret DB string' } } })).toBe('Conversion service is unavailable. Please try again.');
    expect(conversionError(new Error('secret stack'))).not.toContain('secret');
    expect(conversionError({ response: { status: 401 } })).toContain('sign in again');
  });
  it('scopes every queue job read, result read and retry to the selected project organization', async () => {
    await conversionQueueService.listJobs('project', undefined, 'assigned-org');
    await conversionQueueService.getJob('job', undefined, 'assigned-org');
    await conversionQueueService.getResult('job', 'assigned-org');
    await conversionQueueService.retryJob('job', 'assigned-org');
    for (const [, config] of vi.mocked(apiClient.get).mock.calls) {
      expect(config?.headers).toEqual({ 'x-organization-id': 'assigned-org' });
    }
    expect(apiClient.post).toHaveBeenCalledWith('/conversions/job/retry', undefined, { headers: { 'x-organization-id': 'assigned-org' } });
  });
});
