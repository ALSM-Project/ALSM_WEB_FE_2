import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api/apiClient';
import { partnersApi, PartnerExportError } from '../api/partners.api';

vi.mock('@/services/api/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const PROJECT = '6650aa00aa00aa00aa00aa01';
const LOCAL_PROJECT = 'proj-fnx-core';
const OPTIONS = {
  selectedScreenIds: ['s1', 's2'],
  includeTypeScript: true,
  includeUnitTests: false,
  includeDocumentation: true,
};

const bundleDto = {
  id: '6650ee00ee00ee00ee00ee01',
  projectId: PROJECT,
  partnerEmail: 'jreynolds@pacificbanking.com',
  packageName: 'core-banking-screens-modernized-bundle-v1.zip',
  format: 'ZIP',
  fileSizeBytes: 2048,
  screensIncluded: 2,
  programsIncluded: 0,
  excludedItems: [{ name: 'MENU.bms', reason: 'Conversion failed' }],
  exportedAt: '2026-10-22T10:00:00.000Z',
  notificationStatus: 'SENT',
  downloadUrl: `/projects/${PROJECT}/partner-export/bundles/6650ee00ee00ee00ee00ee01/download`,
};

function httpError(status: number, data: unknown) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });
}

describe('partnersApi export (UC-48)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === '/projects') {
        return [{ id: PROJECT, name: 'Core Banking Screens', organizationId: 'org-1', sourcePlatform: 'BMS' }];
      }
      throw new Error('offline');
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('maps the server preview to the counts the dialog shows', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      packageName: 'core-banking-screens-modernized-bundle-v1.zip',
      summary: {
        targetFramework: 'React 19',
        screensIncluded: 2,
        programsIncluded: 0,
        excludedItems: [{ name: 'MENU.bms', reason: 'Conversion failed' }],
      },
      metrics: { totalFiles: 14, totalLoc: 300, estimatedSizeKb: 12 },
      fileTree: [],
    });

    const preview = await partnersApi.previewExport(PROJECT, OPTIONS);

    expect(apiClient.post).toHaveBeenCalledWith(`/projects/${PROJECT}/partner-export/preview`, OPTIONS);
    expect(preview).toEqual({
      packageName: 'core-banking-screens-modernized-bundle-v1.zip',
      targetFramework: 'React 19',
      screensIncluded: 2,
      programsIncluded: 0,
      excludedItems: [{ name: 'MENU.bms', reason: 'Conversion failed' }],
      totalFiles: 14,
      estimatedSizeKb: 12,
    });
  });

  it('publishes with the trimmed email and notes and maps the released bundle', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(bundleDto);

    const bundle = await partnersApi.triggerExport({
      projectId: PROJECT,
      partnerEmail: '  jreynolds@pacificbanking.com ',
      customNotes: '  ',
      options: OPTIONS,
    });

    expect(apiClient.post).toHaveBeenCalledWith(`/projects/${PROJECT}/partner-export/publish-and-notify`, {
      partnerEmail: 'jreynolds@pacificbanking.com',
      customNotes: undefined,
      options: OPTIONS,
    });
    expect(bundle).toMatchObject({
      id: bundleDto.id,
      projectName: 'Core Banking Screens',
      partnerContactEmail: 'jreynolds@pacificbanking.com',
      totalItems: 2,
      notificationStatus: 'SENT',
      excludedItems: [{ name: 'MENU.bms', reason: 'Conversion failed' }],
    });
  });

  it('downloads the ZIP as a blob and saves it under the package name', async () => {
    const createObjectURL = vi.fn(() => 'blob:zip');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const blob = new Blob(['PK'], { type: 'application/zip' });
    vi.mocked(apiClient.post).mockResolvedValue(blob);

    await partnersApi.downloadExportZip(PROJECT, OPTIONS, 'bundle-v1.zip');

    expect(apiClient.post).toHaveBeenCalledWith(`/projects/${PROJECT}/partner-export/download`, OPTIONS, {
      responseType: 'blob',
    });
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:zip');
    click.mockRestore();
  });

  it('reads the JSON error out of a blob response (422 nothing to export)', async () => {
    const body = new Blob(
      [JSON.stringify({ code: 'NO_COMPLETED_ITEMS', message: 'None of the selected screens has a completed conversion' })],
      { type: 'application/json' },
    );
    vi.mocked(apiClient.post).mockRejectedValue(httpError(422, body));

    const error = await partnersApi.downloadExportZip(PROJECT, OPTIONS, 'x.zip').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PartnerExportError);
    expect(error).toMatchObject({
      status: 422,
      code: 'NO_COMPLETED_ITEMS',
      message: 'None of the selected screens has a completed conversion',
    });
  });

  it('gives user-safe messages for 403, a failed transaction and an unreachable server', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(httpError(403, { message: 'internal detail' }));
    await expect(
      partnersApi.triggerExport({ projectId: PROJECT, partnerEmail: 'a@b.io', options: OPTIONS }),
    ).rejects.toThrow(/do not have permission/i);

    vi.mocked(apiClient.post).mockRejectedValueOnce(
      httpError(503, { code: 'ATOMIC_MUTATION_ABORTED', message: 'Business state and audit were not committed' }),
    );
    await expect(
      partnersApi.triggerExport({ projectId: PROJECT, partnerEmail: 'a@b.io', options: OPTIONS }),
    ).rejects.toThrow(/could not be saved, so the partner was not notified/i);

    vi.mocked(apiClient.post).mockRejectedValueOnce(httpError(500, { message: "ENOENT 'D:\\storage'" }));
    await expect(partnersApi.previewExport(PROJECT, OPTIONS)).rejects.toThrow(
      'The export could not be completed. Please try again later.',
    );

    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network Error'));
    await expect(partnersApi.previewExport(PROJECT, OPTIONS)).rejects.toThrow(/cannot reach the server/i);
  });

  it('refuses to export a browser-only demo project without calling the server', async () => {
    await expect(
      partnersApi.triggerExport({ projectId: LOCAL_PROJECT, partnerEmail: 'a@b.io', options: OPTIONS }),
    ).rejects.toThrow(/exists only in this browser/i);
    await expect(partnersApi.previewExport(LOCAL_PROJECT, OPTIONS)).rejects.toBeInstanceOf(PartnerExportError);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('reads the latest released bundle of a server project from the backend', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === `/projects/${PROJECT}/partner-export/bundles`) return [bundleDto];
      if (url === '/projects') return [{ id: PROJECT, name: 'Core Banking Screens', organizationId: 'org-1' }];
      throw new Error('offline');
    });

    const bundle = await partnersApi.getExportBundleByProjectId(PROJECT);

    expect(bundle?.packageName).toBe('core-banking-screens-modernized-bundle-v1.zip');
  });

  it('retries a notification and returns the new status', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ ...bundleDto, notificationStatus: 'SENT' });

    const bundle = await partnersApi.retryExportNotification(PROJECT, bundleDto.id);

    expect(apiClient.post).toHaveBeenCalledWith(
      `/projects/${PROJECT}/partner-export/bundles/${bundleDto.id}/notify`,
    );
    expect(bundle.notificationStatus).toBe('SENT');
  });

  it('takes the export state of a cached server project from the backend', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce([
      { id: PROJECT, name: 'Core Banking Screens', organizationId: 'org-1', isExported: false },
    ]);
    await partnersApi.getProjects();
    vi.mocked(apiClient.get).mockResolvedValueOnce([
      {
        id: PROJECT,
        name: 'Core Banking Screens',
        organizationId: 'org-1',
        status: 'COMPLETED',
        isExported: true,
        exportedBundleName: 'core-banking-screens-modernized-bundle-v1.zip',
      },
    ]);

    const project = (await partnersApi.getProjects()).find((p) => p.id === PROJECT);

    expect(project).toMatchObject({
      isExported: true,
      status: 'COMPLETED',
      exportedBundleName: 'core-banking-screens-modernized-bundle-v1.zip',
    });
  });
});
