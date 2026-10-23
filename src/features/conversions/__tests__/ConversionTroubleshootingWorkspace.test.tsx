import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConversionTroubleshootingWorkspace } from '../components/ConversionTroubleshootingWorkspace';
import type { QueueJob } from '../services/conversion-queue.service';

const job: QueueJob = {
  id: 'persisted-job', organizationId: 'persisted-org', projectId: 'persisted-project', screenId: 'screen-id',
  status: 'DEAD', conversionType: 'COBOL_TO_JAVA', priority: 'HIGH', attemptCount: 5, maxAttempts: 5,
  createdBy: 'staff-id', createdAt: '2026-10-23T01:00:00Z', updatedAt: '2026-10-23T01:05:00Z',
  errorCode: 'RECORDED_FAILURE', errorMessage: 'Recorded conversion error',
};
afterEach(cleanup);
describe('persisted queue investigation', () => {
  it('renders persisted context and metadata without synthesizing missing artifacts', () => {
    render(<ConversionTroubleshootingWorkspace job={job} projectName="Persisted project" onBack={vi.fn()} />);
    expect(screen.getByText('Persisted project')).toBeInTheDocument();
    expect(screen.getByText('Recorded conversion error')).toBeInTheDocument();
    expect(screen.getByText('5 / 5')).toBeInTheDocument();
    for (const label of ['Legacy source code', 'Field mappings', 'Execution history', 'Worker logs']) {
      expect(screen.getByRole('region', { name: label })).toHaveTextContent('Not available');
    }
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
