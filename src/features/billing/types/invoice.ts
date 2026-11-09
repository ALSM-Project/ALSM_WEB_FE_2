export type InvoiceStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  organizationName?: string;
  customerId: string;
  customerEmail?: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidAt?: string | null;
  items?: InvoiceLineItem[];
  subtotal?: number;
  tax?: number;
  pdfUrl?: string;
}

export interface ListInvoicesQuery {
  organizationId?: string;
  status?: InvoiceStatus;
  search?: string;
  page?: number;
  limit?: number;
}
