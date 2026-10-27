import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrganizationsPage } from '../pages/OrganizationsPage';
import { adminApi, OrganizationDto } from '../api/admin.api';
import { SupportViewProvider } from '../context/SupportViewContext';

const createWrapper = (permissions: string[] = ['organizations.impersonate']) => {
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
      <MemoryRouter>
        <SupportViewProvider>{children}</SupportViewProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const mockOrgs: OrganizationDto[] = [
  {
    id: 'org-acme-corp',
    name: 'Acme Corporation',
    domain: 'acme.corp',
    contactEmail: 'contact@acme.corp',
    type: 'ENTERPRISE',
    status: 'ACTIVE',
    engagementType: 'ENTERPRISE_T1',
    createdAt: '2026-06-12T10:00:00Z',
    updatedAt: '2026-10-18T14:00:00Z',
  },
  {
    id: 'org-fnx-prod',
    name: 'Fintech Nexus International',
    domain: 'fintechnexus.io',
    contactEmail: 'support@fintechnexus.io',
    type: 'ENTERPRISE',
    status: 'ACTIVE',
    engagementType: 'ENTERPRISE_T2',
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-10-19T11:30:00Z',
  },
];

vi.mock('../api/admin.api', () => ({
  adminApi: {
    getOrganizations: vi.fn(),
    getEngagementTypes: vi.fn(),
    createEnterpriseOrganization: vi.fn(),
  },
}));

describe('OrganizationsPage - Customer Support & Read-Only Access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(adminApi.getOrganizations).mockResolvedValue(mockOrgs);
    vi.mocked(adminApi.getEngagementTypes).mockResolvedValue([]);
  });

  it('renders organisation directory with search input and support view actions', async () => {
    render(<OrganizationsPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Customer Support & Organisation Access')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
      expect(screen.getByText('Fintech Nexus International')).toBeInTheDocument();
    });

    // Check columns and buttons
    expect(screen.getByText('org-acme-corp')).toBeInTheDocument();
    expect(screen.getByText('contact@acme.corp')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Support View/i }).length).toBe(2);
  });

  it('filters organisations by contact email search', async () => {
    render(<OrganizationsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText('Search organisations');
    fireEvent.change(searchInput, { target: { value: 'fintechnexus' } });

    expect(screen.getByText('Fintech Nexus International')).toBeInTheDocument();
    expect(screen.queryByText('Acme Corporation')).not.toBeInTheDocument();
  });

  it('opens confirmation modal and enters read-only support view', async () => {
    render(<OrganizationsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    });

    const acmeRow = screen.getByText('Acme Corporation').closest('tr')!;
    const supportViewButton = within(acmeRow).getByRole('button', { name: /Support View/i });
    fireEvent.click(supportViewButton);

    // Verify confirmation modal content
    expect(screen.getByText('Enter Customer Support View')).toBeInTheDocument();
    expect(screen.getByText(/Read-Only Support Session/i)).toBeInTheDocument();
    expect(screen.getByText(/You are about to simulate entering customer organization/i)).toBeInTheDocument();
    expect(screen.getByText(/Guardrails enforced in Support View:/i)).toBeInTheDocument();

    // Confirm entry
    const confirmButton = screen.getByRole('button', { name: /Confirm & Enter Support View/i });
    fireEvent.click(confirmButton);

    // Verify localStorage has support view credentials
    const stored = localStorage.getItem('alsm_support_view');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.orgId).toBe('org-acme-corp');
    expect(parsed.readOnly).toBe(true);
  });
});
