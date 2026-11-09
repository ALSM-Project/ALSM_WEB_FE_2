import React, { useState } from 'react';
import { Award, CheckCircle2, X } from 'lucide-react';
import { Button, toast } from '@/shared/ui';
import type { MeetingRequest } from '../types/meeting-request';

interface RecordOutcomeModalProps {
  meeting: MeetingRequest;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { summary: string; qualificationScore?: number; nextSteps?: string }) => Promise<void>;
  isSubmitting: boolean;
}

export const RecordOutcomeModal: React.FC<RecordOutcomeModalProps> = ({
  meeting,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [summary, setSummary] = useState('');
  const [qualificationScore, setQualificationScore] = useState<number>(80);
  const [nextSteps, setNextSteps] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      toast.warning('Please provide a consultation outcome summary');
      return;
    }

    await onSubmit({
      summary: summary.trim(),
      qualificationScore,
      nextSteps: nextSteps.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Record Meeting Outcome</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Consultation results for {meeting.customer.companyName} ({meeting.requestId})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Consultation Summary & Key Findings *
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Client verified 120 BMS maps and 45 CICS programs. Main technical blocker is legacy subfile handling. Demonstrated live AST transformation studio..."
              rows={4}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                Qualification Score: {qualificationScore}/100
              </label>
              <span className="text-[11px] font-bold text-slate-500">
                {qualificationScore >= 80 ? 'Highly Qualified' : qualificationScore >= 60 ? 'Promising' : 'Requires Nurturing'}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={qualificationScore}
              onChange={(e) => setQualificationScore(Number(e.target.value))}
              className="w-full accent-[#244A70] cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Agreed Next Steps
            </label>
            <textarea
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              placeholder="e.g. Send formal NDA and Enterprise quotation for 120 screens PoC package."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isSubmitting ? 'Recording...' : 'Mark Consultation Completed'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
