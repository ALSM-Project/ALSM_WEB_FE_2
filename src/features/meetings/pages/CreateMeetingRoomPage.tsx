import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Video,
  Link,
  Clock,
  Users,
  FileText,
  Wand2,
  CheckCircle2,
  Copy,
  ExternalLink,
  X,
  AlertCircle,
  Calendar,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { useCreateMeeting } from '../hooks/useMeetings';

// ─── helpers ──────────────────────────────────────────────────────────────────
const GOOGLE_MEET_PATTERN = /^https:\/\/meet\.google\.com\/[a-z0-9][a-z0-9-]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type MeetingMode = 'auto' | 'custom';
type QuickDuration = 30 | 60;

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addMinutes(d: Date, m: number): Date {
  return new Date(d.getTime() + m * 60_000);
}

function formatPreviewDateTime(startIso: string, endIso: string): string {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'Time not specified';
    const date = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(s);
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${date} • ${timeFormatter.format(s)} – ${timeFormatter.format(e)}`;
  } catch {
    return 'Time not specified';
  }
}

function computeDurationMinutes(startIso: string, endIso: string): number | null {
  try {
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return null;
    return Math.round((e - s) / 60_000);
  } catch {
    return null;
  }
}

// ─── component ────────────────────────────────────────────────────────────────
export const CreateMeetingRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mutateAsync: createMeeting, isPending } = useCreateMeeting();

  const paramTitle = searchParams.get('title') || '';
  const paramEmail = searchParams.get('email') || '';

  const { data: projectsList = [], isLoading: isLoadingProjects } = useQuery<Array<{ id: string; name: string }>>({
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
    { value: '', label: isLoadingProjects ? 'Loading projects...' : '-- Select a project (Chọn dự án) --' },
    ...projectsList.map((p) => ({
      value: p.id,
      label: p.name,
    })),
  ];


  // form state
  const [title, setTitle] = useState(paramTitle);
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [mode, setMode] = useState<MeetingMode>('auto');
  const [customMeetingUrl, setCustomMeetingUrl] = useState('');
  const [attendeeInput, setAttendeeInput] = useState('');
  const [attendeeEmails, setAttendeeEmails] = useState<string[]>(() => (paramEmail ? [paramEmail] : []));
  const [startTime, setStartTime] = useState(() => toLocalDatetimeValue(addMinutes(new Date(), 5)));
  const [endTime, setEndTime] = useState(() => toLocalDatetimeValue(addMinutes(new Date(), 65)));

  // derived
  const selectedProject = projectsList.find((p) => p.id === projectId || p.name === projectId);

  // ui state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [successMeeting, setSuccessMeeting] = useState<{ meetingUrl: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // quick‐duration helper
  const applyQuickDuration = (minutes: QuickDuration) => {
    const s = addMinutes(new Date(), 2);
    setStartTime(toLocalDatetimeValue(s));
    setEndTime(toLocalDatetimeValue(addMinutes(s, minutes)));
  };

  // attendee chip management
  const addAttendee = () => {
    const email = attendeeInput.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_PATTERN.test(email)) {
      setErrors((e) => ({ ...e, attendeeInput: 'Invalid email address' }));
      return;
    }
    if (attendeeEmails.includes(email)) {
      setErrors((e) => ({ ...e, attendeeInput: 'This email is already added' }));
      return;
    }
    setAttendeeEmails((prev) => [...prev, email]);
    setAttendeeInput('');
    setErrors((e) => {
      const { attendeeInput: _, ...rest } = e;
      return rest;
    });
  };

  const removeAttendee = (email: string) => {
    setAttendeeEmails((prev) => prev.filter((e) => e !== email));
  };

  // validation
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    // 1. Title validation
    if (!title.trim()) {
      errs.title = 'Meeting title is required';
    } else if (title.trim().length < 3) {
      errs.title = 'Meeting title must be at least 3 characters';
    }

    // 2. Description / Agenda validation
    if (!description.trim()) {
      errs.description = 'Meeting description/agenda is required';
    } else if (description.trim().length < 5) {
      errs.description = 'Meeting description/agenda must be at least 5 characters';
    }

    // 3. Project ID validation
    if (!projectId.trim()) {
      errs.projectId = 'Please select a related project';
    }

    // 4. Attendees validation: auto-add valid email if typed but not added yet
    let currentAttendees = [...attendeeEmails];
    if (attendeeInput.trim()) {
      const email = attendeeInput.trim().toLowerCase();
      if (EMAIL_PATTERN.test(email) && !currentAttendees.includes(email)) {
        currentAttendees.push(email);
        setAttendeeEmails(currentAttendees);
        setAttendeeInput('');
      } else if (!EMAIL_PATTERN.test(email)) {
        errs.attendeeInput = 'Invalid email address';
      }
    }

    if (currentAttendees.length === 0) {
      errs.attendees = 'At least one attendee email is required';
    }

    // 5. Google Meet Link validation
    if (mode === 'custom') {
      const url = customMeetingUrl.trim();
      if (!url) {
        errs.customMeetingUrl = 'Please enter a Google Meet link';
      } else if (!GOOGLE_MEET_PATTERN.test(url)) {
        errs.customMeetingUrl = 'Must be a valid Google Meet link (https://meet.google.com/xxx-yyyy-zzz)';
      }
    }

    // 6. Schedule validation
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!startTime || isNaN(start.getTime())) {
      errs.startTime = 'Start time is required and must be valid';
    }
    if (!endTime || isNaN(end.getTime())) {
      errs.endTime = 'End time is required and must be valid';
    }
    if (!errs.startTime && !errs.endTime && end <= start) {
      errs.endTime = 'End time must be after start time';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    if (!validate()) return;

    try {
      const result = await createMeeting({
        title: title.trim(),
        description: description.trim(),
        customMeetingUrl: mode === 'custom' ? customMeetingUrl.trim() : undefined,
        projectId: projectId.trim(),
        attendeeEmails,
        scheduledStartTime: new Date(startTime).toISOString(),
        scheduledEndTime: new Date(endTime).toISOString(),
      });
      setSuccessMeeting({ meetingUrl: result.meetingUrl, title: result.title });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setGlobalError(msg ?? 'Failed to create meeting. Please try again.');
    }
  };

  const copyLink = async () => {
    if (!successMeeting) return;
    await navigator.clipboard.writeText(successMeeting.meetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const durationMins = computeDurationMinutes(startTime, endTime);

  // ── success screen ────────────────────────────────────────────────────────
  if (successMeeting) {
    return (
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5EAF0]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF2FC] text-[#0652CC] uppercase tracking-wider">
                Enterprise Collaboration
              </span>
              <span className="text-[11px] text-[#6B778C]">Google Meet Integration</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#091E42] mt-1">
              Meeting Room Ready
            </h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto py-6">
          <Card className="text-center p-8 bg-white border border-[#E5EAF0] shadow-2xs rounded-xl">
            <div className="flex flex-col items-center gap-5 py-4">
              {/* Google Meet icon circle */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00AC47] via-[#00832D] to-[#0052CC] flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Video className="w-10 h-10 text-white" />
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <div>
                <h1 className="text-2xl font-bold text-[#091E42]">Meeting Room Created!</h1>
                <p className="text-sm text-[#42526E] mt-1">
                  Your Google Meet room is ready and active for participants
                </p>
              </div>

              <div className="w-full bg-[#F7F9FC] rounded-xl border border-[#E5EAF0] p-5 text-left">
                <p className="text-xs font-semibold text-[#42526E] mb-2 uppercase tracking-wide">
                  Google Meet Link
                </p>
                <div className="flex items-center gap-2 bg-white border border-[#E5EAF0] rounded-lg px-3.5 py-3 shadow-2xs">
                  <Link className="w-4 h-4 text-[#0652CC] shrink-0" />
                  <span className="text-sm font-mono text-[#0652CC] font-semibold flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {successMeeting.meetingUrl}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <Button
                  id="copy-meet-link-btn"
                  variant="outline"
                  className="flex-1 gap-2 py-2.5"
                  onClick={() => {
                    void copyLink();
                  }}
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button
                  id="join-meet-btn"
                  variant="primary"
                  className="flex-1 gap-2 py-2.5 bg-[#0652CC] hover:bg-[#0041A8]"
                  onClick={() => window.open(successMeeting.meetingUrl, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="w-4 h-4" />
                  Join Now
                </Button>
              </div>

              <Button
                id="view-meetings-btn"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/enterprise/meetings')}
                className="text-[#0652CC] hover:text-[#0041A8] font-medium"
              >
                View all meetings →
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── create form (Full-width 2-column layout) ──────────────────────────────
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5EAF0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF2FC] text-[#0652CC] uppercase tracking-wider">
              Enterprise Collaboration
            </span>
            <span className="text-[11px] text-[#6B778C]">Schedule Conference</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091E42] mt-1">
            Create Online Meeting Room
          </h1>
          <p className="text-xs text-[#6B778C] mt-1 max-w-3xl">
            Configure and schedule a secure Google Meet conference room for your enterprise team
          </p>
        </div>
        <div>
          <Button
            id="cancel-create-meeting-btn"
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
        </div>
      </div>

      {globalError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 shadow-2xs">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-rose-600" />
          <span className="font-medium">{globalError}</span>
        </div>
      )}

      <form id="create-meeting-form" onSubmit={(e) => { void handleSubmit(e); }}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ══════════════════════════════════════════════════════════════════════════
              LEFT COLUMN: Primary Form Information (7 cols on lg, 8 cols on xl)
              ══════════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* Card 1: Meeting Details */}
            <Card className="border border-[#E5EAF0] bg-white shadow-2xs rounded-xl">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F4F8]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#E8F1FF] flex items-center justify-center text-[#0652CC]">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#091E42]">Meeting Details</h2>
                      <p className="text-xs text-[#42526E]">Primary topic and agenda for attendees</p>
                    </div>
                  </div>
                  <Badge variant="info">Required</Badge>
                </div>

                <Input
                  id="meeting-title-input"
                  label="Meeting Title *"
                  placeholder="e.g. Sprint Review — Project Phoenix"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  error={errors.title}
                />

                <div className="w-full flex flex-col space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#091E42] tracking-wide">
                      Description / Agenda *
                    </label>
                    <span className="text-[11px] font-semibold text-rose-500">Required (min 5 chars)</span>
                  </div>
                  <textarea
                    id="meeting-description-input"
                    rows={4}
                    placeholder="What will this meeting cover? Add objectives, talking points, or shared resources..."
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (errors.description) {
                        setErrors((prev) => {
                          const { description: _, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 text-sm bg-white border ${
                      errors.description
                        ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500'
                        : 'border-[#D9E2EC] focus:ring-[#0652CC] focus:border-[#0652CC]'
                    } rounded-lg text-[#091E42] placeholder-[#6B778C] shadow-2xs transition-all focus:outline-none focus:ring-2 resize-none`}
                  />
                  {errors.description && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">{errors.description}</p>
                  )}
                </div>

                <Select
                  id="meeting-project-select"
                  label="Related Project (Dự án liên kết) *"
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    if (errors.projectId) {
                      setErrors((prev) => {
                        const { projectId: _, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  options={projectOptions}
                  error={errors.projectId}
                  helperText="Select a modernization project for this meeting from your organization"
                />
              </div>
            </Card>

            {/* Card 2: Schedule */}
            <Card className="border border-[#E5EAF0] bg-white shadow-2xs rounded-xl">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F4F8]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#091E42]">Schedule & Timing</h2>
                      <p className="text-xs text-[#42526E]">Set meeting date, start time, and estimated duration</p>
                    </div>
                  </div>
                  {durationMins !== null && (
                    <Badge variant="primary" className="font-mono">
                      {durationMins} mins
                    </Badge>
                  )}
                </div>

                {/* Quick presets */}
                <div className="flex items-center gap-2 flex-wrap bg-[#F7F9FC] p-3 rounded-lg border border-[#E5EAF0]">
                  <span className="text-xs font-medium text-[#42526E]">Quick start presets:</span>
                  {([30, 60] as QuickDuration[]).map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      id={`quick-duration-${mins}-btn`}
                      onClick={() => applyQuickDuration(mins)}
                      className="px-3 py-1 text-xs font-semibold rounded-full bg-white border border-[#0652CC]/30 text-[#0652CC] hover:bg-[#E8F1FF] hover:border-[#0652CC] transition-colors cursor-pointer shadow-2xs"
                    >
                      Now + {mins}m
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const tom = new Date();
                      tom.setDate(tom.getDate() + 1);
                      tom.setHours(9, 0, 0, 0);
                      setStartTime(toLocalDatetimeValue(tom));
                      setEndTime(toLocalDatetimeValue(addMinutes(tom, 60)));
                    }}
                    className="px-3 py-1 text-xs font-semibold rounded-full bg-white border border-[#D9E2EC] text-[#42526E] hover:bg-gray-100 transition-colors cursor-pointer shadow-2xs"
                  >
                    Tomorrow 9:00 AM
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    id="meeting-start-time-input"
                    label="Start Time *"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    error={errors.startTime}
                  />
                  <Input
                    id="meeting-end-time-input"
                    label="End Time *"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    error={errors.endTime}
                  />
                </div>
              </div>
            </Card>

            {/* Card 3: Google Meet configuration */}
            <Card className="border border-[#E5EAF0] bg-white shadow-2xs rounded-xl">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F4F8]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#091E42]">Google Meet Configuration</h2>
                      <p className="text-xs text-[#42526E]">Choose how your video room URL is generated</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-medium border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Enterprise Encrypted
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* auto */}
                  <button
                    type="button"
                    id="mode-auto-btn"
                    onClick={() => setMode('auto')}
                    className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      mode === 'auto'
                        ? 'border-[#0652CC] bg-[#E8F1FF]/60 shadow-sm'
                        : 'border-[#D9E2EC] bg-white hover:border-[#0652CC]/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Wand2 className={`w-4 h-4 ${mode === 'auto' ? 'text-[#0652CC]' : 'text-[#6B778C]'}`} />
                      <span className={`text-sm font-bold ${mode === 'auto' ? 'text-[#0652CC]' : 'text-[#091E42]'}`}>
                        Auto-generate link
                      </span>
                      {mode === 'auto' && (
                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0652CC] text-white">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#42526E] leading-relaxed">
                      ALSM automatically provisions a unique Google Meet link code (format: 3-4-3 letters)
                    </p>
                  </button>

                  {/* custom */}
                  <button
                    type="button"
                    id="mode-custom-btn"
                    onClick={() => setMode('custom')}
                    className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      mode === 'custom'
                        ? 'border-[#0652CC] bg-[#E8F1FF]/60 shadow-sm'
                        : 'border-[#D9E2EC] bg-white hover:border-[#0652CC]/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Link className={`w-4 h-4 ${mode === 'custom' ? 'text-[#0652CC]' : 'text-[#6B778C]'}`} />
                      <span className={`text-sm font-bold ${mode === 'custom' ? 'text-[#0652CC]' : 'text-[#091E42]'}`}>
                        Use existing link
                      </span>
                    </div>
                    <p className="text-xs text-[#42526E] leading-relaxed">
                      Paste an existing Google Meet link already scheduled in your Google Calendar
                    </p>
                  </button>
                </div>

                {mode === 'auto' && (
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-950">Lưu ý khi chọn Auto-generate:</p>
                      <p className="leading-relaxed text-amber-900">
                        Chế độ tự sinh từ máy chủ yêu cầu đã cấu hình Google Workspace Enterprise Service Account. Để cuộc họp 100% vào được ngay và không bị lỗi mã phòng trên Google, bạn nên chọn tab <strong className="font-bold underline cursor-pointer" onClick={() => setMode('custom')}>&quot;Use existing link&quot;</strong> để lấy link Google Meet chính thức.
                      </p>
                    </div>
                  </div>
                )}

                {mode === 'custom' && (
                  <div className="pt-2 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#E8F1FF]/70 border border-[#0652CC]/25 rounded-xl p-3.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#0652CC] shrink-0" />
                        <span className="text-xs text-[#091E42] font-medium">
                          Chưa có link? Bấm nút để Google tự động tạo phòng họp thật ngay lập tức:
                        </span>
                      </div>
                      <button
                        type="button"
                        id="open-google-meet-new-btn"
                        onClick={() => window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer')}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0652CC] text-white hover:bg-[#0041A8] transition-colors shadow-2xs shrink-0 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Tạo phòng Meet thật ngay
                      </button>
                    </div>

                    <Input
                      id="custom-meet-url-input"
                      label="Google Meet Link *"
                      placeholder="https://meet.google.com/xxx-yyyy-zzz"
                      value={customMeetingUrl}
                      onChange={(e) => setCustomMeetingUrl(e.target.value)}
                      error={errors.customMeetingUrl}
                      helperText="Định dạng chuẩn: https://meet.google.com/xxx-yyyy-zzz (Đảm bảo người nhận thư click là vào họp được ngay)"
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════════
              RIGHT COLUMN: Live Preview, Attendees & Actions (5 cols on lg, 4 cols on xl)
              ══════════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-6">
            {/* Live Invitation Preview Card */}
            <Card className="border border-[#E5EAF0] bg-white shadow-2xs rounded-xl overflow-hidden p-0">
              <div className="bg-gradient-to-r from-[#00AC47] via-[#00832D] to-[#0052CC] p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    <span className="text-xs font-bold tracking-wider uppercase">Google Meet Invitation</span>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    Live Preview
                  </span>
                </div>
                <h3 className="text-lg font-bold mt-2 truncate">
                  {title.trim() || 'Untitled Meeting'}
                </h3>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-2.5 text-xs text-[#42526E]">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-[#0652CC] shrink-0" />
                    <span className="font-medium text-[#091E42]">
                      {formatPreviewDateTime(startTime, endTime)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Link className="w-4 h-4 text-[#0652CC] shrink-0" />
                    <span className="font-mono text-[#0652CC] truncate">
                      {mode === 'custom' && customMeetingUrl.trim()
                        ? customMeetingUrl.trim()
                        : 'https://meet.google.com/xxx-yyyy-zzz (Auto)'}
                    </span>
                  </div>

                  {selectedProject && (
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[#0652CC] shrink-0" />
                      <span className="font-medium text-[#091E42] truncate">
                        Project: {selectedProject.name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>
                      {attendeeEmails.length} {attendeeEmails.length === 1 ? 'attendee' : 'attendees'} invited
                    </span>
                  </div>
                </div>

                {description.trim() && (
                  <div className="p-3 bg-[#F7F9FC] rounded-lg border border-[#E5EAF0] text-xs text-[#42526E] line-clamp-3">
                    <span className="font-semibold text-[#091E42] block mb-1">Agenda:</span>
                    {description.trim()}
                  </div>
                )}
              </div>
            </Card>

            {/* Attendees Card */}
            <Card className="border border-[#E5EAF0] bg-white shadow-2xs rounded-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F4F8]">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0652CC]" />
                    <h2 className="text-sm font-bold text-[#091E42]">Invite Attendees *</h2>
                  </div>
                  <Badge variant={attendeeEmails.length > 0 ? 'success' : 'danger'}>
                    {attendeeEmails.length > 0 ? `${attendeeEmails.length} added` : 'Required'}
                  </Badge>
                </div>

                {errors.attendees && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{errors.attendees}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      id="meeting-attendee-input"
                      placeholder="colleague@company.com"
                      value={attendeeInput}
                      onChange={(e) => setAttendeeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addAttendee();
                        }
                      }}
                      error={errors.attendeeInput}
                    />
                  </div>
                  <Button
                    type="button"
                    id="add-attendee-btn"
                    variant="outline"
                    size="sm"
                    className="self-start h-[38px] px-4 font-semibold"
                    onClick={addAttendee}
                  >
                    Add
                  </Button>
                </div>

                {attendeeEmails.length > 0 ? (
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pt-1">
                    {attendeeEmails.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E8F1FF] text-xs font-semibold text-[#0652CC] border border-[#0652CC]/20"
                      >
                        {email}
                        <button
                          type="button"
                          aria-label={`Remove ${email}`}
                          onClick={() => removeAttendee(email)}
                          className="rounded-full hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#6B778C] italic">
                    No attendees added yet. Type an email and press Enter or Add.
                  </p>
                )}
              </div>
            </Card>

            {/* Submit & Summary Card */}
            <Card className="border border-[#E5EAF0] bg-[#F7F9FC] shadow-2xs rounded-xl space-y-4">
              <Button
                id="submit-create-meeting-btn"
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isPending}
                disabled={isPending}
                className="w-full gap-2 bg-[#0652CC] hover:bg-[#0041A8] py-3 text-base shadow-sm cursor-pointer"
              >
                <Video className="w-5 h-5" />
                Create Meeting Room
              </Button>

              <Button
                id="cancel-form-btn"
                type="button"
                variant="ghost"
                onClick={() => navigate(-1)}
                className="w-full text-xs text-[#42526E] hover:text-[#091E42]"
              >
                Cancel and return
              </Button>

              <div className="pt-3 border-t border-[#D9E2EC] text-[11px] text-[#6B778C] space-y-1.5">
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Supports up to 100 participants with screen sharing
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Meeting link saved and accessible anytime from Online Meetings
                </p>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateMeetingRoomPage;
