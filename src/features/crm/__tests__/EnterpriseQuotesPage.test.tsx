import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  isContractCustomerSigned,
  isContractPendingCustomerSign,
  isContractAlsmSigned,
  TablePagination,
  EnterpriseQuotesPage,
} from '../pages/EnterpriseQuotesPage';
import type { EnterpriseContract } from '@/features/contracts/api/contracts.api';
import { contractsApi } from '@/features/contracts/api/contracts.api';
import { crmApi } from '../api/crm.api';

vi.mock('@/features/contracts/api/contracts.api', async () => {
  const actual = await vi.importActual<any>('@/features/contracts/api/contracts.api');
  return {
    ...actual,
    contractsApi: {
      ...actual.contractsApi,
      listContracts: vi.fn(),
      getPdfUrl: vi.fn((id: string) => `/api/contracts/${id}/pdf`),
    },
  };
});

vi.mock('../api/crm.api', () => ({
  crmApi: {
    listQuotes: vi.fn(),
    getLeads: vi.fn(),
  },
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    hasPermission: () => true,
    user: { email: 'admin@admin.com', role: 'PLATFORM_ADMIN' },
  }),
}));

vi.mock('../components/EnterpriseQuoteWizardModal', () => ({
  EnterpriseQuoteWizardModal: () => null,
}));

vi.mock('../components/QuotePreviewModal', () => ({
  QuotePreviewModal: () => null,
}));

describe('EnterpriseQuotesPage Signature Classification', () => {
  const signedContract: EnterpriseContract = {
    id: 'ctr-1',
    contractNumber: 'ALSM-CTR-2026-89AA',
    title: 'Enterprise Modernization Agreement - Client Workspace',
    organizationId: 'org-1',
    organizationName: 'Client Workspace',
    serviceMode: 'WE_CONVERT_FOR_YOU',
    contractType: 'ENTERPRISE_HYBRID_MSA',
    status: 'ACTIVE',
    lifecycleStatus: 'COMPLETED',
    plan: 'Enterprise Core Modernization',
    effectiveDate: '2026-11-07',
    endDate: '2027-11-07',
    customer: {
      companyName: 'Client Workspace',
      taxId: '0109988776',
      businessAddress: 'Hanoi',
      representativeName: 'Nguyen Van A',
      representativeTitle: 'Director',
      contactEmail: 'client@workspace.io',
    },
    scope: { screensQuota: 100, programsQuota: 20, storageGb: 50 },
    commercialTerms: {
      subtotal: 11000,
      discountPercent: 0,
      discountAmount: 0,
      vatRate: 10,
      vatAmount: 1100,
      totalValue: 12100,
      currency: 'VND',
      paymentStructure: 'ONE_TIME',
    },
    clauses: [],
    milestones: [],
    paymentSchedule: [],
    signingProcess: {
      providerSigningStatus: 'SIGNED',
      customerSigningStatus: 'SIGNED',
    },
    totalValue: 12100,
    currency: 'VND',
    amendments: [],
    renewals: [],
    auditTrail: [],
    createdAt: '2026-11-07T09:32:26.846Z',
    updatedAt: '2026-11-07T09:32:26.846Z',
  };

  const unsignedContract: EnterpriseContract = {
    ...signedContract,
    id: 'ctr-2',
    contractNumber: 'ALSM-CTR-2026-9A52',
    status: 'DRAFT',
    lifecycleStatus: 'INTERNAL_REVIEW',
    signingProcess: {
      providerSigningStatus: 'SIGNED',
      customerSigningStatus: 'NOT_SIGNED',
    },
  };

  it('correctly identifies a contract signed by customer', () => {
    expect(isContractCustomerSigned(signedContract)).toBe(true);
    expect(isContractPendingCustomerSign(signedContract)).toBe(false);
    expect(isContractAlsmSigned(signedContract)).toBe(true);
  });

  it('correctly identifies a contract pending customer signature', () => {
    expect(isContractCustomerSigned(unsignedContract)).toBe(false);
    expect(isContractPendingCustomerSign(unsignedContract)).toBe(true);
    expect(isContractAlsmSigned(unsignedContract)).toBe(true);
  });

  it('correctly handles case-insensitive status for Active contracts', () => {
    const activeContract = {
      ...signedContract,
      status: 'Active',
      signingProcess: {
        providerSigningStatus: 'SIGNED' as const,
        customerSigningStatus: 'NOT_SIGNED' as const,
      },
    };
    expect(isContractCustomerSigned(activeContract)).toBe(true);
    expect(isContractPendingCustomerSign(activeContract)).toBe(false);
  });
});

