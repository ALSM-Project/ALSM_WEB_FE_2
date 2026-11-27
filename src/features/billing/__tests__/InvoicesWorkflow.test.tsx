import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvoicesPage } from '../pages/InvoicesPage';
import { invoicesApi } from '../api/invoices.api';

const mockInvoices = [
  {
    id: 'inv-2026-001',
    invoiceNumber: 'INV-2026-0891',
    organizationId: 'org-1',
    organizationName: 'Fintech Nexus International',
    customerId: 'cust-1',
    customerEmail: 'billing@fintechnexus.io',
    amount: 12500,
    currency: 'USD',
    status: 'PAID' as const,
    issueDate: '2026-10-01T00:00:00Z',
    dueDate: '2026-10-31T00:00:00Z',
    subtotal: 12500,
    tax: 0,
    items: [
      { id: 'item-1', description: 'Enterprise Tier 2 Monthly Subscription', quantity: 1, unitPrice: 8000, total: 8000 },
      { id: 'item-2', description: 'High-Volume Screen Conversion Pack (150 screens)', quantity: 1, unitPrice: 4500, total: 4500 },
    ],
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-0892',
    organizationId: 'org-2',
    organizationName: 'Acme Corporation',
    customerId: 'cust-2',
    customerEmail: 'finance@acme.com',
    amount: 4200,
    currency: 'USD',
    status: 'PENDING' as const,
    issueDate: '2026-10-15T00:00:00Z',
    dueDate: '2026-11-15T00:00:00Z',
    items: [],
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2026-0870',
    organizationId: 'org-3',
    organizationName: 'Global Transit Logistics',
    customerId: 'cust-3',
    customerEmail: 'ap@globaltransit.com',
    amount: 3100,
    currency: 'USD',
    status: 'OVERDUE' as const,
    issueDate: '2026-09-01T00:00:00Z',
    dueDate: '2026-09-30T00:00:00Z',
    items: [],
  },
];

describe('View Invoices Workflow (Enterprise Customer & Admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(invoicesApi, 'getInvoices').mockResolvedValue(mockInvoices);
  });

  it('renders enterprise invoices list with KPI summary metrics', async () => {
    render(<InvoicesPage />);

    expect(screen.getByRole('heading', { name: /(Invoices|Enterprise Invoices)/i })).toBeInTheDocument();
    expect(screen.getByText('Total Invoiced')).toBeInTheDocument();
    expect(screen.getByText('Total Settled (Paid)')).toBeInTheDocument();
    expect(screen.getByText('Pending & Outstanding')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0891')).toBeInTheDocument();
      expect(screen.getByText('INV-2026-0892')).toBeInTheDocument();
      expect(screen.getByText('INV-2026-0870')).toBeInTheDocument();
    });

    expect(screen.getByText('Fintech Nexus International')).toBeInTheDocument();
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.getByText('Global Transit Logistics')).toBeInTheDocument();
  });

  it('filters invoices by status tabs', async () => {
    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0891')).toBeInTheDocument();
    });

    // Click PAID filter tab
    const paidTab = screen.getByRole('button', { name: 'PAID' });
    fireEvent.click(paidTab);

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0891')).toBeInTheDocument();
      expect(screen.queryByText('INV-2026-0892')).not.toBeInTheDocument(); // PENDING
      expect(screen.queryByText('INV-2026-0870')).not.toBeInTheDocument(); // OVERDUE
    });
  });

  it('filters invoices by search query', async () => {
    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by invoice #, company, or email...');
    fireEvent.change(searchInput, { target: { value: 'acme' } });

    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.queryByText('Fintech Nexus International')).not.toBeInTheDocument();
  });

  it('opens invoice detail modal and displays itemized deliverables and totals', async () => {
    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0891')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: /View/i });
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Invoice Breakdown: INV-2026-0891/i)).toBeInTheDocument();
      expect(screen.getByText('Itemized Deliverables')).toBeInTheDocument();
      expect(screen.getByText('Enterprise Tier 2 Monthly Subscription')).toBeInTheDocument();
      expect(screen.getByText('High-Volume Screen Conversion Pack (150 screens)')).toBeInTheDocument();
      expect(screen.getAllByText('$12,500 USD').length).toBeGreaterThan(0);
    });

    // Close modal
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Invoice Breakdown: INV-2026-0891/i)).not.toBeInTheDocument();
    });
  });

  it('triggers PDF receipt download for an invoice', async () => {
    const downloadSpy = vi.spyOn(invoicesApi, 'downloadReceiptPdf').mockResolvedValue(
      new Blob(['fake-pdf'], { type: 'application/pdf' })
    );

    // Mock URL.createObjectURL and revokeObjectURL
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0891')).toBeInTheDocument();
    });

    const pdfButtons = screen.getAllByRole('button', { name: /PDF/i });
    fireEvent.click(pdfButtons[0]);

    await waitFor(() => {
      expect(downloadSpy).toHaveBeenCalledWith('inv-2026-001');
    });
  });
});
