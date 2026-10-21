import React, { useState } from 'react';
import { Button, Input, Modal } from '@/shared/ui';
import { ShieldAlert, FileText } from 'lucide-react';
import { crmApi, LeadQuote } from '../api/crm.api';

export interface CreateQuoteModalProps {
  isOpen: boolean;
  leadId: string;
  leadCompany: string;
  onClose: () => void;
  onSuccess: (quote: LeadQuote) => void;
  onPreviewRequested?: (quoteDraft: {
    plan: string;
    projectScope: string;
    basePrice: number;
    discountPercent: number;
    finalPrice: number;
    discountReason?: string;
  }) => void;
}

export const CreateQuoteModal: React.FC<CreateQuoteModalProps> = ({
  isOpen,
  leadId,
  leadCompany,
  onClose,
  onSuccess,
  onPreviewRequested,
}) => {
  const [plan, setPlan] = useState('Enterprise Tier 1');
  const [projectScope, setProjectScope] = useState('120 COBOL CICS screens & 45 Batch jobs');
  const [basePrice, setBasePrice] = useState(85000);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [discountReason, setDiscountReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const finalPrice = Math.round(basePrice * (1 - discountPercent / 100));
  const requiresApproval = discountPercent > 15;

  const handlePlanChange = (selectedPlan: string) => {
    setPlan(selectedPlan);
    if (selectedPlan === 'Enterprise Tier 1') {
      setBasePrice(85000);
      setProjectScope('120 COBOL CICS screens & 45 Batch jobs');
    } else if (selectedPlan === 'Enterprise Tier 2') {
      setBasePrice(150000);
      setProjectScope('350 COBOL screens, 120 Batch programs, 99.9% uptime SLA');
    } else if (selectedPlan === 'Professional') {
      setBasePrice(45000);
      setProjectScope('50 BMS screens & core database validation');
    } else {
      setBasePrice(25000);
      setProjectScope('Pilot project (20 screens)');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requiresApproval && !discountReason.trim()) {
      setErrorMsg('Discounts above 15% require an explicit justification for Sales Manager approval.');
      return;
    }

    try {
      setSubmitting(true);
      const quote = await crmApi.createQuote(leadId, {
        plan,
        projectScope: projectScope.trim(),
        basePrice: Number(basePrice) || 50000,
        discountPercent: Number(discountPercent) || 0,
        discountReason: discountReason.trim() || undefined,
      });

      onSuccess(quote);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create quote.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Create Commercial Quote for ${leadCompany}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Modernization Plan</label>
            <select
              value={plan}
              onChange={(e) => handlePlanChange(e.target.value)}
              className="w-full text-xs py-2 px-2.5 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42] focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
            >
              <option value="Pilot Sandbox">Pilot Sandbox ($25,000)</option>
              <option value="Professional">Professional Tier ($45,000)</option>
              <option value="Enterprise Tier 1">Enterprise Tier 1 ($85,000)</option>
              <option value="Enterprise Tier 2">Enterprise Tier 2 ($150,000)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Base Price ($)</label>
            <Input
              type="number"
              min="10000"
              step="5000"
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value))}
              className="text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-[#091E42] mb-1">Project Scope & Deliverables</label>
          <Input
            value={projectScope}
            onChange={(e) => setProjectScope(e.target.value)}
            placeholder="e.g. 120 COBOL CICS screens & 45 Batch jobs"
            className="text-xs"
          />
        </div>

        <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0] space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-[#091E42]">Discount Percentage (%)</label>
            <span className="font-mono font-bold text-sm text-[#091E42]">{discountPercent}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="35"
            step="5"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
            className="w-full accent-[#0652CC] cursor-pointer"
          />

          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E5EAF0]">
            <span className="text-[#6B778C]">Effective Price:</span>
            <span className="font-mono text-base font-extrabold text-[#0652CC]">
              ${finalPrice.toLocaleString()}
            </span>
          </div>

          {requiresApproval && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                Sales Manager Approval Required ({discountPercent}% &gt; 15% threshold)
              </div>
              <p>
                Discounts greater than 15% will automatically route this quote to the <strong>Discount Approvals</strong> queue before it can be accepted.
              </p>
              <Input
                required
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="Reason for discount (e.g., multi-year commitment, competitive deal)..."
                className="mt-1 text-xs bg-white"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#E5EAF0]">
          {onPreviewRequested && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() =>
                onPreviewRequested({
                  plan,
                  projectScope,
                  basePrice,
                  discountPercent,
                  finalPrice,
                  discountReason,
                })
              }
              className="text-[#0652CC] border-blue-200"
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              Preview Quote Sheet
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={submitting}
              className="bg-[#0652CC] hover:bg-[#0543A8] text-white"
            >
              {submitting ? 'Generating...' : 'Issue Quote'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
