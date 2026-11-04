import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, LoaderCircle, X } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { leadsApi } from '../api/leads.api';
import { LEAD_STATUS_LABELS } from '../types/lead';
import type { Lead, ScheduleDemoPayload, ScheduleDemoResponse } from '../types/lead';

interface ScheduleDemoModalProps {
  lead: Lead;
  onClose: () => void;
  onSuccess: (result: ScheduleDemoResponse) => void;
}

const localDateTime = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const safeErrorMessage = (error: unknown) => {
  const status = (error as { response?: { status?: number; data?: { code?: string } } })?.response?.status;
  const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
  if (status === 400) {
    return code === 'INVALID_DEMO_DATE'
      ? 'Choose a date and time in the future.'
      : code === 'LEAD_NOT_SCHEDULABLE'
        ? 'A demo cannot be scheduled for a closed lead.'
        : 'Check the title, duration, attendee emails, and other required fields.';
  }
  if (status === 401) return 'Your session has expired. Sign in again before scheduling the demo.';
  if (status === 403) return 'You do not have permission to schedule demos for this lead.';
  if (status === 404) return 'This lead could not be found. Refresh the list and try again.';
  if (status === 409) return 'The lead changed or this retry key was used for different details. Refresh the lead and try again.';
  if (status === 503) return 'Demo scheduling is temporarily unavailable. Retry the same submission shortly.';
  return 'The demo could not be scheduled. Please try again shortly.';
};

