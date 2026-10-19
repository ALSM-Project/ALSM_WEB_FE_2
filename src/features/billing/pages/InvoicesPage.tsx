import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { Card, Button, Input, Modal } from '@/shared/ui';
import { invoicesApi } from '../api/invoices.api';
import { InvoiceDto, InvoiceStatus } from '../types/invoice';

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await invoicesApi.getInvoices({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchTerm || undefined,
      });
      setInvoices(data);
    } catch {
      // handled by api fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleDownloadPdf = async (invoice: InvoiceDto) => {
    try {
      setDownloadingId(invoice.id);
      const blob = await invoicesApi.downloadReceiptPdf(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download invoice PDF', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(term) ||
      (inv.organizationName && inv.organizationName.toLowerCase().includes(term)) ||
      (inv.customerEmail && inv.customerEmail.toLowerCase().includes(term));
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalBilled = invoices.reduce((acc, i) => acc + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === 'PAID').reduce((acc, i) => acc + i.amount, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE')
    .reduce((acc, i) => acc + i.amount, 0);

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Paid
          </span>
        );
      case 'PENDING':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-50 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <h1 className="text-2xl font-bold text-[#17263A] tracking-tight">
            Invoices
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvoices}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border border-[#DCE3EC] rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8491A3]">
            <span>Total Invoiced</span>
            <DollarSign className="w-4 h-4 text-[#244A70]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#17263A]">
            ${totalBilled.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#8491A3] mt-0.5">
            Across {invoices.length} billed cycles
          </div>
        </Card>

        <Card className="p-4 bg-white border border-[#DCE3EC] rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8491A3]">
            <span>Total Settled (Paid)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-700">
            ${totalPaid.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-800 mt-0.5 font-medium">
            {Math.round((totalPaid / (totalBilled || 1)) * 100)}% realization rate
          </div>
        </Card>

        <Card className="p-4 bg-white border border-[#DCE3EC] rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8491A3]">
            <span>Pending & Outstanding</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#17263A]">
            ${totalOutstanding.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-800 mt-0.5 font-medium">
            Requires attention or review
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-[#DCE3EC] rounded-xl shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8491A3]" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by invoice #, company, or email..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          {(['ALL', 'PAID', 'PENDING', 'OVERDUE'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-[#244A70] text-white shadow-xs'
                  : 'bg-[#F8FAFC] text-[#8491A3] hover:bg-[#EEF1F6] hover:text-[#244A70]'
              }`}
            >
              {status === 'ALL' ? 'All Invoices' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-[#DCE3EC] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[10px] font-bold text-[#8491A3] uppercase tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Tenant / Customer</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3EC]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8491A3]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#244A70]" />
                      <span>Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8491A3]">
                    <FileText className="w-8 h-8 mx-auto text-[#DCE3EC] mb-2" />
                    <div>No enterprise invoices found matching your criteria.</div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F8FAFC]/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-[#244A70]">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#17263A]">{inv.organizationName || 'Tenant'}</div>
                      <div className="text-[10px] text-[#8491A3]">{inv.customerEmail}</div>
                    </td>
                    <td className="py-3 px-4 text-[#8491A3]">
                      {new Date(inv.issueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-[#8491A3]">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#17263A]">
                      ${inv.amount.toLocaleString()} {inv.currency}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(inv.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvoice(inv)}
                          className="h-7 px-2 text-xs"
                          title="View Invoice Details"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-[#8491A3]" />
                          <span>View</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPdf(inv)}
                          disabled={downloadingId === inv.id}
                          className="h-7 px-2 text-xs text-[#244A70] border-[#244A70]/30 hover:bg-[#EEF1F6]"
                          title="Download Receipt PDF"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          <span>{downloadingId === inv.id ? 'Saving...' : 'PDF'}</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={`Invoice Breakdown: ${selectedInvoice?.invoiceNumber || ''}`}
      >
        {selectedInvoice && (
          <div className="space-y-4 text-xs">
            {/* Header summary */}
            <div className="p-3.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8491A3]">Billed To</span>
                <div className="font-bold text-sm text-[#17263A]">
                  {selectedInvoice.organizationName || 'Enterprise Tenant'}
                </div>
                <div className="text-[11px] text-[#8491A3]">{selectedInvoice.customerEmail}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#8491A3]">Status</span>
                <div className="mt-0.5">{getStatusBadge(selectedInvoice.status)}</div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[#DCE3EC]">
                <Calendar className="w-4 h-4 text-[#8491A3]" />
                <div>
                  <div className="text-[10px] text-[#8491A3]">Issue Date</div>
                  <div className="font-semibold text-[#17263A]">
                    {new Date(selectedInvoice.issueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[#DCE3EC]">
                <Calendar className="w-4 h-4 text-[#8491A3]" />
                <div>
                  <div className="text-[10px] text-[#8491A3]">Due Date</div>
                  <div className="font-semibold text-[#17263A]">
                    {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Line items table */}
            <div>
              <div className="font-bold text-xs text-[#17263A] mb-2">Itemized Deliverables</div>
              <div className="border border-[#DCE3EC] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[10px] font-bold text-[#8491A3] uppercase">
                    <tr>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE3EC]">
                    {(selectedInvoice.items || []).map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 text-[#17263A]">{item.description}</td>
                        <td className="py-2 px-3 text-center text-[#8491A3]">{item.quantity}</td>
                        <td className="py-2 px-3 text-right text-[#8491A3]">
                          ${item.unitPrice.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-[#17263A]">
                          ${item.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Totals */}
            <div className="p-3 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-[#8491A3]">
                <span>Subtotal:</span>
                <span className="font-semibold text-[#17263A]">
                  ${(selectedInvoice.subtotal || selectedInvoice.amount * 0.9).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[#8491A3]">
                <span>Applicable Tax / VAT:</span>
                <span className="font-semibold text-[#17263A]">
                  ${(selectedInvoice.tax || selectedInvoice.amount * 0.1).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-[#DCE3EC] text-sm font-bold text-[#17263A]">
                <span>Total Amount:</span>
                <span className="text-[#244A70]">
                  ${selectedInvoice.amount.toLocaleString()} {selectedInvoice.currency}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#DCE3EC]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedInvoice(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleDownloadPdf(selectedInvoice)}
                className="bg-[#244A70] hover:bg-[#244A70] text-white"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                <span>Download Receipt PDF</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
