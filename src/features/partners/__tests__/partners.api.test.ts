import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api/apiClient';
import { partnersApi, PartnerApiError } from '../api/partners.api';

vi.mock('@/services/api/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const form = {
  name: '  Pacific Banking Systems Ltd.  ',
  domain: 'pacificbanking.com',
  contactName: 'Jonathan Reynolds',
  contactEmail: 'JReynolds@PacificBanking.com',
  engagementType: 'Dedicated Modernization',
  assignedStaffName: 'Sarah Jenkins (Sr. Conversion Specialist)',
};

const record = {
  id: '6650aa00aa00aa00aa00aa01',
  name: 'Pacific Banking Systems Ltd.',
  contactEmail: 'jreynolds@pacificbanking.com',
  contactName: 'Jonathan Reynolds',
  primaryDomain: 'pacificbanking.com',
  engagementType: 'Dedicated Modernization',
  assignedStaffName: 'Sarah Jenkins (Sr. Conversion Specialist)',
  status: 'ACTIVE',
  createdAt: '2026-10-22T03:00:00.000Z',
  updatedAt: '2026-10-22T03:00:00.000Z',
};

function httpError(status: number, data: Record<string, unknown>) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });
}

describe('partnersApi (UC-44)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(apiClient.get).mockRejectedValue(new Error('offline'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates the partner through POST /partners and maps the saved record', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(record);

    const partner = await partnersApi.createPartner(form);

    expect(apiClient.post).toHaveBeenCalledWith('/partners', {
      name: 'Pacific Banking Systems Ltd.',
      contactEmail: 'JReynolds@PacificBanking.com',
      contactName: 'Jonathan Reynolds',
      primaryDomain: 'pacificbanking.com',
      engagementType: 'Dedicated Modernization',
      assignedStaffName: 'Sarah Jenkins (Sr. Conversion Specialist)',
    });
    expect(partner).toMatchObject({
      id: record.id,
      name: 'Pacific Banking Systems Ltd.',
      contactEmail: 'jreynolds@pacificbanking.com',
      domain: 'pacificbanking.com',
      status: 'ACTIVE',
      projectCount: 0,
    });
  });

  it('rejects a duplicate with a 409 PartnerApiError carrying the server message', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(
      httpError(409, {
        code: 'PARTNER_ALREADY_EXISTS',
        message: "A partner with contact email 'jreynolds@pacificbanking.com' already exists",
      }),
    );

    const error = await partnersApi.createPartner(form).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PartnerApiError);
    expect(error).toMatchObject({
      status: 409,
      code: 'PARTNER_ALREADY_EXISTS',
      message: "A partner with contact email 'jreynolds@pacificbanking.com' already exists",
    });
  });

  it('joins class-validator messages from a 400 response', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(
      httpError(400, { message: ['contactEmail must be an email', 'name should not be empty'] }),
    );

    await expect(partnersApi.createPartner(form)).rejects.toMatchObject({
      status: 400,
      message: 'contactEmail must be an email; name should not be empty',
    });
  });

  it('does not invent a local partner when the server is unreachable', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Network Error'));

    const error = await partnersApi.createPartner(form).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PartnerApiError);
    expect((error as PartnerApiError).status).toBeUndefined();
    expect((error as PartnerApiError).message).toMatch(/was not created/i);
    await expect(partnersApi.getPartners()).rejects.toBeInstanceOf(PartnerApiError);
  });

  it('lists backend partners first in the directory', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === '/partners') return [record];
      throw new Error('offline');
    });

    const partners = await partnersApi.getPartners();

    expect(partners[0]).toMatchObject({ id: record.id, name: record.name });
    expect(partners.filter((p) => p.id === record.id)).toHaveLength(1);
  });
});

describe('partnersApi.createProject', () => {
  const input = {
    partnerId: 'partner-1',
    partnerName: 'Pacific Banking Systems Ltd.',
    name: ' Ngan hang ',
    description: ' Core ',
    conversionType: 'BMS_DSPF_TO_FRONTEND' as const,
    targetFramework: 'React 19 + Tailwind CSS',
  };
  const serverProject = {
    id: '6650aa00aa00aa00aa00aa01',
    name: 'Ngan hang',
    description: 'Core',
    organizationId: 'org-1',
    conversionType: 'BMS_DSPF_TO_FRONTEND',
    status: 'DRAFT',
    createdAt: '2026-10-23T00:00:00Z',
    updatedAt: '2026-10-23T00:00:00Z',
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates the project on the server and keeps the server id, with no sample files or totals', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(serverProject);

    const project = await partnersApi.createProject(input);

    expect(apiClient.post).toHaveBeenCalledWith('/projects', {
      name: 'Ngan hang',
      description: 'Core',
      conversionType: 'BMS_DSPF_TO_FRONTEND',
    });
    expect(project).toMatchObject({
      id: serverProject.id,
      partnerId: 'partner-1',
      partnerName: 'Pacific Banking Systems Ltd.',
      screensTotal: 0,
    });
    // Listing re-reads the server and re-attaches the partner link kept in this browser.
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === '/projects') return [serverProject];
      return [];
    });
    const listed = await partnersApi.getProjects('partner-1');
    expect(listed.map((p) => p.id)).toEqual([serverProject.id]);
    expect(await partnersApi.getProjects('someone-else')).toEqual([]);
  });

  it('does not create a browser-only project when the server rejects or is unreachable', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(httpError(403, {}));
    await expect(partnersApi.createProject(input)).rejects.toThrow(/permission to create projects/i);

    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network Error'));
    const error = await partnersApi.createProject(input).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PartnerApiError);
    expect((error as Error).message).toMatch(/project was not created/i);
    expect(localStorage.getItem('alsm_partner_project_links_v1')).toBeNull();
  });
});

describe('partnersApi without sample data', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('lists nothing when the server has nothing, instead of seeded partners or projects', async () => {
    localStorage.clear();
    vi.mocked(apiClient.get).mockResolvedValue([]);

    expect(await partnersApi.getPartners()).toEqual([]);
    expect(await partnersApi.getProjects()).toEqual([]);
    expect(await partnersApi.getExportBundles()).toEqual([]);
    expect(await partnersApi.getProjectItems('proj-fnx-core')).toEqual([]);
    expect(await partnersApi.getValidationFindings('item-1')).toEqual([]);
    expect(await partnersApi.getFieldMappings('item-1')).toEqual([]);
  });

  it('counts only real projects and exports per partner', async () => {
    localStorage.clear();
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === '/partners') return [{ ...record, completedExportCount: 2, latestActivity: 'Exported x.zip' }];
      if (url === '/projects') return [];
      throw new Error('offline');
    });

    const [partner] = await partnersApi.getPartners();

    expect(partner).toMatchObject({
      projectCount: 0,
      completedExportCount: 2,
      latestActivity: 'Exported x.zip',
    });
  });
});