export const ScheduleDemoModal: React.FC<ScheduleDemoModalProps> = ({ lead, onClose, onSuccess }) => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('sales.leads.manage');
  const [title, setTitle] = useState(`Modernization Demo: ${lead.companyName}`.slice(0, 200));
  const [scheduledAt, setScheduledAt] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    date.setHours(14, 0, 0, 0);
    return localDateTime(date);
  });
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [attendees, setAttendees] = useState(lead.contactEmail);
  const [agenda, setAgenda] = useState('1. Introduction and overview\n2. Modernization walkthrough\n3. Q&A and next steps');
  const [internalNotes, setInternalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestKey = useRef<{ signature: string; id: string } | null>(null);
  const submitLock = useRef(false);
  const isClosedLead = lead.status === 'WON' || lead.status === 'LOST';

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage || isClosedLead || submitLock.current) return;
    setErrorMessage(null);

    const normalizedTitle = title.trim();
    const localDate = scheduledAt ? new Date(scheduledAt) : new Date(Number.NaN);
    const duration = Number(durationMinutes);
    const attendeeEmails = Array.from(new Set(attendees
      .split(/[\n,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)));
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (normalizedTitle.length < 3 || normalizedTitle.length > 200) {
      setErrorMessage('Demo title must be between 3 and 200 characters.');
      return;
    }
    if (!Number.isFinite(localDate.getTime()) || localDate.getTime() <= Date.now()) {
      setErrorMessage('Choose a date and time in the future.');
      return;
    }
    if (!Number.isInteger(duration) || duration < 15 || duration > 240) {
      setErrorMessage('Demo duration must be between 15 and 240 minutes.');
      return;
    }
    if (attendeeEmails.length < 1 || attendeeEmails.length > 50 || attendeeEmails.some((email) => !validEmail.test(email))) {
      setErrorMessage('Enter between 1 and 50 valid attendee email addresses.');
      return;
    }
    if (agenda.trim().length > 2000 || internalNotes.trim().length > 2000) {
      setErrorMessage('Agenda and internal notes must each be 2,000 characters or fewer.');
      return;
    }

    const payload: ScheduleDemoPayload = {
      title: normalizedTitle,
      scheduledAt: localDate.toISOString(),
      durationMinutes: duration,
      attendeeEmails,
      ...(agenda.trim() ? { agenda: agenda.trim() } : {}),
      ...(internalNotes.trim() ? { internalNotes: internalNotes.trim() } : {}),
    };
    const signature = JSON.stringify(payload);
    if (!requestKey.current || requestKey.current.signature !== signature) {
      requestKey.current = { signature, id: crypto.randomUUID() };
    }

    submitLock.current = true;
    setIsSubmitting(true);
    try {
      onSuccess(await leadsApi.scheduleDemo(lead.id, payload, requestKey.current.id));
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
        aria-labelledby="schedule-demo-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-2xl"
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
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <CalendarClock aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 id="schedule-demo-title" className="font-bold text-[#091E42]">Schedule Demo</h2>
              <p className="text-xs text-[#6B778C]">{lead.companyName} - {lead.contactName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close schedule demo" className="rounded p-1 text-[#6B778C] hover:bg-gray-200 disabled:opacity-50">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={submit} noValidate className="overflow-y-auto p-5">
          {!canManage && (
            <p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              You do not have the sales.leads.manage permission to schedule a demo.
            </p>
          )}
          {isClosedLead && (
            <p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              A demo cannot be scheduled for a lead that is Won or Lost.
            </p>
          )}
          {errorMessage && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{errorMessage}</p>}

          <p className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-950">
            Current lead status: <strong>{LEAD_STATUS_LABELS[lead.status]}</strong>. Scheduling moves New or Contacted leads to Qualified; other open statuses remain unchanged.
          </p>

          <label className="mb-4 block text-sm font-medium text-[#253858]">
            Demo title <span className="text-rose-600" aria-hidden="true">*</span>
            <input autoFocus required minLength={3} maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} disabled={!canManage || isClosedLead || isSubmitting} className="mt-1.5 block w-full rounded-lg border border-[#D9E2EC] px-3 py-2.5 text-sm" />
          </label>

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[#253858]">
              Date and time <span className="text-rose-600" aria-hidden="true">*</span>
              <input required type="datetime-local" min={localDateTime(new Date(Date.now() + 60_000))} value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} disabled={!canManage || isClosedLead || isSubmitting} className="mt-1.5 block w-full rounded-lg border border-[#D9E2EC] px-3 py-2.5 text-sm" />
            </label>
            <label className="block text-sm font-medium text-[#253858]">
              Duration <span className="text-rose-600" aria-hidden="true">*</span>
              <select required value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} disabled={!canManage || isClosedLead || isSubmitting} className="mt-1.5 block w-full rounded-lg border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm">
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
                <option value="120">120 minutes</option>
              </select>
            </label>
          </div>

          <label className="mb-4 block text-sm font-medium text-[#253858]">
            Attendee emails <span className="text-rose-600" aria-hidden="true">*</span>
            <textarea required rows={2} value={attendees} onChange={(event) => setAttendees(event.target.value)} disabled={!canManage || isClosedLead || isSubmitting} aria-describedby="demo-attendees-help" placeholder="contact@example.com, teammate@example.com" className="mt-1.5 block w-full resize-y rounded-lg border border-[#D9E2EC] px-3 py-2.5 text-sm" />
            <span id="demo-attendees-help" className="mt-1 block text-xs font-normal text-[#6B778C]">Separate email addresses with commas or new lines. The lead contact is filled in automatically.</span>
          </label>

          <label className="mb-4 block text-sm font-medium text-[#253858]">
            Agenda <span className="text-xs font-normal text-[#6B778C]">(optional)</span>
            <textarea rows={3} maxLength={2000} value={agenda} onChange={(event) => setAgenda(event.target.value)} disabled={!canManage || isClosedLead || isSubmitting} aria-describedby="demo-agenda-count" className="mt-1.5 block w-full resize-y rounded-lg border border-[#D9E2EC] px-3 py-2.5 text-sm" />
            <span id="demo-agenda-count" className="mt-1 block text-right text-xs text-[#6B778C]">{agenda.length}/2,000</span>
          </label>

          <label className="mb-4 block text-sm font-medium text-[#253858]">
            Internal preparation notes <span className="text-xs font-normal text-[#6B778C]">(optional)</span>
            <textarea rows={3} maxLength={2000} value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} disabled={!canManage || isClosedLead || isSubmitting} aria-describedby="demo-notes-count" placeholder="Preparation context for the sales team" className="mt-1.5 block w-full resize-y rounded-lg border border-[#D9E2EC] px-3 py-2.5 text-sm" />
            <span id="demo-notes-count" className="mt-1 block text-right text-xs text-[#6B778C]">{internalNotes.length}/2,000</span>
          </label>

          <p className="mb-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
            Attendees receive an email notification after the demo is saved. This flow does not create calendar invitations or meeting links.
          </p>

          <footer className="flex flex-col-reverse gap-2 border-t border-[#E8ECF1] pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#253858] disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={!canManage || isClosedLead || isSubmitting} aria-busy={isSubmitting} className="flex items-center justify-center gap-2 rounded-lg bg-[#0652CC] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0747b8] disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Scheduling…' : 'Schedule Demo'}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
};
