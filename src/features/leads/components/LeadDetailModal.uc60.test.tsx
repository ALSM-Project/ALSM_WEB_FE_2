import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeadDetailModal } from './LeadDetailModal';
import { leadsApi } from '../api/leads.api';
import type { Lead, LogPhoneCallResponse } from '../types/lead';

vi.mock('../api/leads.api', () => ({
  leadsApi: { getById: vi.fn(), notifyContact: vi.fn(), logPhoneCall: vi.fn() },
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const lead: Lead = {
  id: '6ad586fe9f2215c9ebcac858',
  companyName: 'FPT Software',
  contactName: 'Cuong Nguyen',
  contactEmail: 'cuong@example.test',
  status: 'NEW',
  source: 'WEBSITE',
  priority: 'MEDIUM',
  currency: 'VND',
  tags: [],
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
};

describe('LeadDetailModal phone call workflow (UC-60)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(leadsApi.getById).mockResolvedValue(lead);
  });

  it('opens the call form, saves, and refreshes the detail and call history', async () => {
    const updatedLead: Lead = {
      ...lead,
      status: 'CONTACTED',
      lastContactedAt: '2026-10-29T10:00:00.000Z',
      phoneCalls: [{
        id: 'call-1',
        outcome: 'CONNECTED',
        durationMinutes: 15,
        summary: 'Discussed next steps',
        performedByUserId: 'sales-1',
        performedByEmail: 'sales@alsm.dev',
        createdAt: '2026-10-29T10:00:00.000Z',
      }],
    };
    const response: LogPhoneCallResponse = {
      lead: updatedLead,
      call: updatedLead.phoneCalls![0],
      replayed: false,
      message: 'Phone call logged successfully.',
    };
    vi.mocked(leadsApi.logPhoneCall).mockResolvedValue(response);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <LeadDetailModal lead={lead} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    const openCallButton = await screen.findByRole('button', { name: 'Log Phone Call' });
    await waitFor(() => expect(openCallButton).toBeEnabled());
    fireEvent.click(openCallButton);
    fireEvent.change(screen.getByLabelText(/Call outcome/), { target: { value: 'CONNECTED' } });
    fireEvent.change(screen.getByLabelText(/Call summary/), { target: { value: 'Discussed next steps' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save call' }));

    await waitFor(() => expect(leadsApi.logPhoneCall).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Phone call logged successfully.')).toBeInTheDocument();
    expect(screen.getByText('Status: Contacted')).toBeInTheDocument();
    expect(screen.getByText('Discussed next steps')).toBeInTheDocument();
    expect(queryClient.getQueryData(['leads', 'detail', lead.id])).toMatchObject({ status: 'CONTACTED' });
  });
});
