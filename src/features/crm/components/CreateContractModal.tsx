import React, { useState } from 'react';
import { Button, Input, Modal } from '@/shared/ui';
import { FileCheck2, Info } from 'lucide-react';
import { crmApi, LeadContract, LeadQuote } from '../api/crm.api';

export interface CreateContractModalProps {
  isOpen: boolean;
  leadId: string;
  leadCompany: string;
  quotes?: LeadQuote[];
  initialQuoteId?: string;
  onClose: () => void;
  onSuccess: (contract: LeadContract) => void;
}

export const CreateContractModal: React.FC<CreateContractModalProps> = ({
  isOpen,
  leadId,
  leadCompany,
  quotes = [],
  initialQuoteId,
  onClose,
  onSuccess,
}) => {
  const selectedQuote = quotes.find(q => q.id === initialQuoteId) || quotes.find(q => q.status === 'ACCEPTED') || quotes[0];

  const [title, setTitle] = useState(`Enterprise Modernization Agreement - ${leadCompany}`);
  const [quoteId, setQuoteId] = useState(selectedQuote?.id || '');
  const [plan, setPlan] = useState(selectedQuote?.plan || 'Enterprise Tier 1');
  const [annualValue, setAnnualValue] = useState(selectedQuote?.finalPrice || 85000);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleQuoteChange = (selectedId: string) => {
    setQuoteId(selectedId);
    const q = quotes.find(item => item.id === selectedId);
    if (q) {
      setPlan(q.plan);
      setAnnualValue(q.finalPrice);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please specify contract title.');
      return;
    }
    if (!annualValue || annualValue <= 0) {
      setErrorMsg('Contract value must be greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const contract = await crmApi.createContract(leadId, {
        title: title.trim(),
        plan,
        quoteId: quoteId || undefined,
        annualValue: Number(annualValue),
        effectiveDate,
      });

      onSuccess(contract);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate contract draft.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Create Legal Contract for ${leadCompany}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
            {errorMsg}
          </div>
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
          <label className="block font-semibold text-[#091E42] mb-1">Contract Title *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Master Services Agreement & License Schedule"
            required
          />
        </div>

        {quotes.length > 0 && (
          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Associate Commercial Quote</label>
            <select
              value={quoteId}
              onChange={(e) => handleQuoteChange(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- No Direct Quote Association --</option>
              {quotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quoteNumber} - {q.plan} (${q.finalPrice.toLocaleString()}) [{q.status}]
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Modernization Tier / Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Enterprise Tier 1">Enterprise Tier 1</option>
              <option value="Enterprise Tier 2">Enterprise Tier 2</option>
              <option value="Professional">Professional</option>
              <option value="Standard Pilot">Standard Pilot</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Total Contract Value ($ USD) *</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono">$</span>
              <Input
                type="number"
                min="1"
                className="pl-6"
                value={annualValue}
                onChange={(e) => setAnnualValue(Number(e.target.value))}
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Effective Date</label>
            <div className="relative">
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
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
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={submitting}
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
