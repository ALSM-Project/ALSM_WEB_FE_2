import React, { useState } from 'react';
import { Button, Input, Modal } from '@/shared/ui';
import { Sparkles } from 'lucide-react';
import { crmApi, LeadDemo } from '../api/crm.api';

export interface ScheduleDemoModalProps {
  isOpen: boolean;
  leadId: string;
  leadCompany: string;
  leadEmail: string;
  onClose: () => void;
  onSuccess: (demo: LeadDemo) => void;
}

export const ScheduleDemoModal: React.FC<ScheduleDemoModalProps> = ({
  isOpen,
  leadId,
  leadCompany,
  leadEmail,
  onClose,
  onSuccess,
}) => {
  const [topic, setTopic] = useState(`ALSM Modernization Demo: ${leadCompany}`);
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(14, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [attendees, setAttendees] = useState(leadEmail);
  const [agenda, setAgenda] = useState('1. Introduction & Overview\n2. Live COBOL to React conversion walkthrough\n3. Q&A and Next Steps');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setErrorMsg('Demo topic is required.');
      return;
    }
    if (!scheduledAt) {
      setErrorMsg('Demo date and time are required.');
      return;
    }

    try {
      setSubmitting(true);
      const attendeeList = attendees
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const demo = await crmApi.scheduleDemo(leadId, {
        topic: topic.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: Number(durationMinutes) || 45,
        attendees: attendeeList.length > 0 ? attendeeList : [leadEmail],
        agenda: agenda.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess(demo);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to schedule demo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Schedule Modernization Demo for ${leadCompany}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
            {errorMsg}
          </div>
        )}

        <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Simulated Enterprise Meeting Generator:</span>
            <p className="text-[11px] text-purple-800">
              This scheduling action generates a dedicated mock Google Meet room link for customer presentation without triggering live external mailers.
            </p>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-[#091E42] mb-1">Demo Title / Topic *</label>
          <Input
            required
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="text-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Date & Time *</label>
            <Input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Duration</label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full text-xs py-2 px-2.5 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42] focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
            >
              <option value={30}>30 Minutes</option>
              <option value={45}>45 Minutes (Recommended)</option>
              <option value={60}>60 Minutes (Deep Dive)</option>
              <option value={90}>90 Minutes (Architecture Review)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-[#091E42] mb-1">Attendee Emails (comma-separated)</label>
          <Input
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="j.vance@apexbank.com, cto@apexbank.com"
            className="text-xs"
          />
        </div>

        <div>
          <label className="block font-semibold text-[#091E42] mb-1">Demo Agenda / Target Code</label>
          <textarea
            rows={2}
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-[#D9E2EC] focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
          />
        </div>

        <div>
          <label className="block font-semibold text-[#091E42] mb-1">Internal Preparation Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key technical risks, customer objections to address..."
            className="w-full text-xs p-2.5 rounded-xl border border-[#D9E2EC] focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#E5EAF0]">
          <span className="text-[11px] text-[#6B778C]">
            Auto-advances lead stage to <strong>Qualified</strong>.
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
              {submitting ? 'Scheduling...' : 'Schedule Demo'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
