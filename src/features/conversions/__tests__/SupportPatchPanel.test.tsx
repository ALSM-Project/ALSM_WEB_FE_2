import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SupportPatchPanel } from '../components/SupportPatchPanel';
import { conversionQueueService, type QueueJob } from '../services/conversion-queue.service';
import { summarizeRuleChanges, validateSupportPatchRules } from '../utils/supportPatchRules';

vi.mock('../services/conversion-queue.service', async () => {
  const actual = await vi.importActual<typeof import('../services/conversion-queue.service')>(
    '../services/conversion-queue.service',
  );
  return {
    ...actual,
    conversionQueueService: { getSupportPatch: vi.fn(), applySupportPatch: vi.fn() },
  };
});

const job: QueueJob = {
  id: '6650ee00ee00ee00ee00ee01', organizationId: 'org-1', projectId: 'proj-1', screenId: 'CUSTINQ',
  status: 'DEAD', conversionType: 'BMS_DSPF_TO_FRONTEND', priority: 'NORMAL', attemptCount: 3, maxAttempts: 3,
  createdBy: 'u', createdAt: '2026-10-27T01:00:00Z', updatedAt: '2026-10-27T01:05:00Z',
  errorCode: 'SCHEMA_MAPPING_MISMATCH',
};

const savedRules = [
  { sourceField: 'ACCTNO', targetProperty: 'accountNumber', dataType: 'string' as const, transformRule: 'trim' },
  { sourceField: 'CUST_BAL_AMT', targetProperty: 'currentBalance', dataType: 'string' as const },
];

function renderPanel(permissions = ['conversions.troubleshoot.view', 'conversions.support_patch.apply'], target = job) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  queryClient.setQueryData(['currentUser'], {
    id: 'staff', email: 'staff@alsm.io', isPlatformAdmin: false, effectivePermissions: permissions,
  });
  const onApplied = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <SupportPatchPanel job={target} onApplied={onApplied} />
    </QueryClientProvider>,
  );
  return { onApplied };
}

describe('support patch rules (client)', () => {
  it('flags a target property bound to two types and an invalid identifier', () => {
    const { errors } = validateSupportPatchRules([
      { sourceField: 'A', targetProperty: 'total', dataType: 'number' },
      { sourceField: 'B', targetProperty: 'total', dataType: 'string' },
      { sourceField: 'C', targetProperty: '9lives', dataType: 'string' },
    ]);
    expect(errors).toHaveLength(2);
  });

  it('summarizes added, edited and removed rules', () => {
    expect(
      summarizeRuleChanges(savedRules, [
        { ...savedRules[1], dataType: 'BigDecimal' },
        { sourceField: 'NEW', targetProperty: 'n', dataType: 'string' },
      ]),
    ).toEqual({ added: 1, edited: 1, removed: 1, total: 3 });
  });
});

