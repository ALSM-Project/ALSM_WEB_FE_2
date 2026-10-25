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
  Edit3,
  Trash2,
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import type { Meeting, MeetingStatus } from '../types/meeting';

interface MeetingCardProps {
  meeting: Meeting;
  onSelect?: (meeting: Meeting) => void;
  onEdit?: (meeting: Meeting) => void;
  onDelete?: (meeting: Meeting) => void;
  onCopyLink?: (meeting: Meeting) => void;
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

function formatMeetingDateTime(startIso: string, endIso: string): { dateStr: string; timeStr: string } {
  try {
    const startDate = new Date(startIso);
    const endDate = new Date(endIso);

    const dateStr = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(startDate);

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const timeStr = `${timeFormatter.format(startDate)} – ${timeFormatter.format(endDate)}`;
    return { dateStr, timeStr };
  } catch {
    return { dateStr: startIso, timeStr: '' };
  }
}

export const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  onSelect,
  onEdit,
  onDelete,
  onCopyLink,
}) => {
  const [copied, setCopied] = useState(false);
  const statusInfo = STATUS_CONFIG[meeting.status] || {
    label: meeting.status,
    variant: 'secondary',
  };
  const { dateStr, timeStr } = formatMeetingDateTime(
    meeting.scheduledStartTime,
    meeting.scheduledEndTime,
  );

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(meeting.meetingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopyLink?.(meeting);
    } catch {
      // Fallback
    }
  };

  const handleJoin = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(meeting.meetingUrl, '_blank', 'noopener,noreferrer');
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(meeting);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(meeting);
  };

  return (
    <Card
      variant="default"
      padding="md"
      onClick={() => onSelect?.(meeting)}
      className="border border-[#DCE3EC] rounded-xl hover:border-[#244A70] hover:shadow-md transition-all duration-200 bg-white shadow-2xs flex flex-col justify-between cursor-pointer group"
      id={`meeting-card-${meeting.id}`}
    >
      <div>
        {/* Header row: Status + Meeting Code + Quick Edit/Delete */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-[#8491A3] bg-[#F8FAFC] border border-[#DCE3EC] px-2 py-0.5 rounded">
              {meeting.meetingCode}
            </span>
            {onEdit && (
              <button
                type="button"
                onClick={handleEdit}
                title="Edit meeting"
                className="p-1 rounded-md text-slate-400 hover:text-[#244A70] hover:bg-blue-50 transition-colors opacity-70 group-hover:opacity-100"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                title="Delete meeting"
                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-70 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-[#17263A] group-hover:text-[#244A70] transition-colors line-clamp-2 mb-1">
          {meeting.title}
        </h3>

        {/* Optional Description */}
        {meeting.description && (
          <p className="text-xs text-[#8491A3] line-clamp-2 mb-3 leading-relaxed">
            {meeting.description}
          </p>
        )}

        {/* Schedule & Metadata */}
        <div className="space-y-1.5 mt-3 pt-3 border-t border-[#F4F7FB] text-xs text-[#8491A3]">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#244A70] shrink-0" />
            <span className="font-semibold text-[#17263A]">{dateStr}</span>
            {timeStr && (
              <>
                <span className="text-gray-300">•</span>
                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>{timeStr}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">Host: {meeting.hostEmail}</span>
          </div>

          {meeting.attendeeEmails && meeting.attendeeEmails.length > 0 && (
            <div className="flex items-start gap-2">
              <Users className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {meeting.attendeeEmails.slice(0, 2).map((email, idx) => (
                  <span
                    key={idx}
                    className="inline-block px-1.5 py-0.5 bg-[#F4F7FB] text-[#8491A3] rounded text-[11px]"
                  >
                    {email}
                  </span>
                ))}
                {meeting.attendeeEmails.length > 2 && (
                  <span className="inline-block px-1.5 py-0.5 bg-[#F4F7FB] text-[#8491A3] rounded text-[11px] font-semibold">
                    +{meeting.attendeeEmails.length - 2} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="pt-3 mt-3 border-t border-[#F4F7FB] flex items-center gap-2">
        <Button
          id={`copy-meet-${meeting.id}`}
          variant="outline"
          size="sm"
          className="flex-1 gap-1 text-xs"
          onClick={handleCopy}
        >
          {copied ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-[#8491A3]" />
          )}
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>

        <Button
          id={`join-meet-${meeting.id}`}
          variant="primary"
          size="sm"
          className="flex-1 gap-1 text-xs bg-[#244A70] hover:bg-[#244A70]"
          onClick={handleJoin}
        >
          <Video className="w-3.5 h-3.5" />
          Join
          <ExternalLink className="w-3 h-3 opacity-70" />
        </Button>
      </div>
    </Card>
  );
};
