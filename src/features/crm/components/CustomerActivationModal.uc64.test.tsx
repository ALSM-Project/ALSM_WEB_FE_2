import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerActivationModal } from './CustomerActivationModal';
import { crmApi } from '../api/crm.api';
import { LeadDto } from '../types/crm.types';

vi.mock('../api/crm.api', () => ({ crmApi: { activateCustomer: vi.fn() } }));

const makeLead = (overrides: Partial<LeadDto> = {}): LeadDto => ({
  id: '6ad586fe9f2215c9ebcac858',
  company: 'Zenith Holdings',
  contactName: 'Clara Oswald',
  email: 'clara@zenith.co',
  source: 'Website',
  stage: 'PROPOSAL',
  score: 70,
  interactions: [],
  demos: [],
  quotes: [],
  contracts: [{
    id: 'contract-1',
    contractNumber: 'CTR-2026-ZEN-0001',
    title: 'Enterprise Modernization Agreement',
    plan: 'Enterprise Tier 1',
    annualValue: 125000,
    effectiveDate: '2026-11-01',
    status: 'SIGNED',
    signedAt: '2026-10-31T09:00:00.000Z',
    createdAt: '2026-10-30T09:00:00.000Z',
  }],
  createdAt: '2026-10-30T09:00:00.000Z',
  updatedAt: '2026-10-31T09:00:00.000Z',
  ...overrides,
});

describe('CustomerActivationModal (UC-64)', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the lead, customer, contract, and current state before conversion', () => {
    render(<CustomerActivationModal isOpen lead={makeLead()} canActivate onClose={onClose} onSuccess={onSuccess} />);

    expect(screen.getByText('Zenith Holdings')).toBeInTheDocument();
    expect(screen.getByText('Clara Oswald')).toBeInTheDocument();
    expect(screen.getByText('clara@zenith.co')).toBeInTheDocument();
    expect(screen.getByText(/CTR-2026-ZEN-0001/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Convert Lead to Customer (Won)' })).toBeEnabled();
  });

  it('disables conversion without permission or a signed contract', () => {
    const { rerender } = render(
      <CustomerActivationModal isOpen lead={makeLead()} canActivate={false} onClose={onClose} onSuccess={onSuccess} />,
    );
    expect(screen.getByRole('button', { name: 'Convert Lead to Customer (Won)' })).toBeDisabled();
    expect(screen.getByText(/does not have permission/i)).toBeInTheDocument();

    rerender(
      <CustomerActivationModal
        isOpen
        lead={makeLead({ contracts: [] })}
        canActivate
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    expect(screen.getByRole('button', { name: 'Convert Lead to Customer (Won)' })).toBeDisabled();
    expect(screen.getByText(/sign the contract/i)).toBeInTheDocument();
  });

  it('submits once, prevents duplicate clicks, and returns the persisted Won lead', async () => {
    let resolveRequest!: (value: any) => void;
    vi.mocked(crmApi.activateCustomer).mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve; }));
    const convertedLead = makeLead({ stage: 'WON', convertedOrganizationId: '6a9cdbda5e82fb42d449ac03' });
    render(<CustomerActivationModal isOpen lead={makeLead()} canActivate onClose={onClose} onSuccess={onSuccess} />);

    const button = screen.getByRole('button', { name: 'Convert Lead to Customer (Won)' });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(crmApi.activateCustomer).toHaveBeenCalledTimes(1);
    expect(crmApi.activateCustomer).toHaveBeenCalledWith('6ad586fe9f2215c9ebcac858');

    resolveRequest({ lead: convertedLead, organizationId: convertedLead.convertedOrganizationId, adminLinked: false, replayed: false });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(convertedLead));
  });

  it('shows a permission error returned by the API without mutating the lead', async () => {
    vi.mocked(crmApi.activateCustomer).mockRejectedValueOnce({ response: { status: 403 } });
    render(<CustomerActivationModal isOpen lead={makeLead()} canActivate onClose={onClose} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: 'Convert Lead to Customer (Won)' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission to convert this lead.');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows the persisted organization and avoids a second conversion action after success', () => {
    const lead = makeLead({
      stage: 'WON',
      convertedAt: '2026-10-31T09:30:00.000Z',
      convertedOrganizationId: '6a9cdbda5e82fb42d449ac03',
      provisioning: {
        status: 'COMPLETED',
        organizationId: '6a9cdbda5e82fb42d449ac03',
        organizationName: 'Zenith Holdings',
        adminEmail: 'clara@zenith.co',
        adminLinked: false,
        completedAt: '2026-10-31T09:30:00.000Z',
      },
    });
    render(<CustomerActivationModal isOpen lead={lead} canActivate onClose={onClose} onSuccess={onSuccess} />);

    expect(screen.getByRole('status')).toHaveTextContent('Lead converted and marked Won');
    expect(screen.getByText('6a9cdbda5e82fb42d449ac03')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Convert Lead to Customer (Won)' })).not.toBeInTheDocument();
  });
});
