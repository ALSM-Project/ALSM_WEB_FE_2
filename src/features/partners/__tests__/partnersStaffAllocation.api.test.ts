import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api/apiClient';
import { partnersApi } from '../api/partners.api';

vi.mock('@/services/api/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const PROJECT_ID = '6650aa00aa00aa00aa00aa01';
const serverProject = {
  id: PROJECT_ID,
  name: 'ACME Enterprise Modernization',
  organizationId: '6650cc00cc00cc00cc00cc01',
  conversionType: 'COBOL_TO_JAVA',
  status: 'ACTIVE',
  assignedStaffId: '6650dd00dd00dd00dd00dd01',
  assignedStaffName: 'Marcus Vance',
  staffAssignmentNote: 'Balance screens first',
  createdAt: '2026-10-22T03:00:00.000Z',
  updatedAt: '2026-10-22T03:00:00.000Z',
};

describe('partnersApi - allocating a project to a Conversion Staff member (UC-86)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === `/projects/${PROJECT_ID}`) return serverProject;
      if (url === `/projects/${PROJECT_ID}/screens`) return [];
      return [];
    });
    vi.mocked(apiClient.post).mockResolvedValue({});
  });

  it('saves the allocation and the briefing on the server instead of only in this browser', async () => {
    const project = await partnersApi.assignProject(PROJECT_ID, {
      staffId: '6650dd00dd00dd00dd00dd01',
      staffName: 'Marcus Vance',
      staffNote: '  Balance screens first  ',
    });

    expect(apiClient.post).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/assign-staff`, {
      staffId: '6650dd00dd00dd00dd00dd01',
      note: 'Balance screens first',
    });
    expect(project).toMatchObject({
      assignedStaffId: '6650dd00dd00dd00dd00dd01',
      assignedStaffName: 'Marcus Vance',
      staffAssignmentNote: 'Balance screens first',
    });
    expect(localStorage.getItem('alsm_partner_project_links_v1')).toBeNull();
  });

  it('sends no note when the Team Lead wrote none', async () => {
    await partnersApi.assignProject(PROJECT_ID, { staffId: 'staff-1', staffName: 'X' });
    expect(apiClient.post).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/assign-staff`, { staffId: 'staff-1' });
  });

  it('shows the server error instead of pretending the allocation worked', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(
      Object.assign(new Error('HTTP 400'), {
        response: { status: 400, data: { code: 'STAFF_NOT_ACTIVE', message: 'A locked account cannot be assigned a project' } },
      }),
    );
    await expect(
      partnersApi.assignProject(PROJECT_ID, { staffId: 'locked', staffName: 'Locked' }),
    ).rejects.toThrow();
  });

  it('reads the assignable staff and their workload from the server', async () => {
    const staff = [
      { id: 's1', fullName: 'Marcus Vance', email: 'm@alsm.io', role: 'CONVERSION_STAFF', activeWorkload: 3 },
    ];
    vi.mocked(apiClient.get).mockImplementation(async (url: string) =>
      url === '/projects/assignable-staff' ? staff : [],
    );
    await expect(partnersApi.getAssignableStaff()).resolves.toEqual(staff);
  });

  it('returns an empty roster, not made-up staff, when the server cannot be reached', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('offline'));
    await expect(partnersApi.getAssignableStaff()).resolves.toEqual([]);
  });
});
