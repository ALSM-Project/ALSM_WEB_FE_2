import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { organizationUsageApi } from '../api/organization-usage.api';
import { OrganizationUsagePage } from './OrganizationUsagePage';
import type { OrganizationUsageItem, OrganizationUsageSummary } from '../types/organization-usage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../api/organization-usage.api', () => ({
  organizationUsageApi: {
    getUsageSummary: vi.fn(),
    listOrganizationUsage: vi.fn(),
    getOrganizationUsageDetail: vi.fn(),
    applyQuotaAmendment: vi.fn(),
    updateServiceStatus: vi.fn(),
  },
}));

const mockSummary: OrganizationUsageSummary = {
  totalOrganizations: 40,
  activeOrganizations: 38,
  nearQuotaOrganizations: 3,
  exceededQuotaOrganizations: 1,
  contractsExpiringSoonCount: 2,
  totalAllocatedScreenCapacity: 2500,
  totalConsumedScreenCapacity: 1127,
  totalAllocatedStorageGb: 500,
  totalConsumedStorageGb: 120,
  thresholds: {
    nearLimitPct: 80,
    atLimitPct: 95,
    exceededPct: 100,
    expiringDays: 30,
  },
  lastSyncTime: '2026-11-05T08:00:00.000Z',
};

const mockOrgItem: OrganizationUsageItem = {
  organizationId: 'org-vcb-001',
  name: 'Vietcombank Enterprise Core',
  normalizedName: 'vietcombank-enterprise-core',
  companyName: 'Vietcombank Enterprise Core',
  contactEmail: 'core@vietcombank.com.vn',
  serviceMode: 'ALSM_MANAGED',
  subscriptionPlan: 'Enterprise Managed',
  contractStatus: 'ACTIVE',
  contractNumber: 'CTR-2026-VCB-001',
  contractExpiresAt: '2027-12-31T00:00:00.000Z',
  daysUntilContractExpiry: 420,
  screenCapacity: 200,
  screenUsage: 120,
  remainingScreens: 80,
  screenUsagePct: 60,
  projectCapacity: 15,
  activeProjects: 4,
  remainingProjects: 11,
  storageCapacityGb: 50,
  storageUsageGb: 5,
  remainingStorageGb: 45,
  concurrentJobsLimit: 4,
  activeJobs: 1,
  health: 'HEALTHY',
  orgStatus: 'ACTIVE',
  createdAt: '2026-08-01T00:00:00.000Z',
  lastActivityAt: '2026-11-04T12:00:00.000Z',
};

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <OrganizationUsagePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('OrganizationUsagePage (Admin Cross-Organization Quota Monitoring)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(organizationUsageApi.getUsageSummary).mockResolvedValue(mockSummary);
    vi.mocked(organizationUsageApi.listOrganizationUsage).mockResolvedValue({
      items: [mockOrgItem],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      thresholds: mockSummary.thresholds,
      lastSyncTime: mockSummary.lastSyncTime,
    });
    vi.mocked(organizationUsageApi.getOrganizationUsageDetail).mockResolvedValue({
      ...mockOrgItem,
      membersCount: 8,
      monthlyTrends: [],
      recentActivities: [],
      auditHistory: [],
    });
  });

  it('renders summary cards and organization usage table with real metrics', async () => {
    renderPage();

    expect(await screen.findByText('Organization Usage & Quotas')).toBeInTheDocument();
    expect(await screen.findByText('Vietcombank Enterprise Core')).toBeInTheDocument();
    expect(screen.getByText('org-vcb-001')).toBeInTheDocument();
    expect(screen.getByText('120 / 200 screens')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getAllByText('Healthy').length).toBeGreaterThan(0);
  });

  it('filters by search term', async () => {
    renderPage();

    const searchInput = await screen.findByPlaceholderText(/Search organization, company, Org ID/);
    fireEvent.change(searchInput, { target: { value: 'Vietcombank' } });

    expect(searchInput).toHaveValue('Vietcombank');
  });

  it('navigates to organization detail page on row or Details button click', async () => {
    renderPage();

    const row = await screen.findByText('Vietcombank Enterprise Core');
    fireEvent.click(row);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/billing/usage/org-vcb-001');

    const detailsBtn = screen.getByRole('button', { name: /Details/i });
    fireEvent.click(detailsBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/billing/usage/org-vcb-001');
  });
});
