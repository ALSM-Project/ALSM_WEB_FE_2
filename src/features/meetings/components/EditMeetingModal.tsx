import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  AlertCircle,
  Video,
  Save,
} from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import type { Meeting, MeetingStatus, UpdateMeetingRequest } from '../types/meeting';

interface EditMeetingModalProps {
  isOpen: boolean;
  meeting: Meeting | null;
  onClose: () => void;
  onSave: (id: string, dto: UpdateMeetingRequest) => Promise<void>;
  isSaving?: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toLocalDatetimeValue(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

function addMinutes(dateString: string, minutes: number): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const newDate = new Date(d.getTime() + minutes * 60_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${newDate.getFullYear()}-${pad(newDate.getMonth() + 1)}-${pad(newDate.getDate())}T${pad(newDate.getHours())}:${pad(newDate.getMinutes())}`;
  } catch {
    return '';
  }
}

export const EditMeetingModal: React.FC<EditMeetingModalProps> = ({
  isOpen,
  meeting,
  onClose,
  onSave,
  isSaving = false,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [customMeetingUrl, setCustomMeetingUrl] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<MeetingStatus>('SCHEDULED');
  const [attendeeEmails, setAttendeeEmails] = useState<string[]>([]);
  const [attendeeInput, setAttendeeInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  // Fetch available projects
  const { data: projectsList = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['available-projects-list'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<Array<{ id: string; name: string }>>('/projects');
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const projectOptions: SelectOption[] = [
    { value: '', label: '-- General Team Sync / No Specific Project --' },
    ...projectsList.map((p) => ({ value: p.id, label: p.name })),
  ];

  const statusOptions: SelectOption[] = [
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title || '');
      setDescription(meeting.description || '');
      setStartTime(toLocalDatetimeValue(meeting.scheduledStartTime));
      setEndTime(toLocalDatetimeValue(meeting.scheduledEndTime));
      setCustomMeetingUrl(meeting.meetingUrl || '');
      setProjectId(meeting.projectId || '');
      setStatus(meeting.status || 'SCHEDULED');
      setAttendeeEmails(meeting.attendeeEmails ? [...meeting.attendeeEmails] : []);
      setAttendeeInput('');
      setErrors({});
      setGlobalError('');
    }
  }, [meeting, isOpen]);

  if (!meeting) return null;

  const handleAddAttendee = () => {
    const email = attendeeInput.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_PATTERN.test(email)) {
      setErrors((prev) => ({ ...prev, attendeeInput: 'Invalid email address format' }));
      return;
    }
    if (attendeeEmails.includes(email)) {
      setErrors((prev) => ({ ...prev, attendeeInput: 'Email already added' }));
      return;
    }
    setAttendeeEmails((prev) => [...prev, email]);
    setAttendeeInput('');
    setErrors((prev) => {
      const { attendeeInput: _, ...rest } = prev;
      return rest;
    });
  };

  const handleRemoveAttendee = (email: string) => {
    setAttendeeEmails((prev) => prev.filter((e) => e !== email));
  };

  const applyDuration = (mins: number) => {
    if (!startTime) return;
    setEndTime(addMinutes(startTime, mins));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim() || title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    if (!description.trim() || description.trim().length < 5) {
      newErrors.description = 'Description/Agenda must be at least 5 characters';
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime())) {
      newErrors.startTime = 'Invalid start date';
    }
    if (isNaN(end.getTime())) {
      newErrors.endTime = 'Invalid end date';
    } else if (end <= start) {
      newErrors.endTime = 'End time must be after start time';
    }

    if (customMeetingUrl && !/^https:\/\/meet\.google\.com\/[a-z0-9][a-z0-9-]*$/.test(customMeetingUrl)) {
      newErrors.customMeetingUrl = 'Must be a valid Google Meet link (https://meet.google.com/xxx-yyyy-zzz)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setGlobalError('');
      await onSave(meeting.id, {
        title: title.trim(),
        description: description.trim(),
        scheduledStartTime: start.toISOString(),
        scheduledEndTime: end.toISOString(),
        customMeetingUrl: customMeetingUrl.trim() || undefined,
        projectId: projectId.trim() || undefined,
        attendeeEmails,
        status,
      });
      onClose();
    } catch (err: any) {
      setGlobalError(err?.response?.data?.message || err?.message || 'Failed to update meeting');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Online Meeting" maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {globalError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{globalError}</span>
          </div>
        )}

        {/* Meeting Title */}
        <div>
          <label className="block text-xs font-semibold text-[#17263A] mb-1">
            Meeting Title / Topic *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sprint Review & Code Modernization Sync"
            error={errors.title}
          />
        </div>

        {/* Description / Agenda */}
        <div>
          <label className="block text-xs font-semibold text-[#17263A] mb-1">
            Meeting Agenda & Objectives *
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe key topics, discussion points, and sprint goals..."
            className={`w-full p-2.5 rounded-xl border text-xs text-[#17263A] focus:outline-none focus:ring-2 focus:ring-[#244A70] ${
              errors.description ? 'border-rose-400 bg-rose-50/30' : 'border-[#DCE3EC] bg-[#F8FAFC] focus:bg-white'
            }`}
          />
          {errors.description && (
            <p className="text-[11px] text-rose-600 mt-1">{errors.description}</p>
          )}
        </div>

        {/* Status & Project */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#17263A] mb-1">
              Meeting Status
            </label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as MeetingStatus)}
              options={statusOptions}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17263A] mb-1">
              Related Project
            </label>
            <Select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              options={projectOptions}
            />
          </div>
        </div>

        {/* Time Schedule */}
        <div className="p-3.5 rounded-xl border border-[#DCE3EC] bg-[#F8FAFC] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-[#17263A] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#244A70]" />
              Schedule & Duration
            </span>
            <div className="flex items-center gap-1">
              {[15, 30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => applyDuration(mins)}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-[#DCE3EC] text-[#8491A3] hover:border-[#244A70] hover:text-[#244A70]"
                >
                  +{mins}m
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[#8491A3] font-medium mb-1">Start Time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
              {errors.startTime && <p className="text-[11px] text-rose-600 mt-1">{errors.startTime}</p>}
            </div>

            <div>
              <label className="block text-[11px] text-[#8491A3] font-medium mb-1">End Time</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
              {errors.endTime && <p className="text-[11px] text-rose-600 mt-1">{errors.endTime}</p>}
            </div>
          </div>
        </div>

        {/* Google Meet Link */}
        <div>
          <label className="block text-xs font-semibold text-[#17263A] mb-1 flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-[#244A70]" />
            Google Meet Room Link
          </label>
          <Input
            value={customMeetingUrl}
            onChange={(e) => setCustomMeetingUrl(e.target.value)}
            placeholder="https://meet.google.com/xxx-yyyy-zzz"
            error={errors.customMeetingUrl}
          />
        </div>

        {/* Attendees */}
        <div>
          <label className="block text-xs font-semibold text-[#17263A] mb-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#244A70]" />
            Attendees ({attendeeEmails.length})
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="email"
              value={attendeeInput}
              onChange={(e) => setAttendeeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddAttendee();
                }
              }}
              placeholder="member@company.com"
              className="flex-1 text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#244A70]"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddAttendee}>
              Add
            </Button>
          </div>
          {errors.attendeeInput && (
            <p className="text-[11px] text-rose-600 mb-2">{errors.attendeeInput}</p>
          )}

          {attendeeEmails.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-slate-200 bg-white max-h-28 overflow-y-auto">
              {attendeeEmails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[11px] font-medium border border-blue-200"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => handleRemoveAttendee(email)}
                    className="hover:text-rose-600 font-bold ml-0.5"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#DCE3EC] flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSaving}
            className="gap-1.5 bg-[#244A70] hover:bg-[#244A70]"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
