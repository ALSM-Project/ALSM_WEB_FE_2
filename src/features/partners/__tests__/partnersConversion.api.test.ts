import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api/apiClient';
import { partnersApi, PartnerConversionError } from '../api/partners.api';

vi.mock('@/services/api/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const PROJECT = '6650aa00aa00aa00aa00aa01';
const LOGIN = '6650bb00bb00bb00bb00bb0a';
const MENU = '6650bb00bb00bb00bb00bb0b';
const ORDERS = '6650bb00bb00bb00bb00bb0c';

const screens = [
  { id: LOGIN, projectId: PROJECT, name: 'LOGIN.bms', sourceType: 'BMS', updatedAt: '2026-10-22T01:00:00Z' },
  { id: MENU, projectId: PROJECT, name: 'MENU.bms', sourceType: 'BMS', updatedAt: '2026-10-22T01:00:00Z' },
  { id: ORDERS, projectId: PROJECT, name: 'ORDERS.bms', sourceType: 'BMS', updatedAt: '2026-10-22T01:00:00Z' },
];

function job(screenId: string, status: string, createdAt: string, extra: Record<string, unknown> = {}) {
  return { id: `job-${screenId}-${createdAt}`, screenId, status, attemptCount: 1, maxAttempts: 3, createdAt, updatedAt: createdAt, ...extra };
}

function httpError(status: number, data: Record<string, unknown>) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });
}

let jobs: ReturnType<typeof job>[] = [];

