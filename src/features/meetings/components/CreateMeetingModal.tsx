import React, { useState } from 'react';
import {
  Calendar,
  Users,
  Video,
  Sparkles,
  Link,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { CreateMeetingRequest } from '../types/meeting';

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateMeetingRequest) => Promise<void>;
  isSubmitting?: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOOGLE_MEET_PATTERN = /^https:\/\/meet\.google\.com\/[a-z0-9][a-z0-9-]*$/;

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addMinutes(d: Date, m: number): Date {
  return new Date(d.getTime() + m * 60_000);
}

export const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [mode, setMode] = useState<'auto' | 'custom'>('auto');
  const [customMeetingUrl, setCustomMeetingUrl] = useState('');
  const [startTime, setStartTime] = useState(() => toLocalDatetimeValue(addMinutes(new Date(), 10)));
  const [endTime, setEndTime] = useState(() => toLocalDatetimeValue(addMinutes(new Date(), 40)));
  const [attendeeEmails, setAttendeeEmails] = useState<string[]>([]);
  const [attendeeInput, setAttendeeInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  // Fetch projects list
  const { data: rawProjectsList = [], isLoading: isLoadingProjects } = useQuery<Array<{
    id: string;
    name: string;
    assignedTeamLeadId?: string;
    assignedTeamLeadName?: string;
  }>>({
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

  // Filter projects assigned by admin down to this team lead
  const myAssignedProjects = React.useMemo(() => {
    if (!user) return rawProjectsList;

    const assignedToMe = rawProjectsList.filter((p) => {
      const matchId = p.assignedTeamLeadId && (p.assignedTeamLeadId === user.id);
      const matchName = !!(
        p.assignedTeamLeadName &&
        user.fullName &&
        p.assignedTeamLeadName.toLowerCase().includes(user.fullName.toLowerCase())
      );
      return matchId || matchName;
    });

    if (assignedToMe.length > 0) return assignedToMe;

    if (user.isPlatformAdmin) {
      const assignedToAnyLead = rawProjectsList.filter((p) => !!p.assignedTeamLeadId);
      if (assignedToAnyLead.length > 0) return assignedToAnyLead;
    }

    const hasAnyLeadAssigned = rawProjectsList.some((p) => !!p.assignedTeamLeadId);
    if (!hasAnyLeadAssigned) return rawProjectsList;

    return [];
  }, [rawProjectsList, user]);

  const projectOptions: SelectOption[] = [
    {
      value: '',
      label: isLoadingProjects
        ? 'Loading projects...'
        : myAssignedProjects.length === 0
        ? '-- No projects assigned to your account --'
        : '-- General Team Meeting / No Project --',
    },
    ...myAssignedProjects.map((p) => ({ value: p.id, label: p.name })),
  ];

  // Fetch assigned staff members for the selected project
  const { data: assignedMembers = [] } = useQuery<Array<{ id: string; fullName: string; email: string; role: string }>>({
    queryKey: ['project-assigned-members-modal', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      try {
        const res = await apiClient.get<Array<{ id: string; fullName: string; email: string; role: string }>>(
          `/projects/${projectId}/assigned-members`,
        );
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });

  // Automatically include assigned member emails
  React.useEffect(() => {
    if (Array.isArray(assignedMembers) && assignedMembers.length > 0) {
      setAttendeeEmails((prev) => {
        const set = new Set(prev);
        let changed = false;
        assignedMembers.forEach((m) => {
          if (m && typeof m.email === 'string' && m.email.trim()) {
            const em = m.email.trim().toLowerCase();
            if (!set.has(em)) {
              set.add(em);
              changed = true;
            }
          }
        });
        return changed ? Array.from(set) : prev;
      });
    }
  }, [assignedMembers]);

  const applyDuration = (mins: number) => {
    const s = startTime ? new Date(startTime) : addMinutes(new Date(), 10);
    const validStart = isNaN(s.getTime()) ? addMinutes(new Date(), 10) : s;
    setStartTime(toLocalDatetimeValue(validStart));
    setEndTime(toLocalDatetimeValue(addMinutes(validStart, mins)));
  };

  const handleAddAttendee = () => {
    const email = attendeeInput.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_PATTERN.test(email)) {
      setErrors((prev) => ({ ...prev, attendeeInput: 'Invalid email address format' }));
      return;
    }
    if (attendeeEmails.includes(email)) {
      setErrors((prev) => ({ ...prev, attendeeInput: 'Email already added to attendee list' }));
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

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setProjectId('');
    setMode('auto');
    setCustomMeetingUrl('');
    setStartTime(toLocalDatetimeValue(addMinutes(new Date(), 10)));
    setEndTime(toLocalDatetimeValue(addMinutes(new Date(), 40)));
    setAttendeeEmails([]);
    setAttendeeInput('');
    setErrors({});
    setGlobalError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Meeting title is required';
    } else if (title.trim().length < 3) {
      newErrors.title = 'Meeting title must be at least 3 characters';
    }

    if (!description.trim()) {
      newErrors.description = 'Meeting agenda/description is required';
    } else if (description.trim().length < 5) {
      newErrors.description = 'Meeting agenda must be at least 5 characters';
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime())) {
      newErrors.startTime = 'Invalid start time';
    }
    if (isNaN(end.getTime())) {
      newErrors.endTime = 'Invalid end time';
    } else if (end <= start) {
      newErrors.endTime = 'End time must be after start time';
    }

    if (attendeeEmails.length === 0 && attendeeInput.trim()) {
      if (EMAIL_PATTERN.test(attendeeInput.trim())) {
        attendeeEmails.push(attendeeInput.trim().toLowerCase());
        setAttendeeInput('');
      }
    }

    if (attendeeEmails.length === 0) {
      newErrors.attendeeInput = 'Please add at least one attendee email';
    }

    if (mode === 'custom') {
      if (!customMeetingUrl.trim()) {
        newErrors.customMeetingUrl = 'Custom Google Meet URL is required in custom mode';
      } else if (!GOOGLE_MEET_PATTERN.test(customMeetingUrl.trim())) {
        newErrors.customMeetingUrl = 'Must be a valid Google Meet link (https://meet.google.com/xxx-yyyy-zzz)';
      }
    }

    // Resolve a project fallback if none selected
    let effectiveProjectId = projectId.trim();
    if (!effectiveProjectId && myAssignedProjects.length > 0) {
      effectiveProjectId = myAssignedProjects[0].id;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setGlobalError('');
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        scheduledStartTime: start.toISOString(),
        scheduledEndTime: end.toISOString(),
        projectId: effectiveProjectId || 'general-team-meeting',
        attendeeEmails,
        customMeetingUrl: mode === 'custom' ? customMeetingUrl.trim() : undefined,
      });
      handleReset();
      onClose();
    } catch (err: any) {
      setGlobalError(err?.response?.data?.message || err?.message || 'Failed to create meeting room');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Online Meeting Room" maxWidth="2xl">
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
            Meeting Title / Subject *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Daily Standup, Sprint 14 Architecture Sync, AST Conversion Review"
            error={errors.title}
          />
        </div>

        {/* Agenda / Description */}
        <div>
          <label className="block text-xs font-semibold text-[#17263A] mb-1">
            Meeting Agenda & Objectives *
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Outline sprint goals, discussion topics, code review checklists..."
            className={`w-full p-2.5 rounded-xl border text-xs text-[#17263A] focus:outline-none focus:ring-2 focus:ring-[#244A70] ${
              errors.description ? 'border-rose-400 bg-rose-50/30' : 'border-[#DCE3EC] bg-[#F8FAFC] focus:bg-white'
            }`}
          />
          {errors.description && (
            <p className="text-[11px] text-rose-600 mt-1">{errors.description}</p>
          )}
        </div>

        {/* Project Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#17263A] mb-1">
            Associated Project
          </label>
          <Select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            options={projectOptions}
          />
        </div>

        {/* Date & Time with Quick Durations */}
        <div className="p-3.5 rounded-xl border border-[#DCE3EC] bg-[#F8FAFC] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-[#17263A] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#244A70]" />
              Schedule Date & Duration
            </span>
            <div className="flex items-center gap-1">
              {[15, 30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => applyDuration(mins)}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-[#DCE3EC] text-[#8491A3] hover:border-[#244A70] hover:text-[#244A70] cursor-pointer"
                >
                  +{mins}m
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[#8491A3] font-medium mb-1">Start Time *</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
              {errors.startTime && <p className="text-[11px] text-rose-600 mt-1">{errors.startTime}</p>}
            </div>

            <div>
              <label className="block text-[11px] text-[#8491A3] font-medium mb-1">End Time *</label>
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

        {/* Meeting Link Generation Mode */}
        <div className="p-3.5 rounded-xl border border-[#DCE3EC] bg-white space-y-2.5">
          <label className="block text-xs font-semibold text-[#17263A]">
            Google Meet Room Configuration
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('auto')}
              className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                mode === 'auto'
                  ? 'border-[#244A70] bg-blue-50/60 text-[#244A70]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-xs">Auto-Generate Meet Link</p>
                <p className="text-[10px] opacity-75 mt-0.5">Automated secure Google Meet room</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                mode === 'custom'
                  ? 'border-[#244A70] bg-blue-50/60 text-[#244A70]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <Link className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-xs">Custom Meet Link</p>
                <p className="text-[10px] opacity-75 mt-0.5">Paste an existing Google Meet link</p>
              </div>
            </button>
          </div>

          {mode === 'custom' && (
            <div className="pt-2">
              <Input
                value={customMeetingUrl}
                onChange={(e) => setCustomMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/xxx-yyyy-zzz"
                error={errors.customMeetingUrl}
              />
            </div>
          )}
        </div>

        {/* Attendees */}
        <div>
          <label className="block text-xs font-semibold text-[#17263A] mb-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#244A70]" />
            Invite Team Members *
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
              placeholder="e.g. engineer@alsm.io"
              className="flex-1 text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#244A70]"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddAttendee}>
              <Plus className="w-3.5 h-3.5 mr-1" />
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
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[11px] font-medium border border-blue-200"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {email}
                  <button
                    type="button"
                    onClick={() => handleRemoveAttendee(email)}
                    className="hover:text-rose-600 font-bold ml-1 text-xs"
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
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="gap-1.5 bg-[#244A70] hover:bg-[#244A70]"
          >
            <Video className="w-3.5 h-3.5" />
            {isSubmitting ? 'Scheduling Meeting...' : 'Schedule Meeting'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