describe('SupportPatchPanel', () => {
  beforeEach(() => {
    vi.mocked(conversionQueueService.getSupportPatch).mockResolvedValue({
      job,
      rules: savedRules,
      history: [{ id: 'p1', rules: savedRules, note: 'first', changedRuleCount: 2, appliedBy: 'u', appliedAt: '2026-10-26T10:00:00Z' }],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads the rules saved on the server for the job', async () => {
    renderPanel();

    expect(await screen.findByDisplayValue('accountNumber')).toBeInTheDocument();
    expect(screen.getByDisplayValue('currentBalance')).toBeInTheDocument();
    expect(conversionQueueService.getSupportPatch).toHaveBeenCalledWith(job.id, 'org-1', expect.anything());
  });

  it('shows green when valid and red when a type conflict is found', async () => {
    renderPanel();
    await screen.findByDisplayValue('currentBalance');

    fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
    expect(screen.getByLabelText('Validation result')).toHaveTextContent('All 2 rule(s) are valid.');

    fireEvent.change(screen.getByLabelText('Target property for CUST_BAL_AMT'), { target: { value: 'accountNumber' } });
    fireEvent.change(screen.getByLabelText('Data type for CUST_BAL_AMT'), { target: { value: 'BigDecimal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
    expect(screen.getByLabelText('Validation result')).toHaveTextContent(/target "accountNumber" is BigDecimal here but string/);
  });

  it('applies the patch after confirmation, closes the dialog and reports the re-queued job', async () => {
    const requeued = { ...job, status: 'QUEUED' as const, attemptCount: 0, priority: 'HIGH' };
    const patchedRules = [savedRules[0], { ...savedRules[1], dataType: 'BigDecimal' as const }];
    vi.mocked(conversionQueueService.applySupportPatch).mockResolvedValue({
      job: requeued,
      patch: { id: 'p2', rules: patchedRules, note: 'n', changedRuleCount: 1, appliedBy: 'u', appliedAt: '2026-10-27T02:00:00Z' },
      warnings: [],
    });
    const { onApplied } = renderPanel();
    await screen.findByDisplayValue('currentBalance');

    fireEvent.change(screen.getByLabelText('Data type for CUST_BAL_AMT'), { target: { value: 'BigDecimal' } });
    fireEvent.change(screen.getByLabelText('Support note'), { target: { value: ' Balance is a decimal ' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply Patch & Re-run/ }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('1 rule(s) will change');
    expect(dialog).toHaveTextContent('0 added, 1 edited, 0 removed');
    fireEvent.click(within(dialog).getByRole('button', { name: /Confirm & Apply/ }));

    await waitFor(() => expect(onApplied).toHaveBeenCalledWith(requeued));
    expect(conversionQueueService.applySupportPatch).toHaveBeenCalledWith(
      job.id,
      { rules: patchedRules, note: 'Balance is a decimal' },
      'org-1',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/is QUEUED again with attempts reset to 0\/3 at HIGH priority/)).toBeInTheDocument();
  });

  it('does not open the confirmation when validation finds errors', async () => {
    renderPanel();
    await screen.findByDisplayValue('currentBalance');

    fireEvent.change(screen.getByLabelText('Target property for CUST_BAL_AMT'), { target: { value: '1bad' } });
    fireEvent.change(screen.getByLabelText('Support note'), { target: { value: 'fix' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply Patch & Re-run/ }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Validation result')).toHaveTextContent('1 error(s)');
    expect(conversionQueueService.applySupportPatch).not.toHaveBeenCalled();
  });

  it('requires a change and a note before applying', async () => {
    renderPanel();
    await screen.findByDisplayValue('currentBalance');
    const apply = screen.getByRole('button', { name: /Apply Patch & Re-run/ });

    expect(apply).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Remove rule ACCTNO'));
    expect(apply).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Support note'), { target: { value: 'Removed a stale rule' } });
    expect(apply).toBeEnabled();
  });

  it('shows the server error and keeps the edits when applying fails', async () => {
    vi.mocked(conversionQueueService.applySupportPatch).mockRejectedValue({
      response: { status: 409, data: { message: 'Only failed jobs can be patched; this job is QUEUED' } },
    });
    renderPanel();
    await screen.findByDisplayValue('currentBalance');

    fireEvent.click(screen.getByLabelText('Remove rule ACCTNO'));
    fireEvent.change(screen.getByLabelText('Support note'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply Patch & Re-run/ }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /Confirm & Apply/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Only failed jobs can be patched');
    expect(screen.queryByDisplayValue('accountNumber')).not.toBeInTheDocument();
  });

  it('is read-only without conversions.support_patch.apply', async () => {
    renderPanel(['conversions.troubleshoot.view']);

    expect(await screen.findByDisplayValue('currentBalance')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Apply Patch & Re-run/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Support note')).not.toBeInTheDocument();
  });

  it('blocks applying to a job that is not FAILED or DEAD', async () => {
    renderPanel(undefined, { ...job, status: 'QUEUED' });
    await screen.findByDisplayValue('currentBalance');

    fireEvent.click(screen.getByLabelText('Remove rule ACCTNO'));
    fireEvent.change(screen.getByLabelText('Support note'), { target: { value: 'x' } });
    expect(screen.getByRole('button', { name: /Apply Patch & Re-run/ })).toBeDisabled();
    expect(screen.getByText(/only while the job is FAILED or DEAD/)).toBeInTheDocument();
  });
});
