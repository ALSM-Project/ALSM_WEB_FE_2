import React, { useState } from 'react';
import { Button, Modal } from '@/shared/ui';
import { 
  FileText, CheckCircle2, Send, 
  Printer, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { LeadQuote } from '../types/crm.types';
import { crmApi } from '../api/crm.api';
import { formatVnd } from '@/shared/utils/currency';

export interface QuotePreviewModalProps {
  isOpen: boolean;
  leadId: string;
  leadCompany: string;
  leadContact: string;
  leadEmail: string;
  quote: LeadQuote | null;
  onClose: () => void;
  onQuoteUpdated?: (updatedQuote: LeadQuote) => void;
  onCreateContractFromQuote?: (quote: LeadQuote) => void;
}

export const QuotePreviewModal: React.FC<QuotePreviewModalProps> = ({
  isOpen,
  leadId,
  leadCompany,
  leadContact,
  leadEmail,
  quote,
  onClose,
  onQuoteUpdated,
  onCreateContractFromQuote,
}) => {
  const [acting, setActing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!quote) return null;

  const handleSimulateSend = async () => {
    try {
      setActing(true);
      // In local store or API, update status to SENT
      quote.status = 'SENT';
      quote.sentAt = new Date().toISOString();
      setSuccessMessage('Quote successfully sent to customer email.');
      onQuoteUpdated?.(quote);
      setTimeout(() => setSuccessMessage(null), 3500);
    } finally {
      setActing(false);
    }
  };

  const handleSimulateAccept = async () => {
    try {
      setActing(true);
      const updated = await crmApi.acceptQuote(leadId, quote.id);
      setSuccessMessage('Quote accepted by customer! Ready to generate contract.');
      onQuoteUpdated?.(updated);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to accept quote.');
    } finally {
      setActing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Commercial Quote Preview: ${quote.quoteNumber}`}
    >
      <div className="space-y-4 text-xs">
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Header / Document Details */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Document Type</span>
              <h3 className="text-sm font-bold text-[#091E42] flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Modernization Services & Platform Quotation
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${
                quote.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                quote.status === 'SENT' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                quote.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                'bg-slate-200 text-slate-700'
              }`}>
                {quote.status}
              </span>
              {quote.requiresApproval && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  quote.approvalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' :
                  quote.approvalStatus === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-300' :
                  'bg-amber-50 text-amber-800 border border-amber-300'
                }`}>
                  Approval: {quote.approvalStatus}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Issued To</p>
              <p className="font-semibold text-slate-800 text-xs mt-0.5">{leadCompany}</p>
              <p className="text-slate-600">{leadContact}</p>
              <p className="text-slate-500 font-mono text-[11px]">{leadEmail}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Quote Meta</p>
              <p className="text-slate-700 mt-0.5"><span className="text-slate-400">Reference:</span> {quote.quoteNumber}</p>
              <p className="text-slate-700"><span className="text-slate-400">Created:</span> {new Date(quote.createdAt).toLocaleDateString()}</p>
              <p className="text-slate-700"><span className="text-slate-400">Valid Through:</span> 30 calendar days</p>
            </div>
          </div>
        </div>

        {/* Scope and Line Items */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-100/75 px-4 py-2 border-b border-slate-200 font-semibold text-slate-700 text-xs">
            Commercial Scope & Deliverables
          </div>
          <div className="p-4 space-y-3">
            <div>
              <p className="text-slate-500 text-[11px] font-medium">Selected Architecture Plan</p>
              <p className="font-semibold text-slate-900 text-sm">{quote.plan}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px] font-medium">Scope Description</p>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {quote.projectScope || 'ALSM Automated Legacy Modernization Suite: Source parsing, screen conversion, database mapping, and CI/CD runtime packaging.'}
              </p>
            </div>

            {/* Pricing Breakdown */}
            <div className="mt-4 pt-3 border-t border-slate-200 space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Standard Base Fee:</span>
                <span>{formatVnd(quote.basePrice)}</span>
              </div>
              {quote.discountPercent > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Authorized Discount ({quote.discountPercent}%):</span>
                  <span>{formatVnd(-Math.round(quote.basePrice * quote.discountPercent / 100))}</span>
                </div>
              )}
              {quote.discountReason && (
                <div className="text-[11px] text-slate-500 italic pl-3 border-l-2 border-emerald-300">
                  Justification: "{quote.discountReason}"
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-300">
                <span>Total Investment:</span>
                <span className="text-blue-600">{formatVnd(quote.finalPrice)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Commercial Terms Notice */}
        <div className="text-[11px] text-slate-500 bg-blue-50/60 border border-blue-100 rounded-lg p-3 space-y-1">
          <div className="font-semibold text-blue-900 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Standard ALSM Commercial Terms
          </div>
          <p>
            This quote includes full source AST extraction, continuous validation suites, and deployment to Web 3 runtime targets.
            Payment terms are Net-30 upon signature unless custom milestones are specified.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-slate-600"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Print / PDF
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {quote.status === 'DRAFT' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSimulateSend}
                disabled={acting || (quote.requiresApproval && quote.approvalStatus !== 'APPROVED')}
                title={quote.requiresApproval && quote.approvalStatus !== 'APPROVED' ? 'Requires discount approval first' : ''}
              >
                <Send className="w-3.5 h-3.5 mr-1 text-blue-600" />
                Simulate Send Quote
              </Button>
            )}

            {quote.status !== 'ACCEPTED' && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSimulateAccept}
                disabled={acting || (quote.requiresApproval && quote.approvalStatus !== 'APPROVED')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Simulate Customer Accept
              </Button>
            )}

            {quote.status === 'ACCEPTED' && onCreateContractFromQuote && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  onCreateContractFromQuote(quote);
                  onClose();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Generate Contract
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}

            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
