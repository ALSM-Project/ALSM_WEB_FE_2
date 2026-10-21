import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PartnerListPage } from '../pages/staff/PartnerListPage';

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
});
