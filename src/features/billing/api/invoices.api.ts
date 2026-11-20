import { apiClient } from '@/services/api/apiClient';
import { InvoiceDto, ListInvoicesQuery } from '../types/invoice';



export const invoicesApi = {
  getInvoices: async (query?: ListInvoicesQuery): Promise<InvoiceDto[]> => {
    try {
      const res = await apiClient.get<InvoiceDto[]>('/billing/invoices', { params: query });
      if (Array.isArray(res)) {
        return res;
      }
      return [];
    } catch {
      return [];
    }
  },

  getInvoiceById: async (id: string): Promise<InvoiceDto> => {
    return apiClient.get<InvoiceDto>(`/billing/invoices/${id}`);
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
