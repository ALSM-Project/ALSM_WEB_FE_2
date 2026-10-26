import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConversionQueuePage from './ConversionQueuePage';
import { apiClient } from '@/services/api/apiClient';
import type { QueueJob } from '../services/conversion-queue.service';

// Exercise the production service against HTTP-shaped client responses. Fixtures stay in tests.
vi.mock('@/services/api/apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
const auth = vi.hoisted(() => ({ id: 'staff-a', epoch: 'login-a', signedIn: true, loading: false, permissions: [] as string[], listeners: new Set<() => void>() }));
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({
  user: auth.signedIn ? { id: auth.id, effectivePermissions: auth.permissions, isPlatformAdmin: false } : null,
  isLoading: auth.loading,
  hasPermission: (permission: string) => auth.permissions.includes(permission),
}) }));
vi.mock('@/services/api/tokenStore', () => ({ tokenStore: {
  subscribe: (fn: () => void) => { auth.listeners.add(fn); return () => auth.listeners.delete(fn); },
  epoch: () => auth.epoch, getRefreshToken: () => auth.signedIn ? 'test-refresh' : null, isLogoutPending: () => false,
} }));
const completed: QueueJob = {
  id: 'job-1', organizationId: 'org-1', projectId: 'p1', status: 'COMPLETED', conversionType: 'COBOL_TO_JAVA',
  priority: 'NORMAL', attemptCount: 5, maxAttempts: 5, createdBy: 'real-submitter', createdAt: '2026-10-17T10:00:00Z', updatedAt: '2026-10-17T10:01:00Z',
};
const failed: QueueJob = { ...completed, id: 'job-failed', status: 'FAILED', errorCode: 'RECORDED_FAILURE', errorMessage: 'Persisted error' };
let projects: { id: string; name: string; organizationId: string }[];
let records: QueueJob[];
let jobsError: unknown;
let projectsError: unknown;
let retryError: unknown;
const clients: QueryClient[] = [];
function show(url = '/queue?projectId=p1', reviewOnly = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  const ui = <QueryClientProvider client={client}><MemoryRouter initialEntries={[url]}><ConversionQueuePage reviewOnly={reviewOnly} /></MemoryRouter></QueryClientProvider>;
  return { ...render(ui), client, ui };
}
const failure = (status: number, message: string) => ({ response: { status, data: { message } } });
const queueRequests = () => vi.mocked(apiClient.get).mock.calls.filter(([url]) => /\/projects\/.+\/conversions/.test(url));
const row = (id: string) => screen.getByRole('button', { name: `View job ${id}` }).closest('tr')!;
beforeEach(() => {
  vi.resetAllMocks();
  auth.id = 'staff-a'; auth.epoch = 'login-a'; auth.signedIn = true; auth.loading = false;
  auth.permissions = ['conversions.queue.view', 'quality-review.manage', 'conversions.retry', 'conversions.troubleshoot.view'];
  projects = [{ id: 'p1', name: 'Real project', organizationId: 'org-1' }, { id: 'p2', name: 'Second project', organizationId: 'org-1' }];
  records = [completed, { ...completed, id: 'job-2', status: 'QUEUED' }];
  jobsError = projectsError = retryError = null;
  vi.mocked(apiClient.get).mockImplementation(async (url) => {
    if (url === '/conversion-queue/projects') { if (projectsError) throw projectsError; return projects; }
    if (url.match(/^\/projects\/[^/]+\/conversions$/)) {
      if (jobsError) throw jobsError;
      const project = url.split('/')[2];
      return records.filter((job) => job.projectId === project);
    }
    const job = records.find((job) => url === `/conversions/${job.id}`);
    if (job) return job;
    throw failure(404, 'Job was not found');
  });
  vi.mocked(apiClient.post).mockImplementation(async () => {
    if (retryError) throw retryError;
    records = records.map((job) => job.id === failed.id ? { ...job, status: 'PROCESSING', attemptCount: 1 } : job);
    return { ...failed, status: 'QUEUED', attemptCount: 0 };
  });
});
afterEach(() => { cleanup(); clients.splice(0).forEach((client) => client.clear()); vi.useRealTimers(); });

