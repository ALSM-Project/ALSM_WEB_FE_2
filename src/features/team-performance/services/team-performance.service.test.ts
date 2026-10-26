import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api/apiClient';
import { teamPerformanceService, type ManagedTeam } from './team-performance.service';
vi.mock('@/services/api/apiClient', () => ({ apiClient: { get: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); vi.mocked(apiClient.get).mockReset(); });
describe('scoped team HTTP contracts', () => {
  it('sends team kind, 7/30 period and exact organization without client actor or manager claims', async () => {
    const team: ManagedTeam = { id: 'team/id', organizationId: 'org-a', kind: 'SALES', name: 'Sales', revision: 1 };
    await teamPerformanceService.listTeams('SALES', 'org-a');
    await teamPerformanceService.sales(team, 7);
    await teamPerformanceService.sales(team, 30);
    expect(vi.mocked(apiClient.get).mock.calls).toEqual([
      ['/teams', { params: { kind: 'SALES' }, headers: { 'x-organization-id': 'org-a' } }],
      ['/teams/team%2Fid/performance', { params: { days: 7 }, headers: { 'x-organization-id': 'org-a' } }],
      ['/teams/team%2Fid/performance', { params: { days: 30 }, headers: { 'x-organization-id': 'org-a' } }],
    ]);
  });
  it('propagates denied scope and server errors', async () => {
    const error = new Error('Denied'); vi.mocked(apiClient.get).mockRejectedValue(error);
    await expect(teamPerformanceService.listTeams('SALES')).rejects.toBe(error);
  });
  it('reads conversion workload with the selected team organization and period', async () => {
    const team: ManagedTeam = { id: 'conversion/id', organizationId: 'org-b', kind: 'CONVERSION', name: 'Conversion', revision: 1 };
    await teamPerformanceService.listTeams('CONVERSION', 'org-b');
    await teamPerformanceService.workload(team, 30);
    expect(vi.mocked(apiClient.get).mock.calls).toEqual([
      ['/teams', { params: { kind: 'CONVERSION' }, headers: { 'x-organization-id': 'org-b' } }],
      ['/teams/conversion%2Fid/workload', { params: { days: 30 }, headers: { 'x-organization-id': 'org-b' } }],
    ]);
  });
});
