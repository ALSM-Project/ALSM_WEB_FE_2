import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Modal } from '@/shared/ui';
import { FileCheck2, Info } from 'lucide-react';
import { crmApi, LeadContract, LeadQuote } from '../api/crm.api';
import type { ApprovedContractTemplateVersion } from '../types/crm.types';
import { formatVnd } from '@/shared/utils/currency';

const EMPTY_CONTRACT_QUOTES: LeadQuote[] = [];

export interface CreateContractModalProps {
  isOpen: boolean;
  leadId: string;
  leadCompany: string;
  quotes?: LeadQuote[];
  initialQuoteId?: string;
  editingContract?: LeadContract | null;
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
  editingContract = null,
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
  const [approvedTemplates, setApprovedTemplates] = useState<ApprovedContractTemplateVersion[]>([]);
  const [approvedTemplateVersionId, setApprovedTemplateVersionId] = useState('');
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const submitLock = useRef(false);
  const requestKey = useRef<{ signature: string; id: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const accepted = quotes.filter((quote) => quote.status === 'ACCEPTED');
    const initialQuote = accepted.find((quote) => quote.id === initialQuoteId) || accepted[0];
    setTitle(editingContract?.title || `Enterprise Modernization Agreement - ${leadCompany}`);
    setQuoteId(editingContract?.quoteId || initialQuote?.id || '');
    setPlan(editingContract?.plan || initialQuote?.plan || 'Enterprise Tier 1');
    setAnnualValue(editingContract?.annualValue || initialQuote?.finalPrice || 85000);
    setEffectiveDate(editingContract?.effectiveDate || new Date().toLocaleDateString('en-CA'));
    setApprovedTemplateVersionId(editingContract?.approvedTemplateVersionId || '');
    setErrorMsg(null);
    submitLock.current = false;
    requestKey.current = null;
  }, [isOpen, leadId, leadCompany, initialQuoteId, quotes, editingContract]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setTemplatesLoading(true);
    void crmApi.listApprovedContractTemplates()
      .then((templates) => {
        if (cancelled) return;
        setApprovedTemplates(templates);
        setApprovedTemplateVersionId((current) => templates.some((template) => template.id === current) ? current : templates[0]?.id || '');
      })
      .catch(() => {
        if (!cancelled) setErrorMsg('Approved legal templates could not be loaded. Refresh and try again.');
      })
      .finally(() => { if (!cancelled) setTemplatesLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen]);

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
    if (!approvedTemplateVersionId || !approvedTemplates.some((template) => template.id === approvedTemplateVersionId)) {
      setErrorMsg('An approved legal template is required before a contract draft can be created. Contact the authorized template administrator.');
      return;
    }
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
      approvedTemplateVersionId,
    };
    const signature = JSON.stringify(payload);
    if (!requestKey.current || requestKey.current.signature !== signature) {
      requestKey.current = { signature, id: crypto.randomUUID() };
    }

    submitLock.current = true;
    try {
      setSubmitting(true);
      setErrorMsg(null);
      if (editingContract) {
        const revised = await crmApi.reviseLegalContract(leadId, editingContract.id, requestKey.current.id, payload);
        onSuccess({
          id: revised.contract.id,
          contractNumber: revised.contract.contractNumber,
          title: revised.version.title,
          plan: revised.version.plan,
          quoteId: revised.version.quoteId,
          annualValue: revised.version.annualValue,
          status: 'DRAFT',
          effectiveDate: revised.version.effectiveDate,
          createdAt: revised.contract.createdAt,
          workflowStatus: revised.contract.lifecycleStatus,
          reviewStatus: revised.contract.reviewStatus,
          versionId: revised.version.id,
          documentAvailable: revised.documentAvailable,
          signingAvailable: revised.signingAvailable,
          signingBlockedReason: revised.signingBlockedReason,
          approvedTemplateVersionId: revised.version.approvedTemplateVersionId,
          approvedTemplateSnapshot: revised.version.approvedTemplateSnapshot,
        });
      } else {
        onSuccess(await crmApi.createContract(leadId, requestKey.current.id, payload));
      }
      onClose();
    } catch (err) {
      const error = err as { response?: { status?: number; data?: { code?: string; message?: string | string[]; details?: Array<{ retrySafe?: boolean; mutationCommitted?: boolean | 'unknown' }> } } };
      const status = error.response?.status;
      const code = error.response?.data?.code;
      const message = error.response?.data?.message;
      const outcome = error.response?.data?.details?.[0];
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
        if (code === 'MONGO_TRANSACTIONS_REQUIRED') {
          setErrorMsg('The contract was not saved because the database is not ready for this operation. Contact an administrator before retrying.');
        } else if (code === 'ATOMIC_MUTATION_ABORTED' || outcome?.mutationCommitted === false) {
          setErrorMsg('The contract was not saved. The service could not complete the save; contact an administrator before retrying.');
        } else if (outcome?.mutationCommitted === 'unknown') {
          setErrorMsg('The save result could not be confirmed. Check Contracts & E-Sign before retrying.');
        } else {
          setErrorMsg('Contract creation is temporarily unavailable. Check Contracts & E-Sign before retrying.');
        }
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
      title={`${editingContract ? 'Revise' : 'Create'} Contract Draft for ${leadCompany}`}
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
            <span className="font-semibold text-blue-950">{editingContract ? 'New immutable version' : 'Contract initiation'}</span>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Create a metadata draft for internal review. This does not issue a legal agreement or send anything to the customer. Signing stays unavailable until the approved contract text and signing provider are configured.
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
            disabled={submitting || !canCreateContract || templatesLoading || approvedTemplates.length === 0 || !approvedTemplateVersionId}
            required
          />
        </div>

        <div>
          <label htmlFor="contract-approved-template" className="block font-semibold text-[#091E42] mb-1">Approved Legal Template *</label>
          <select
            id="contract-approved-template"
            value={approvedTemplateVersionId}
            onChange={(e) => setApprovedTemplateVersionId(e.target.value)}
            disabled={submitting || templatesLoading || !canCreateContract || approvedTemplates.length === 0}
            required
            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{templatesLoading ? 'Loading approved templates…' : approvedTemplates.length ? 'Select an approved version' : 'No approved legal templates available'}</option>
            {approvedTemplates.map((template) => (
              <option key={template.id} value={template.id}>{template.title} · v{template.versionNumber} · {template.locale.toUpperCase()}</option>
            ))}
          </select>
          {approvedTemplates.length === 0 && !templatesLoading && (
            <p className="mt-1 text-[11px] text-amber-800">An authorized Legal administrator must create and approve a template before Sales can create a contract.</p>
          )}
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
            <label className="block font-semibold text-[#091E42] mb-1">Draft status</label>
            <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700 font-medium">
              {editingContract ? 'New draft version (not yet a legal document)' : 'Draft metadata (not yet a legal document)'}
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
            disabled={submitting || !canCreateContract || templatesLoading || approvedTemplates.length === 0 || !approvedTemplateVersionId}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FileCheck2 className="w-3.5 h-3.5 mr-1" />
            {submitting ? 'Saving Draft...' : editingContract ? 'Save New Version' : 'Create Draft'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
