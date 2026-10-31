import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Modal } from '@/shared/ui';
import { FileCheck2, Info } from 'lucide-react';
import { crmApi, LeadContract, LeadQuote } from '../api/crm.api';
import { formatVnd } from '@/shared/utils/currency';

const EMPTY_CONTRACT_QUOTES: LeadQuote[] = [];

export interface CreateContractModalProps {
  isOpen: boolean;
  leadId: string;
  leadCompany: string;
  quotes?: LeadQuote[];
  initialQuoteId?: string;
  canCreateContract: boolean;
  onClose: () => void;
  onSuccess: (contract: LeadContract) => void;
}

export const CreateContractModal: React.FC<CreateContractModalProps> = ({
  isOpen,
  leadId,
  leadCompany,
  quotes = EMPTY_CONTRACT_QUOTES,
  initialQuoteId,
  canCreateContract,
  onClose,
  onSuccess,
}) => {
  const acceptedQuotes = quotes.filter((quote) => quote.status === 'ACCEPTED');
  const selectedQuote = acceptedQuotes.find((quote) => quote.id === initialQuoteId) || acceptedQuotes[0];

  const [title, setTitle] = useState(`Enterprise Modernization Agreement - ${leadCompany}`);
  const [quoteId, setQuoteId] = useState(selectedQuote?.id || '');
  const [plan, setPlan] = useState(selectedQuote?.plan || 'Enterprise Tier 1');
  const [annualValue, setAnnualValue] = useState(selectedQuote?.finalPrice || 85000);
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const submitLock = useRef(false);
  const requestKey = useRef<{ signature: string; id: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const accepted = quotes.filter((quote) => quote.status === 'ACCEPTED');
    const initialQuote = accepted.find((quote) => quote.id === initialQuoteId) || accepted[0];
    setTitle(`Enterprise Modernization Agreement - ${leadCompany}`);
    setQuoteId(initialQuote?.id || '');
    setPlan(initialQuote?.plan || 'Enterprise Tier 1');
    setAnnualValue(initialQuote?.finalPrice || 85000);
    setEffectiveDate(new Date().toLocaleDateString('en-CA'));
    setErrorMsg(null);
    submitLock.current = false;
    requestKey.current = null;
  }, [isOpen, leadId, leadCompany, initialQuoteId, quotes]);

  const handleQuoteChange = (selectedId: string) => {
    setQuoteId(selectedId);
    const q = quotes.find(item => item.id === selectedId);
    if (q) {
      setPlan(q.plan);
      setAnnualValue(q.finalPrice);
    }
  };

  const handleClose = () => {
    if (!submitting) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateContract || submitLock.current) return;
    const normalizedTitle = title.trim();
    const normalizedPlan = plan.trim();
    const value = Number(annualValue);
    if (normalizedTitle.length < 3 || normalizedTitle.length > 200) {
      setErrorMsg('Contract title must be between 3 and 200 characters.');
      return;
    }
    if (normalizedPlan.length < 2 || normalizedPlan.length > 100) {
      setErrorMsg('Select a valid contract plan.');
      return;
    }
    if (!Number.isSafeInteger(value) || value <= 0) {
      setErrorMsg('Contract value must be a positive whole VND amount.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) || Number.isNaN(new Date(`${effectiveDate}T00:00:00`).getTime())) {
      setErrorMsg('Enter a valid effective date.');
      return;
    }

    const payload = {
      title: normalizedTitle,
      plan: normalizedPlan,
      quoteId: quoteId || undefined,
      annualValue: value,
      effectiveDate,
    };
    const signature = JSON.stringify(payload);
    if (!requestKey.current || requestKey.current.signature !== signature) {
      requestKey.current = { signature, id: crypto.randomUUID() };
    }

    submitLock.current = true;
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const contract = await crmApi.createContract(leadId, requestKey.current.id, payload);

      onSuccess(contract);
      onClose();
    } catch (err) {
      const error = err as { response?: { status?: number; data?: { code?: string; message?: string | string[] } } };
      const status = error.response?.status;
      const code = error.response?.data?.code;
      const message = error.response?.data?.message;
      if (status === 400) {
        setErrorMsg(Array.isArray(message) ? message.join(', ') : message || 'Check the contract details and selected quote.');
      } else if (status === 401) {
        setErrorMsg('Your session has expired. Sign in again before creating a contract.');
      } else if (status === 403) {
        setErrorMsg('You do not have permission to create contracts for this lead.');
      } else if (status === 404) {
        setErrorMsg(code === 'CONTRACT_QUOTE_NOT_FOUND' ? 'The selected quote is no longer available. Refresh the lead and try again.' : 'This lead could not be found. Refresh and try again.');
      } else if (status === 409) {
        setErrorMsg('The request conflicted with another contract update. Refresh the lead and try again.');
      } else if (status === 503) {
        setErrorMsg('Contract creation is temporarily unavailable. Retry the same submission shortly.');
      } else {
        setErrorMsg('The contract could not be created. Please try again shortly.');
      }
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Create Legal Contract for ${leadCompany}`}
    >
      <form onSubmit={handleSubmit} noValidate aria-busy={submitting} className="space-y-4 text-xs">
        {errorMsg && (
          <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
            {errorMsg}
          </div>
        )}
        {!canCreateContract && (
          <p role="alert" className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            You do not have permission to create contracts for this lead.
          </p>
        )}

        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-slate-700">
            <span className="font-semibold text-blue-950">Contract Initiation Stage</span>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Draft a binding Enterprise Master Services Agreement (MSA). Once drafted, you can preview terms, simulate DocuSign envelope dispatch, and record legal signatures.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="contract-title" className="block font-semibold text-[#091E42] mb-1">Contract Title *</label>
          <Input
            id="contract-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Master Services Agreement & License Schedule"
            disabled={submitting || !canCreateContract}
            required
          />
        </div>

        {quotes.length > 0 && (
          <div>
            <label htmlFor="contract-quote" className="block font-semibold text-[#091E42] mb-1">Associate Accepted Quote</label>
            <select
              id="contract-quote"
              value={quoteId}
              onChange={(e) => handleQuoteChange(e.target.value)}
              disabled={submitting || !canCreateContract}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- No Direct Quote Association --</option>
              {acceptedQuotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quoteNumber} - {q.plan} ({formatVnd(q.finalPrice)}) [{q.status}]
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="contract-plan" className="block font-semibold text-[#091E42] mb-1">Modernization Tier / Plan</label>
            <select
              id="contract-plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              disabled={submitting || !canCreateContract || Boolean(quoteId)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {!['Enterprise Tier 1', 'Enterprise Tier 2', 'Professional', 'Standard Pilot'].includes(plan) && (
                <option value={plan}>{plan}</option>
              )}
              <option value="Enterprise Tier 1">Enterprise Tier 1</option>
              <option value="Enterprise Tier 2">Enterprise Tier 2</option>
              <option value="Professional">Professional</option>
              <option value="Standard Pilot">Standard Pilot</option>
            </select>
          </div>

          <div>
            <label htmlFor="contract-value" className="block font-semibold text-[#091E42] mb-1">Total Contract Value (VND) *</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono">₫</span>
              <Input
                id="contract-value"
                type="number"
                min="1"
                className="pl-6"
                value={annualValue}
                onChange={(e) => setAnnualValue(Number(e.target.value))}
                disabled={submitting || !canCreateContract || Boolean(quoteId)}
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="contract-effective-date" className="block font-semibold text-[#091E42] mb-1">Effective Date</label>
            <div className="relative">
              <Input
                id="contract-effective-date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                disabled={submitting || !canCreateContract}
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Initial Status</label>
            <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700 font-medium">
              DRAFT (Awaiting E-Sign Dispatch)
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={submitting || !canCreateContract}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FileCheck2 className="w-3.5 h-3.5 mr-1" />
            {submitting ? 'Creating Draft...' : 'Generate Contract Draft'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
