import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api/apiClient';
import { conversionQueueService, conversionError } from './conversion-queue.service';
vi.mock('@/services/api/apiClient', () => ({ apiClient: { get: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
describe('conversion queue HTTP contracts', () => {
  it('uses real authenticated API routes and escapes path segments', async () => {
    await conversionQueueService.listProjects();
    await conversionQueueService.listJobs('project/id');
    await conversionQueueService.getJob('job/id');
    await conversionQueueService.getResult('job/id');
    expect(vi.mocked(apiClient.get).mock.calls).toEqual([
      ['/projects'], ['/projects/project%2Fid/conversions'], ['/conversions/job%2Fid'], ['/conversions/job%2Fid/result'],
    ]);
  });
  it('propagates server failures and prefers their diagnostic message', async () => {
    const failure = { response: { status: 403, data: { message: 'Organization access denied' } }, message: 'Request failed' };
    vi.mocked(apiClient.get).mockRejectedValue(failure);
    await expect(conversionQueueService.listProjects()).rejects.toBe(failure);
    expect(conversionError(failure)).toBe('Organization access denied');
  });
});
