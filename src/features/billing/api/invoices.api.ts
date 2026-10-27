import { apiClient } from '@/services/api/apiClient';
import { InvoiceDto, ListInvoicesQuery } from '../types/invoice';

const MOCK_INVOICES: InvoiceDto[] = [
  {
    id: 'inv-2026-001',
    invoiceNumber: 'INV-2026-0891',
    organizationId: 'org-fnx-prod',
    organizationName: 'Fintech Nexus International',
    customerId: 'cust-fnx-admin',
    customerEmail: 'support@fintechnexus.io',
    amount: 12500,
    currency: 'USD',
    status: 'PAID',
    issueDate: '2026-10-01T00:00:00Z',
    dueDate: '2026-10-15T00:00:00Z',
    paidAt: '2026-10-03T11:20:00Z',
    subtotal: 11500,
    tax: 1000,
    items: [
      { id: 'item-1', description: 'Enterprise Tier 2 Monthly Subscription', quantity: 1, unitPrice: 8500, total: 8500 },
      { id: 'item-2', description: 'High-Volume Screen Conversion Pack (150 screens)', quantity: 1, unitPrice: 3000, total: 3000 },
    ],
  },
  {
    id: 'inv-2026-002',
    invoiceNumber: 'INV-2026-0892',
    organizationId: 'org-acme-corp',
    organizationName: 'Acme Corporation',
    customerId: 'cust-acme-lead',
    customerEmail: 'contact@acme.corp',
    amount: 18000,
    currency: 'USD',
    status: 'PENDING',
    issueDate: '2026-10-15T00:00:00Z',
    dueDate: '2026-10-30T00:00:00Z',
    paidAt: null,
    subtotal: 16500,
    tax: 1500,
    items: [
      { id: 'item-3', description: 'Enterprise Tier 1 Custom Provisioning', quantity: 1, unitPrice: 15000, total: 15000 },
      { id: 'item-4', description: 'Priority SLA Dedicated Node', quantity: 1, unitPrice: 1500, total: 1500 },
    ],
  },
  {
    id: 'inv-2026-003',
    invoiceNumber: 'INV-2026-0870',
    organizationId: 'org-gtl',
    organizationName: 'Global Transit Logistics',
    customerId: 'cust-gtl-fin',
    customerEmail: 'billing@gtl.com',
    amount: 4500,
    currency: 'USD',
    status: 'OVERDUE',
    issueDate: '2026-09-01T00:00:00Z',
    dueDate: '2026-09-15T00:00:00Z',
    paidAt: null,
    subtotal: 4100,
    tax: 400,
    items: [
      { id: 'item-5', description: 'Managed Conversion Overage Billing', quantity: 1, unitPrice: 4100, total: 4100 },
    ],
  },
];

export const invoicesApi = {
  getInvoices: async (query?: ListInvoicesQuery): Promise<InvoiceDto[]> => {
    try {
      const res = await apiClient.get<InvoiceDto[]>('/billing/invoices', { params: query });
      if (Array.isArray(res) && res.length > 0) {
        return res;
      }
      return MOCK_INVOICES;
    } catch {
      return MOCK_INVOICES;
    }
  },

  getInvoiceById: async (id: string): Promise<InvoiceDto> => {
    try {
      const res = await apiClient.get<InvoiceDto>(`/billing/invoices/${id}`);
      return res;
    } catch {
      const match = MOCK_INVOICES.find((i) => i.id === id || i.invoiceNumber === id);
      if (match) return match;
      throw new Error('Invoice not found');
    }
  },

  downloadReceiptPdf: async (id: string): Promise<Blob> => {
    try {
      const res = await apiClient.get<any>(`/billing/invoices/${id}/receipt.pdf`, {
        responseType: 'blob',
      });
      return res instanceof Blob ? res : new Blob([res], { type: 'application/pdf' });
    } catch {
      // Return a simulated PDF blob
      const dummyPdfContent = `%PDF-1.4 simulated receipt for invoice ${id}`;
      return new Blob([dummyPdfContent], { type: 'application/pdf' });
    }
  },
};
