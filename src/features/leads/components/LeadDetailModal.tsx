import React, { useEffect, useState } from 'react';
import type { Lead, LogPhoneCallResponse, ScheduleDemoResponse } from '../types/lead';
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS, LEAD_PRIORITY_LABELS, LEAD_PHONE_CALL_OUTCOME_LABELS } from '../types/lead';
import {
  X,
  User,
  Mail,
  Phone,
  Briefcase,
  DollarSign,
  Tag,
  Calendar,
  Clock,
  FileText,
  UserCheck,
  TrendingUp,
  Send,
  FileCheck,
  LoaderCircle,
  PhoneCall,
  CalendarClock,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '../api/leads.api';
import { LEAD_DETAILS_QUERY_KEY, LEADS_QUERY_KEY, useLeadDetails } from '../hooks/useLeads';
import { LogPhoneCallModal } from './LogPhoneCallModal';
import { ScheduleDemoModal } from './ScheduleDemoModal';
import { formatVnd } from '@/shared/utils/currency';

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdateStatus?: (lead: Lead) => void;
  onSendQuote?: (lead: Lead) => void;
  onNotificationUpdate?: (lead: Lead) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead: selectedLead,
  onClose,
  onUpdateStatus,
  onSendQuote,
  onNotificationUpdate,
}) => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasPermission('sales.leads.manage');
  const detailsQuery = useLeadDetails(selectedLead?.id);
  const lead = detailsQuery.data ?? selectedLead;
  const [isNotifying, setIsNotifying] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [notificationTone, setNotificationTone] = useState<'success' | 'warning' | 'error'>('success');
  const [emailStatus, setEmailStatus] = useState(lead?.emailNotificationStatus);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callMessage, setCallMessage] = useState<string | null>(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  useEffect(() => {
    setNotificationMessage(null);
    setCallMessage(null);
    setDemoMessage(null);
    setIsNotifying(false);
    setIsCallModalOpen(false);
    setIsDemoModalOpen(false);
  }, [selectedLead?.id]);
  useEffect(() => {
    setEmailStatus(detailsQuery.data?.emailNotificationStatus ?? selectedLead?.emailNotificationStatus);
  }, [detailsQuery.data, selectedLead?.id]);

  const sendContactNotification = async () => {
    if (!lead || isNotifying || emailStatus === 'SENT') return;
    setIsNotifying(true);
    setNotificationMessage(null);
    try {
      const result = await leadsApi.notifyContact(lead.id, crypto.randomUUID());
      queryClient.setQueryData([...LEAD_DETAILS_QUERY_KEY, lead.id], result.lead);
      setEmailStatus(result.lead.emailNotificationStatus);
      setNotificationTone(result.notificationSent === true ? 'success' : 'warning');
      setNotificationMessage(result.message);
      onNotificationUpdate?.(result.lead);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      setNotificationTone(status === 403 ? 'error' : 'warning');
      setNotificationMessage(
        status === 403
          ? 'You do not have permission to send contact emails.'
          : status === 401
            ? 'Your session has expired. Sign in again before sending this email.'
          : status === 404
            ? 'This lead could not be found. Refresh the list and try again.'
            : status === 400
              ? 'The email request was invalid. Refresh the lead and try again.'
              : status === 503
                ? 'The email service is temporarily unavailable. Try again shortly.'
            : 'The email could not be sent. Please try again shortly.',
      );
    } finally {
      setIsNotifying(false);
    }
  };
  const emailButtonLabel = emailStatus === 'SENT'
    ? 'Email sent'
    : emailStatus === 'FAILED'
      ? 'Retry contact email'
      : emailStatus === 'SENDING'
        ? 'Email processing'
        : isNotifying
          ? 'Sending email…'
          : 'Send contact email';
  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  if (!lead) return null;

  const detailErrorStatus = (detailsQuery.error as { response?: { status?: number } } | null)?.response?.status;
  const detailErrorMessage = detailErrorStatus === 403
    ? 'You do not have permission to view this lead.'
    : detailErrorStatus === 401
      ? 'Your session has expired. Sign in again to view lead details.'
      : detailErrorStatus === 404
        ? 'This lead could not be found. Refresh the lead list and try again.'
        : detailErrorStatus === 400
          ? 'The lead identifier is invalid. Refresh the lead list and try again.'
        : 'Could not load the latest lead details. The information below may be an older list preview.';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCallLogged = (result: LogPhoneCallResponse) => {
    queryClient.setQueryData([...LEAD_DETAILS_QUERY_KEY, result.lead.id], result.lead);
    void queryClient.invalidateQueries({
      queryKey: LEADS_QUERY_KEY,
      predicate: (query) => query.queryKey[1] !== 'detail',
    });
    setCallMessage(result.message);
    setIsCallModalOpen(false);
  };

  const handleDemoScheduled = (result: ScheduleDemoResponse) => {
    queryClient.setQueryData([...LEAD_DETAILS_QUERY_KEY, result.lead.id], result.lead);
    void queryClient.invalidateQueries({
      queryKey: LEADS_QUERY_KEY,
      predicate: (query) => query.queryKey[1] !== 'detail',
    });
    setDemoMessage(result.message);
    setIsDemoModalOpen(false);
  };

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-[#E8ECF1]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-details-title"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8ECF1] bg-[#F7F9FC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0652CC] to-[#4C9AFF] flex items-center justify-center text-white font-bold text-base shadow-sm">
              {lead.companyName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 id="lead-details-title" className="text-base font-bold text-[#091E42]">{lead.companyName}</h2>
              <p className="text-xs text-[#6B778C]">Lead ID: {lead.id}</p>
            </div>
          </div>
          <button
            autoFocus
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B778C] hover:bg-gray-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {detailsQuery.isLoading && (
            <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-[#42526E]">
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin text-[#0652CC]" />
              Loading lead details…
            </p>
          )}
          {detailsQuery.isFetching && !detailsQuery.isLoading && (
            <p role="status" aria-live="polite" className="text-xs text-[#6B778C]">
              Refreshing lead details…
            </p>
          )}
          {detailsQuery.isError && (
            <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
              <span>{detailErrorMessage}</span>
              <button
                type="button"
                onClick={() => void detailsQuery.refetch()}
                disabled={detailsQuery.isFetching}
                className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 disabled:opacity-50"
              >
                {detailsQuery.isFetching ? 'Retrying…' : 'Try again'}
              </button>
            </div>
          )}
          {/* Quick Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Status: {LEAD_STATUS_LABELS[lead.status]}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
              Source: {LEAD_SOURCE_LABELS[lead.source]}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
              Priority: {LEAD_PRIORITY_LABELS[lead.priority]}
            </span>
            {lead.estimatedValue ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {formatVnd(lead.estimatedValue)}
              </span>
            ) : null}
          </div>

          {/* Grid Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Information */}
            <div className="p-4 rounded-lg bg-[#F7F9FC] border border-[#E8ECF1] space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B778C] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0652CC]" /> Contact Person
              </h3>
              <div className="space-y-1.5 text-xs text-[#091E42]">
                <div className="flex items-center gap-2">
                  <span className="text-[#6B778C] w-20">Full Name:</span>
                  <span className="font-semibold">{lead.contactName}</span>
                </div>
                {lead.jobTitle && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#6B778C] w-20">Job Title:</span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-[#8993A4]" />
                      {lead.jobTitle}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[#6B778C] w-20">Email:</span>
                  <a
                    href={`mailto:${lead.contactEmail}`}
                    className="text-[#0652CC] hover:underline flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3" />
                    {lead.contactEmail}
                  </a>
                </div>
                {lead.contactPhone && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#6B778C] w-20">Phone:</span>
                    <a
                      href={`tel:${lead.contactPhone}`}
                      className="text-[#0652CC] hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      {lead.contactPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment & Management */}
            <div className="p-4 rounded-lg bg-[#F7F9FC] border border-[#E8ECF1] space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B778C] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#0652CC]" /> Assignment & Ownership
              </h3>
              <div className="space-y-1.5 text-xs text-[#091E42]">
                <div className="flex items-center gap-2">
                  <span className="text-[#6B778C] w-24">Assigned Staff:</span>
                  <span className="font-medium">
                    {lead.assignedToEmail || <span className="italic text-gray-400">Unassigned</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B778C] w-24">Created By:</span>
                  <span>{lead.createdByEmail || lead.createdByUserId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B778C] w-24">Created Date:</span>
                  <span className="flex items-center gap-1 text-[#42526E]">
                    <Calendar className="w-3 h-3 text-[#8993A4]" />
                    {formatDate(lead.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B778C] w-24">Last Updated:</span>
                  <span className="flex items-center gap-1 text-[#42526E]">
                    <Clock className="w-3 h-3 text-[#8993A4]" />
                    {formatDate(lead.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Follow-up & Contact Dates */}
          {(lead.lastContactedAt || lead.nextFollowUpAt) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lead.lastContactedAt && (
                <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 text-xs">
                  <span className="text-amber-800 font-semibold block mb-0.5">Last Contacted</span>
                  <span className="text-amber-900">{formatDate(lead.lastContactedAt)}</span>
                </div>
              )}
              {lead.nextFollowUpAt && (
                <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-xs">
                  <span className="text-blue-800 font-semibold block mb-0.5">Next Follow-Up</span>
                  <span className="text-blue-900">{formatDate(lead.nextFollowUpAt)}</span>
                </div>
              )}
            </div>
          )}

          {/* Phone call history (UC-60) */}
          <section aria-labelledby="lead-phone-calls-title" className="space-y-2">
            <h3 id="lead-phone-calls-title" className="text-xs font-bold uppercase tracking-wider text-[#6B778C] flex items-center gap-1.5">
              <PhoneCall aria-hidden="true" className="w-3.5 h-3.5 text-[#0652CC]" />
              Call history ({lead.phoneCalls?.length ?? 0})
            </h3>
            {lead.phoneCalls?.length ? (
              <ol className="space-y-2">
                {[...lead.phoneCalls].reverse().map((call) => (
                  <li key={call.id} className="rounded-lg border border-[#E8ECF1] bg-[#F7F9FC] p-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-xs font-semibold text-[#091E42]">
                        {LEAD_PHONE_CALL_OUTCOME_LABELS[call.outcome]} | {call.durationMinutes} min
                      </span>
                      <time dateTime={call.createdAt} className="text-xs text-[#6B778C]">{formatDate(call.createdAt)}</time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[#253858]">{call.summary}</p>
                    {call.notes && <p className="mt-1 whitespace-pre-wrap text-xs text-[#6B778C]">{call.notes}</p>}
                    <p className="mt-1 text-xs text-[#6B778C]">Logged by {call.performedByEmail || call.performedByUserId}</p>
                    {call.followUpAt && <p className="mt-1 text-xs font-medium text-blue-800">Follow-up: {formatDate(call.followUpAt)}</p>}
                  </li>
                ))}
              </ol>
            ) : detailsQuery.data ? (
              <p className="rounded-lg border border-dashed border-[#D9E2EC] p-3 text-sm text-[#6B778C]">No phone calls have been logged for this lead.</p>
            ) : null}
          </section>

          {/* Scheduled demos (UC-61) */}
          <section aria-labelledby="lead-demos-title" className="space-y-2">
            <h3 id="lead-demos-title" className="text-xs font-bold uppercase tracking-wider text-[#6B778C] flex items-center gap-1.5">
              <CalendarClock aria-hidden="true" className="w-3.5 h-3.5 text-[#0652CC]" />
              Scheduled demos ({lead.demos?.length ?? 0})
            </h3>
            {lead.demos?.length ? (
              <ol className="space-y-2">
                {[...lead.demos].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()).map((demo) => (
                  <li key={demo.id} className="rounded-lg border border-[#E8ECF1] bg-[#F7F9FC] p-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-semibold text-[#091E42]">{demo.title}</span>
                      <span className={`w-fit rounded-full border px-2 py-0.5 text-[10px] font-bold ${demo.status === 'SCHEDULED' ? 'border-blue-200 bg-blue-50 text-blue-700' : demo.status === 'COMPLETED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                        {demo.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#42526E]">
                      {formatDate(demo.scheduledAt)} · {demo.durationMinutes} minutes
                    </p>
                    <p className="mt-1 break-words text-xs text-[#6B778C]">Attendees: {demo.attendeeEmails.join(', ')}</p>
                    {demo.agenda && <p className="mt-2 whitespace-pre-wrap text-xs text-[#42526E]">Agenda: {demo.agenda}</p>}
                    {demo.internalNotes && <p className="mt-1 whitespace-pre-wrap text-xs text-[#6B778C]">Internal notes: {demo.internalNotes}</p>}
                    <p className="mt-1 text-xs text-[#6B778C]">Scheduled by {demo.scheduledByEmail || demo.scheduledByUserId}</p>
                  </li>
                ))}
              </ol>
            ) : detailsQuery.data ? (
              <p className="rounded-lg border border-dashed border-[#D9E2EC] p-3 text-sm text-[#6B778C]">No demos have been scheduled for this lead.</p>
            ) : null}
          </section>

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B778C] mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#0652CC]" /> Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {lead.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md text-xs bg-gray-100 text-[#42526E] border border-gray-200"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B778C] mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#0652CC]" /> Internal Notes
              </h3>
              <div className="p-3 rounded-lg bg-[#F7F9FC] border border-[#E8ECF1] text-xs text-[#091E42] whitespace-pre-wrap leading-relaxed">
                {lead.notes}
              </div>
            </div>
          )}

          {/* Quotes History (UC-62) */}
          {lead.quotes && lead.quotes.length > 0 && (
            <div id="lead-quotes-history-section">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B778C] mb-2 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-[#0652CC]" /> Modernization Quotes ({lead.quotes.length})
              </h3>
              <div className="space-y-2">
                {lead.quotes.map((q) => (
                  <div
                    key={q.id}
                    className="p-3 rounded-lg bg-[#F7F9FC] border border-[#E8ECF1] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#0652CC]">{q.quoteNumber}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            q.status === 'SENT'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {q.status}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#091E42] mt-0.5">{q.planName}</p>
                      <p className="text-[11px] text-[#6B778C]">Sent to: {q.recipientEmail}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-[#091E42]">
                        {formatVnd(q.amount)}
                      </div>
                      {q.discountPercent ? (
                        <div className="text-[10px] text-amber-600">
                          {q.discountPercent}% discount included
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E8ECF1] bg-[#F7F9FC] flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex flex-col gap-2">
            {notificationMessage && (
              <p
                role={notificationTone === 'error' ? 'alert' : 'status'}
                aria-live="polite"
                className={`text-xs ${notificationTone === 'success' ? 'text-emerald-700' : notificationTone === 'error' ? 'text-rose-700' : 'text-amber-800'}`}
              >
                {notificationMessage}
              </p>
            )}
            {callMessage && <p role="status" aria-live="polite" className="text-xs text-emerald-700">{callMessage}</p>}
            {demoMessage && <p role="status" aria-live="polite" className="text-xs text-emerald-700">{demoMessage}</p>}
            <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <button
                id="send-lead-notification-btn"
                type="button"
                onClick={sendContactNotification}
                  disabled={!detailsQuery.data || isNotifying || emailStatus === 'SENT' || emailStatus === 'SENDING'}
                aria-busy={isNotifying}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-[#D9E2EC] text-[#091E42] hover:bg-gray-100 transition-colors cursor-pointer shadow-2xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isNotifying
                  ? <LoaderCircle aria-hidden="true" className="w-3.5 h-3.5 animate-spin" />
                  : <Mail className="w-3.5 h-3.5 text-[#0652CC]" />}
                {emailButtonLabel}
              </button>
            )}
            {canManage && (
              <button
                id="open-log-phone-call-btn"
                type="button"
                onClick={() => { setCallMessage(null); setIsCallModalOpen(true); }}
                disabled={!detailsQuery.data}
                className="flex items-center gap-1.5 rounded-lg border border-[#D9E2EC] bg-white px-3 py-2 text-xs font-semibold text-[#091E42] shadow-2xs transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PhoneCall aria-hidden="true" className="h-3.5 w-3.5 text-[#0652CC]" />
                Log Phone Call
              </button>
            )}
            {canManage && lead.status !== 'WON' && lead.status !== 'LOST' && (
              <button
                id="open-schedule-demo-btn"
                type="button"
                onClick={() => { setDemoMessage(null); setIsDemoModalOpen(true); }}
                disabled={!detailsQuery.data}
                className="flex items-center gap-1.5 rounded-lg border border-[#D9E2EC] bg-white px-3 py-2 text-xs font-semibold text-[#091E42] shadow-2xs transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarClock aria-hidden="true" className="h-3.5 w-3.5 text-[#0652CC]" />
                Schedule Demo
              </button>
            )}
            {canManage && onUpdateStatus && (
              <button
                id="open-update-status-btn"
                onClick={() => onUpdateStatus(lead)}
                  disabled={!detailsQuery.data}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-[#D9E2EC] text-[#091E42] hover:bg-gray-100 transition-colors cursor-pointer shadow-2xs"
              >
                <TrendingUp className="w-3.5 h-3.5 text-[#0652CC]" />
                Update Status
              </button>
            )}
            {canManage && onSendQuote && lead.status !== 'WON' && lead.status !== 'LOST' && (
              <button
                id="open-send-quote-btn"
                onClick={() => onSendQuote(lead)}
                  disabled={!detailsQuery.data}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0652CC] text-white hover:bg-[#0747b8] transition-colors cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Send Quote
              </button>
            )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-[#D9E2EC] text-[#091E42] hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
    {isCallModalOpen && <LogPhoneCallModal lead={lead} onClose={() => setIsCallModalOpen(false)} onSuccess={handleCallLogged} />}
    {isDemoModalOpen && <ScheduleDemoModal lead={lead} onClose={() => setIsDemoModalOpen(false)} onSuccess={handleDemoScheduled} />}
    </>
  );
};
