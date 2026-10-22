import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PartnerListPage } from '../pages/staff/PartnerListPage';
import { apiClient } from '@/services/api/apiClient';

// Never hit a real backend from tests: every request fails like an offline server, so the
// pages render their deterministic local data.
vi.mock('@/services/api/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const createWrapper = (permissions: string[] = ['partner.view', 'partner.create', 'partner_project.create']) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClient.setQueryData(['currentUser'], {
    id: 'user-staff',
    email: 'staff@alsm.io',
    isPlatformAdmin: false,
    effectivePermissions: permissions,
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('PartnerListPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(apiClient.get).mockRejectedValue(new Error('offline'));
    vi.mocked(apiClient.post).mockRejectedValue(new Error('offline'));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders KPI metric cards and partner organization list', async () => {
    render(<PartnerListPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Fintech Nexus International')).toBeInTheDocument();
    expect(screen.getByText('Pacific Heritage Life & Annuity')).toBeInTheDocument();
    expect(screen.getByText('Total Partners')).toBeInTheDocument();
    expect(screen.getByText('Completed Exports')).toBeInTheDocument();
  });

  it('filters partner organizations by search term', async () => {
    render(<PartnerListPage />, { wrapper: createWrapper() });

    await screen.findByText('Fintech Nexus International');
    const searchInput = screen.getByPlaceholderText(/Search by name, domain, email.../i);
    fireEvent.change(searchInput, { target: { value: 'Pacific' } });

    expect(screen.getByText('Pacific Heritage Life & Annuity')).toBeInTheDocument();
    expect(screen.queryByText('Fintech Nexus International')).not.toBeInTheDocument();
  });

  it('respects action permissions by hiding Add Partner and New Project buttons when unpermitted', async () => {
    // Only has partner.view permission
    render(<PartnerListPage />, { wrapper: createWrapper(['partner.view']) });

    expect(await screen.findByText('Fintech Nexus International')).toBeInTheDocument();
    expect(screen.queryByText('Add Partner')).not.toBeInTheDocument();
    expect(screen.queryByText('New Project')).not.toBeInTheDocument();
  });

  it('displays Add Partner and New Project buttons when user has permissions', async () => {
    render(<PartnerListPage />, {
      wrapper: createWrapper(['partner.view', 'partner.create', 'partner_project.create']),
    });

    expect(await screen.findByText('Fintech Nexus International')).toBeInTheDocument();
    expect(screen.getByText('Add Partner')).toBeInTheDocument();
    expect(screen.getAllByText('New Project').length).toBeGreaterThan(0);
  });

  it('opens centered Register Partner modal when clicking Add Partner', async () => {
    render(<PartnerListPage />, {
      wrapper: createWrapper(['partner.view', 'partner.create', 'partner_project.create']),
    });

    expect(await screen.findByText('Fintech Nexus International')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /Add Partner/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Register Partner Organization')).toBeInTheDocument();
  });

  it('shows a success notice and the new partner after creating one through the modal', async () => {
    const created = {
      id: '6650aa00aa00aa00aa00aa09',
      name: 'Horizon Banking Cloud',
      contactEmail: 'alex@horizoncloud.io',
      contactName: 'Alex Morgan',
      primaryDomain: 'horizoncloud.io',
      status: 'ACTIVE',
      createdAt: '2026-10-22T03:00:00.000Z',
      updatedAt: '2026-10-22T03:00:00.000Z',
    };
    vi.mocked(apiClient.post).mockResolvedValue(created);
    render(<PartnerListPage />, { wrapper: createWrapper() });
    await screen.findByText('Fintech Nexus International');

    // The backend now returns the new partner on the refresh that follows a create.
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === '/partners') return [created];
      throw new Error('offline');
    });
    fireEvent.click(screen.getByRole('button', { name: /Add Partner/i }));
    fireEvent.change(screen.getByLabelText(/Organization \/ Company Name/i), {
      target: { value: 'Horizon Banking Cloud' },
    });
    fireEvent.change(screen.getByLabelText(/Primary Web Domain/i), {
      target: { value: 'horizoncloud.io' },
    });
    fireEvent.change(screen.getByLabelText(/Contact Representative Name/i), {
      target: { value: 'Alex Morgan' },
    });
    fireEvent.change(screen.getByLabelText(/Contact Email Address/i), {
      target: { value: 'alex@horizoncloud.io' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Register & Setup Partner/i }));

    expect(
      await screen.findByText('Partner "Horizon Banking Cloud" was created successfully.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Horizon Banking Cloud')).toBeInTheDocument();
  });
});
