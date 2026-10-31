import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateContractModal } from './CreateContractModal';
import { crmApi } from '../api/crm.api';
import type { LeadContract } from '../types/crm.types';

vi.mock('../api/crm.api', () => ({ crmApi: { createContract: vi.fn() } }));

const contract: LeadContract = {
  id: 'contract-id',
  contractNumber: 'CTR-2026-ZENI-0001',
  title: 'Enterprise Modernization Agreement - Zenith',
  plan: 'Enterprise Tier 1',
  annualValue: 85000,
  status: 'DRAFT',
  effectiveDate: '2026-11-01',
  createdAt: '2026-10-31T08:00:00.000Z',
};

describe('CreateContractModal (UC-63)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submits one idempotent request and returns the persisted contract', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    vi.mocked(crmApi.createContract).mockResolvedValue(contract);
    render(
      <CreateContractModal
        isOpen
        leadId="6ad586fe9f2215c9ebcac858"
        leadCompany="Zenith Holdings"
        canCreateContract
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Generate Contract Draft/ }));

    await waitFor(() => expect(crmApi.createContract).toHaveBeenCalledTimes(1));
    expect(crmApi.createContract).toHaveBeenCalledWith(
      '6ad586fe9f2215c9ebcac858',
      expect.stringMatching(/^[0-9a-f-]{36}$/i),
      expect.objectContaining({
        title: expect.stringContaining('Zenith Holdings'),
        plan: 'Enterprise Tier 1',
        annualValue: 85000,
      }),
    );
    expect(onSuccess).toHaveBeenCalledWith(contract);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('validates contract value in the browser before sending', async () => {
    render(
      <CreateContractModal
        isOpen
        leadId="6ad586fe9f2215c9ebcac858"
        leadCompany="Zenith Holdings"
        canCreateContract
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Total Contract Value/), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Contract Draft/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('positive whole VND amount');
    expect(crmApi.createContract).not.toHaveBeenCalled();
  });

  it('shows an authorization failure and leaves the modal open', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    vi.mocked(crmApi.createContract).mockRejectedValue({ response: { status: 403 } });
    render(
      <CreateContractModal
        isOpen
        leadId="6ad586fe9f2215c9ebcac858"
        leadCompany="Zenith Holdings"
        canCreateContract
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Generate Contract Draft/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('do not have permission');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reuses the same idempotency key when the user retries unchanged details', async () => {
    vi.mocked(crmApi.createContract)
      .mockRejectedValueOnce({
        response: {
          status: 503,
          data: {
            code: 'ATOMIC_MUTATION_ABORTED',
            details: [{ mutationCommitted: false, retrySafe: false }],
          },
        },
      })
      .mockResolvedValueOnce(contract);
    render(
      <CreateContractModal
        isOpen
        leadId="6ad586fe9f2215c9ebcac858"
        leadCompany="Zenith Holdings"
        canCreateContract
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    const submit = screen.getByRole('button', { name: /Generate Contract Draft/ });
    fireEvent.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent('contract was not saved');
    fireEvent.click(submit);

    await waitFor(() => expect(crmApi.createContract).toHaveBeenCalledTimes(2));
    expect(vi.mocked(crmApi.createContract).mock.calls[0][1]).toBe(vi.mocked(crmApi.createContract).mock.calls[1][1]);
  });

  it('disables contract submission when the user lacks permission', () => {
    render(
      <CreateContractModal
        isOpen
        leadId="6ad586fe9f2215c9ebcac858"
        leadCompany="Zenith Holdings"
        canCreateContract={false}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Generate Contract Draft/ })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('do not have permission');
    expect(crmApi.createContract).not.toHaveBeenCalled();
  });
});
