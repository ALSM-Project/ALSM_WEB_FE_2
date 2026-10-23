import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api/apiClient';
import { partnersApi, PartnerUploadError } from '../api/partners.api';

vi.mock('@/services/api/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const SERVER_PROJECT = '6650aa00aa00aa00aa00aa01';
const LOCAL_PROJECT = 'proj-fnx-core';

function file(name: string, content = 'content'): File {
  return new File([content], name);
}

function httpError(status: number, data: Record<string, unknown>) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });
}

describe('partnersApi.uploadSourceFiles (UC-46)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(apiClient.get).mockRejectedValue(new Error('offline'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('posts the files as multipart form data to the project conversion-sources endpoint', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      inputReference: 'sources/p/uuid',
      files: [{ name: 'LOGIN.bms', sizeBytes: 7 }],
      screens: [{ id: 'scr-1', name: 'LOGIN.bms', sourceType: 'BMS' }],
    });
    const progress = vi.fn();

    const result = await partnersApi.uploadSourceFiles(SERVER_PROJECT, [file('LOGIN.bms')], progress);

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    const [url, body, config] = vi.mocked(apiClient.post).mock.calls[0];
    expect(url).toBe(`/projects/${SERVER_PROJECT}/conversion-sources`);
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).getAll('files')).toHaveLength(1);
    expect(((body as FormData).get('files') as File).name).toBe('LOGIN.bms');

    // Real progress events from the transport are forwarded as percentages.
    (config as { onUploadProgress: (e: unknown) => void }).onUploadProgress({ loaded: 25, total: 100 });
    expect(progress).toHaveBeenCalledWith(25);

    expect(result).toEqual({ registered: ['LOGIN.bms'], ignoredEntries: [] });
    expect(progress).toHaveBeenCalledWith(100);
  });

  it('reports the screens the server registered and the ignored zip entries, without writing local items', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      inputReference: 'sources/p/uuid',
      files: [
        { name: 'LOGIN.bms', sizeBytes: 7 },
        { name: 'MENU.bms', sizeBytes: 7 },
      ],
      screens: [
        { id: 's1', name: 'LOGIN.bms', sourceType: 'BMS' },
        { id: 's2', name: 'MENU.bms', sourceType: 'BMS' },
      ],
      ignoredEntries: ['bundle.zip/README.md'],
    });

    const result = await partnersApi.uploadSourceFiles(SERVER_PROJECT, [file('bundle.zip')]);

    expect(result.registered).toEqual(['LOGIN.bms', 'MENU.bms']);
    expect(result.ignoredEntries).toEqual(['bundle.zip/README.md']);
    // Server projects read their workspace items from the backend, not the local store.
    expect(localStorage.getItem('alsm_partner_items_v1') ?? '').not.toContain(SERVER_PROJECT);
  });

  it('maps a 400 rejection to a PartnerUploadError with the server message and stores nothing', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(
      httpError(400, { code: 'EMPTY_FILE', message: 'File "A.bms" is empty (0 bytes)' }),
    );

    const error = await partnersApi
      .uploadSourceFiles(SERVER_PROJECT, [file('A.bms')])
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PartnerUploadError);
    expect(error).toMatchObject({ status: 400, code: 'EMPTY_FILE', message: 'File "A.bms" is empty (0 bytes)' });
    expect(localStorage.getItem('alsm_partner_items_v1') ?? '').not.toContain('A.bms');
  });

  it('gives user-safe messages for 403, 413 and an unreachable server', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(httpError(403, { message: 'internal detail' }));
    await expect(partnersApi.uploadSourceFiles(SERVER_PROJECT, [file('A.bms')])).rejects.toThrow(
      /do not have permission/i,
    );

    vi.mocked(apiClient.post).mockRejectedValueOnce(httpError(413, {}));
    await expect(partnersApi.uploadSourceFiles(SERVER_PROJECT, [file('A.bms')])).rejects.toThrow(/50 MB/);

    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network Error'));
    await expect(partnersApi.uploadSourceFiles(SERVER_PROJECT, [file('A.bms')])).rejects.toThrow(
      /cannot reach the server/i,
    );
  });

  it('refuses a project that is not stored on the server without calling it', async () => {
    const error = await partnersApi
      .uploadSourceFiles(LOCAL_PROJECT, [file('CUSTREG.bms', 'DFHMSD')])
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PartnerUploadError);
    expect((error as Error).message).toMatch(/not stored on the server/i);
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(await partnersApi.getProjectItems(LOCAL_PROJECT)).toEqual([]);
  });
});
