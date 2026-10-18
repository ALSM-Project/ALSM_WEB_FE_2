import React, { useState } from 'react';
import { 
  Video, Calendar, Users, Mail, Phone, Building2, 
  CheckCircle2, Copy, ExternalLink, AlertCircle, X
} from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import type { QuoteRequest } from '../types/quote';

export interface CustomerMeetingInfo {
  quoteId: string;
  meetingUrl: string;
  scheduledAt: string;
  durationMinutes: number;
  topic: string;
  attendees: string[];
  agenda: string;
  notes?: string;
  createdAt: string;
}

interface ScheduleCustomerConsultationModalProps {
  isOpen: boolean;
  quote: QuoteRequest | null;
  onClose: () => void;
  onScheduled: (meeting: CustomerMeetingInfo) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateMockGoogleMeetUrl(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `https://meet.google.com/alsm-${part(3)}-${part(3)}`;
}

export const ScheduleCustomerConsultationModal: React.FC<ScheduleCustomerConsultationModalProps> = ({
  isOpen,
  quote,
  onClose,
  onScheduled,
}) => {
  if (!quote) return null;

  const defaultTopic = `Enterprise Modernization Consultation - ${quote.companyName || 'Client'}`;
  const defaultAgenda = `1. Requirements review & modernization scope for ${quote.companyName}
2. Screen & program volume estimate and architecture fit
3. Enterprise pricing, SLA guarantees, and payment structure
4. Pilot migration scope & timeline alignment`;

  const [topic, setTopic] = useState(defaultTopic);
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [meetingUrl, setMeetingUrl] = useState(() => generateMockGoogleMeetUrl());
  const [attendeeInput, setAttendeeInput] = useState('');
  const [attendeeEmails, setAttendeeEmails] = useState<string[]>(() => [quote.email].filter(Boolean));
  const [agenda, setAgenda] = useState(defaultAgenda);
  const [notes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<CustomerMeetingInfo | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const handleAddAttendee = () => {
    const email = attendeeInput.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_PATTERN.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (attendeeEmails.includes(email)) {
      setErrorMsg('This attendee email is already added.');
      return;
    }
    setAttendeeEmails([...attendeeEmails, email]);
    setAttendeeInput('');
    setErrorMsg(null);
  };

  const handleRemoveAttendee = (email: string) => {
    setAttendeeEmails(attendeeEmails.filter((e) => e !== email));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setErrorMsg('Meeting topic is required.');
      return;
    }
    if (!scheduledAt) {
      setErrorMsg('Scheduled date and time are required.');
      return;
    }
    if (attendeeEmails.length === 0) {
      setErrorMsg('At least one attendee email is required.');
      return;
    }

    const meetingInfo: CustomerMeetingInfo = {
      quoteId: quote.id,
      meetingUrl: meetingUrl.trim(),
      scheduledAt: new Date(scheduledAt).toISOString(),
      durationMinutes,
      topic: topic.trim(),
      attendees: attendeeEmails,
      agenda: agenda.trim(),
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setSuccessResult(meetingInfo);
    onScheduled(meetingInfo);
  };

  const handleCopyLink = async () => {
    if (!successResult) return;
    await navigator.clipboard.writeText(successResult.meetingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCopyEmailInvite = async () => {
    if (!successResult) return;
    const formattedDate = new Date(successResult.scheduledAt).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const inviteText = `Subject: Invitation: ${successResult.topic}
When: ${formattedDate} (${successResult.durationMinutes} minutes)
Google Meet Link: ${successResult.meetingUrl}

Dear ${quote.fullName || 'Customer'},

Thank you for your interest in the ALSM Enterprise Modernization platform. We have scheduled an enterprise quote consultation to review your requirements for ${quote.companyName}.

Agenda:
${successResult.agenda}

Looking forward to speaking with you!
ALSM Enterprise Sales Team`;

    await navigator.clipboard.writeText(inviteText);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 3000);
  };

  const handleClose = () => {
    setSuccessResult(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={successResult ? "Customer Meeting Scheduled" : "Schedule Customer Consultation"}
      size="lg"
    >
      {successResult ? (
        <div className="space-y-5 text-xs">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-emerald-900">
                Customer Consultation Confirmed!
              </h4>
              <p className="text-emerald-800">
                The consultation meeting for <strong>{quote.companyName}</strong> has been scheduled and linked to this quote request.
              </p>
            </div>
          </div>

          {/* Meeting Room Link Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Google Meet Consultation Link
            </span>
            <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-300 font-mono text-xs text-[#17263A]">
              <div className="flex items-center gap-2 truncate">
                <Video className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{successResult.meetingUrl}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </button>
                <a
                  href={successResult.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#244A70] hover:bg-[#244A70] text-white text-xs font-bold transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Join Room
                </a>
              </div>
            </div>
          </div>

          {/* Invitation Details Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Time & Date</span>
              <p className="font-semibold text-slate-900 mt-0.5">
                {new Date(successResult.scheduledAt).toLocaleString()} ({successResult.durationMinutes} mins)
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Customer Attendees</span>
              <p className="font-semibold text-slate-900 mt-0.5 truncate">
                {successResult.attendees.join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyEmailInvite}
              className="inline-flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-[#244A70]" />
              {copiedInvite ? 'Invite Copied!' : 'Copy Customer Email Invite'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleClose}
              className="bg-[#244A70] hover:bg-[#244A70]"
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Customer Context Header */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Building2 className="w-4 h-4 text-[#244A70] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-[#17263A]">
                  {quote.companyName || 'Enterprise Account'}
                </h4>
                <div className="flex items-center gap-3 text-[11px] text-[#8491A3] mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-400" />
                    Contact: <strong>{quote.fullName}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {quote.email}
                  </span>
                  {quote.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {quote.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 shrink-0">
              Customer Consultation
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Meeting Topic */}
          <div>
            <label className="block font-semibold text-[#17263A] mb-1">Consultation Title / Topic *</label>
            <Input
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Enterprise Modernization Consultation"
              className="text-xs"
            />
          </div>

          {/* Date, Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#17263A] mb-1">Date & Time *</label>
              <div className="relative">
                <Input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="text-xs pl-8"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#17263A] mb-1">Duration</label>
              <div className="grid grid-cols-3 gap-1.5 h-9">
                {[30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                      durationMinutes === mins
                        ? 'bg-[#244A70] text-white border-[#244A70]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {mins} mins
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Google Meet Link */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-[#17263A]">Google Meet Room URL *</label>
              <button
                type="button"
                onClick={() => setMeetingUrl(generateMockGoogleMeetUrl())}
                className="text-[11px] text-[#244A70] hover:underline font-semibold cursor-pointer"
              >
                Regenerate Link
              </button>
            </div>
            <div className="relative">
              <Input
                required
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/xxx-yyyy-zzz"
                className="text-xs font-mono pl-8"
              />
              <Video className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Customer Attendees */}
          <div>
            <label className="block font-semibold text-[#17263A] mb-1">Customer & Team Attendees *</label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={attendeeInput}
                onChange={(e) => setAttendeeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAttendee();
                  }
                }}
                placeholder="Add another stakeholder email..."
                className="text-xs flex-1"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddAttendee}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {attendeeEmails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-slate-100 text-slate-800 border border-slate-200"
                >
                  <Mail className="w-3 h-3 text-slate-500" />
                  {email}
                  {email !== quote.email && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAttendee(email)}
                      className="hover:text-rose-600 cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Agenda */}
          <div>
            <label className="block font-semibold text-[#17263A] mb-1">Consultation Agenda</label>
            <textarea
              rows={4}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-md focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70] outline-none text-slate-800"
              placeholder="Outline discussion points for customer quotation..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <Video className="w-3.5 h-3.5 mr-1.5" />
              Schedule Customer Meeting
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
