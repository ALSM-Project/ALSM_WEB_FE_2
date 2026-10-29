import React, { useState, useEffect, useRef } from 'react';
import type { Lead, SendQuotePayload, SendQuoteResponse } from '../types/lead';
import { useSendQuote } from '../hooks/useLeads';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  X,
  Send,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Percent,
  Calendar,
  Mail,
  ShieldAlert,
  Loader2,
  Download,
} from 'lucide-react';

interface SendQuoteModalProps {
  lead: Lead | null;
  onClose: () => void;
  onSuccess?: (response: SendQuoteResponse) => void;
}

const PRESET_PLANS = [
  {
    name: 'Modernization Starter Assessment',
    amount: 25000,
    scope: 'Complete source inventory, complexity scoring, and target architecture roadmap.',
  },
  {
    name: 'Core Platform Migration & Modernization',
    amount: 60000,
    scope: 'Automated conversion of legacy logic, screen definitions, and data schema migration.',
  },
  {
    name: 'Enterprise Full-Stack Cloud Transformation',
    amount: 120000,
    scope: 'End-to-end modernization, integration testing, CI/CD pipeline setup, and production cutover.',
  },
];

export const SendQuoteModal: React.FC<SendQuoteModalProps> = ({
  lead,
  onClose,
  onSuccess,
}) => {
  const { hasPermission } = useAuth();
  const canSendQuote = hasPermission('sales.leads.manage');

  const [planName, setPlanName] = useState('Core Platform Migration & Modernization');
  const [projectScope, setProjectScope] = useState(
    'Automated conversion of legacy logic, screen definitions, and data schema migration.',
  );
  const [amount, setAmount] = useState<number>(60000);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [validityDays, setValidityDays] = useState<number>(30);
  const [notes] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<SendQuoteResponse | null>(null);
  const submissionKey = useRef<{ fingerprint: string; requestId: string } | null>(null);
  const submitting = useRef(false);

  const sendQuoteMutation = useSendQuote();

  useEffect(() => {
    if (lead) {
      setRecipientEmail(lead.contactEmail || '');
      setAmount(lead.estimatedValue && lead.estimatedValue > 0 ? lead.estimatedValue : 60000);
      setDiscountPercent(0);
      setDiscountReason('');
      setValidationError(null);
      setSuccessResult(null);
      submissionKey.current = null;
    }
  }, [lead]);

  if (!lead) return null;

  const isTerminalStatus = lead.status === 'WON' || lead.status === 'LOST';
  const requiresApproval = discountPercent > 15;
  const calculatedDiscountAmount = Math.round((amount * discountPercent) / 100);
  const finalAmount = Math.max(0, amount - calculatedDiscountAmount);

  const handleSelectPreset = (preset: (typeof PRESET_PLANS)[number]) => {
    setPlanName(preset.name);
    setAmount(preset.amount);
    setProjectScope(preset.scope);
  };

  const validate = (): string | null => {
    if (!planName.trim()) {
      return 'Plan name cannot be empty.';
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return 'Quote amount must be a positive number greater than 0.';
    }
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      return 'Discount percent must be between 0 and 100.';
    }
    if (discountPercent > 15 && !discountReason.trim()) {
      return 'Discounts above 15% require an explicit justification for manager approval.';
    }
    if (!recipientEmail.trim() || !/^\S+@\S+\.\S+$/.test(recipientEmail.trim())) {
      return 'A valid recipient email address is required.';
    }
    if (!Number.isInteger(validityDays) || validityDays < 1 || validityDays > 365) {
      return 'Validity days must be between 1 and 365 days.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || sendQuoteMutation.isPending) return;
    setValidationError(null);

    const err = validate();
    if (err) {
      setValidationError(err);
      return;
    }

    const values = {
      planName: planName.trim(),
      amount,
      discountPercent: discountPercent > 0 ? discountPercent : undefined,
      discountReason: discountReason.trim() ? discountReason.trim() : undefined,
      recipientEmail: recipientEmail.trim(),
      validityDays,
      projectScope: projectScope.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    const fingerprint = JSON.stringify(values);
    if (!submissionKey.current || submissionKey.current.fingerprint !== fingerprint) {
      submissionKey.current = { fingerprint, requestId: globalThis.crypto.randomUUID() };
    }
    const payload: SendQuotePayload = { ...values, requestId: submissionKey.current.requestId };

    submitting.current = true;
    try {
      const res = await sendQuoteMutation.mutateAsync({
        id: lead.id,
        payload,
      });
      setSuccessResult(res);
      onSuccess?.(res);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      const status = (err as { response?: { status?: number } })?.response?.status;
      const safeMessages: Record<string, string> = {
        INVALID_STATUS: 'This lead is no longer eligible for a quote. Refresh the lead and try again.',
        LEAD_STATE_CHANGED: 'The lead changed while the quote was being processed. Refresh and try again.',
        LEAD_NOT_FOUND: 'This lead could not be found. Refresh the page and try again.',
        IDEMPOTENCY_KEY_REUSED: 'The quote request changed. Submit again to create a new request.',
        MONGO_TRANSACTIONS_REQUIRED: 'Quote sending is temporarily unavailable. Please try again later.',
      };
      const message = status === 401
        ? 'Your session has expired. Sign in again to send this quote.'
        : status === 403
          ? 'You do not have permission to send quotes.'
          : safeMessages[code ?? ''] ?? 'We could not send the quote. Check the details and try again.';
      setValidationError(message);
    } finally {
      submitting.current = false;
    }
  };

  return (
    <div
      id="send-quote-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="send-quote-modal"
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-[#E8ECF1]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8ECF1] bg-[#F7F9FC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0652CC] to-[#00A3BF] flex items-center justify-center text-white font-bold text-base shadow-sm">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#091E42]">
                Send Modernization Quote (UC-62)
              </h2>
              <p className="text-xs text-[#6B778C]">
                Lead: <span className="font-semibold text-[#091E42]">{lead.companyName}</span> ({lead.contactName}) · Current stage: <span className="font-semibold text-[#091E42]">{lead.status}</span>
              </p>
            </div>
          </div>
          <button
            id="close-send-quote-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B778C] hover:bg-gray-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission Gate */}
        {!canSendQuote ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#091E42]">Permission Required</h3>
              <p className="text-xs text-[#6B778C] mt-1 max-w-md mx-auto">
                You do not have the required <code className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded">sales.leads.manage</code> permission to send quotes to leads. Please contact your administrator.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-[#091E42] hover:bg-gray-200 cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : isTerminalStatus ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#091E42]">
                Cannot Send Quote to {lead.status} Lead
              </h3>
              <p className="text-xs text-[#6B778C] mt-1 max-w-md mx-auto">
                This lead is currently in <span className="font-semibold">{lead.status}</span> status. Quotes can only be issued to active prospects in NEW, CONTACTED, QUALIFIED, PROPOSAL, or NEGOTIATION stages.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-[#091E42] hover:bg-gray-200 cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : successResult ? (
          /* Success Screen */
          <div className="p-8 space-y-6 overflow-y-auto">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#091E42]">Quote Successfully Processed!</h3>
              <p className="text-xs text-[#42526E] max-w-md mx-auto">
                {successResult.message}
              </p>
            </div>

            <div className="bg-[#F7F9FC] rounded-xl p-5 border border-[#E8ECF1] space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-[#E8ECF1]">
                <span className="text-xs font-medium text-[#6B778C]">Quote Reference:</span>
                <span className="text-sm font-bold text-[#0652CC]">{successResult.quote.quoteNumber}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B778C]">Plan Tier:</span>
                <span className="font-semibold text-[#091E42]">{successResult.quote.planName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B778C]">Recipient Email:</span>
                <span className="font-semibold text-[#091E42]">{successResult.quote.recipientEmail}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B778C]">Quoted Amount:</span>
                <span className="font-bold text-emerald-600 text-sm">
                  ${successResult.quote.amount.toLocaleString()} USD
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B778C]">Quote Status:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                    successResult.quote.status === 'SENT'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {successResult.quote.status === 'SENT' ? 'SENT TO CLIENT' : 'PENDING APPROVAL'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B778C]">Lead Stage:</span>
                <span className="font-semibold text-[#091E42]">
                  {successResult.lead.status}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {successResult.quote.pdfUrl && (
                <a
                  href={successResult.quote.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-[#D9E2EC] text-[#091E42] hover:bg-gray-50 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </a>
              )}
              <button
                id="done-quote-modal-btn"
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#0652CC] text-white hover:bg-[#0747b8] transition-colors cursor-pointer shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form Content */
          <form noValidate onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Validation alert */}
              {validationError && (
                <div
                  id="send-quote-error-alert"
                  role="alert"
                  aria-live="assertive"
                  className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 animate-in fade-in"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Package Presets */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B778C] mb-2">
                  Select Quick Package Preset
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PRESET_PLANS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`text-left p-3 rounded-lg border text-xs transition-all cursor-pointer ${
                        planName === preset.name
                          ? 'border-[#0652CC] bg-[#0652CC]/5 ring-1 ring-[#0652CC]'
                          : 'border-[#E8ECF1] bg-white hover:border-[#4C9AFF]'
                      }`}
                    >
                      <div className="font-semibold text-[#091E42] line-clamp-1">{preset.name}</div>
                      <div className="font-bold text-[#0652CC] mt-1">
                        ${preset.amount.toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan Name & Scope */}
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="quote-plan-name"
                    className="block text-xs font-semibold text-[#091E42] mb-1"
                  >
                    Modernization Plan Name *
                  </label>
                  <input
                    id="quote-plan-name"
                    type="text"
                    required
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g. Enterprise Full-Stack Cloud Transformation"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:border-[#0652CC] focus:ring-1 focus:ring-[#0652CC] outline-hidden text-[#091E42]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="quote-project-scope"
                    className="block text-xs font-semibold text-[#091E42] mb-1"
                  >
                    Project Scope / Deliverables
                  </label>
                  <textarea
                    id="quote-project-scope"
                    rows={2}
                    value={projectScope}
                    onChange={(e) => setProjectScope(e.target.value)}
                    placeholder="Key deliverables and milestones..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:border-[#0652CC] focus:ring-1 focus:ring-[#0652CC] outline-hidden text-[#091E42]"
                  />
                </div>
              </div>

              {/* Pricing, Discount & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="quote-base-amount"
                    className="block text-xs font-semibold text-[#091E42] mb-1"
                  >
                    Base Quote Amount (USD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-[#8993A4] absolute left-3 top-2.5" />
                    <input
                      id="quote-base-amount"
                      type="number"
                      required
                      min={1}
                      step={100}
                      value={amount || ''}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:border-[#0652CC] focus:ring-1 focus:ring-[#0652CC] outline-hidden text-[#091E42]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="quote-discount-percent"
                    className="block text-xs font-semibold text-[#091E42] mb-1"
                  >
                    Discount Percentage (%)
                  </label>
                  <div className="relative">
                    <Percent className="w-4 h-4 text-[#8993A4] absolute left-3 top-2.5" />
                    <input
                      id="quote-discount-percent"
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:border-[#0652CC] focus:ring-1 focus:ring-[#0652CC] outline-hidden text-[#091E42]"
                    />
                  </div>
                </div>
              </div>

              {/* Conditional Discount Justification (>15%) */}
              {requiresApproval && (
                <div
                  id="quote-discount-approval-warning"
                  className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 space-y-2 animate-in fade-in"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Manager Approval Required (Discount &gt; 15%)</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    This discount exceeds 15%. A mandatory business justification is required. The quote status will be set to <strong>PENDING_APPROVAL</strong> until reviewed.
                  </p>
                  <div>
                    <label
                      htmlFor="quote-discount-reason"
                      className="block text-[11px] font-bold text-amber-900 mb-1"
                    >
                      Discount Justification / Reason *
                    </label>
                    <input
                      id="quote-discount-reason"
                      type="text"
                      required
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder="e.g. Strategic multi-year contract commitment / executive approved"
                      className="w-full px-3 py-1.5 text-xs rounded border border-amber-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 text-[#091E42]"
                    />
                  </div>
                </div>
              )}

              {/* Recipient Email & Validity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="quote-recipient-email"
                    className="block text-xs font-semibold text-[#091E42] mb-1"
                  >
                    Recipient Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8993A4] absolute left-3 top-2.5" />
                    <input
                      id="quote-recipient-email"
                      type="email"
                      required
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="contact@company.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:border-[#0652CC] focus:ring-1 focus:ring-[#0652CC] outline-hidden text-[#091E42]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="quote-validity-days"
                    className="block text-xs font-semibold text-[#091E42] mb-1"
                  >
                    Validity Period (Days)
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#8993A4] absolute left-3 top-2.5" />
                    <input
                      id="quote-validity-days"
                      type="number"
                      min={1}
                      max={365}
                      value={validityDays}
                      onChange={(e) => setValidityDays(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:border-[#0652CC] focus:ring-1 focus:ring-[#0652CC] outline-hidden text-[#091E42]"
                    />
                  </div>
                </div>
              </div>

              {/* Live Calculation Summary Card */}
              <div className="bg-[#F7F9FC] rounded-xl p-4 border border-[#E8ECF1] space-y-2">
                <div className="flex justify-between items-center text-xs text-[#6B778C]">
                  <span>Base Price:</span>
                  <span>${amount.toLocaleString()} USD</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between items-center text-xs text-amber-600 font-medium">
                    <span>Discount ({discountPercent}%):</span>
                    <span>-${calculatedDiscountAmount.toLocaleString()} USD</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#E8ECF1] flex justify-between items-center">
                  <span className="text-xs font-bold text-[#091E42]">Final Quoted Amount:</span>
                  <span className="text-base font-extrabold text-[#0652CC]">
                    ${finalAmount.toLocaleString()} USD
                  </span>
                </div>
                <div className="text-[11px] text-[#8993A4] pt-1">
                  Status on submit: {requiresApproval ? 'PENDING APPROVAL' : 'IMMEDIATELY SENT'}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-[#E8ECF1] bg-[#F7F9FC] flex justify-end gap-2 items-center">
              <button
                type="button"
                onClick={onClose}
                disabled={sendQuoteMutation.isPending || !canSendQuote}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-[#D9E2EC] text-[#091E42] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="submit-send-quote-btn"
                type="submit"
                disabled={sendQuoteMutation.isPending || !canSendQuote}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0652CC] text-white hover:bg-[#0747b8] transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {sendQuoteMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{requiresApproval ? 'Submit for Approval' : 'Send Quote'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
