import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle, PhoneCall, X } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { leadsApi } from '../api/leads.api';
import type { Lead, LogPhoneCallPayload, LogPhoneCallResponse } from '../types/lead';
import { LEAD_PHONE_CALL_OUTCOME_LABELS } from '../types/lead';

interface LogPhoneCallModalProps {
  lead: Lead;
  onClose: () => void;
  onSuccess: (result: LogPhoneCallResponse) => void;
}

const localDateTime = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const safeErrorMessage = (error: unknown) => {
  const status = (error as { response?: { status?: number; data?: { code?: string } } })?.response?.status;
  const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
  if (status === 400) {
    return code === 'INVALID_FOLLOW_UP_DATE'
      ? 'Follow-up date and time must be in the future.'
      : 'Check the required fields and enter valid call details.';
  }
  if (status === 401) return 'Your session has expired. Sign in again before logging the call.';
  if (status === 403) return 'You do not have permission to log calls for this lead.';
  if (status === 404) return 'This lead could not be found. Refresh the list and try again.';
  if (status === 409) return 'The lead changed or this retry key was used for different details. Refresh the lead and try again.';
  if (status === 503) return 'Call logging is temporarily unavailable. Retry the same submission shortly.';
  return 'The call could not be logged. Please try again shortly.';
};

export const LogPhoneCallModal: React.FC<LogPhoneCallModalProps> = ({ lead, onClose, onSuccess }) => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('sales.leads.manage');
  const [outcome, setOutcome] = useState<LogPhoneCallPayload['outcome'] | ''>('');
  const [durationMinutes, setDurationMinutes] = useState('15');
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestKey = useRef<{ signature: string; id: string } | null>(null);
  const submitLock = useRef(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage || submitLock.current) return;
    setErrorMessage(null);

    const trimmedSummary = summary.trim();
    const trimmedNotes = notes.trim();
    const duration = Number(durationMinutes);
    const followUpDate = followUpAt ? new Date(followUpAt) : undefined;
    if (followUpDate && (!Number.isFinite(followUpDate.getTime()) || followUpDate.getTime() <= Date.now())) {
      setErrorMessage('Follow-up date and time must be in the future.');
      return;
    }
    if (!outcome || !trimmedSummary || trimmedSummary.length > 500 || !Number.isInteger(duration) || duration < 1 || duration > 480 || trimmedNotes.length > 2000) {
      setErrorMessage('Complete the outcome, a summary, and a valid duration before submitting.');
      return;
    }
    const payload: LogPhoneCallPayload = {
      outcome,
      durationMinutes: duration,
      summary: trimmedSummary,
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      ...(followUpDate ? { followUpAt: followUpDate.toISOString() } : {}),
    };
    const signature = JSON.stringify(payload);
    if (!requestKey.current || requestKey.current.signature !== signature) {
      requestKey.current = { signature, id: crypto.randomUUID() };
    }

    submitLock.current = true;
    setIsSubmitting(true);
    try {
      const result = await leadsApi.logPhoneCall(lead.id, payload, requestKey.current.id);
      onSuccess(result);
    } catch (error) {
      setErrorMessage(safeErrorMessage(error));
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-phone-call-title"
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-2xl"
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape' && !isSubmitting) onClose();
          if (event.key === 'Tab') {
            const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled])',
            ));
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header className="flex items-center justify-between border-b border-[#E8ECF1] bg-[#F7F9FC] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-[#0652CC]">
              <PhoneCall aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 id="log-phone-call-title" className="font-bold text-[#091E42]">Log Phone Call</h2>
              <p className="text-xs text-[#6B778C]">{lead.companyName} · {lead.contactName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close log phone call" className="rounded p-1 text-[#6B778C] hover:bg-gray-200 disabled:opacity-50">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={submit} noValidate className="overflow-y-auto p-5">
          {!canManage && (
            <p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              You do not have the sales.leads.manage permission to log a call.
            </p>
          )}
          {errorMessage && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{errorMessage}</p>}

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[#253858]">
              Call outcome <span className="text-rose-600" aria-hidden="true">*</span>
              <select
                autoFocus
                required
                value={outcome}
                onChange={(event) => setOutcome(event.target.value as LogPhoneCallPayload['outcome'] | '')}
                disabled={!canManage || isSubmitting}
                className="mt-1.5 block w-full rounded-lg border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm"
              >
                <option value="">Select an outcome</option>
                {Object.entries(LEAD_PHONE_CALL_OUTCOME_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-[#253858]">
              Duration (minutes) <span className="text-rose-600" aria-hidden="true">*</span>
              <input
                required
                type="number"
                min={1}
                max={480}
                step={1}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                disabled={!canManage || isSubmitting}
                className="mt-1.5 block w-full rounded-lg border border-[#D9E2EC] px-3 py-2.5 text-sm"
              />
            </label>
          </div>

          <label className="mb-4 block text-sm font-medium text-[#253858]">
            Call summary <span className="text-rose-600" aria-hidden="true">*</span>
            <textarea
              required
              autoComplete="off"
              maxLength={500}
              rows={3}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              disabled={!canManage || isSubmitting}
              aria-describedby="call-summary-count"
              placeholder="What did you and the contact discuss?"
              className="mt-1.5 block w-full resize-y rounded-lg border border-[#D9E2EC] px-3 py-2.5 text-sm"
            />
            <span id="call-summary-count" className="mt-1 block text-right text-xs text-[#6B778C]">{summary.length}/500</span>
          </label>

          <label className="mb-4 block text-sm font-medium text-[#253858]">
            Follow-up date and time <span className="text-xs font-normal text-[#6B778C]">(optional)</span>
            <input
              type="datetime-local"
              min={localDateTime(new Date())}
              value={followUpAt}
              onChange={(event) => setFollowUpAt(event.target.value)}
              disabled={!canManage || isSubmitting}
              className="mt-1.5 block w-full rounded-lg border border-[#D9E2EC] px-3 py-2.5 text-sm"
            />
          </label>

          <label className="mb-4 block text-sm font-medium text-[#253858]">
            Internal notes <span className="text-xs font-normal text-[#6B778C]">(optional)</span>
            <textarea
              maxLength={2000}
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={!canManage || isSubmitting}
              aria-describedby="call-notes-count"
              placeholder="Additional context or next steps for the sales team"
              className="mt-1.5 block w-full resize-y rounded-lg border border-[#D9E2EC] px-3 py-2.5 text-sm"
            />
            <span id="call-notes-count" className="mt-1 block text-right text-xs text-[#6B778C]">{notes.length}/2,000</span>
          </label>

          <footer className="flex flex-col-reverse gap-2 border-t border-[#E8ECF1] pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#253858] disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={!canManage || isSubmitting} aria-busy={isSubmitting} className="flex items-center justify-center gap-2 rounded-lg bg-[#0652CC] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0747b8] disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving call…' : 'Save call'}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
};
