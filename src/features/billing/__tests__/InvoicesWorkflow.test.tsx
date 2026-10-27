import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvoicesPage } from '../pages/InvoicesPage';
import { invoicesApi } from '../api/invoices.api';

describe('View Invoices Workflow (Enterprise Customer & Admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders enterprise invoices list with KPI summary metrics', async () => {
    render(<InvoicesPage />);

    expect(screen.getByText('Enterprise Invoices')).toBeInTheDocument();
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
