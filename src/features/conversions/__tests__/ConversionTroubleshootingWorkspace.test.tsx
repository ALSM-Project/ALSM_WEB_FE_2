import { cleanup, fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversionTroubleshootingWorkspace } from '../components/ConversionTroubleshootingWorkspace';
import { conversionQueueService, type QueueJob } from '../services/conversion-queue.service';

vi.mock('../services/conversion-queue.service', async () => {
  const actual = await vi.importActual<typeof import('../services/conversion-queue.service')>(
    '../services/conversion-queue.service',
  );
  return { ...actual, conversionQueueService: { getSupportPatch: vi.fn(), applySupportPatch: vi.fn() } };
});

/** The workspace reads the job's saved mapping rules through react-query. */
function render(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  queryClient.setQueryData(['currentUser'], {
    id: 'viewer', email: 'viewer@alsm.io', isPlatformAdmin: false, effectivePermissions: ['conversions.troubleshoot.view'],
  });
  const wrap = (node: ReactElement) => <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>;
  const view = rtlRender(wrap(ui));
  return { ...view, rerender: (next: ReactElement) => view.rerender(wrap(next)) };
}

const job: QueueJob = {
  id: 'persisted-job', organizationId: 'persisted-org', projectId: 'persisted-project', screenId: 'screen-id',
  status: 'DEAD', conversionType: 'COBOL_TO_JAVA', priority: 'HIGH', attemptCount: 5, maxAttempts: 5,
  createdBy: 'staff-id', createdAt: '2026-10-23T01:00:00Z', updatedAt: '2026-10-23T01:05:00Z',
  errorCode: 'RECORDED_FAILURE', errorMessage: 'Recorded conversion error',
};
beforeEach(() => {
  vi.mocked(conversionQueueService.getSupportPatch).mockResolvedValue({ job, rules: [], history: [] });
});
afterEach(cleanup);
describe('persisted queue investigation', () => {
  it('renders persisted context and metadata without synthesizing missing artifacts', async () => {
    render(<ConversionTroubleshootingWorkspace job={job} projectName="Persisted project" onBack={vi.fn()} />);
    expect(screen.getByText('Persisted project')).toBeInTheDocument();
    expect(screen.getByText('Recorded conversion error')).toBeInTheDocument();
    expect(screen.getByText('5 / 5')).toBeInTheDocument();
    for (const label of ['Legacy source code', 'Execution history', 'Worker logs']) {
      expect(screen.getByRole('region', { name: label })).toHaveTextContent('Not available');
    }
    // Field mappings are read from the server; none are saved for this job, and none are invented.
    expect(await screen.findByText('No mapping rules saved for this job yet.')).toBeInTheDocument();
    expect(screen.queryByText(/Acme|Syntax.*Verified|4\.2s|worker-node/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Apply Support Patch|Validate Mapping|Retry Conversion/ })).not.toBeInTheDocument();
  });
  it('delegates authorized retry to the queue confirmation without altering the supplied record', () => {
    const retry = vi.fn();
    const back = vi.fn();
    render(<ConversionTroubleshootingWorkspace job={job} onBack={back} onRetry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry Conversion' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(job.status).toBe('DEAD');
    fireEvent.click(screen.getByRole('button', { name: 'Back to Queue' }));
    expect(back).toHaveBeenCalledOnce();
  });
  it('blocks retries for active or completed jobs and during a pending submission', () => {
    const view = render(<ConversionTroubleshootingWorkspace job={{ ...job, status: 'COMPLETED' }} onBack={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Retry Conversion' })).not.toBeInTheDocument();
    view.rerender(<ConversionTroubleshootingWorkspace job={job} onBack={vi.fn()} onRetry={vi.fn()} retrying />);
    expect(screen.getByRole('button', { name: 'Retry Conversion' })).toBeDisabled();
  });
});
