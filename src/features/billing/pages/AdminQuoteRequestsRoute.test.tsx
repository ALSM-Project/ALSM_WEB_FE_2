import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { quoteApi } from '../api/quote.api';
import { AdminQuoteRequestsRoute } from './AdminQuoteRequestsRoute';

const auth = vi.hoisted(() => ({
  hasPermission: vi.fn<(permission: string) => boolean>(),
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ hasPermission: auth.hasPermission }),
}));

vi.mock('../api/quote.api', () => ({
  quoteApi: {
    listQuoteRequests: vi.fn(),
    updateQuoteStatus: vi.fn(),
    resolveAppeal: vi.fn(),
  },
}));

const renderRoute = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminQuoteRequestsRoute />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('AdminQuoteRequestsRoute (UC-32 permissions)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(quoteApi.listQuoteRequests).mockResolvedValue({ items: [], total: 0 });
  });

  it('denies users without billing.quotes.manage and does not call the quote API', () => {
    auth.hasPermission.mockReturnValue(false);
    renderRoute();

    expect(screen.getByRole('heading', { name: 'Access Denied' })).toBeInTheDocument();
    expect(auth.hasPermission).toHaveBeenCalledWith('billing.quotes.manage');
    expect(quoteApi.listQuoteRequests).not.toHaveBeenCalled();
  });

  it('loads the Enterprise Admin quote page for users with billing.quotes.manage', async () => {
    auth.hasPermission.mockReturnValue(true);
    renderRoute();

    expect(await screen.findByText('No quote requests found')).toBeInTheDocument();
    expect(quoteApi.listQuoteRequests).toHaveBeenCalledWith({ status: '', page: 1, limit: 10 });
  });
});