describe('authoritative project conversion queue', () => {
  it('renders real records, status filters, and completed job review navigation', async () => {
    show();
    expect(await screen.findByRole('button', { name: 'View job job-1' })).toBeInTheDocument();
    expect(queueRequests()[0][0]).toBe('/projects/p1/conversions');
    expect(screen.getAllByText('real-submitter')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Review quality' })).toHaveAttribute('href', '/admin/projects/p1/conversions/job-1/quality-review?organizationId=org-1');
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'QUEUED' } });
    expect(screen.queryByRole('button', { name: 'View job job-1' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Waiting jobs')).toHaveTextContent('1');
  });
  it('loads real details and never invents logs or a dead-letter status from attempts', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'View job job-1' }));
    expect(await screen.findByText('Not reported')).toBeInTheDocument();
    expect(screen.getByText(/Not available. Worker logs/)).toBeInTheDocument();
    expect(screen.queryByText('DLQ LIMIT REACHED')).not.toBeInTheDocument();
    expect(screen.queryByText(/Worker dispatched|Parsing input source/)).not.toBeInTheDocument();
  });
  it('requires explicit project selection without showing jobs or counts', async () => {
    show('/queue');
    expect(await screen.findByText('Select a project to view its conversion queue.')).toBeInTheDocument();
    expect(queueRequests()).toHaveLength(0);
    expect(screen.queryByRole('region', { name: 'Project queue status summary' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Acme|job-bms-custinq|All Accessible Projects/)).not.toBeInTheDocument();
  });
  it('rejects inaccessible project URLs before requesting jobs', async () => {
    show('/queue?projectId=foreign');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
    expect(queueRequests()).toHaveLength(0);
  });
  it('shows project loading without fabricated counts', () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {}));
    show('/queue');
    expect(screen.getByRole('status')).toHaveTextContent('Loading projects');
    expect(queueRequests()).toHaveLength(0);
  });
  it('handles no projects and permission errors truthfully', async () => {
    projects = [];
    const view = show();
    expect(await screen.findByText('No accessible projects found.')).toBeInTheDocument();
    expect(queueRequests()).toHaveLength(0);
    view.unmount();
    projectsError = failure(403, 'Organization access denied');
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent('Organization access denied');
    expect(queueRequests()).toHaveLength(0);
  });
  it('keeps failures distinct from empty queues, hides diagnostics, and recovers on refresh', async () => {
    jobsError = failure(503, 'mongodb://secret/internal-stack');
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent('Conversion service is unavailable');
    expect(screen.queryByText(/No conversion jobs|secret|Acme/)).not.toBeInTheDocument();
    records = []; jobsError = null;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('No conversion jobs match this selection.')).toBeInTheDocument();
    expect(screen.getByLabelText('Waiting jobs')).toHaveTextContent('0');
  });
  it('filters type and search from persisted fields and counts all project records', async () => {
    records = [completed, failed, { ...completed, id: 'bms', status: 'QUEUED', conversionType: 'BMS_DSPF_TO_FRONTEND' }, { ...completed, id: 'dead', status: 'DEAD' }];
    show();
    await screen.findByRole('button', { name: 'View job bms' });
    expect(screen.getByLabelText('Failed or dead jobs')).toHaveTextContent('2');
    fireEvent.change(screen.getByLabelText('Job Type'), { target: { value: 'BMS_DSPF_TO_FRONTEND' } });
    expect(screen.queryByRole('button', { name: 'View job job-1' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Search by job ID/), { target: { value: 'nonexistent' } });
    expect(screen.getByText('No conversion jobs match this selection.')).toBeInTheDocument();
    expect(screen.getByLabelText('Failed or dead jobs')).toHaveTextContent('2');
  });
  it('clears details and confirmation immediately on project change and aborts old requests', async () => {
    records = [completed, failed];
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'View job job-1' }));
    await screen.findByText('Not reported');
    fireEvent.click(within(row(failed.id)).getByRole('button', { name: 'Retry Job' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'p2' } });
    expect(screen.queryByText('Job Details: job-1')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('No conversion jobs match this selection.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View job job-1' })).not.toBeInTheDocument();
  });
  it('ignores late job/detail responses from the previous project', async () => {
    let resolveDetail!: (value: unknown) => void;
    const original = vi.mocked(apiClient.get).getMockImplementation()!;
    vi.mocked(apiClient.get).mockImplementation((url, config) => url === '/conversions/job-1' ? new Promise((resolve) => { resolveDetail = resolve; }) : original(url, config));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'View job job-1' }));
    await waitFor(() => expect(resolveDetail).toBeTypeOf('function'));
    const signal = vi.mocked(apiClient.get).mock.calls.find(([url]) => url === '/conversions/job-1')![1]!.signal;
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'p2' } });
    expect(signal?.aborted).toBe(true);
    resolveDetail(completed);
    expect(await screen.findByText('No conversion jobs match this selection.')).toBeInTheDocument();
    expect(screen.queryByText('Not reported')).not.toBeInTheDocument();
  });
  it('hides cached records on refresh denial', async () => {
    show(); await screen.findByRole('button', { name: 'View job job-1' });
    jobsError = failure(403, 'Access revoked');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Access revoked');
    expect(screen.queryByRole('button', { name: 'View job job-1' })).not.toBeInTheDocument();
  });
  it('isolates cached data and selection after changing authenticated user or login', async () => {
    const view = show(); await screen.findByRole('button', { name: 'View job job-1' });
    auth.id = 'staff-b'; auth.epoch = 'login-b'; records = [];
    view.rerender(<QueryClientProvider client={view.client}><MemoryRouter initialEntries={['/queue?projectId=p1']}><ConversionQueuePage /></MemoryRouter></QueryClientProvider>);
    expect(screen.queryByRole('button', { name: 'View job job-1' })).not.toBeInTheDocument();
    expect(await screen.findByText('No conversion jobs match this selection.')).toBeInTheDocument();
  });
  it('does not claim success after rejected retry and keeps authoritative status', async () => {
    records = [failed]; retryError = failure(403, 'Your organization role cannot perform this action');
    show();
    fireEvent.click(within((await screen.findByRole('button', { name: `View job ${failed.id}` })).closest('tr')!).getByRole('button', { name: 'Retry Job' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Re-Queue Job' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to retry job: Your organization role cannot perform this action');
    expect(within(row(failed.id)).getByText('FAILED')).toBeInTheDocument();
    expect(screen.queryByText(/Retry accepted|successfully|reset to 0/)).not.toBeInTheDocument();
  });
  it('prevents duplicate retry submissions and refreshes authoritative state instead of the POST snapshot', async () => {
    records = [failed];
    let finish!: () => void;
    vi.mocked(apiClient.post).mockImplementation(() => new Promise((resolve) => { finish = () => { records = [{ ...failed, status: 'PROCESSING', attemptCount: 1 }]; resolve({ ...failed, status: 'QUEUED', attemptCount: 0 }); }; }));
    show();
    fireEvent.click(within((await screen.findByRole('button', { name: `View job ${failed.id}` })).closest('tr')!).getByRole('button', { name: 'Retry Job' }));
    const confirm = screen.getByRole('button', { name: 'Confirm & Re-Queue Job' });
    fireEvent.click(confirm); fireEvent.click(confirm);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Retrying...' })).toBeDisabled();
    finish();
    expect(await screen.findByText(/Retry accepted for job/)).toBeInTheDocument();
    expect(within(row(failed.id)).getByText('PROCESSING')).toBeInTheDocument();
    expect(within(row(failed.id)).getByText('1 / 5')).toBeInTheDocument();
    expect(queueRequests().length).toBeGreaterThan(1);
  });
  it('loads truthful troubleshooting details and uses the same real retry operation', async () => {
    records = [failed];
    show('/queue?projectId=p1&tab=troubleshoot');
    const inspect = (await screen.findAllByRole('button', { name: 'Troubleshoot' }))[0];
    fireEvent.click(inspect);
    expect(await screen.findByRole('heading', { name: /Troubleshooting Workspace/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Worker logs' })).toHaveTextContent('Not available');
    fireEvent.click(screen.getByRole('button', { name: 'Retry Conversion' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Re-Queue Job' }));
    expect(await screen.findByText(/Retry accepted for job/)).toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledWith(`/conversions/${failed.id}/retry`, undefined, { headers: { 'x-organization-id': 'org-1' } });
  });
  it('hides restricted actions and only shows completed jobs on Quality Review', async () => {
    auth.permissions = ['quality-review.manage'];
    show('/review?projectId=p1', true);
    await screen.findByRole('button', { name: 'View job job-1' });
    expect(screen.queryByRole('button', { name: 'View job job-2' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry Job' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Troubleshooting &/ })).not.toBeInTheDocument();
  });
  it('polls real records only while a valid project is selected', async () => {
    vi.useFakeTimers();
    show();
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByRole('button', { name: 'View job job-1' })).toBeInTheDocument();
    records = [{ ...completed, status: 'PROCESSING' }];
    await act(async () => { await vi.advanceTimersByTimeAsync(10100); });
    expect(within(row(completed.id)).getByText('PROCESSING')).toBeInTheDocument();
    const calls = queueRequests().length;
    expect(calls).toBeGreaterThan(1);
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: '' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(10100); });
    expect(queueRequests()).toHaveLength(calls);
    expect(screen.queryByRole('button', { name: 'View job job-1' })).not.toBeInTheDocument();
  });
  it('refreshes persisted detail errors even when the retry endpoint rejects after an enqueue failure', async () => {
    records = [failed];
    vi.mocked(apiClient.post).mockImplementation(async () => {
      records = [{ ...failed, attemptCount: 0, errorCode: 'CONVERSION_QUEUE_UNAVAILABLE', errorMessage: 'Conversion job could not be queued' }];
      throw failure(400, 'Conversion job could not be queued');
    });
    show();
    fireEvent.click(await screen.findByRole('button', { name: `View job ${failed.id}` }));
    await screen.findByText('Persisted error');
    fireEvent.click(screen.getAllByRole('button', { name: 'Retry Job' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Re-Queue Job' }));
    expect(await screen.findByText('Error Code: CONVERSION_QUEUE_UNAVAILABLE')).toBeInTheDocument();
    expect(screen.queryByText('Persisted error')).not.toBeInTheDocument();
  });
  it.each(['anonymous', 'denied'])('does not fetch any queue data for %s users', async (mode) => {
    auth.signedIn = mode !== 'anonymous'; auth.permissions = [];
    show();
    expect(screen.getByRole('alert')).toHaveTextContent(mode === 'anonymous' ? 'Sign in' : 'permission');
    expect(apiClient.get).not.toHaveBeenCalled();
  });
  it('carries the assigned project organization to jobs, detail, retry, and review navigation', async () => {
    projects = [{ id: 'p2', name: 'Assigned in another organization', organizationId: 'org-2' }];
    records = [{ ...failed, projectId: 'p2', organizationId: 'org-2' }, { ...completed, projectId: 'p2', organizationId: 'org-2' }];
    show('/queue?projectId=p2');
    fireEvent.click(await screen.findByRole('button', { name: `View job ${failed.id}` }));
    await screen.findByText('Persisted error');
    const getCalls = vi.mocked(apiClient.get).mock.calls;
    expect(getCalls.find(([url]) => url === '/projects/p2/conversions')?.[1]?.headers).toEqual({ 'x-organization-id': 'org-2' });
    expect(getCalls.find(([url]) => url === `/conversions/${failed.id}`)?.[1]?.headers).toEqual({ 'x-organization-id': 'org-2' });
    expect(screen.getByRole('link', { name: 'Review quality' })).toHaveAttribute('href', '/admin/projects/p2/conversions/job-1/quality-review?organizationId=org-2');
    fireEvent.click(screen.getAllByRole('button', { name: 'Retry Job' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Re-Queue Job' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(`/conversions/${failed.id}/retry`, undefined, { headers: { 'x-organization-id': 'org-2' } }));
  });
  it('clears cached jobs and details when refreshed assignments no longer include the project', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'View job job-1' }));
    await screen.findByText('Not reported');
    projects = [];
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable in your current authorized assignments');
    expect(screen.queryByRole('button', { name: 'View job job-1' })).not.toBeInTheDocument();
    expect(screen.queryByText('Job Details: job-1')).not.toBeInTheDocument();
  });
});
