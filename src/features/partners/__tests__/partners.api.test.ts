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
    const before = await partnersApi.getPartners();

    const error = await partnersApi.createPartner(form).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PartnerApiError);
    expect((error as PartnerApiError).status).toBeUndefined();
    expect((error as PartnerApiError).message).toMatch(/was not created/i);
    const after = await partnersApi.getPartners();
    expect(after.map((p) => p.id)).toEqual(before.map((p) => p.id));
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
