import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrganizationsPage } from '../pages/OrganizationsPage';
import { adminApi, OrganizationDto } from '../api/admin.api';
import { SupportViewProvider, useSupportView } from '../context/SupportViewContext';
import { OrganizationDetailPage } from '../pages/OrganizationDetailPage';
import { ImpersonationBanner } from '../components/ImpersonationBanner';
import { apiClient } from '@/services/api/apiClient';
import { useAuth } from '@/features/auth/hooks/useAuth';

const createWrapper = (permissions: string[] = ['organizations.impersonate'], path = '/', authenticated = true) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: Infinity } },
  });
  queryClient.setQueryData(['currentUser'], authenticated ? {
    id: 'user-support',
    email: 'support@alsm.io',
    isPlatformAdmin: false,
    effectivePermissions: permissions,
  } : null);

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
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
    getOrganizationById: vi.fn(),
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
    vi.mocked(adminApi.getOrganizationById).mockResolvedValue(mockOrgs[0]);
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Unexpected support admission'));
  });
  afterEach(() => vi.restoreAllMocks());

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

  it('disables support entry and cannot confirm, navigate or submit duplicate admissions', async () => {
    const Location = () => <span data-testid="location">{useLocation().pathname}</span>;
    render(<><OrganizationsPage /><ImpersonationBanner /><Location /></>, { wrapper: createWrapper() });

    const buttons = await screen.findAllByRole('button', { name: /Support View/i });
    for (const button of buttons) {
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription('Support View is currently unavailable.');
      fireEvent.click(button);
      fireEvent.click(button);
    }
    expect(screen.getByRole('status')).toHaveTextContent('Support View is currently unavailable.');
    expect(screen.queryByText('Enter Customer Support View')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirm & Enter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(localStorage.getItem('alsm_support_view')).toBeNull();
    expect(localStorage.getItem('alsm_impersonation')).toBeNull();
  });

  it.each([false, true])('hides entry without a permission (authenticated=%s)', async (authenticated) => {
    render(<OrganizationsPage />, { wrapper: createWrapper([], '/', authenticated) });
    await screen.findByText('Acme Corporation');
    expect(screen.queryByRole('button', { name: /Support View/i })).not.toBeInTheDocument();
  });

  it('shows an empty directory without fabricated organisations', async () => {
    vi.mocked(adminApi.getOrganizations).mockResolvedValue([]);
    render(<OrganizationsPage />, { wrapper: createWrapper() });
    await screen.findByText('No organisations match your search criteria.');
    expect(screen.queryByText('Acme Corporation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Support View/i })).not.toBeInTheDocument();
  });

  it('shows a recoverable directory failure without fabricated organisations or internal details', async () => {
    vi.mocked(adminApi.getOrganizations).mockRejectedValueOnce(new Error('private dependency detail'));
    render(<OrganizationsPage />, { wrapper: createWrapper() });
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load organisations. Please try again.');
    expect(screen.queryByText(/private dependency detail/)).not.toBeInTheDocument();
    expect(screen.queryByText('Acme Corporation')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await screen.findByText('Acme Corporation');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('disables the detail-page entry without changing customer context', async () => {
    render(<Routes><Route path="/admin/organizations/:orgId" element={<OrganizationDetailPage />} /></Routes>,
      { wrapper: createWrapper(undefined, '/admin/organizations/org-acme-corp') });
    const button = await screen.findByRole('button', { name: /Support View/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription('Support View is currently unavailable.');
    fireEvent.click(button);
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(localStorage.getItem('alsm_support_view')).toBeNull();
  });

  it('hides detail-page entry without a permission', async () => {
    render(<Routes><Route path="/admin/organizations/:orgId" element={<OrganizationDetailPage />} /></Routes>,
      { wrapper: createWrapper([], '/admin/organizations/org-acme-corp') });
    await screen.findByText('Acme Corporation');
    expect(screen.queryByRole('button', { name: /Support View/i })).not.toBeInTheDocument();
  });

  it('does not fabricate detail data when the API denies access', async () => {
    vi.mocked(adminApi.getOrganizationById).mockRejectedValue(new Error('private permission detail'));
    render(<Routes><Route path="/admin/organizations/:orgId" element={<OrganizationDetailPage />} /></Routes>,
      { wrapper: createWrapper(undefined, '/admin/organizations/org-acme-corp') });
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load organisation details. Please try again.');
    expect(screen.queryByText('Acme Corporation')).not.toBeInTheDocument();
    expect(screen.queryByText(/private permission detail/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Support View/i })).not.toBeInTheDocument();
  });
});

const StateProbe = () => {
  const { supportOrg, isSupportReadOnly, exitSupportView } = useSupportView();
  const { user } = useAuth();
  return <>
    <span data-testid="support-state">{JSON.stringify({ supportOrg, isSupportReadOnly })}</span>
    <span data-testid="actor">{user?.email}</span>
    <button onClick={exitSupportView}>Clear legacy view</button>
    <ImpersonationBanner />
  </>;
};

describe('Support View cannot be activated by client storage', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => vi.restoreAllMocks());

  it.each([
    '{"orgId":"other-tenant","orgName":"Forged","readOnly":true}',
    '{"orgId":"other-tenant","expiresAt":"2099-01-01","revokedAt":null}',
    '{invalid json',
  ])('ignores and cleans legacy payload %s on restoration', (payload) => {
    localStorage.setItem('alsm_support_view', payload);
    localStorage.setItem('alsm_impersonation', payload);
    localStorage.setItem('unrelated-key', 'preserve');
    render(<StateProbe />, { wrapper: createWrapper() });
    expect(screen.getByTestId('support-state')).toHaveTextContent('{"supportOrg":null,"isSupportReadOnly":false}');
    expect(screen.getByTestId('actor')).toHaveTextContent('support@alsm.io');
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(localStorage.getItem('alsm_support_view')).toBeNull();
    expect(localStorage.getItem('alsm_impersonation')).toBeNull();
    expect(localStorage.getItem('unrelated-key')).toBe('preserve');
  });

  it('ignores forged same-tab and cross-tab events and keeps exit cleanup safe', () => {
    render(<StateProbe />, { wrapper: createWrapper() });
    const payload = '{"orgId":"other-tenant","orgName":"Forged","readOnly":true}';
    act(() => {
      localStorage.setItem('alsm_support_view', payload);
      localStorage.setItem('alsm_impersonation', payload);
      window.dispatchEvent(new Event('alsm-support-view-changed'));
      window.dispatchEvent(new StorageEvent('storage', { key: 'alsm_support_view', newValue: payload }));
    });
    expect(screen.getByTestId('support-state')).toHaveTextContent('{"supportOrg":null,"isSupportReadOnly":false}');
    expect(screen.getByTestId('actor')).toHaveTextContent('support@alsm.io');
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear legacy view' }));
    expect(localStorage.getItem('alsm_support_view')).toBeNull();
    expect(localStorage.getItem('alsm_impersonation')).toBeNull();
  });

  it('remains inactive when storage cleanup is denied', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('storage denied'); });
    render(<StateProbe />, { wrapper: createWrapper() });
    expect(screen.getByTestId('support-state')).toHaveTextContent('{"supportOrg":null,"isSupportReadOnly":false}');
    fireEvent.click(screen.getByRole('button', { name: 'Clear legacy view' }));
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });
});
