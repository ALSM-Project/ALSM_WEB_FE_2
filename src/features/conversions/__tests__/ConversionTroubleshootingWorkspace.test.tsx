import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConversionTroubleshootingWorkspace } from '../components/ConversionTroubleshootingWorkspace';
import { INITIAL_MOCK_JOBS } from '../services/mock-queue-data';

const createWrapper = (permissions: string[] = [
  'conversions.troubleshoot.view',
  'conversions.mapping.validate',
  'conversions.support_patch.apply',
  'conversions.retry'
]) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClient.setQueryData(['currentUser'], {
    id: 'user-support',
    email: 'support@alsm.io',
    isPlatformAdmin: false,
    effectivePermissions: permissions,
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('ConversionTroubleshootingWorkspace - Error Investigation & Support Patch', () => {
  const sampleJob = INITIAL_MOCK_JOBS[0]; // job-bms-custinq (DEAD)

  it('renders workspace overview with target context and failure reason', () => {
    render(
      <ConversionTroubleshootingWorkspace
        job={sampleJob}
        onBack={vi.fn()}
        onJobUpdated={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/Troubleshooting Workspace: CUSTINQ.bms/i)).toBeInTheDocument();
    expect(screen.getByText('DEAD-LETTER LIMIT REACHED (3/3)')).toBeInTheDocument();
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.getAllByText(/SCHEMA_MAPPING_MISMATCH/i).length).toBeGreaterThan(0);
  });

  it('navigates to mapping tab, edits target property, and marks as PATCHED', () => {
    render(
      <ConversionTroubleshootingWorkspace
        job={sampleJob}
        onBack={vi.fn()}
        onJobUpdated={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    // Switch to Mapping tab
    const mappingTab = screen.getByRole('button', { name: /Field & Method Mapping/i });
    fireEvent.click(mappingTab);

    expect(screen.getByText(/Rule Engine & Field Mapping Overrides/i)).toBeInTheDocument();

    // Find CUST_BAL_AMT input and change value
    const targetInputs = screen.getAllByRole('textbox');
    // First input is sourceField 'ACCTNO', second is targetProperty 'accountNumber'
    fireEvent.change(targetInputs[1], { target: { value: 'accountNumberOverride' } });

    expect(screen.getByText('PATCHED')).toBeInTheDocument();
  });

  it('navigates to validation tab and runs simulated AST validation', async () => {
    render(
      <ConversionTroubleshootingWorkspace
        job={sampleJob}
        onBack={vi.fn()}
        onJobUpdated={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    // Switch to Validation tab
    const validationTab = screen.getByRole('button', { name: /Validation Simulation/i });
    fireEvent.click(validationTab);

    expect(screen.getByText('Simulated Mapping Validator')).toBeInTheDocument();

    const validateBtn = screen.getByRole('button', { name: /Validate Mapping/i });
    fireEvent.click(validateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Simulated Validation Passed/i)).toBeInTheDocument();
    });
  });

  it('opens confirmation modal and applies support patch', async () => {
    const handleJobUpdated = vi.fn();
    render(
      <ConversionTroubleshootingWorkspace
        job={sampleJob}
        onBack={vi.fn()}
        onJobUpdated={handleJobUpdated}
      />,
      { wrapper: createWrapper() }
    );

    const applyPatchBtn = screen.getByRole('button', { name: /Apply Support Patch/i });
    fireEvent.click(applyPatchBtn);

    // Verify modal appears
    expect(screen.getByText('Apply Support Patch & Re-Queue')).toBeInTheDocument();
    expect(screen.getByText(/Confirm Support Patch Operation/i)).toBeInTheDocument();

    // Confirm patch
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Apply Patch/i });
    fireEvent.click(confirmBtn);

    expect(handleJobUpdated).toHaveBeenCalled();
    const updatedJob = handleJobUpdated.mock.calls[0][0];
    expect(updatedJob.status).toBe('QUEUED');
    expect(updatedJob.attemptCount).toBe(0);
    expect(screen.getByText(/Support patch applied successfully!/i)).toBeInTheDocument();
  });
});
