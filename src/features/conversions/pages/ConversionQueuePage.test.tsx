import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConversionQueuePage from './ConversionQueuePage';
import { conversionQueueService, type QueueJob } from '../services/conversion-queue.service';

vi.mock('../services/conversion-queue.service', async () => ({
  ...await vi.importActual('../services/conversion-queue.service'),
  conversionQueueService: { listProjects: vi.fn(), listJobs: vi.fn(), getJob: vi.fn() },
}));
const permissions = vi.hoisted(() => ({ review: true }));
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ hasPermission: () => permissions.review }) }));
const completed: QueueJob = {
  id: 'job-1', organizationId: 'org-1', projectId: 'p1', status: 'COMPLETED', conversionType: 'COBOL_TO_JAVA',
  priority: 'NORMAL', attemptCount: 1, maxAttempts: 3, createdBy: 'real-submitter', createdAt: '2026-10-17T10:00:00Z', updatedAt: '2026-10-17T10:01:00Z',
};
const clients: QueryClient[] = [];
function show(url = '/queue?projectId=p1', reviewOnly = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[url]}><ConversionQueuePage reviewOnly={reviewOnly} /></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => {
  vi.clearAllMocks();
  permissions.review = true;
  vi.mocked(conversionQueueService.listProjects).mockResolvedValue([{ id: 'p1', name: 'Real project', organizationId: 'org-1' }]);
  vi.mocked(conversionQueueService.listJobs).mockResolvedValue([completed, { ...completed, id: 'job-2', status: 'QUEUED' }]);
  vi.mocked(conversionQueueService.getJob).mockResolvedValue(completed);
});
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); });
describe('project conversion queue', () => {
  it('loads persisted jobs, filters status, and links completed jobs to review', async () => {
    show();
    expect(await screen.findByRole('button', { name: 'View job job-1' })).toBeInTheDocument();
    expect(conversionQueueService.listJobs).toHaveBeenCalledWith('p1');
    expect(screen.getAllByText('real-submitter')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Review quality' })).toHaveAttribute('href', '/admin/projects/p1/conversions/job-1/quality-review');
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'QUEUED' } });
    expect(screen.queryByRole('button', { name: 'View job job-1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Review quality' })).not.toBeInTheDocument();
  });
  it('fetches real job detail and displays unreported engine honestly', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'View job job-1' }));
    expect(await screen.findByText('Not reported')).toBeInTheDocument();
    expect(conversionQueueService.getJob).toHaveBeenCalledWith('job-1');
    expect(screen.queryByRole('button', { name: /claim/i })).not.toBeInTheDocument();
  });
  it('does not request inaccessible project IDs from the URL', async () => {
    show('/queue?projectId=foreign');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
    expect(conversionQueueService.listJobs).not.toHaveBeenCalled();
  });
  it('shows a project loading state and no fabricated queue counts', () => {
    vi.mocked(conversionQueueService.listProjects).mockReturnValue(new Promise(() => {}));
    show('/queue');
    expect(screen.getByRole('status')).toHaveTextContent('Loading projects');
    expect(conversionQueueService.listJobs).not.toHaveBeenCalled();
  });
  it('keeps load errors distinct from an empty queue and refreshes', async () => {
    vi.mocked(conversionQueueService.listJobs).mockRejectedValue(new Error('Database unavailable'));
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
    expect(screen.queryByText('No conversion jobs match this selection.')).not.toBeInTheDocument();
    vi.mocked(conversionQueueService.listJobs).mockResolvedValue([]);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('No conversion jobs match this selection.')).toBeInTheDocument();
  });
  it('limits review entry to completed jobs and existing permission', async () => {
    permissions.review = false;
    show('/review?projectId=p1', true);
    await waitFor(() => expect(screen.getByRole('button', { name: 'View job job-1' })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'View job job-2' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Review quality' })).not.toBeInTheDocument();
  });
  it('derives status counts from all project records, keeps them independent of filtering, and changes scope with project selection', async () => {
    vi.mocked(conversionQueueService.listProjects).mockResolvedValue([
      { id: 'p1', name: 'First project', organizationId: 'org-1' },
      { id: 'p2', name: 'Second project', organizationId: 'org-1' },
    ]);
    vi.mocked(conversionQueueService.listJobs).mockImplementation(async (project) => project === 'p1' ? [
      completed,
      { ...completed, id: 'queued', status: 'QUEUED' },
      { ...completed, id: 'processing', status: 'PROCESSING' },
      { ...completed, id: 'failed', status: 'FAILED' },
      { ...completed, id: 'dead', status: 'DEAD' },
    ] : [
      { ...completed, projectId: 'p2', id: 'next-queued-1', status: 'QUEUED' },
      { ...completed, projectId: 'p2', id: 'next-queued-2', status: 'QUEUED' },
    ]);
    show();
    expect(await screen.findByRole('region', { name: 'Project queue status summary' })).toHaveTextContent('Project: First project');
    expect(screen.getByLabelText('Waiting jobs')).toHaveTextContent('1');
    expect(screen.getByLabelText('Processing jobs')).toHaveTextContent('1');
    expect(screen.getByLabelText('Failed or dead jobs')).toHaveTextContent('2');
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'COMPLETED' } });
    expect(screen.getByRole('button', { name: 'View job job-1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View job failed' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Failed or dead jobs')).toHaveTextContent('2');
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'p2' } });
    await waitFor(() => expect(screen.getByRole('region', { name: 'Project queue status summary' })).toHaveTextContent('Project: Second project'));
    expect(screen.getByLabelText('Waiting jobs')).toHaveTextContent('2');
    expect(screen.getByLabelText('Processing jobs')).toHaveTextContent('0');
    expect(screen.getByLabelText('Failed or dead jobs')).toHaveTextContent('0');
    expect(screen.getByText('No conversion jobs match this selection.')).toBeInTheDocument();
    expect(conversionQueueService.listJobs).toHaveBeenCalledWith('p2');
  });
});
