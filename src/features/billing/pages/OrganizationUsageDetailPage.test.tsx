import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { organizationUsageApi } from '../api/organization-usage.api';
import { OrganizationUsageDetailPage } from './OrganizationUsageDetailPage';
import type { OrganizationUsageDetail } from '../types/organization-usage';

vi.mock('../api/organization-usage.api', () => ({
  organizationUsageApi: {
    getOrganizationUsageDetail: vi.fn(),
    updateServiceStatus: vi.fn(),
  },
}));

vi.mock('@/context/NavigationContext', () => ({
  useNavigation: () => ({
    setCustomBreadcrumbs: vi.fn(),
  }),
}));

const mockDetail: OrganizationUsageDetail = {
  organizationId: 'org-test-123',
  name: "Gia Khanh Nguyen's Organization",
  normalizedName: 'gia-khanh-nguyen-organization',
  companyName: "Gia Khanh Nguyen's Organization",
  contactEmail: 'khanh@example.com',
  serviceMode: 'CUSTOMER_SELF_SERVICE',
  subscriptionPlan: 'Enterprise Evaluation',
  contractStatus: 'TRIAL',
  contractNumber: 'CTR-DEFAULT',
  screenCapacity: 20,
  screenUsage: 736,
  remainingScreens: 0,
  overQuotaScreens: 716,
  isOverQuota: true,
  isConversionBlocked: true,
  screenUsagePct: 3680,
  projectCapacity: 10,
  activeProjects: 2,
  remainingProjects: 8,
  storageCapacityGb: 5,
  storageUsageGb: 0,
  remainingStorageGb: 5,
  concurrentJobsLimit: 2,
  activeJobs: 0,
  health: 'EXCEEDED',
  orgStatus: 'TRIAL',
  createdAt: '2026-01-01T00:00:00.000Z',
  membersCount: 1,
  monthlyTrends: [],
  recentActivities: [],
  auditHistory: [],
};

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/billing/usage/org-test-123']}>
        <Routes>
          <Route path="/admin/billing/usage/:orgId" element={<OrganizationUsageDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('OrganizationUsageDetailPage - Dedicated Full Detail View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dedicated organization detail page with page title, breadcrumbs, and metrics', async () => {
    vi.mocked(organizationUsageApi.getOrganizationUsageDetail).mockResolvedValueOnce(mockDetail);

    renderPage();

    expect(await screen.findByText('Organization Usage & Entitlements')).toBeInTheDocument();
    expect(screen.getByText("Gia Khanh Nguyen's Organization")).toBeInTheDocument();
    expect(screen.getByText(/CRITICAL: Resource Quota Breached/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Amend Quota/i }).length).toBeGreaterThan(0);
  });

  it('switches between dossier tabs: Quotas, Usage Analytics, and Conversion Activity', async () => {
    vi.mocked(organizationUsageApi.getOrganizationUsageDetail).mockResolvedValueOnce(mockDetail);

    renderPage();

    await screen.findByText("Gia Khanh Nguyen's Organization");

    const quotasTab = screen.getByRole('button', { name: /Quotas & Entitlements/i });
    fireEvent.click(quotasTab);

    expect(screen.getByText('Authorized Service Limits & Entitlements')).toBeInTheDocument();
  });
});
