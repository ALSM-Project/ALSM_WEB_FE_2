import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { quoteApi } from '../api/quote.api';
import { AdminQuoteRequestsPage } from './AdminQuoteRequestsPage';

vi.mock('../api/quote.api', () => ({
  quoteApi: {
    listQuoteRequests: vi.fn(),
    updateQuoteStatus: vi.fn(),
    resolveAppeal: vi.fn(),
  },
}));

const pendingQuote = {
  id: 'quote-32-1',
  userId: 'customer-1',
  organizationId: 'org-1',
  fullName: 'Alice Nguyen',
  companyName: 'ACME Bank',
  email: 'alice@acme.example',
  phone: '+84901234567',
  message: 'Migrate all legacy screens',
  currentPlanTier: 'PROFESSIONAL' as const,
  status: 'PENDING' as const,
  createdAt: '2026-10-20T10:00:00.000Z',
};

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminQuoteRequestsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('AdminQuoteRequestsPage (UC-32 Enterprise Admin portal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    vi.stubGlobal('alert', vi.fn());
    vi.mocked(quoteApi.listQuoteRequests).mockResolvedValue({ items: [pendingQuote], total: 1 });
    vi.mocked(quoteApi.updateQuoteStatus).mockResolvedValue({ ...pendingQuote, status: 'APPROVED' });
  });

  it('lists pending customer requests and exposes the expected admin actions', async () => {
    renderPage();

    expect(await screen.findByText('ACME Bank')).toBeInTheDocument();
    expect(screen.getByText('Alice Nguyen')).toBeInTheDocument();
    expect(screen.getByText('Migrate all legacy screens')).toBeInTheDocument();
    expect(screen.getByText('PENDING REVIEW')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark as Contacted' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve & Activate Enterprise' })).toBeInTheDocument();
    expect(quoteApi.listQuoteRequests).toHaveBeenCalledWith({ status: '', page: 1, limit: 10 });
  });

  it('approves only after confirmation, calls the admin API, and shows a success message', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Approve & Activate Enterprise' }));

    await waitFor(() => {
      expect(quoteApi.updateQuoteStatus).toHaveBeenCalledWith('quote-32-1', 'APPROVED', undefined);
    });
    expect(window.confirm).toHaveBeenCalledWith('Approve the Enterprise upgrade for ACME Bank?');
    expect(await screen.findByText('Successfully updated request quote-32-1 to Approved and Enterprise activated!')).toBeInTheDocument();
  });

  it('does not submit an approval when the admin cancels confirmation', async () => {
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Approve & Activate Enterprise' }));

    expect(quoteApi.updateQuoteStatus).not.toHaveBeenCalled();
  });

  it('shows the dependency error and does not show a success result when approval fails', async () => {
    vi.mocked(quoteApi.updateQuoteStatus).mockRejectedValueOnce(new Error('Billing service unavailable'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Approve & Activate Enterprise' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error: Billing service unavailable');
    });
    expect(screen.queryByText(/Successfully updated request/)).not.toBeInTheDocument();
  });

  it('filters the list to pending requests and renders an empty state when none match', async () => {
    vi.mocked(quoteApi.listQuoteRequests)
      .mockResolvedValueOnce({ items: [pendingQuote], total: 1 })
      .mockResolvedValueOnce({ items: [], total: 0 });
    renderPage();
    await screen.findByText('ACME Bank');
    fireEvent.click(screen.getByRole('button', { name: 'Pending Review' }));

    await waitFor(() => {
      expect(quoteApi.listQuoteRequests).toHaveBeenLastCalledWith({ status: 'PENDING', page: 1, limit: 10 });
    });
    expect(await screen.findByText('No quote requests found')).toBeInTheDocument();
  });
});
