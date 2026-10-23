import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminQualityReviewPage from './AdminQualityReviewPage';
import { adminQualityReviewService } from '../services/quality-review.service';
import { conversionQueueService } from '../services/conversion-queue.service';
import type { ConversionQualityReviewResponse } from '../types/quality-review';

vi.mock('../services/quality-review.service', () => ({ adminQualityReviewService: { getQualityReview: vi.fn(), submitQualityReview: vi.fn() } }));
vi.mock('../services/conversion-queue.service', async () => ({ ...await vi.importActual('../services/conversion-queue.service'), conversionQueueService: { getResult: vi.fn() } }));
const pending: ConversionQualityReviewResponse = {
  review: { organizationId: 'org', projectId: 'p', conversionJobId: 'j', status: 'PENDING' },
  fileSummary: { fileCount: 1, totalLines: 2 },
};
const clients: QueryClient[] = [];
function show(url = '/admin/projects/p/conversions/j/quality-review') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  const router = createMemoryRouter([{ path: '/admin/projects/:projectId/conversions/:conversionJobId/quality-review', element: <AdminQualityReviewPage /> }], { initialEntries: [url] });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  return router;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminQualityReviewService.getQualityReview).mockResolvedValue(pending);
  vi.mocked(conversionQueueService.getResult).mockResolvedValue({ conversionJobId: 'j', files: [{ relativePath: 'Main.java', content: 'class Main {}' }] });
  vi.mocked(adminQualityReviewService.submitQualityReview).mockResolvedValue({ ...pending.review, status: 'ACCEPTED', reviewedBy: 'reviewer-real', reviewedAt: '2026-10-17T10:00:00Z' });
});
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); });
describe('quality review artifact and decision workflow', () => {
  it('preserves the queue-selected organization for review, artifact reads and submission', async () => {
    show('/admin/projects/p/conversions/j/quality-review?organizationId=assigned-org');
    await screen.findByText('Main.java');
    expect(adminQualityReviewService.getQualityReview).toHaveBeenCalledWith('p', 'j', 'assigned-org');
    expect(conversionQueueService.getResult).toHaveBeenCalledWith('j', 'assigned-org');
    fireEvent.click(screen.getByRole('button', { name: 'Save Admin Review Decision' }));
    await waitFor(() => expect(adminQualityReviewService.submitQualityReview).toHaveBeenCalledWith('p', 'j', { status: 'ACCEPTED', reviewNote: undefined, qualityScore: undefined }, 'assigned-org'));
  });
  it('loads generated files and shows a persisted successful decision', async () => {
    show();
    expect(await screen.findByText('Main.java')).toBeInTheDocument();
    expect(screen.getByText('class Main {}')).toBeInTheDocument();
    expect(screen.getByText('Engine version: Not reported')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Admin Review Decision' }));
    expect(await screen.findByText('Review Updated')).toBeInTheDocument();
    expect(adminQualityReviewService.submitQualityReview).toHaveBeenCalledWith('p', 'j', { status: 'ACCEPTED', reviewNote: undefined, qualityScore: undefined });
    expect(screen.getByText('reviewer-real')).toBeInTheDocument();
  });
  it('requires a note for rework and only sends valid decisions', async () => {
    show();
    await screen.findByText('Main.java');
    fireEvent.click(screen.getByRole('button', { name: /Needs Rework/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Admin Review Decision' }));
    expect(screen.getByText(/A review note is required/)).toBeInTheDocument();
    expect(adminQualityReviewService.submitQualityReview).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Admin Justification Note/), { target: { value: 'Incorrect field mapping' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Admin Review Decision' }));
    await waitFor(() => expect(adminQualityReviewService.submitQualityReview).toHaveBeenCalledWith('p', 'j', { status: 'NEEDS_REWORK', reviewNote: 'Incorrect field mapping', qualityScore: undefined }));
  });
  it('blocks review submission when actual artifacts cannot be loaded', async () => {
    vi.mocked(conversionQueueService.getResult).mockRejectedValue({ response: { data: { message: 'Artifact storage unavailable' } } });
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent('Artifact storage unavailable');
    expect(screen.getByRole('button', { name: 'Save Admin Review Decision' })).toBeDisabled();
    expect(adminQualityReviewService.submitQualityReview).not.toHaveBeenCalled();
  });
  it('reloads and surfaces a concurrent review conflict without a success alert', async () => {
    vi.mocked(adminQualityReviewService.submitQualityReview).mockRejectedValue({ response: { status: 409, data: { message: 'Concurrent update' } } });
    show();
    await screen.findByText('Main.java');
    fireEvent.click(screen.getByRole('button', { name: 'Save Admin Review Decision' }));
    expect(await screen.findByText('Review Modified Concurrently')).toBeInTheDocument();
    await waitFor(() => expect(adminQualityReviewService.getQualityReview).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Review Updated')).not.toBeInTheDocument();
  });
  it('resets draft, score, decision and errors when navigating between jobs on the same mounted route', async () => {
    const nextReview = { ...pending.review, projectId: 'next-project', conversionJobId: 'next-job', status: 'NEEDS_REWORK' as const, qualityScore: 2, reviewNote: 'Next job persisted note' };
    vi.mocked(adminQualityReviewService.getQualityReview).mockImplementation(async (_project, job) => job === 'j' ? pending : { ...pending, review: nextReview });
    vi.mocked(adminQualityReviewService.submitQualityReview).mockRejectedValueOnce({ response: { status: 403 } }).mockResolvedValue(nextReview);
    const router = show();
    await screen.findByText('Main.java');
    fireEvent.change(screen.getByLabelText(/Admin Justification Note/), { target: { value: 'Previous job unsaved draft' } });
    fireEvent.click(screen.getByRole('button', { name: '5★' }));
    fireEvent.click(screen.getByRole('button', { name: /Flag Issue/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Admin Review Decision' }));
    await screen.findByText('You do not have permission to override this quality review decision.');
    await act(async () => { await router.navigate('/admin/projects/next-project/conversions/next-job/quality-review'); });
    await waitFor(() => expect(screen.getByLabelText(/Admin Justification Note/)).toHaveValue('Next job persisted note'));
    expect(screen.queryByText('You do not have permission to override this quality review decision.')).not.toBeInTheDocument();
    expect(screen.queryByText('Review Updated')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Admin Review Decision' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Save Admin Review Decision' }));
    await waitFor(() => expect(adminQualityReviewService.submitQualityReview).toHaveBeenLastCalledWith('next-project', 'next-job', { status: 'NEEDS_REWORK', reviewNote: 'Next job persisted note', qualityScore: 2 }));
  });
});
