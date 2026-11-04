import React, { useState } from 'react';
import { Button, Input, Modal } from '@/shared/ui';
import { ArrowRight, Lock } from 'lucide-react';
import { LeadDto, LeadStage } from '../types/crm.types';
import { crmApi } from '../api/crm.api';
import { formatVnd } from '@/shared/utils/currency';

export interface ManageStageModalProps {
  isOpen: boolean;
  lead: LeadDto;
  onClose: () => void;
  onSuccess: (updatedLead: LeadDto) => void;
  onOpenActivation?: () => void;
}

export const ManageStageModal: React.FC<ManageStageModalProps> = ({
  isOpen,
  lead,
  onClose,
  onSuccess,
  onOpenActivation,
}) => {
  const [selectedStage, setSelectedStage] = useState<LeadStage>(
    lead.stage === 'WON' ? 'WON' : lead.stage
  );
  const [notes, setNotes] = useState('');
  const [nextFollowUpAt, setNextFollowUpAt] = useState(
    lead.nextFollowUpAt ? lead.nextFollowUpAt.split('T')[0] : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const availableStages: { key: LeadStage; label: string; desc: string }[] = [
    { key: 'NEW', label: 'New Lead', desc: 'Inbound or captured prospect awaiting initial outreach' },
    { key: 'CONTACTED', label: 'Contacted', desc: 'Sales representative has initiated correspondence or call' },
    { key: 'QUALIFIED', label: 'Qualified', desc: 'Technical & budget qualification completed, demo presented' },
    { key: 'PROPOSAL', label: 'Proposal / Contract', desc: 'Commercial quotation issued or contract out for review' },
    { key: 'LOST', label: 'Closed Lost', desc: 'Opportunity lost, disqualified, or postponed indefinitely' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedStage === lead.stage && !notes.trim()) {
      onClose();
      return;
    }

    if (selectedStage === 'WON') {
      setErrorMsg("Manual selection of 'Won' is disabled by policy. Please trigger Customer Activation.");
      return;
    }

    try {
      setSubmitting(true);
      const updated = await crmApi.updateLeadStage(lead.id, {
        stage: selectedStage,
        notes: notes.trim() || undefined,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : undefined,
      });

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update stage.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasSignedContract = lead.contracts?.some(c => c.status === 'FULLY_SIGNED' || c.status === 'SIGNED');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Pipeline Stage: ${lead.company}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* Current status display */}
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Current Pipeline Stage</span>
            <div className="font-semibold text-slate-900 mt-0.5">{lead.stage}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Deal Value</span>
            <div className="font-semibold text-blue-600 mt-0.5">
              {formatVnd(lead.dealValue || 0)}
            </div>
          </div>
        </div>

        {/* Stage Selection list */}
        <div>
          <label className="block font-semibold text-[#091E42] mb-2">Select Target Stage</label>
          <div className="space-y-2">
            {availableStages.map((st) => (
              <label
                key={st.key}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedStage === st.key
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="pipelineStage"
                  value={st.key}
                  checked={selectedStage === st.key}
                  onChange={() => setSelectedStage(st.key)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{st.label}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">{st.desc}</div>
                </div>
              </label>
            ))}

            {/* Won Stage - Disabled & Restricted with Explanation */}
            <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/80 opacity-90">
              <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Closed Won (Automated Activation Only)</span>
                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-semibold rounded">
                    System Controlled
                  </span>
                </div>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  Per Section 3.11 requirements, sales representatives cannot manually select "Won". 
                  Transition to Won requires an executed contract, payment confirmation, and automated customer tenant provisioning.
                </p>
                {lead.stage === 'PROPOSAL' && onOpenActivation && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenActivation();
                      }}
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold text-xs"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      {hasSignedContract ? 'Execute Customer Activation Now' : 'Open Activation Checklist & Requirements'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Change Audit Notes */}
        <div>
          <label className="block font-semibold text-[#091E42] mb-1">
            Reason / Stage Change Notes {selectedStage !== lead.stage && '*'}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add context for this stage change (logged to stage audit history)..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={selectedStage !== lead.stage}
          />
        </div>

        {/* Next Follow Up Date */}
        <div>
          <label className="block font-semibold text-[#091E42] mb-1">Next Follow-up Date</label>
          <Input
            type="date"
            value={nextFollowUpAt}
            onChange={(e) => setNextFollowUpAt(e.target.value)}
          />
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
            {submitting ? 'Updating...' : 'Save Stage Update'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