describe('TablePagination Component', () => {
  it('renders correct records range and page indicator', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <TablePagination
        currentPage={1}
        pageSize={5}
        totalItems={8}
        itemName="contracts"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        ariaLabel="Active contracts per page"
      />
    );

    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();

    // Previous button should be disabled on first page
    const prevBtn = screen.getByRole('button', { name: 'Previous Page' });
    const nextBtn = screen.getByRole('button', { name: 'Next Page' });
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    // Clicking next calls onPageChange with 2
    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);

    // Changing per page dropdown calls onPageSizeChange and resets page
    const select = screen.getByRole('combobox', { name: 'Active contracts per page' });
    fireEvent.change(select, { target: { value: '10' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(10);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('returns null when totalItems is 0', () => {
    const { container } = render(
      <TablePagination
        currentPage={1}
        pageSize={5}
        totalItems={0}
        itemName="contracts"
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('EnterpriseQuotesPage Executed Contracts Pagination Integration', () => {
  const mockContracts: EnterpriseContract[] = [
    {
      id: 'ctr-1',
      contractNumber: 'ALSM-CTR-2026-343F',
      title: 'Huong vi Enterprise Modernization',
      organizationId: 'org-huongvi-12345',
      organizationName: 'Huong vi Enterprise',
      serviceMode: 'WE_CONVERT_FOR_YOU',
      contractType: 'ENTERPRISE_CORE_MSA',
      status: 'ACTIVE',
      lifecycleStatus: 'COMPLETED',
      customer: { companyName: 'Huong vi Enterprise', representativeName: 'huong v114' },
      totalValue: 25410,
      scope: { screensQuota: 2000 },
      signingProcess: { providerSigningStatus: 'SIGNED', customerSigningStatus: 'SIGNED' },
      effectiveDate: '2026-11-09',
      endDate: '2027-11-09',
    },
    {
      id: 'ctr-2',
      contractNumber: 'ALSM-CTR-2026-88FD',
      title: 'BMS screen Modernization',
      organizationId: 'org-bms-12345',
      organizationName: 'BMS screen',
      serviceMode: 'WE_CONVERT_FOR_YOU',
      contractType: 'ENTERPRISE_CORE_MSA',
      status: 'ACTIVE',
      lifecycleStatus: 'COMPLETED',
      customer: { companyName: 'BMS screen', representativeName: 'công ty TNHH' },
      totalValue: 20570,
      scope: { screensQuota: 5000 },
      signingProcess: { providerSigningStatus: 'SIGNED', customerSigningStatus: 'SIGNED' },
      effectiveDate: '2026-11-08',
      endDate: '2027-11-08',
    },
    {
      id: 'ctr-3',
      contractNumber: 'CTR-2026-CMGT-0E5F7F',
      title: 'Enterprise Partner Agreement',
      organizationId: 'org-partner-12345',
      organizationName: 'Enterprise Partner',
      serviceMode: 'SELF_SERVICE',
      contractType: 'ENTERPRISE_CORE_MSA',
      status: 'ACTIVE',
      lifecycleStatus: 'COMPLETED',
      customer: { companyName: 'Enterprise Partner', representativeName: 'Corporate Representative' },
      totalValue: 0,
      scope: { screensQuota: 100 },
      signingProcess: { providerSigningStatus: 'SIGNED', customerSigningStatus: 'SIGNED' },
      effectiveDate: '2026-11-01',
      endDate: '2027-11-01',
    },
    {
      id: 'ctr-4',
      contractNumber: 'ALSM-CTR-2026-0A08',
      title: 'Hoang cute Modernization',
      organizationId: 'org-hoang-12345',
      organizationName: 'Hoang cute',
      serviceMode: 'WE_CONVERT_FOR_YOU',
      contractType: 'ENTERPRISE_CORE_MSA',
      status: 'ACTIVE',
      lifecycleStatus: 'COMPLETED',
      customer: { companyName: 'Hoang cute', representativeName: 'hoang cute' },
      totalValue: 15730,
      scope: { screensQuota: 2000 },
      signingProcess: { providerSigningStatus: 'SIGNED', customerSigningStatus: 'SIGNED' },
      effectiveDate: '2026-11-08',
      endDate: '2027-11-08',
    },
    {
      id: 'ctr-5',
      contractNumber: 'ALSM-CTR-2026-9A52',
      title: 'Client Workspace 1',
      organizationId: 'org-client1-12345',
      organizationName: 'Client Workspace',
      serviceMode: 'SELF_SERVICE',
      contractType: 'ENTERPRISE_CORE_MSA',
      status: 'ACTIVE',
      lifecycleStatus: 'COMPLETED',
      customer: { companyName: 'Client Workspace', representativeName: 'Truong Minh Khoi' },
      totalValue: 12100,
      scope: { screensQuota: 50 },
      signingProcess: { providerSigningStatus: 'SIGNED', customerSigningStatus: 'SIGNED' },
      effectiveDate: '2026-11-07',
      endDate: '2027-11-07',
    },
    {
      id: 'ctr-6',
      contractNumber: 'ALSM-CTR-2026-8688',
      title: 'fpt Modernization',
      organizationId: 'org-fpt-12345',
      organizationName: 'fpt',
      serviceMode: 'WE_CONVERT_FOR_YOU',
      contractType: 'ENTERPRISE_CORE_MSA',
      status: 'ACTIVE',
      lifecycleStatus: 'COMPLETED',
      customer: { companyName: 'fpt', representativeName: 'hoang cute' },
      totalValue: 12100,
      scope: { screensQuota: 20 },
      signingProcess: { providerSigningStatus: 'SIGNED', customerSigningStatus: 'SIGNED' },
      effectiveDate: '2026-11-07',
      endDate: '2027-11-07',
    },
    {
      id: 'ctr-7',
      contractNumber: 'CTR-2026-FPTS-02C17D',
      title: 'FPT Information System Agreement',
      organizationId: 'org-fpts-12345',
      organizationName: 'FPT Information System',
      serviceMode: 'SELF_SERVICE',
      contractType: 'ENTERPRISE_CORE_MSA',
      status: 'ACTIVE',
      lifecycleStatus: 'COMPLETED',
      customer: { companyName: 'FPT Information System', representativeName: 'Nguyen Hoang Long' },
      totalValue: 36300,
      scope: { screensQuota: 100 },
      signingProcess: { providerSigningStatus: 'SIGNED', customerSigningStatus: 'SIGNED' },
      effectiveDate: '2026-11-01',
      endDate: '2027-11-01',
    },
    {
      id: 'ctr-8',
      contractNumber: 'ALSM-CTR-2026-89AA',
      title: 'Client Workspace 2',
      organizationId: 'org-client2-12345',
      organizationName: 'Client Workspace',
      serviceMode: 'SELF_SERVICE',
      contractType: 'ENTERPRISE_CORE_MSA',
      status: 'ACTIVE',
      lifecycleStatus: 'COMPLETED',
      customer: { companyName: 'Client Workspace', representativeName: 'Truong Minh Khoi' },
      totalValue: 12100,
      scope: { screensQuota: 50 },
      signingProcess: { providerSigningStatus: 'SIGNED', customerSigningStatus: 'SIGNED' },
      effectiveDate: '2026-11-07',
      endDate: '2027-11-07',
    },
  ] as unknown as EnterpriseContract[];

  beforeEach(() => {
    vi.clearAllMocks();
    (crmApi.listQuotes as any).mockResolvedValue([]);
    (crmApi.getLeads as any).mockResolvedValue([]);
    (contractsApi.listContracts as any).mockResolvedValue({ items: mockContracts, total: 8 });
  });

  it('paginates 8 active contracts with 5 per page by default and navigates to page 2', async () => {
    render(
      <MemoryRouter>
        <EnterpriseQuotesPage />
      </MemoryRouter>
    );

    // Wait for active contracts table to be loaded
    await waitFor(() => {
      expect(screen.getByText('Huong vi Enterprise')).toBeInTheDocument();
    });

    // Check page 1 items are shown (first 5)
    expect(screen.getByText('ALSM-CTR-2026-343F')).toBeInTheDocument();
    expect(screen.getByText('ALSM-CTR-2026-88FD')).toBeInTheDocument();
    expect(screen.getByText('CTR-2026-CMGT-0E5F7F')).toBeInTheDocument();
    expect(screen.getByText('ALSM-CTR-2026-0A08')).toBeInTheDocument();
    expect(screen.getByText('ALSM-CTR-2026-9A52')).toBeInTheDocument();

    // Contracts 6, 7, 8 should NOT be on page 1
    expect(screen.queryByText('ALSM-CTR-2026-8688')).not.toBeInTheDocument();
    expect(screen.queryByText('CTR-2026-FPTS-02C17D')).not.toBeInTheDocument();
    expect(screen.queryByText('ALSM-CTR-2026-89AA')).not.toBeInTheDocument();

    // Verify pagination controls for active contracts
    const perPageSelect = screen.getByRole('combobox', { name: 'Active contracts per page' });
    expect(perPageSelect).toHaveValue('5');

    // Click Next page
    const nextButtons = screen.getAllByRole('button', { name: 'Next Page' });
    // The active contracts table pagination is the last one rendered on overview
    const activeContractsNextBtn = nextButtons[nextButtons.length - 1];
    fireEvent.click(activeContractsNextBtn);

    // Now page 2 items should be visible
    expect(screen.getByText('ALSM-CTR-2026-8688')).toBeInTheDocument();
    expect(screen.getByText('CTR-2026-FPTS-02C17D')).toBeInTheDocument();
    expect(screen.getByText('ALSM-CTR-2026-89AA')).toBeInTheDocument();

    // Contract 1 from page 1 should not be visible now
    expect(screen.queryByText('ALSM-CTR-2026-343F')).not.toBeInTheDocument();
  });
});
