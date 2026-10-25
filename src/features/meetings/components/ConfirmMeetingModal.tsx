import React, { useState } from 'react';
import { Calendar, Clock, Globe, Video, X } from 'lucide-react';
import { Button, Badge } from '@/shared/ui';
import type { MeetingFormat, MeetingRequest } from '../types/meeting-request';

interface ConfirmMeetingModalProps {
  meeting: MeetingRequest;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    scheduledStartTime: string;
    scheduledEndTime: string;
    format: MeetingFormat;
    customMeetingUrl?: string;
    createGoogleMeet: boolean;
  }) => Promise<void>;
  isSubmitting: boolean;
  calendarConnected: boolean;
}

export const ConfirmMeetingModal: React.FC<ConfirmMeetingModalProps> = ({
  meeting,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  calendarConnected,
}) => {
  const defaultDate = meeting.scheduling.requestedDate || new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(meeting.scheduling.requestedTime || '10:00');
  const [endTime, setEndTime] = useState('10:45');
  const [format, setFormat] = useState<MeetingFormat>('GOOGLE_MEET');
  const [createGoogleMeet, setCreateGoogleMeet] = useState(calendarConnected);
  const [customMeetingUrl, setCustomMeetingUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startIso = new Date(`${date}T${startTime}:00`).toISOString();
    const endIso = new Date(`${date}T${endTime}:00`).toISOString();

    await onSubmit({
      scheduledStartTime: startIso,
      scheduledEndTime: endIso,
      format,
      customMeetingUrl: customMeetingUrl.trim() || undefined,
      createGoogleMeet,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Confirm & Schedule Meeting</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Lock in appointment for {meeting.customer.companyName} ({meeting.requestId})
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
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meeting Date
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Time
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Time
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Meeting Format & Platform
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as MeetingFormat)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
            >
              <option value="GOOGLE_MEET">Google Meet</option>
              <option value="TEAMS">Microsoft Teams</option>
              <option value="ZOOM">Zoom Video</option>
              <option value="PHONE">Phone Conference</option>
              <option value="IN_PERSON">In-Person Meeting</option>
            </select>
          </div>

          {format === 'GOOGLE_MEET' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-[#244A70]" />
                  Google Calendar API
                </span>
                <Badge variant={calendarConnected ? 'success' : 'secondary'}>
                  {calendarConnected ? 'Integration Active' : 'Unconfigured (Manual URL)'}
                </Badge>
              </div>

              {calendarConnected ? (
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={createGoogleMeet}
                    onChange={(e) => setCreateGoogleMeet(e.target.checked)}
                    className="rounded text-[#244A70] focus:ring-[#244A70]"
                  />
                  <span className="text-xs text-slate-600">
                    Automatically create calendar event with live Meet link
                  </span>
                </label>
              ) : (
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Google Calendar service account is not configured in backend environment. Enter a manual Google Meet link below, or create room via internal conference tool.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom / External Meeting URL (Optional)
            </label>
            <div className="relative">
              <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={customMeetingUrl}
                onChange={(e) => setCustomMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/xxx-yyyy-zzz or Teams/Zoom link"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting} className="bg-[#244A70]">
              {isSubmitting ? 'Confirming...' : 'Confirm Meeting'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
