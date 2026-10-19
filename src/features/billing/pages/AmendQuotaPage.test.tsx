import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { organizationUsageApi } from '../api/organization-usage.api';
import { AmendQuotaPage } from './AmendQuotaPage';
import type { OrganizationUsageDetail } from '../types/organization-usage';

vi.mock('../api/organization-usage.api', () => ({
  organizationUsageApi: {
    getOrganizationUsageDetail: vi.fn(),
    applyQuotaAmendment: vi.fn(),
  },
}));

vi.mock('@/context/NavigationContext', () => ({
  useNavigation: () => ({
    setCustomBreadcrumbs: vi.fn(),
  }),
}));

const mockDetail: OrganizationUsageDetail = {
  organizationId: 'org-123',
  name: "Gia Khanh Nguyen's Organization",
  normalizedName: 'gia-khanh-nguyen-organization',
  companyName: "Gia Khanh Nguyen's Organization",
  contactEmail: 'khanh@example.com',
  serviceMode: 'CUSTOMER_SELF_SERVICE',
  subscriptionPlan: 'Trial',
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
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/billing/usage/org-123/amend']}>
        <Routes>
          <Route path="/admin/billing/usage/:orgId/amend" element={<AmendQuotaPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AmendQuotaPage - Governance & Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quota amendment form with loaded organization details in English', async () => {
    vi.mocked(organizationUsageApi.getOrganizationUsageDetail).mockResolvedValueOnce(mockDetail);

    renderPage();

    expect(await screen.findByText('Amend Service Quota & Entitlements')).toBeInTheDocument();
    expect(screen.getAllByText("Gia Khanh Nguyen's Organization").length).toBeGreaterThan(0);
    expect(screen.getByText('Resource Quota Adjustment & Entitlement Comparison')).toBeInTheDocument();
  });

  it('submits amendment with target capacities and contract reference', async () => {
    vi.mocked(organizationUsageApi.getOrganizationUsageDetail).mockResolvedValueOnce(mockDetail);
    vi.mocked(organizationUsageApi.applyQuotaAmendment).mockResolvedValueOnce(mockDetail);

    renderPage();

    await screen.findByText('Amend Service Quota & Entitlements');

    const justificationInput = screen.getByPlaceholderText(/Detail the customer expansion request/i);
    fireEvent.change(justificationInput, {
      target: { value: 'Customer expanded pilot to 1,000 screens under Enterprise expansion order' },
    });

    const submitBtn = screen.getByRole('button', { name: /Confirm & Apply Quota Amendment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(organizationUsageApi.applyQuotaAmendment).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          targetScreenCapacity: 736,
          justification: 'Customer expanded pilot to 1,000 screens under Enterprise expansion order',
        })
      );
    });
  });

  it('displays formatted validation error message if server returns 400 with array of errors', async () => {
    vi.mocked(organizationUsageApi.getOrganizationUsageDetail).mockResolvedValueOnce(mockDetail);
    vi.mocked(organizationUsageApi.applyQuotaAmendment).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          message: [
            'targetScreenCapacity must be a number',
            'justification must be longer than 5 characters',
          ],
        },
      },
    });

    renderPage();

    await screen.findByText('Amend Service Quota & Entitlements');

    const justificationInput = screen.getByPlaceholderText(/Detail the customer expansion request/i);
    fireEvent.change(justificationInput, {
      target: { value: 'Valid justification for amendment' },
    });

    const submitBtn = screen.getByRole('button', { name: /Confirm & Apply Quota Amendment/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/targetScreenCapacity must be a number; justification must be longer than 5 characters/i)
    ).toBeInTheDocument();
  });
});
