import React, { useState } from 'react';
import { Button, Input, Modal } from '@/shared/ui';
import { Phone, Mail, Users, FileText } from 'lucide-react';
import { crmApi, LeadInteraction } from '../api/crm.api';

export interface LogInteractionModalProps {
  isOpen: boolean;
  leadId: string;
  leadCompany: string;
  onClose: () => void;
  onSuccess: (interaction: LeadInteraction) => void;
}

export const LogInteractionModal: React.FC<LogInteractionModalProps> = ({
  isOpen,
  leadId,
  leadCompany,
  onClose,
  onSuccess,
}) => {
  const [type, setType] = useState<LeadInteraction['type']>('PHONE_CALL');
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [outcome, setOutcome] = useState('Connected with Decision Maker');
  const [summary, setSummary] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      setErrorMsg('Interaction summary is required.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await crmApi.logInteraction(leadId, {
        type,
        durationMinutes: Number(durationMinutes) || 15,
        outcome,
        summary: summary.trim(),
        actionItems: actionItems.trim() || undefined,
        details: details.trim() || undefined,
      });

      onSuccess(res);
      onClose();
      setSummary('');
      setActionItems('');
      setDetails('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to log interaction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log Interaction for ${leadCompany}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* Interaction Type Selector */}
        <div>
          <label className="block font-semibold text-[#091E42] mb-1.5">Interaction Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: 'PHONE_CALL', label: 'Phone Call', icon: Phone },
              { key: 'EMAIL', label: 'Email', icon: Mail },
              { key: 'MEETING', label: 'Meeting', icon: Users },
              { key: 'NOTE', label: 'Quick Note', icon: FileText },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key as any)}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition-all cursor-pointer ${
                    type === t.key
                      ? 'border-[#0652CC] bg-blue-50/70 text-[#0652CC] ring-1 ring-[#0652CC]'
                      : 'border-[#E5EAF0] text-[#6B778C] hover:bg-[#F7F9FC]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Call Duration (Minutes)</label>
            <Input
              type="number"
              min="1"
              max="240"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Outcome</label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full text-xs py-2 px-2.5 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42] focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
            >
              <option value="Connected with Decision Maker">Connected with Decision Maker</option>
              <option value="Demo Agreed">Demo Agreed</option>
              <option value="Proposal Requested">Proposal Requested</option>
              <option value="Follow-up Requested">Follow-up Requested</option>
              <option value="Left Voicemail">Left Voicemail</option>
              <option value="Gatekeeper Refusal">Gatekeeper Refusal</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-[#091E42] mb-1">Summary *</label>
          <Input
            required
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="e.g. Discussed core modernization requirements and SLA constraints..."
            className="text-xs"
          />
        </div>

        <div>
          <label className="block font-semibold text-[#091E42] mb-1">Action Items / Next Steps</label>
          <Input
            value={actionItems}
            onChange={(e) => setActionItems(e.target.value)}
            placeholder="e.g. Schedule architecture deep dive for Thursday 2 PM"
            className="text-xs"
          />
        </div>

        <div>
          <label className="block font-semibold text-[#091E42] mb-1">Detailed Discussion Notes</label>
          <textarea
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Specific technical topics, decision makers involved, objections addressed..."
            className="w-full text-xs p-2.5 rounded-xl border border-[#D9E2EC] focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#E5EAF0]">
          <span className="text-[11px] text-[#6B778C]">
            Updates the lead's <strong>Last Contacted</strong> timestamp.
          </span>
          <div className="flex items-center gap-2">
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
              {submitting ? 'Logging...' : 'Save Interaction'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