describe('partnersApi conversions (UC-47)', () => {
  beforeEach(() => {
    localStorage.clear();
    jobs = [];
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === '/projects') {
        return [{ id: PROJECT, name: 'Core Screens', organizationId: 'org-1', sourcePlatform: 'BMS', targetPlatform: 'React' }];
      }
      if (url === `/projects/${PROJECT}/screens`) return screens;
      if (url === `/projects/${PROJECT}/conversions`) return jobs;
      throw new Error(`unexpected GET ${url}`);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('builds workspace items from the server screens and their latest job', async () => {
    jobs = [
      job(LOGIN, 'FAILED', '2026-10-22T02:00:00Z', { errorCode: 'CONVERSION_ENGINE_UNAVAILABLE', errorMessage: 'java.lang.NullPointerException at ...' }),
      job(LOGIN, 'COMPLETED', '2026-10-22T03:00:00Z', { attemptCount: 2 }),
      job(MENU, 'QUEUED', '2026-10-22T03:00:00Z', { attemptCount: 0 }),
      job(ORDERS, 'DEAD', '2026-10-22T03:00:00Z', { attemptCount: 3, errorCode: 'CONVERSION_ENGINE_UNAVAILABLE' }),
    ];

    const items = await partnersApi.getProjectItems(PROJECT);

    expect(items.map((i) => [i.sourceFile, i.status, `${i.attemptCount}/${i.maxAttempts}`])).toEqual([
      ['LOGIN.bms', 'COMPLETED', '2/3'],
      ['MENU.bms', 'PROCESSING', '0/3'],
      ['ORDERS.bms', 'DEAD_LETTER', '3/3'],
    ]);
    expect(items[0].id).toBe(LOGIN);
    // Raw tool output never reaches the UI - only a safe message for the error code.
    expect(items[2].safeErrorMessage).toMatch(/could not convert this file/i);
    expect(JSON.stringify(items)).not.toContain('NullPointerException');
  });

  it('shows an item with no job yet as PENDING with 0 attempts', async () => {
    const items = await partnersApi.getProjectItems(PROJECT);

    expect(items.every((i) => i.status === 'PENDING' && i.attemptCount === 0)).toBe(true);
  });

  it('starts one conversion through POST /conversions/jobs and returns the refreshed item', async () => {
    vi.mocked(apiClient.post).mockImplementation(async () => {
      jobs = [job(LOGIN, 'QUEUED', '2026-10-22T04:00:00Z', { attemptCount: 0 })];
      return jobs[0];
    });

    const item = await partnersApi.retryItemConversion(PROJECT, LOGIN);

    expect(apiClient.post).toHaveBeenCalledWith(`/projects/${PROJECT}/conversions/jobs`, { screenId: LOGIN });
    expect(item).toMatchObject({ id: LOGIN, status: 'PROCESSING', attemptCount: 0, maxAttempts: 3 });
  });

  it('passes through user-facing server reasons and hides internal ones', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(
      httpError(409, { code: 'CONVERSION_ALREADY_IN_PROGRESS', message: '"LOGIN.bms" already has a conversion in progress' }),
    );
    await expect(partnersApi.retryItemConversion(PROJECT, LOGIN)).rejects.toMatchObject({
      status: 409,
      message: '"LOGIN.bms" already has a conversion in progress',
    });

    vi.mocked(apiClient.post).mockRejectedValueOnce(
      httpError(400, { code: 'CONVERSION_QUEUE_UNAVAILABLE', message: 'Conversion job could not be queued' }),
    );
    await expect(partnersApi.retryItemConversion(PROJECT, LOGIN)).rejects.toThrow(/temporarily unavailable/i);

    vi.mocked(apiClient.post).mockRejectedValueOnce(httpError(500, { message: 'MongoServerError: E11000 at db.jobs' }));
    const internal = await partnersApi.retryItemConversion(PROJECT, LOGIN).catch((e: unknown) => e);
    expect(internal).toBeInstanceOf(PartnerConversionError);
    expect((internal as Error).message).not.toMatch(/Mongo|E11000/);
  });

  it('runs all non-completed, non-running items in one bulk request and marks skipped ones', async () => {
    jobs = [
      job(LOGIN, 'COMPLETED', '2026-10-22T03:00:00Z'),
      job(MENU, 'FAILED', '2026-10-22T03:00:00Z', { errorCode: 'CONVERSION_ENGINE_UNAVAILABLE' }),
    ];
    vi.mocked(apiClient.post).mockImplementation(async () => {
      jobs = [...jobs, job(MENU, 'QUEUED', '2026-10-22T05:00:00Z', { attemptCount: 0 })];
      return {
        jobs: [jobs[jobs.length - 1]],
        skipped: [{ screenId: ORDERS, code: 'COPYBOOK_DEPENDENCY_BLOCKED', message: '"ORDERS.bms" is missing copybooks: X' }],
      };
    });

    const items = await partnersApi.runAllConversions(PROJECT);

    expect(apiClient.post).toHaveBeenCalledWith(`/projects/${PROJECT}/conversions/jobs/bulk`, {
      screenIds: [MENU, ORDERS],
    });
    expect(items.find((i) => i.id === MENU)?.status).toBe('PROCESSING');
    expect(items.find((i) => i.id === ORDERS)?.lastSkipReason).toBe('"ORDERS.bms" is missing copybooks: X');
    expect(items.find((i) => i.id === LOGIN)?.status).toBe('COMPLETED');
  });

  it('does not call the server when everything is already converted or running', async () => {
    jobs = [
      job(LOGIN, 'COMPLETED', '2026-10-22T03:00:00Z'),
      job(MENU, 'PROCESSING', '2026-10-22T03:00:00Z'),
      job(ORDERS, 'COMPLETED', '2026-10-22T03:00:00Z'),
    ];

    const items = await partnersApi.runAllConversions(PROJECT);

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(items).toHaveLength(3);
  });

  it('refuses to fake a conversion for a browser-only demo project', async () => {
    await expect(partnersApi.retryItemConversion('proj-fnx-core', 'item-1')).rejects.toThrow(/exists only in this browser/i);
    await expect(partnersApi.runAllConversions('proj-fnx-core')).rejects.toBeInstanceOf(PartnerConversionError);
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
