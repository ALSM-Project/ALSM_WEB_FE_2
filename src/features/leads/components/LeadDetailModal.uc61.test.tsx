import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeadDetailModal } from './LeadDetailModal';
import { leadsApi } from '../api/leads.api';
import type { Lead, ScheduleDemoResponse } from '../types/lead';

vi.mock('../api/leads.api', () => ({
  leadsApi: { getById: vi.fn(), notifyContact: vi.fn(), logPhoneCall: vi.fn(), scheduleDemo: vi.fn() },
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
  currency: 'USD',
  tags: [],
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
};

describe('LeadDetailModal schedule demo workflow (UC-61)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(leadsApi.getById).mockResolvedValue(lead);
  });

  it('schedules a demo and refreshes the lead status and demo history', async () => {
    const demo = {
      id: 'demo-1',
      title: 'Modernization Demo: FPT Software',
      scheduledAt: '2026-11-03T07:00:00.000Z',
      durationMinutes: 45,
      attendeeEmails: ['cuong@example.test'],
      status: 'SCHEDULED' as const,
      scheduledByUserId: 'sales-1',
      scheduledByEmail: 'sales@alsm.dev',
      createdAt: '2026-10-29T10:00:00.000Z',
    };
    const updatedLead: Lead = { ...lead, status: 'QUALIFIED', demos: [demo] };
    const response: ScheduleDemoResponse = {
      demo,
      lead: updatedLead,
      replayed: false,
      message: 'Demo scheduled successfully.',
    };
    vi.mocked(leadsApi.scheduleDemo).mockResolvedValue(response);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <LeadDetailModal lead={lead} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    const openButton = await screen.findByRole('button', { name: 'Schedule Demo' });
    await waitFor(() => expect(openButton).toBeEnabled());
    fireEvent.click(openButton);
    const scheduleButtons = screen.getAllByRole('button', { name: 'Schedule Demo' });
    fireEvent.click(scheduleButtons[scheduleButtons.length - 1]);

    await waitFor(() => expect(leadsApi.scheduleDemo).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Demo scheduled successfully.')).toBeInTheDocument();
    expect(screen.getByText('Status: Qualified')).toBeInTheDocument();
    expect(screen.getByText('Scheduled demos (1)')).toBeInTheDocument();
    expect(screen.getByText('Modernization Demo: FPT Software')).toBeInTheDocument();
    expect(queryClient.getQueryData(['leads', 'detail', lead.id])).toMatchObject({ status: 'QUALIFIED', demos: [{ id: 'demo-1' }] });
  });
});
