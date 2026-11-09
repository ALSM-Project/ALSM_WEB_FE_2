import React, { useState } from 'react';
import {
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Mail,
  Phone,
  Send,
  Shield,
  TrendingUp,
  User,
  UserCheck,
  Video,
  X,
  Check,
  AlertTriangle,
  XCircle,
  Copy,
} from 'lucide-react';
import { Badge, Button } from '@/shared/ui';
import type { MeetingRequest } from '../types/meeting-request';

interface MeetingRequestDetailDrawerProps {
  meeting: MeetingRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onAssignSales: () => void;
  onProposeSlots: () => void;
  onConfirmMeeting: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  onRecordOutcome: () => void;
  onConvertToOpportunity: () => void;
  onCreateQuote: () => void;
  onAddNote: (content: string) => Promise<void>;
  calendarConnected: boolean;
}

export const MeetingRequestDetailDrawer: React.FC<MeetingRequestDetailDrawerProps> = ({
  meeting,
  isOpen,
  onClose,
  onAssignSales,
  onProposeSlots,
  onConfirmMeeting,
  onReschedule,
  onCancel,
  onRecordOutcome,
  onConvertToOpportunity,
  onCreateQuote,
  onAddNote,
  calendarConnected,
}) => {
  void calendarConnected;
  const [activeTab, setActiveTab] = useState<'details' | 'scheduling' | 'pipeline' | 'notes'>('details');
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [invitationSent, setInvitationSent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !meeting) return null;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setIsSubmittingNote(true);
    try {
      await onAddNote(newNote.trim());
      setNewNote('');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleCopyMeetLink = () => {
    if (meeting?.scheduling?.meetingUrl) {
      navigator.clipboard.writeText(meeting.scheduling.meetingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleSendInvitation = () => {
    setInvitationSent(true);
    setTimeout(() => setInvitationSent(false), 4000);
  };

  const isCancelled = meeting.status === 'CANCELLED' || meeting.status === 'NO_SHOW';
  const isCompleted = meeting.status === 'COMPLETED';
  const isScheduled = meeting.status === 'SCHEDULED' || meeting.status === 'CONFIRMED' || meeting.status === 'IN_PROGRESS';
  const isPendingReview = meeting.status === 'NEW_REQUEST' || meeting.status === 'PENDING_SCHEDULING' || meeting.status === 'RESCHEDULE_REQUESTED';

  // Compute status of 6 Meeting Timeline steps:
  // 1. Request submitted
  // 2. Request reviewed
  // 3. Meeting scheduled
  // 4. Invitation sent
  // 5. Meeting completed
  // 6. Follow-up created
  const timelineSteps = [
    {
      id: 'submitted',
      label: 'Request Submitted',
      completed: true,
      timestamp: meeting.createdAt ? new Date(meeting.createdAt).toLocaleString('vi-VN') : undefined,
    },
    {
      id: 'reviewed',
      label: 'Request Reviewed',
      completed: Boolean(meeting.assignment?.assignedSalesName || !isPendingReview),
      timestamp: meeting.assignment?.assignedAt ? new Date(meeting.assignment.assignedAt).toLocaleString('vi-VN') : undefined,
    },
    {
      id: 'scheduled',
      label: 'Meeting Scheduled',
      completed: Boolean(isScheduled || isCompleted),
      timestamp: meeting.scheduling?.scheduledStartTime ? new Date(meeting.scheduling.scheduledStartTime).toLocaleString('vi-VN') : undefined,
    },
    {
      id: 'invitation',
      label: 'Invitation Sent',
      completed: Boolean((meeting.scheduling?.meetingUrl || invitationSent) && (isScheduled || isCompleted)),
      timestamp: meeting.scheduling?.meetingUrl ? 'Dispatched' : undefined,
    },
    {
      id: 'completed',
      label: 'Meeting Completed',
      completed: isCompleted,
      timestamp: meeting.outcome?.recordedAt ? new Date(meeting.outcome.recordedAt).toLocaleString('vi-VN') : undefined,
    },
    {
      id: 'followup',
      label: 'Follow-up Created',
      completed: Boolean(meeting.relatedLeadId || meeting.relatedQuoteId),
      timestamp: meeting.relatedQuoteId ? 'Quote Created' : meeting.relatedLeadId ? 'Opportunity Created' : undefined,
    },
  ];

  const getStatusBadgeVariant = (status: string): 'secondary' | 'success' | 'warning' | 'danger' => {
    switch (status) {
      case 'CONFIRMED':
      case 'SCHEDULED':
        return 'success';
      case 'IN_PROGRESS':
      case 'COMPLETED':
        return 'secondary';
      case 'PENDING_SCHEDULING':
      case 'NEW_REQUEST':
      case 'RESCHEDULE_REQUESTED':
        return 'warning';
      case 'CANCELLED':
      case 'NO_SHOW':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[#17263A] shadow-2xs">
              {meeting.requestId}
            </span>
            <Badge variant={getStatusBadgeVariant(meeting.status || 'NEW_REQUEST')}>
              {(meeting.status || 'NEW_REQUEST').replace(/_/g, ' ')}
            </Badge>
            <Badge variant={meeting.priority === 'URGENT' ? 'danger' : meeting.priority === 'HIGH' ? 'warning' : 'secondary'}>
              {meeting.priority || 'MEDIUM'}
            </Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title & Organization Banner */}
        <div className="px-6 py-4 bg-white border-b border-slate-100">
          <h2 className="text-base font-bold text-[#17263A] leading-snug">
            {meeting.topic || 'Customer Consultation Request'}
          </h2>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {meeting.customer?.companyName || 'Unknown Company'}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {meeting.customer?.fullName || 'N/A'}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {meeting.customer?.email || 'N/A'}
            </span>
            {meeting.customer?.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {meeting.customer.phone}
              </span>
            )}
          </div>
        </div>

        {/* ── Meeting Lifecycle Timeline (Section 4.6) ────────────────────────── */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider">
              Meeting Lifecycle Timeline
            </span>
            {isCancelled && (
              <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Cancelled
              </span>
            )}
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {timelineSteps.map((st, idx) => (
              <div key={st.id} className="text-center group">
                <div className="flex items-center justify-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                      st.completed
                        ? 'bg-emerald-600 text-white'
                        : isCancelled
                        ? 'bg-slate-200 text-slate-400'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {st.completed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                </div>
                <div className="text-[10px] font-semibold text-slate-700 mt-1 truncate" title={st.label}>
                  {st.label}
                </div>
                {st.timestamp && (
                  <div className="text-[9px] text-slate-400 truncate font-mono">
                    {st.timestamp}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-200 bg-white text-xs font-semibold text-slate-600 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'details'
                ? 'border-[#244A70] text-[#244A70] font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Requirements & Scope
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scheduling')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'scheduling'
                ? 'border-[#244A70] text-[#244A70] font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <span>Scheduling & Meet Link</span>
            {meeting.scheduling?.scheduledStartTime && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pipeline')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pipeline'
                ? 'border-[#244A70] text-[#244A70] font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <span>Opportunity & Quotes</span>
            {meeting.relatedQuoteId && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-bold">
                Quote
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'notes'
                ? 'border-[#244A70] text-[#244A70] font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <span>Internal Notes & History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
              {meeting.internalNotes?.length || 0}
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Meeting Core Information */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-[#17263A] uppercase tracking-wider">
                  Meeting Information
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Meeting Title</span>
                    <span className="font-semibold text-slate-800">{meeting.topic}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Meeting Type</span>
                    <span className="font-semibold text-blue-700">
                      {(meeting.consultationType || '').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Customer & Lead</span>
                    <span className="font-semibold text-slate-800">
                      {meeting.customer?.fullName} {meeting.relatedLeadId && `(${meeting.relatedLeadId.slice(0, 8)})`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Organization</span>
                    <span className="font-semibold text-slate-800">
                      {meeting.customer?.companyName || 'Individual Prospect'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Requested Date</span>
                    <span className="font-semibold text-slate-800">
                      {meeting.scheduling?.requestedDate || 'Flexible / As soon as possible'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Scheduled Slot</span>
                    <span className="font-semibold text-emerald-700">
                      {meeting.scheduling?.scheduledStartTime
                        ? new Date(meeting.scheduling.scheduledStartTime).toLocaleString('vi-VN')
                        : 'Pending scheduling'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Timezone</span>
                    <span className="font-mono text-slate-700">{meeting.scheduling?.timezone || 'Asia/Ho_Chi_Minh'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Target Duration</span>
                    <span className="font-semibold text-slate-800">{meeting.scheduling?.durationMinutes || 45} minutes</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Assigned Sales</span>
                    <span className="font-semibold text-slate-800">
                      {meeting.assignment?.assignedSalesName || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {meeting.requirements?.businessRequirements && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-400 block text-[11px] mb-1 font-semibold">Description / Agenda</span>
                    <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                      {meeting.requirements.businessRequirements}
                    </p>
                  </div>
                )}
              </div>

              {/* Requirements & Scope */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-[#17263A] uppercase tracking-wider">
                  Legacy Architecture Scope
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Legacy System</span>
                    <span className="font-semibold text-slate-800">
                      {meeting.requirements?.legacySystemType || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Est. Screen Count</span>
                    <span className="font-semibold text-slate-800">
                      {meeting.requirements?.estimatedScreens || 'TBD'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Est. Programs</span>
                    <span className="font-semibold text-slate-800">
                      {meeting.requirements?.estimatedPrograms || 'TBD'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Project Scale</span>
                    <Badge variant="secondary">
                      {meeting.requirements?.estimatedProjectScale || 'STANDARD'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Delivery Timeline</span>
                    <span className="font-semibold text-slate-800">
                      {meeting.requirements?.expectedTimeline || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Service Mode</span>
                    <span className="font-semibold text-slate-800">
                      {(meeting.requirements?.serviceMode || '').replace(/_/g, ' ') || 'CUSTOMER SELF SERVICE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assigned Sales Representative */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#17263A] uppercase tracking-wider">
                    Assigned Sales Representative
                  </h4>
                  {meeting.assignment?.assignedSalesName ? (
                    <div className="flex items-center gap-2 mt-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">
                        {meeting.assignment.assignedSalesName}
                      </span>
                      {meeting.assignment.assignedSalesEmail && (
                        <span className="text-xs text-slate-500">
                          ({meeting.assignment.assignedSalesEmail})
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700 mt-1">
                      No sales representative currently assigned.
                    </p>
                  )}
                </div>
                <Button variant="secondary" onClick={onAssignSales} className="text-xs">
                  {meeting.assignment?.assignedSalesName ? 'Reassign' : 'Assign Sales Rep'}
                </Button>
              </div>

              {/* Consultation Outcome (if completed) */}
              {meeting.outcome && (
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      Recorded Consultation Outcome
                    </h4>
                    {meeting.outcome.qualificationScore !== undefined && (
                      <span className="text-xs font-extrabold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                        Score: {meeting.outcome.qualificationScore}/100
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    {meeting.outcome.summary}
                  </p>
                  {meeting.outcome.nextSteps && (
                    <div className="text-[11px] text-emerald-700 pt-1 border-t border-emerald-200 font-medium">
                      Next steps: {meeting.outcome.nextSteps}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'scheduling' && (
            <div className="space-y-6">
              {/* Confirmed Appointment Banner */}
              {meeting.scheduling?.scheduledStartTime ? (
                <div className="bg-[#17263A] text-white rounded-xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Confirmed Appointment Slot
                      </span>
                    </div>
                    <Badge variant="success">
                      {meeting.scheduling?.format || 'GOOGLE_MEET'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Scheduled Start</span>
                      <span className="font-bold text-white text-sm">
                        {new Date(meeting.scheduling.scheduledStartTime).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Duration & Timezone</span>
                      <span className="text-slate-200 font-medium">
                        {meeting.scheduling?.durationMinutes || 45} mins ({meeting.scheduling?.timezone || 'Asia/Ho_Chi_Minh'})
                      </span>
                    </div>
                  </div>

                  {meeting.scheduling?.meetingUrl ? (
                    <div className="pt-3 border-t border-slate-750 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <a
                          href={meeting.scheduling.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-lg transition-colors shadow-2xs"
                        >
                          <Video className="w-4 h-4" />
                          Join Google Meet Room
                          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                        </a>
                        <button
                          type="button"
                          onClick={handleCopyMeetLink}
                          className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 cursor-pointer flex items-center gap-1"
                          title="Copy meeting link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {copiedLink ? 'Copied!' : 'Copy Link'}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleSendInvitation}
                        className="px-3 py-2 rounded-lg bg-[#244A70] hover:bg-[#1B3856] text-xs text-white font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {invitationSent ? 'Invitation Sent!' : 'Send Calendar Invitation'}
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2 text-xs text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      No conference link attached. Use Confirm / Link Meet below to add Google Meet link.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-3">
                  <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">No Confirmed Appointment Yet</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Customer requested {meeting.scheduling?.requestedDate || 'a consultation slot'}.
                    </p>
                  </div>
                  {!isCancelled && !isCompleted && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Button variant="secondary" onClick={onProposeSlots} className="text-xs">
                        Propose Available Slots
                      </Button>
                      <Button variant="primary" onClick={onConfirmMeeting} className="text-xs bg-[#244A70]">
                        Lock In Meeting Time
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Proposed Slots List */}
              {meeting.scheduling?.proposedSlots && meeting.scheduling.proposedSlots.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#17263A] uppercase tracking-wider">
                    Proposed Time Slots ({meeting.scheduling.proposedSlots.length})
                  </h4>
                  <div className="space-y-2">
                    {meeting.scheduling.proposedSlots.map((slot, idx) => (
                      <div
                        key={slot.slotId || idx}
                        className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              {new Date(slot.startTime).toLocaleString('vi-VN')} -{' '}
                              {new Date(slot.endTime).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Proposed by {slot.proposedBy}
                            </span>
                          </div>
                        </div>
                        <Badge variant={slot.status === 'ACCEPTED' ? 'success' : 'secondary'}>
                          {slot.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scheduling State Machine Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200">
                {!isCancelled && !isCompleted && (
                  <>
                    <Button variant="secondary" onClick={onProposeSlots} className="text-xs">
                      Propose New Time
                    </Button>
                    <Button variant="secondary" onClick={onConfirmMeeting} className="text-xs">
                      {meeting.scheduling?.scheduledStartTime ? 'Update Meet Link' : 'Schedule Meeting'}
                    </Button>
                    {meeting.scheduling?.scheduledStartTime && (
                      <Button variant="secondary" onClick={onReschedule} className="text-xs">
                        Reschedule
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      onClick={onCancel}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      Cancel Meeting
                    </Button>
                  </>
                )}
                {isCancelled && (
                  <span className="text-xs text-rose-600 font-semibold italic">
                    This meeting request has been cancelled and cannot be scheduled.
                  </span>
                )}
                {isCompleted && (
                  <span className="text-xs text-emerald-700 font-semibold italic">
                    This meeting is marked completed.
                  </span>
                )}
              </div>
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="space-y-6">
              {/* Sales Opportunity Status */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#17263A] uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#244A70]" />
                    CRM Sales Pipeline Status
                  </h4>
                  {meeting.relatedLeadId ? (
                    <Badge variant="success">
                      Linked to Lead
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Not Handed Off
                    </Badge>
                  )}
                </div>

                {meeting.relatedLeadId ? (
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-600">
                      This consultation has transitioned into the commercial sales pipeline:
                    </p>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="font-mono text-xs text-slate-700">
                        Lead Ref: {meeting.relatedOpportunityId || meeting.relatedLeadId}
                      </span>
                      <a
                        href={`/sales/leads/${meeting.relatedLeadId}`}
                        className="text-[#244A70] hover:underline font-bold text-xs inline-flex items-center gap-1"
                      >
                        Open Lead Dossier
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-600">
                      If the consultation is qualified, transition this account into the active Sales Opportunity pipeline.
                    </p>
                    <Button
                      variant="primary"
                      onClick={onConvertToOpportunity}
                      className="text-xs bg-[#244A70] inline-flex items-center gap-1.5"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Convert to Sales Opportunity
                    </Button>
                  </div>
                )}
              </div>

              {/* Commercial Enterprise Quotation */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#17263A] uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    Enterprise Quotation
                  </h4>
                  {meeting.relatedQuoteId ? (
                    <Badge variant="secondary">
                      {meeting.relatedQuoteId}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      No Quote Generated
                    </Badge>
                  )}
                </div>

                {meeting.relatedQuoteId ? (
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-600">
                      An enterprise quotation is linked to this opportunity. Quotations are reviewed and signed under legal contract workflows.
                    </p>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-800">
                        {meeting.relatedQuoteId}
                      </span>
                      <a
                        href="/sales/quotes"
                        className="text-[#244A70] hover:underline font-bold text-xs inline-flex items-center gap-1"
                      >
                        View in Quotes & Contracts
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-600">
                      Generate a commercial quote with custom modernization scope, screen capacity tier, and volume pricing.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={onCreateQuote}
                        className="text-xs inline-flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Draft Enterprise Quotation
                      </Button>
                      <a
                        href="/sales/quotes"
                        className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                        Quotes & Contracts
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Add Internal Consultation Note
                </label>
                <div className="flex gap-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Record internal team observations, customer readiness, technical caveats..."
                    rows={2}
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmittingNote || !newNote.trim()}
                    className="self-end bg-[#244A70] text-xs inline-flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Add
                  </Button>
                </div>
              </form>

              {/* Internal Notes Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#17263A] uppercase tracking-wider">
                  Internal Notes ({(meeting.internalNotes || []).length})
                </h4>
                {(!meeting.internalNotes || meeting.internalNotes.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">No internal notes added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {meeting.internalNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-700">{note.authorName}</span>
                          <span>{new Date(note.createdAt).toLocaleString('vi-VN')}</span>
                        </div>
                        <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Complete Audit & Activity Timeline */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold text-[#17263A] uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  Meeting Lifecycle History ({(meeting.meetingHistory || []).length})
                </h4>
                <div className="space-y-2 text-xs">
                  {(meeting.meetingHistory || []).map((hist, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-100">
                      <span className="w-2 h-2 rounded-full bg-[#244A70] mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700">{hist.action}</span>
                          <span className="text-slate-400">
                            {new Date(hist.timestamp).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        {hist.details && (
                          <p className="text-slate-600 text-xs mt-0.5">{hist.details}</p>
                        )}
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          by {hist.performedBy}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions (Section 4.6 Compliant) */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isCompleted && !isCancelled && (
              <Button
                variant="primary"
                onClick={onRecordOutcome}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark as Completed / Record Outcome
              </Button>
            )}
            {!meeting.relatedLeadId && !isCancelled && (
              <Button
                variant="secondary"
                onClick={onConvertToOpportunity}
                className="text-xs inline-flex items-center gap-1.5"
              >
                <TrendingUp className="w-3.5 h-3.5 text-[#244A70]" />
                Convert to Lead / Opportunity
              </Button>
            )}
            {!isCancelled && !isCompleted && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="text-xs text-rose-600 hover:bg-rose-50"
              >
                Reject Request
              </Button>
            )}
          </div>

          <Button variant="secondary" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
