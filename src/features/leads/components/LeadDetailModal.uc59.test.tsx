import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeadDetailModal } from './LeadDetailModal';
import { leadsApi } from '../api/leads.api';
import type { CreateLeadResponse, Lead } from '../types/lead';

vi.mock('../api/leads.api', () => ({
  leadsApi: { getById: vi.fn(), notifyContact: vi.fn() },
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const lead: Lead = {
  id: '64b000000000000000000010',
  companyName: 'FPT Software',
  contactName: 'Cuong Nguyen',
  contactEmail: 'cuong@example.test',
  status: 'NEW',
  source: 'WEBSITE',
  priority: 'MEDIUM',
  currency: 'VND',
  tags: [],
  createdByUserId: '64b000000000000000000001',
  createdByEmail: 'sales@example.test',
  createdAt: '2026-10-29T00:00:00.000Z',
  updatedAt: '2026-10-29T00:00:00.000Z',
};

describe('LeadDetailModal contact notification (UC-59)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(leadsApi.getById).mockResolvedValue(lead);
  });

  it('sends one notification request and shows the server result', async () => {
    const response: CreateLeadResponse = {
      lead: { ...lead, emailNotificationStatus: 'SENT', emailNotifiedAt: '2026-10-29T00:00:00.000Z' },
      replayed: false,
      notificationSent: true,
      message: 'The contact notification email was sent.',
    };
    vi.mocked(leadsApi.notifyContact).mockResolvedValue(response);
    const onNotificationUpdate = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <LeadDetailModal lead={lead} onClose={vi.fn()} onNotificationUpdate={onNotificationUpdate} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(leadsApi.getById).toHaveBeenCalledWith(lead.id));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send contact email' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Send contact email' }));

    await waitFor(() => expect(leadsApi.notifyContact).toHaveBeenCalledTimes(1));
    expect(leadsApi.notifyContact).toHaveBeenCalledWith(lead.id, expect.stringMatching(/^[0-9a-f-]{36}$/i));
    expect(await screen.findByRole('status')).toHaveTextContent(response.message);
    expect(onNotificationUpdate).toHaveBeenCalledWith(response.lead);
    expect(screen.getByRole('button', { name: 'Email sent' })).toBeDisabled();
  });

  it('shows a permission state when the detail request is forbidden', async () => {
    vi.mocked(leadsApi.getById).mockRejectedValue({ response: { status: 403 } });

    render(
      <QueryClientProvider client={queryClient}>
        <LeadDetailModal lead={lead} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission to view this lead.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('closes the accessible detail dialog with Escape', async () => {
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <LeadDetailModal lead={lead} onClose={onClose} />
      </QueryClientProvider>,
    );

    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
