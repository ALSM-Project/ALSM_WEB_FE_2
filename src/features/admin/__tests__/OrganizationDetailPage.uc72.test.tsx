import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrganizationDetailPage } from '../pages/OrganizationDetailPage';
import { adminApi, OrganizationDto } from '../api/admin.api';
import { SupportViewProvider } from '../context/SupportViewContext';

// Mock Auth hook
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-1',
      fullName: 'System Administrator',
      email: 'admin@alsm.io',
      isPlatformAdmin: true,
      roles: ['ADMIN'],
    },
    hasPermission: () => true,
    isLoading: false,
  }),
}));

// Mock Admin API
vi.mock('../api/admin.api', () => ({
  adminApi: {
    getOrganizationById: vi.fn(),
    updateEngagement: vi.fn(),
    createDemoProject: vi.fn(),
  },
}));

const mockOrg: OrganizationDto = {
  id: '6a8d90b0569ea93e27ad862e',
  name: 'Acme Modernization Global',
  domain: 'acme.global',
  contactEmail: 'admin@acme.global',
  type: 'ENTERPRISE',
  status: 'ACTIVE',
  engagementType: 'ENTERPRISE_T2',
  trialExpiresAt: '2026-12-31T23:59:59.000Z',
  memberCount: 3,
  projectCount: 2,
  conversionJobCount: 15,
  limits: {
    maxProjects: 10,
    maxConversionsPerMonth: 100,
    maxStorageGb: 50,
    aiValidationEnabled: true,
    trialScreens: 15,
    trialPrograms: 8,
    trialStorageGb: 5,
  },
  usageStats: {
    totalScreensConverted: 120,
    activeProjects: 2,
    storageUsedGb: 12.5,
    conversionsThisMonth: 15,
  },
  members: [
    {
      userId: 'usr-1',
      fullName: 'Alice Walker',
      email: 'a.walker@acme.global',
      role: 'OWNER',
      status: 'ACTIVE',
      joinedDate: '2026-08-01',
    },
    {
      userId: 'usr-2',
      fullName: 'Bob Smith',
      email: 'b.smith@acme.global',
      role: 'ADMIN',
      status: 'ACTIVE',
      joinedDate: '2026-08-15',
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'AS400 Core Banking Modernization',
      conversionType: 'COBOL_TO_JAVA',
      status: 'IN_PROGRESS',
      isDemo: false,
      createdAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'proj-2',
      name: 'BMS Screen Demo',
      conversionType: 'BMS_TO_REACT',
      status: 'DRAFT',
      isDemo: true,
      createdAt: '2026-09-10T10:00:00.000Z',
    },
  ],
  billingHistory: [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-2026-001',
      date: '2026-10-01',
      plan: 'Enterprise Tier 2',
      amount: 15000,
      paymentMethod: 'Bank Wire',
      status: 'PAID',
    },
  ],
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-10-20T12:00:00.000Z',
};

const renderComponent = (orgId = '6a8d90b0569ea93e27ad862e') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/admin/organizations/${orgId}`]}>
        <SupportViewProvider>
          <Routes>
            <Route
              path="/admin/organizations/:orgId"
              element={<OrganizationDetailPage />}
            />
            <Route
              path="/admin/organizations"
              element={<div>Organizations Directory Page</div>}
            />
          </Routes>
        </SupportViewProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('[UC-72] View Organisation Details (Web 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Displays loading spinner and message while fetching organisation details', () => {
    vi.mocked(adminApi.getOrganizationById).mockReturnValue(new Promise(() => {}));

    renderComponent();

    expect(screen.getByText(/Loading organisation details.../i)).toBeInTheDocument();
  });

  it('2. Renders organisation identity, status, domain, and contact email successfully', async () => {
    vi.mocked(adminApi.getOrganizationById).mockResolvedValueOnce(mockOrg);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Acme Modernization Global')).toBeInTheDocument();
    });

    // Check status and type badges
    expect(screen.getAllByText('ACTIVE').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('ENTERPRISE').length).toBeGreaterThanOrEqual(1);

    // Check tenant ID
    expect(
      screen.getByText(/Tenant ID: 6a8d90b0569ea93e27ad862e/)
    ).toBeInTheDocument();

    // Check domain and email
    expect(screen.getByText('acme.global')).toBeInTheDocument();
    expect(screen.getByText('admin@acme.global')).toBeInTheDocument();
  });

  it('3. Renders engagement plan, limits, and resource usage statistics', async () => {
    vi.mocked(adminApi.getOrganizationById).mockResolvedValueOnce(mockOrg);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ENTERPRISE_T2')).toBeInTheDocument();
    });

    // Check usage stats
    expect(screen.getByText('Resource & Platform Usage Statistics')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument(); // screens converted
    expect(screen.getByText('12.5 GB')).toBeInTheDocument(); // storage consumed
    expect(screen.getByText(/Active \(Cobol & Forms\)/i)).toBeInTheDocument();
  });

  it('4. Renders members list with names, roles, and status', async () => {
    vi.mocked(adminApi.getOrganizationById).mockResolvedValueOnce(mockOrg);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Alice Walker')).toBeInTheDocument();
      expect(screen.getByText('a.walker@acme.global')).toBeInTheDocument();
      expect(screen.getByText('OWNER')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('b.smith@acme.global')).toBeInTheDocument();
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });
  });

  it('5. Renders modernization projects associated with the organisation', async () => {
    vi.mocked(adminApi.getOrganizationById).mockResolvedValueOnce(mockOrg);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Modernization Projects')).toBeInTheDocument();
    });

    expect(screen.getByText('AS400 Core Banking Modernization')).toBeInTheDocument();
    expect(screen.getByText('COBOL_TO_JAVA')).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();

    expect(screen.getByText('BMS Screen Demo')).toBeInTheDocument();
    expect(screen.getByText('BMS_TO_REACT')).toBeInTheDocument();
    expect(screen.getByText('Demo')).toBeInTheDocument();
  });

  it('6. Renders commercial billing invoices', async () => {
    vi.mocked(adminApi.getOrganizationById).mockResolvedValueOnce(mockOrg);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Commercial Billing & Invoices')).toBeInTheDocument();
    });

    expect(screen.getByText('INV-2026-001')).toBeInTheDocument();
    expect(screen.getByText('15.000 VND')).toBeInTheDocument();
    expect(screen.getByText('Bank Wire')).toBeInTheDocument();
    expect(screen.getByText('PAID')).toBeInTheDocument();
  });

  it('7. Displays error state with Try Again button when API call fails', async () => {
    vi.mocked(adminApi.getOrganizationById).mockRejectedValueOnce(
      new Error('Network error')
    );

    renderComponent('unknown-id');

    await waitFor(() => {
      expect(screen.getByText('Organisation Unavailable')).toBeInTheDocument();
      expect(
        screen.getByText(/Unable to load organisation details/i)
      ).toBeInTheDocument();
    });

    // Verify Try Again button is present
    const retryBtn = screen.getByRole('button', { name: /Try Again/i });
    expect(retryBtn).toBeInTheDocument();

    // Now mock success for retry
    vi.mocked(adminApi.getOrganizationById).mockResolvedValueOnce(mockOrg);
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Acme Modernization Global')).toBeInTheDocument();
    });
  });

  it('8. Back button navigates back to /admin/organizations', async () => {
    vi.mocked(adminApi.getOrganizationById).mockResolvedValueOnce(mockOrg);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Acme Modernization Global')).toBeInTheDocument();
    });

    const backBtn = screen.getByTitle('Back to Directory');
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText('Organizations Directory Page')).toBeInTheDocument();
    });
  });
});
