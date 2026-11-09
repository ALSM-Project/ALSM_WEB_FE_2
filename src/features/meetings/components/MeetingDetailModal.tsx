import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Copy,
  CheckCircle2,
  ExternalLink,
  Users,
  Video,
  User,
  FolderGit2,
  Edit3,
  Trash2,
  Play,
  Check,
  XCircle,
  FileText,
} from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import type { Meeting, MeetingStatus } from '../types/meeting';

interface MeetingDetailModalProps {
  isOpen: boolean;
  meeting: Meeting | null;
  onClose: () => void;
  onEdit: (meeting: Meeting) => void;
  onDelete: (meeting: Meeting) => void;
  onStatusChange: (meeting: Meeting, status: MeetingStatus) => void;
  isUpdatingStatus?: boolean;
}

const STATUS_CONFIG: Record<
  MeetingStatus,
  { label: string; variant: 'info' | 'success' | 'secondary' | 'danger' }
> = {
  SCHEDULED: { label: 'Scheduled', variant: 'info' },
  IN_PROGRESS: { label: 'In Progress', variant: 'success' },
  COMPLETED: { label: 'Completed', variant: 'secondary' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
};

function formatMeetingDateTime(startIso?: string, endIso?: string) {
  if (!startIso || !endIso) return { dateStr: '', timeStr: '', durationStr: '' };
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const dateStr = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(s);

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const timeStr = `${timeFormatter.format(s)} – ${timeFormatter.format(e)}`;

    const diffMinutes = Math.round((e.getTime() - s.getTime()) / 60_000);
    const durationStr =
      diffMinutes >= 60
        ? `${Math.floor(diffMinutes / 60)} hr ${diffMinutes % 60 ? `${diffMinutes % 60} mins` : ''}`
        : `${diffMinutes} mins`;

    return { dateStr, timeStr, durationStr };
  } catch {
    return { dateStr: startIso, timeStr: '', durationStr: '' };
  }
}

export const MeetingDetailModal: React.FC<MeetingDetailModalProps> = ({
  isOpen,
  meeting,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  isUpdatingStatus = false,
}) => {
  const [copied, setCopied] = useState(false);

  if (!meeting) return null;

  const statusInfo = STATUS_CONFIG[meeting.status] || {
    label: meeting.status,
    variant: 'secondary',
  };

  const { dateStr, timeStr, durationStr } = formatMeetingDateTime(
    meeting.scheduledStartTime,
    meeting.scheduledEndTime,
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(meeting.meetingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleJoinMeet = () => {
    window.open(meeting.meetingUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Online Meeting Details" maxWidth="2xl">
      <div className="space-y-6">
        {/* Header Hero */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <span className="text-xs font-mono text-[#244A70] bg-[#EEF1F6] px-2.5 py-0.5 rounded font-semibold border border-blue-200">
                {meeting.meetingCode}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#17263A] tracking-tight">{meeting.title}</h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(meeting)}
              className="gap-1.5 text-xs text-[#17263A]"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#244A70]" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(meeting)}
              className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          </div>
        </div>

        {/* Primary Meeting Link Card */}
        <div className="p-4 rounded-lg bg-[#EEF1F6] border border-[#DCE3EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#244A70] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider">
                Google Meet Video Room
              </p>
              <p className="text-sm font-semibold text-[#17263A] truncate max-w-sm">
                {meeting.meetingUrl}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1.5 text-xs bg-white text-[#8491A3]"
            >
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#8491A3]" />
              )}
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleJoinMeet}
              className="gap-1.5 text-xs bg-[#244A70] hover:bg-[#244A70] text-white shadow-xs"
            >
              <Video className="w-3.5 h-3.5" />
              Join Room
              <ExternalLink className="w-3 h-3 opacity-80" />
            </Button>
          </div>
        </div>

        {/* Meeting Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Schedule */}
          <div className="p-3.5 rounded-xl border border-[#DCE3EC] bg-white space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#8491A3]">
              <Calendar className="w-3.5 h-3.5 text-[#244A70]" />
              <span>Date & Time</span>
            </div>
            <p className="text-sm font-bold text-[#17263A]">{dateStr}</p>
            <div className="flex items-center gap-2 text-xs text-[#8491A3]">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{timeStr}</span>
              {durationStr && (
                <span className="font-semibold text-[#244A70] bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                  ({durationStr})
                </span>
              )}
            </div>
          </div>

          {/* Host & Project */}
          <div className="p-3.5 rounded-xl border border-[#DCE3EC] bg-white space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#8491A3]">
              <User className="w-3.5 h-3.5 text-[#244A70]" />
              <span>Meeting Host</span>
            </div>
            <p className="text-sm font-semibold text-[#17263A] truncate">{meeting.hostEmail}</p>
            {meeting.projectName ? (
              <div className="flex items-center gap-1.5 text-xs text-[#8491A3] truncate">
                <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Project: {meeting.projectName}</span>
              </div>
            ) : meeting.projectId ? (
              <div className="flex items-center gap-1.5 text-xs text-[#8491A3] truncate">
                <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Project ID: {meeting.projectId}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Attendees Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#17263A] uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-[#244A70]" />
              <span>Invited Team Members ({meeting.attendeeEmails?.length || 0})</span>
            </div>
          </div>
          {meeting.attendeeEmails && meeting.attendeeEmails.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-[#DCE3EC] bg-[#F8FAFC]">
              {meeting.attendeeEmails.map((email, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#DCE3EC] text-xs font-medium text-[#17263A] shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {email}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8491A3] italic">No attendees registered.</p>
          )}
        </div>

        {/* Description / Agenda */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#17263A] uppercase tracking-wider mb-2">
            <FileText className="w-3.5 h-3.5 text-[#244A70]" />
            <span>Meeting Agenda & Technical Objectives</span>
          </div>
          <div className="p-3.5 rounded-xl border border-[#DCE3EC] bg-white text-xs leading-relaxed text-[#8491A3] whitespace-pre-wrap">
            {meeting.description || 'No specific agenda description provided.'}
          </div>
        </div>

        {/* Status Transition Quick Action Bar */}
        <div className="pt-4 border-t border-[#DCE3EC] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#8491A3]">
            <span>Current Status:</span>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>

          <div className="flex items-center gap-2">
            {meeting.status !== 'IN_PROGRESS' && meeting.status !== 'COMPLETED' && (
              <Button
                variant="outline"
                size="sm"
                disabled={isUpdatingStatus}
                onClick={() => onStatusChange(meeting, 'IN_PROGRESS')}
                className="gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                <Play className="w-3 h-3" />
                Start Meeting
              </Button>
            )}

            {meeting.status !== 'COMPLETED' && (
              <Button
                variant="outline"
                size="sm"
                disabled={isUpdatingStatus}
                onClick={() => onStatusChange(meeting, 'COMPLETED')}
                className="gap-1.5 text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                <Check className="w-3 h-3" />
                Mark Completed
              </Button>
            )}

            {meeting.status !== 'CANCELLED' && meeting.status !== 'COMPLETED' && (
              <Button
                variant="outline"
                size="sm"
                disabled={isUpdatingStatus}
                onClick={() => onStatusChange(meeting, 'CANCELLED')}
                className="gap-1.5 text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
              >
                <XCircle className="w-3 h-3" />
                Cancel Meeting
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
