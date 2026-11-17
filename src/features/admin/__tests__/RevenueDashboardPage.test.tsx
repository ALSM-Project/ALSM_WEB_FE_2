import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RevenueDashboardPage } from '../pages/RevenueDashboardPage';
import { adminApi } from '../api/admin.api';

vi.mock('../api/admin.api', () => ({
  adminApi: {
    getRevenueSummary: vi.fn(),
    getRevenueTransactions: vi.fn(),
  },
}));

const mockSummary = {
  totalRevenue: 100000000,
  annualRecurringRevenue: 72000000,
  activeContractsCount: 7,
  bankTransferVolume: 80000000,
  bankTransferCount: 6,
  breakdownByPaymentMethod: {
    BANK_TRANSFER: 80000000,
    CORPORATE_WIRE: 20000000,
  },
  revenueByEngagementType: {
    'Enterprise Modernization Program (MANAGED)': 60000000,
    'Platform Subscription (SELF_SERVICE)': 40000000,
  },
};

const mockTransactions = [
  {
    id: 'INV-2026-0001',
    bankReference: 'MB-REF-001',
    client: 'Client Alpha',
    engagementType: 'Managed Modernization',
    paymentMethod: 'BANK_TRANSFER',
    settlementDate: '2026-11-01T10:00:00.000Z',
    contractValue: 20000000,
    status: 'CONFIRMED',
  },
  {
    id: 'INV-2026-0002',
    bankReference: 'MB-REF-002',
    client: 'Client Beta',
    engagementType: 'Managed Modernization',
    paymentMethod: 'BANK_TRANSFER',
    settlementDate: '2026-11-02T10:00:00.000Z',
    contractValue: 15000000,
    status: 'CONFIRMED',
  },
  {
    id: 'INV-2026-0003',
    bankReference: 'MB-REF-003',
    client: 'Client Gamma',
    engagementType: 'Self Service',
    paymentMethod: 'BANK_TRANSFER',
    settlementDate: '2026-11-03T10:00:00.000Z',
    contractValue: 10000000,
    status: 'CONFIRMED',
  },
  {
    id: 'INV-2026-0004',
    bankReference: 'MB-REF-004',
    client: 'Client Delta',
    engagementType: 'Managed Modernization',
    paymentMethod: 'BANK_TRANSFER',
    settlementDate: '2026-11-04T10:00:00.000Z',
    contractValue: 25000000,
    status: 'CONFIRMED',
  },
  {
    id: 'INV-2026-0005',
    bankReference: 'MB-REF-005',
    client: 'Client Epsilon',
    engagementType: 'Self Service',
    paymentMethod: 'BANK_TRANSFER',
    settlementDate: '2026-11-05T10:00:00.000Z',
    contractValue: 10000000,
    status: 'CONFIRMED',
  },
  {
    id: 'INV-2026-0006',
    bankReference: 'MB-REF-006',
    client: 'Client Zeta',
    engagementType: 'Managed Modernization',
    paymentMethod: 'CORPORATE_WIRE',
    settlementDate: '2026-11-06T10:00:00.000Z',
    contractValue: 10000000,
    status: 'CONFIRMED',
  },
  {
    id: 'INV-2026-0007',
    bankReference: 'MB-REF-007',
    client: 'Client Eta',
    engagementType: 'Corporate Wire',
    paymentMethod: 'CORPORATE_WIRE',
    settlementDate: '2026-11-07T10:00:00.000Z',
    contractValue: 10000000,
    status: 'CONFIRMED',
  },
];

describe('RevenueDashboardPage Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (adminApi.getRevenueSummary as any).mockResolvedValue(mockSummary);
    (adminApi.getRevenueTransactions as any).mockResolvedValue(mockTransactions);
  });

  it('renders ledger with default 5 items per page and pagination controls', async () => {
    render(
      <MemoryRouter>
        <RevenueDashboardPage />
      </MemoryRouter>
    );

    // Wait for ledger table to be rendered
    expect(await screen.findByText('Confirmed Contracts & Realised Payment Ledger')).toBeInTheDocument();
    expect(screen.getByText('7 Settled Transactions')).toBeInTheDocument();

    // Check pagination summary
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    // First page should contain first 5 items
    expect(screen.getByText('Client Alpha')).toBeInTheDocument();
    expect(screen.getByText('Client Beta')).toBeInTheDocument();
    expect(screen.getByText('Client Gamma')).toBeInTheDocument();
    expect(screen.getByText('Client Delta')).toBeInTheDocument();
    expect(screen.getByText('Client Epsilon')).toBeInTheDocument();

    // Items from page 2 should NOT be on page 1
    expect(screen.queryByText('Client Zeta')).not.toBeInTheDocument();
    expect(screen.queryByText('Client Eta')).not.toBeInTheDocument();
  });

  it('navigates to next page when Next Page button is clicked', async () => {
    render(
      <MemoryRouter>
        <RevenueDashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Confirmed Contracts & Realised Payment Ledger')).toBeInTheDocument();

    const nextBtn = screen.getByTitle('Next Page');
    expect(nextBtn).toBeEnabled();

    fireEvent.click(nextBtn);

    // Now on page 2
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Client Zeta')).toBeInTheDocument();
    expect(screen.getByText('Client Eta')).toBeInTheDocument();

    // Items from page 1 should not be visible
    expect(screen.queryByText('Client Alpha')).not.toBeInTheDocument();

    // Previous button should now be enabled, next button disabled
    const prevBtn = screen.getByTitle('Previous Page');
    expect(prevBtn).toBeEnabled();
    expect(nextBtn).toBeDisabled();

    // Click previous
    fireEvent.click(prevBtn);
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Client Alpha')).toBeInTheDocument();
  });

  it('changes page size when per-page selector is changed', async () => {
    render(
      <MemoryRouter>
        <RevenueDashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Confirmed Contracts & Realised Payment Ledger')).toBeInTheDocument();

    // Change per page to 10
    const perPageSelect = screen.getByRole('combobox', { name: 'Per page' });
    fireEvent.change(perPageSelect, { target: { value: '10' } });

    // Now all 7 items should be displayed on Page 1 of 1
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    expect(screen.getByText('Client Alpha')).toBeInTheDocument();
    expect(screen.getByText('Client Zeta')).toBeInTheDocument();
    expect(screen.getByText('Client Eta')).toBeInTheDocument();
  });
});
