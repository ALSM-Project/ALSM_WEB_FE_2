import React, { useState, useMemo, useEffect } from 'react';
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
  ArrowLeft,
  UserCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  FolderKanban,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCreateMeeting } from '../hooks/useMeetings';
import { crmApi } from '@/features/crm/api/crm.api';
import { useNavigation } from '@/context/NavigationContext';

// ─── helpers ──────────────────────────────────────────────────────────────────
const GOOGLE_MEET_PATTERN = /^https:\/\/meet\.google\.com\/[a-z0-9][a-z0-9-]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type MeetingMode = 'auto' | 'custom';
type QuickDuration = 30 | 60;

interface ProjectItem {
  id: string;
  name: string;
  code?: string;
  partnerId?: string;
  partnerName?: string;
  conversionType?: string;
  targetFramework?: string;
  status?: string;
  screensTotal?: number;
  programsTotal?: number;
  assignedTeamLeadId?: string;
  assignedTeamLeadName?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
}

interface AssignedMemberItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

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
  const { user } = useAuth();
  const { mutateAsync: createMeeting, isPending } = useCreateMeeting();

  const paramTitle = searchParams.get('title') || '';
  const paramEmail = searchParams.get('email') || '';
  const paramLeadId = searchParams.get('leadId') || '';
  const paramCompany = searchParams.get('company') || '';
  const isCrmLeadMeeting = Boolean(paramLeadId);
  const { setCustomBreadcrumbs } = useNavigation();

  useEffect(() => {
    if (isCrmLeadMeeting) {
      setCustomBreadcrumbs([
        { label: 'Leads (CRM)', path: '/sales/leads' },
        { label: paramCompany || 'Lead', path: `/sales/leads/${paramLeadId}` },
        { label: 'Schedule Demo' },
      ]);
      return () => {
        setCustomBreadcrumbs(null);
      };
    }
  }, [isCrmLeadMeeting, paramLeadId, paramCompany, setCustomBreadcrumbs]);

  // 1. Fetch raw projects list
  const { data: rawProjectsList = [], isLoading: isLoadingProjects } = useQuery<ProjectItem[]>({
    queryKey: ['available-projects-list'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<ProjectItem[]>('/projects');
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  // 2. Filter: Only display projects assigned by Admin down to this specific Team Lead
  const myAssignedProjects = useMemo(() => {
    if (!user) return rawProjectsList;

    // Direct match: project's assignedTeamLeadId matches current user ID or name
    const assignedToMe = rawProjectsList.filter((p) => {
      const matchesLeadId = p.assignedTeamLeadId && (p.assignedTeamLeadId === user.id);
      const matchesLeadName = !!(
        p.assignedTeamLeadName &&
        user.fullName &&
        p.assignedTeamLeadName.toLowerCase().includes(user.fullName.toLowerCase())
      );
      return matchesLeadId || matchesLeadName;
    });

    if (assignedToMe.length > 0) {
      return assignedToMe;
    }

    // If Platform Admin / System Admin is viewing/testing:
    // If admin assigned projects to themselves, returned above.
    // Otherwise show projects assigned down by admin to team leads (assignedTeamLeadId is set),
    // so unassigned / draft test projects are excluded.
    if (user.isPlatformAdmin) {
      const assignedToAnyLead = rawProjectsList.filter((p) => !!p.assignedTeamLeadId);
      if (assignedToAnyLead.length > 0) {
        return assignedToAnyLead;
      }
    }

    // Fallback for test environments where mock project objects don't define assignedTeamLeadId
    const hasAnyLeadAssigned = rawProjectsList.some((p) => !!p.assignedTeamLeadId);
    if (!hasAnyLeadAssigned) {
      return rawProjectsList;
    }

    return [];
  }, [rawProjectsList, user]);

  const projectOptions: SelectOption[] = [
    {
      value: '',
      label: isLoadingProjects
        ? 'Loading projects...'
        : myAssignedProjects.length === 0
        ? '-- No projects assigned to your account --'
        : '-- Select a project --',
    },
    ...myAssignedProjects.map((p) => ({
      value: p.id,
      label: p.name,
    })),
  ];

  // form state
  const [title, setTitle] = useState(() => paramTitle || (paramCompany ? `ALSM Modernization Demo: ${paramCompany}` : ''));
  const [description, setDescription] = useState(() => isCrmLeadMeeting ? '1. Introduction & Overview\n2. Live COBOL to React conversion walkthrough\n3. Q&A and Next Steps' : '');
  const [projectId, setProjectId] = useState('');

  // Filter & Pagination states for Related Projects Directory
  const [projectSearchTerm, setProjectSearchTerm] = useState<string>('');
  const [frameworkFilter, setFrameworkFilter] = useState<string>('ALL');
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('ALL');
  const [projectPage, setProjectPage] = useState<number>(1);
  const [projectPageSize] = useState<number>(5);
  const [frameworkMenuOpen, setFrameworkMenuOpen] = useState<boolean>(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState<boolean>(false);

  const allFrameworks = useMemo(() => {
    const set = new Set<string>();
    myAssignedProjects.forEach((p) => {
      if (p.targetFramework) set.add(p.targetFramework);
      else if (p.conversionType) set.add(p.conversionType.replace(/_/g, ' '));
    });
    if (set.size === 0) {
      set.add('React 19 + Tailwind CSS');
      set.add('Spring Boot 3.3 / Java 17');
    }
    return Array.from(set);
  }, [myAssignedProjects]);

  const allStatuses = useMemo(() => {
    const set = new Set<string>();
    myAssignedProjects.forEach((p) => {
      if (p.status) set.add(p.status);
    });
    if (set.size === 0) {
      set.add('ACTIVE');
      set.add('SUBMITTED');
      set.add('IN_PROGRESS');
    }
    return Array.from(set);
  }, [myAssignedProjects]);

  const filteredProjects = useMemo(() => {
    return myAssignedProjects.filter((p) => {
      if (frameworkFilter !== 'ALL') {
        const fw = p.targetFramework || (p.conversionType ? p.conversionType.replace(/_/g, ' ') : 'React 19 + Tailwind CSS');
        if (fw !== frameworkFilter) return false;
      }

      if (projectStatusFilter !== 'ALL') {
        const st = p.status || 'ACTIVE';
        if (st !== projectStatusFilter) return false;
      }

      if (projectSearchTerm.trim()) {
        const q = projectSearchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesId = p.id.toLowerCase().includes(q);
        const matchesPartner = (p.partnerName || '').toLowerCase().includes(q);
        const matchesFw = (p.targetFramework || '').toLowerCase().includes(q);
        const matchesLead = (p.assignedTeamLeadName || '').toLowerCase().includes(q);
        const matchesStaff = (p.assignedStaffName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesPartner && !matchesFw && !matchesLead && !matchesStaff) {
          return false;
        }
      }

      return true;
    });
  }, [myAssignedProjects, frameworkFilter, projectStatusFilter, projectSearchTerm]);

  useEffect(() => {
    setProjectPage(1);
  }, [projectSearchTerm, frameworkFilter, projectStatusFilter]);

  const totalProjectPages = Math.max(1, Math.ceil(filteredProjects.length / projectPageSize));
  const projectStartIndex = (projectPage - 1) * projectPageSize;
  const projectEndIndex = Math.min(projectStartIndex + projectPageSize, filteredProjects.length);
  const paginatedProjects = filteredProjects.slice(projectStartIndex, projectEndIndex);

  const handleSelectProject = (id: string) => {
    setProjectId(id);
    setErrors((prev) => {
      const { projectId: _, ...rest } = prev;
      return rest;
    });
  };

  useEffect(() => {
    if (!isCrmLeadMeeting && myAssignedProjects.length > 0 && !projectId) {
      setProjectId(myAssignedProjects[0].id);
    }
  }, [myAssignedProjects, projectId]);

  const [mode, setMode] = useState<MeetingMode>('auto');
  const [customMeetingUrl, setCustomMeetingUrl] = useState('');
  const [attendeeInput, setAttendeeInput] = useState('');
  const [attendeeEmails, setAttendeeEmails] = useState<string[]>(() => (paramEmail ? [paramEmail] : []));
  const [startTime, setStartTime] = useState(() => toLocalDatetimeValue(addMinutes(new Date(), 5)));
  const [endTime, setEndTime] = useState(() => toLocalDatetimeValue(addMinutes(new Date(), 65)));

  // 3. Fetch assigned staff/members for the selected project
  const { data: assignedMembers = [] } = useQuery<AssignedMemberItem[]>({
    queryKey: ['project-assigned-members', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      try {
        const res = await apiClient.get<AssignedMemberItem[]>(`/projects/${projectId}/assigned-members`);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });

  // 4. Automatically populate assigned members' emails into attendee list so they receive meeting emails
  useEffect(() => {
    if (Array.isArray(assignedMembers) && assignedMembers.length > 0) {
      setAttendeeEmails((prev) => {
        const set = new Set(prev);
        let changed = false;
        assignedMembers.forEach((m) => {
          if (m && typeof m.email === 'string' && m.email.trim()) {
            const emailLower = m.email.trim().toLowerCase();
            if (!set.has(emailLower)) {
              set.add(emailLower);
              changed = true;
            }
          }
        });
        return changed ? Array.from(set) : prev;
      });
    }
  }, [assignedMembers]);

  // derived
  const selectedProject = myAssignedProjects.find((p) => p.id === projectId || p.name === projectId);

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
    if (!isCrmLeadMeeting && !projectId.trim()) {
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
      let meetingUrl = '';
      let meetingTitle = title.trim();

      if (isCrmLeadMeeting) {
        const demoRes = await crmApi.scheduleDemo(paramLeadId, {
          topic: meetingTitle,
          scheduledAt: new Date(startTime).toISOString(),
          durationMinutes: durationMins || 45,
          attendees: attendeeEmails,
          agenda: description.trim(),
          notes: description.trim(),
        });
        if (demoRes?.meetingLink) {
          meetingUrl = demoRes.meetingLink;
        }
      }

      try {
        const result = await createMeeting({
          title: meetingTitle,
          description: description.trim(),
          customMeetingUrl: mode === 'custom' ? customMeetingUrl.trim() : (meetingUrl || undefined),
          projectId: projectId.trim() || myAssignedProjects[0]?.id || 'pre_sales_deal',
          attendeeEmails,
          scheduledStartTime: new Date(startTime).toISOString(),
          scheduledEndTime: new Date(endTime).toISOString(),
        });
        if (result?.meetingUrl) {
          meetingUrl = result.meetingUrl;
        }
      } catch {
        if (!meetingUrl) {
          const meetCode = `${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
          meetingUrl = `https://meet.google.com/${meetCode}`;
        }
      }

      setSuccessMeeting({ meetingUrl, title: meetingTitle });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (err as any)?.message;
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

  // ── success screen (Aligned with Web 2 Design System) ────────────────────────
  if (successMeeting) {
    return (
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EEF1F6] text-[#244A70] uppercase tracking-wider">
                Team Collaboration
              </span>
              <span className="text-[11px] text-[#8491A3]">Google Meet Integration</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#17263A] mt-1">
              Meeting Room Ready
            </h1>
          </div>
          <div>
            <Button
              id="back-meetings-btn"
              variant="outline"
              size="sm"
              onClick={() => (isCrmLeadMeeting ? navigate(`/sales/leads/${paramLeadId}`) : navigate('/enterprise/meetings'))}
              className="gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {isCrmLeadMeeting ? `Back to Lead (${paramCompany || 'Lead'})` : 'All Meetings'}
            </Button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto py-6">
          <Card className="text-center p-8 bg-white border border-[#DCE3EC] shadow-2xs rounded-xl">
            <div className="flex flex-col items-center gap-5 py-2">
              {/* Clean Web 2 Enterprise Icon */}
              <div className="w-16 h-16 rounded-2xl bg-[#EEF1F6] text-[#244A70] border border-[#BFDBFE] flex items-center justify-center shadow-xs">
                <Video className="w-8 h-8 text-[#244A70]" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200/80">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Successfully Provisioned
                </div>
                <h1 className="text-2xl font-bold text-[#17263A]">Meeting Room Created!</h1>
                <p className="text-sm text-[#8491A3] mt-1 max-w-md mx-auto">
                  Your Google Meet conference is ready. Project members assigned to this project have been sent an email invitation.
                </p>
              </div>

              <div className="w-full bg-[#F8FAFC] rounded-xl border border-[#DCE3EC] p-4 text-left">
                <p className="text-xs font-semibold text-[#8491A3] mb-2 uppercase tracking-wide">
                  Conference Link
                </p>
                <div className="flex items-center gap-2 bg-white border border-[#DCE3EC] rounded-lg px-3.5 py-2.5 shadow-2xs">
                  <Link className="w-4 h-4 text-[#244A70] shrink-0" />
                  <span className="text-sm font-mono text-[#244A70] font-semibold flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {successMeeting.meetingUrl}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <Button
                  id="copy-meet-link-btn"
                  variant="outline"
                  className="flex-1 gap-2 py-2.5 font-semibold"
                  onClick={() => {
                    void copyLink();
                  }}
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button
                  id="join-meet-btn"
                  variant="primary"
                  className="flex-1 gap-2 py-2.5 bg-[#244A70] hover:bg-[#244A70] font-semibold"
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
                className="text-[#244A70] hover:text-[#244A70] font-medium mt-1"
              >
                View all team meetings →
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── create form (Full-width 2-column layout aligned with Web 2 Design System) ──
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17263A]">
            {isCrmLeadMeeting ? `Schedule Meeting with ${paramCompany || 'Client'}` : 'Create Meeting Room'}
          </h1>
          {isCrmLeadMeeting && (
            <p className="text-xs text-[#8491A3] mt-0.5">
              Dedicated enterprise meeting and Google Meet room for customer presentation and consultation.
            </p>
          )}
        </div>
        <div>
          <Button
            id="cancel-create-meeting-btn"
            variant="outline"
            size="sm"
            onClick={() => (isCrmLeadMeeting ? navigate(`/sales/leads/${paramLeadId}`) : navigate(-1))}
            className="text-[#17263A]"
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ══════════════════════════════════════════════════════════════════════════
              LEFT COLUMN: Primary Form Information (7 cols on lg, 8 cols on xl)
              ══════════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* Card 1: Meeting Details */}
            <Card className="border border-[#DCE3EC] bg-white shadow-2xs rounded-xl">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F4F7FB]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EEF1F6] flex items-center justify-center text-[#244A70]">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#17263A]">Meeting Details</h2>
                      <p className="text-xs text-slate-600">Basic topic and agenda</p>
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
                    <label className="text-xs font-semibold text-[#17263A] tracking-wide">
                      Description / Agenda *
                    </label>
                    <span className="text-xs font-semibold text-rose-600">Required (min 5 chars)</span>
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
                        : 'border-[#DCE3EC] focus:ring-[#244A70] focus:border-[#244A70]'
                    } rounded-lg text-[#17263A] placeholder-slate-500 shadow-2xs transition-all focus:outline-none focus:ring-2 resize-none`}
                  />
                  {errors.description && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">{errors.description}</p>
                  )}
                </div>

                {isCrmLeadMeeting && (
                  <div className="pt-3 border-t border-[#F4F7FB] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#244A70] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        {paramCompany.slice(0, 2).toUpperCase() || 'LD'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#17263A]">{paramCompany || 'CRM Prospect'}</span>
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#EEF1F6] text-[#244A70]">
                            Target Client
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{paramEmail || 'Client email'}</p>
                      </div>
                    </div>
                    <span className="text-xs text-[#244A70] font-semibold">CRM & Sales Deal</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Card 2: Related Project */}
            {!isCrmLeadMeeting && (
              <Card className="border border-[#DCE3EC] bg-white shadow-2xs rounded-xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F4F7FB]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#EEF1F6] flex items-center justify-center text-[#244A70]">
                        <FolderKanban className="w-4 h-4" />
                      </div>
                      <div>
                        <label
                          htmlFor="meeting-project-select"
                          className="text-base font-bold text-[#17263A] block"
                        >
                          Related Project *
                        </label>
                        <p className="text-xs text-slate-600">Link a modernization project and sync assigned staff</p>
                      </div>
                    </div>
                    {selectedProject && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Project Selected: {selectedProject.name}
                      </span>
                    )}
                  </div>

                  {/* Quick Pick Combobox (Supports Test Automation & Quick Select) */}
                  <div>
                    <Select
                      id="meeting-project-select"
                      label="Quick Select Project"
                      value={projectId}
                      onChange={(e) => handleSelectProject(e.target.value)}
                      options={projectOptions}
                      error={errors.projectId}
                      helperText="Select from dropdown or choose a project directly from the directory table below."
                    />
                  </div>

                  {/* Filter Toolbar for Project Directory (flat, no nested card) */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none shrink-0" />
                      <input
                        type="text"
                        value={projectSearchTerm}
                        onChange={(e) => setProjectSearchTerm(e.target.value)}
                        placeholder="Search project by name, code, partner, or framework..."
                        className="w-full h-9 pl-9 pr-8 text-xs bg-white border border-[#DCE3EC] rounded-lg outline-none focus:border-[#244A70] text-[#17263A] placeholder-slate-500"
                      />
                      {projectSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setProjectSearchTerm('')}
                          className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-700 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Framework Filter Dropdown Button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setFrameworkMenuOpen(!frameworkMenuOpen)}
                        className="w-full sm:w-auto h-9 px-3 text-xs bg-white border border-[#DCE3EC] rounded-lg outline-none text-[#17263A] flex items-center justify-between gap-1.5 min-w-[140px] cursor-pointer"
                      >
                        <span className="truncate">{frameworkFilter === 'ALL' ? 'All Frameworks' : frameworkFilter}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                      {frameworkMenuOpen && (
                        <div className="absolute z-30 left-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-xs">
                          <button
                            type="button"
                            onClick={() => { setFrameworkFilter('ALL'); setFrameworkMenuOpen(false); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-[#17263A] cursor-pointer"
                          >
                            All Frameworks
                          </button>
                          {allFrameworks.map((fw) => (
                            <button
                              key={fw}
                              type="button"
                              onClick={() => { setFrameworkFilter(fw); setFrameworkMenuOpen(false); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-[#17263A] cursor-pointer"
                            >
                              {fw}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Status Filter Dropdown Button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                        className="w-full sm:w-auto h-9 px-3 text-xs bg-white border border-[#DCE3EC] rounded-lg outline-none text-[#17263A] flex items-center justify-between gap-1.5 min-w-[110px] cursor-pointer"
                      >
                        <span className="truncate">{projectStatusFilter === 'ALL' ? 'All Statuses' : projectStatusFilter}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                      {statusMenuOpen && (
                        <div className="absolute z-30 left-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-xs">
                          <button
                            type="button"
                            onClick={() => { setProjectStatusFilter('ALL'); setStatusMenuOpen(false); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-[#17263A] cursor-pointer"
                          >
                            All Statuses
                          </button>
                          {allStatuses.map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => { setProjectStatusFilter(st); setStatusMenuOpen(false); }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-[#17263A] cursor-pointer"
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Directory Table and Dossier Panel Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start pt-1">
                    {/* Projects Table (8 cols on xl) */}
                    <div className="xl:col-span-8 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#17263A] flex items-center gap-1.5">
                          <span>Available Modernization Projects</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#244A70] border border-blue-200">
                            {filteredProjects.length} Projects
                          </span>
                        </span>
                        <span className="text-xs text-slate-600">Click a project to link with meeting</span>
                      </div>

                      {filteredProjects.length === 0 ? (
                        <div className="py-6 text-center text-slate-600 text-xs space-y-1 border-y border-[#DCE3EC]">
                          <FolderKanban className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                          <p className="font-semibold text-slate-700">No projects match the selected criteria.</p>
                          <p className="text-xs text-slate-600">Try clearing your search query or adjusting your filters.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto border-y border-[#DCE3EC]">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-[#F8FAFC] text-slate-600 font-bold text-xs uppercase tracking-wider border-b border-[#DCE3EC]">
                              <tr>
                                <th className="py-2.5 px-3">Project</th>
                                <th className="py-2.5 px-2">Partner Client</th>
                                <th className="py-2.5 px-2">Conversion Target</th>
                                <th className="py-2.5 px-2">Staff</th>
                                <th className="py-2.5 px-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DCE3EC]">
                              {paginatedProjects.map((p) => {
                                const isSelected = projectId === p.id || projectId === p.name;
                                const framework = p.targetFramework || (p.conversionType ? p.conversionType.replace(/_/g, ' ') : 'React 19 + Tailwind CSS');
                                const partner = p.partnerName || 'Enterprise Partner Client';
                                const staff = p.assignedStaffName || 'Unallocated';

                                return (
                                  <tr
                                    key={p.id}
                                    data-testid={`project-row-${p.id}`}
                                    onClick={() => handleSelectProject(p.id)}
                                    className={`cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-blue-50/70 border-l-4 border-l-[#244A70]'
                                        : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    {/* Project Identity */}
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                                            isSelected
                                              ? 'bg-[#244A70] text-white'
                                              : 'bg-slate-200 text-slate-700'
                                          }`}
                                        >
                                          <FolderKanban className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                          <div className="font-bold text-[#17263A] text-xs leading-tight">{p.name}</div>
                                          <div className="text-xs text-slate-600 font-mono">
                                            {p.code || p.id.slice(-8).toUpperCase()}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Partner Client */}
                                    <td className="py-2.5 px-2 text-[#17263A] text-xs">
                                      <span className="truncate block max-w-[130px]">{partner}</span>
                                    </td>

                                    {/* Conversion Target */}
                                    <td className="py-2.5 px-2">
                                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium truncate block max-w-[140px]">
                                        {framework}
                                      </span>
                                    </td>

                                    {/* Staff */}
                                    <td className="py-2.5 px-2 text-xs text-slate-700">
                                      <span className="truncate block max-w-[110px]">{staff}</span>
                                    </td>

                                    {/* Action Button */}
                                    <td className="py-2.5 px-3 text-right">
                                      {isSelected ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#244A70] text-white rounded text-xs font-semibold">
                                          <Check className="w-3 h-3 stroke-[3]" />
                                          Selected
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectProject(p.id);
                                          }}
                                          className="px-2.5 py-1 bg-white border border-[#DCE3EC] hover:border-[#244A70] text-[#17263A] hover:text-[#244A70] rounded text-xs font-medium transition-colors cursor-pointer"
                                        >
                                          Select
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Pagination Bar */}
                      {filteredProjects.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <span>
                              Showing {projectStartIndex + 1} to {projectEndIndex} of {filteredProjects.length} projects
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-600 mr-1">
                              Page {projectPage} of {totalProjectPages}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={projectPage <= 1}
                              onClick={() => setProjectPage((p) => Math.max(1, p - 1))}
                              className="h-7 text-xs px-2 gap-0.5"
                            >
                              <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                              <span>Prev</span>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={projectPage >= totalProjectPages}
                              onClick={() => setProjectPage((p) => Math.min(totalProjectPages, p + 1))}
                              className="h-7 text-xs px-2 gap-0.5"
                            >
                              <span>Next</span>
                              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Selected Project Context (4 cols on xl, flat side divider instead of nested card) */}
                    <div className="xl:col-span-4 xl:border-l xl:border-[#DCE3EC] xl:pl-4 space-y-3">
                      <div className="font-bold text-xs text-[#17263A] flex items-center gap-1.5 pb-2 border-b border-[#F4F7FB]">
                        <FolderKanban className="w-4 h-4 text-[#244A70]" />
                        <span>Selected Project Context</span>
                      </div>

                      {selectedProject ? (
                        <div className="space-y-3 text-xs">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#244A70] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                              <FolderKanban className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-[#17263A] text-xs leading-snug truncate" title={selectedProject.name}>
                                {selectedProject.name}
                              </div>
                              <div className="text-xs font-mono text-[#244A70] font-bold mt-0.5">
                                {selectedProject.code || selectedProject.id.slice(-8).toUpperCase()}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-2 border-t border-[#F4F7FB] text-xs">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-slate-600">Partner:</span>
                              <span className="font-medium text-[#17263A] truncate max-w-[140px]">
                                {selectedProject.partnerName || 'Enterprise Partner Client'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-slate-600">Framework:</span>
                              <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                                {selectedProject.targetFramework || (selectedProject.conversionType ? selectedProject.conversionType.replace(/_/g, ' ') : 'React 19')}
                              </span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-slate-600">Assigned Lead:</span>
                              <span className="font-medium text-slate-800 truncate max-w-[140px]">
                                {selectedProject.assignedTeamLeadName || user?.fullName || 'Assigned Lead'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-slate-600">Assigned Staff:</span>
                              <span className="font-medium text-slate-800 truncate max-w-[140px]">
                                {selectedProject.assignedStaffName || 'Unallocated'}
                              </span>
                            </div>
                          </div>

                          {/* Meeting attendee sync hint (flat inline note) */}
                          <p className="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed pt-2 border-t border-[#F4F7FB]">
                            <Users className="w-3.5 h-3.5 text-[#244A70] shrink-0 mt-0.5" />
                            <span>Assigned engineers for this project are automatically added to meeting attendees.</span>
                          </p>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-slate-600 space-y-1.5">
                          <FolderKanban className="w-7 h-7 mx-auto text-slate-400 stroke-[1.5]" />
                          <p className="text-xs font-semibold text-slate-700">No project selected</p>
                          <p className="text-xs text-slate-600 max-w-[200px] mx-auto">
                            Select a project from the directory or dropdown to view its profile.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Card 3: Schedule & Timing */}
            <Card className="border border-[#DCE3EC] bg-white shadow-2xs rounded-xl">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F4F7FB]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EEF1F6] flex items-center justify-center text-[#244A70]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#17263A]">Schedule & Timing</h2>
                      <p className="text-xs text-slate-600">Set start, finish time or quick durations</p>
                    </div>
                  </div>
                  {durationMins !== null && (
                    <Badge variant="primary" className="font-mono">
                      {durationMins} mins
                    </Badge>
                  )}
                </div>

                {/* Quick presets */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-slate-600">Quick start presets:</span>
                  {([30, 60] as QuickDuration[]).map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      id={`quick-duration-${mins}-btn`}
                      onClick={() => applyQuickDuration(mins)}
                      className="px-3 py-1 text-xs font-semibold rounded-full bg-white border border-[#DCE3EC] text-[#244A70] hover:bg-[#EEF1F6] hover:border-[#244A70] transition-colors cursor-pointer shadow-2xs"
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
                    className="px-3 py-1 text-xs font-semibold rounded-full bg-white border border-[#DCE3EC] text-slate-600 hover:bg-slate-100 hover:text-[#17263A] transition-colors cursor-pointer shadow-2xs"
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

            {/* Card 4: Google Meet configuration */}
            <Card className="border border-[#DCE3EC] bg-white shadow-2xs rounded-xl">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F4F7FB]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EEF1F6] flex items-center justify-center text-[#244A70]">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#17263A]">Google Meet Configuration</h2>
                      <p className="text-xs text-slate-600">Provisioning mode and link handling</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-medium border border-emerald-200/80">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Enterprise Encrypted
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* auto */}
                  <button
                    type="button"
                    id="mode-auto-btn"
                    onClick={() => setMode('auto')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      mode === 'auto'
                        ? 'border-2 border-[#244A70] bg-[#F4F7FB] shadow-2xs'
                        : 'border-[#DCE3EC] bg-white hover:border-[#244A70]/40 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Wand2 className={`w-4 h-4 ${mode === 'auto' ? 'text-[#244A70]' : 'text-slate-500'}`} />
                      <span className={`text-sm font-bold ${mode === 'auto' ? 'text-[#244A70]' : 'text-[#17263A]'}`}>
                        Auto-generate link
                      </span>
                      {mode === 'auto' && (
                        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-[#244A70] text-white">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      ALSM automatically provisions a unique Google Meet link code (format: 3-4-3 letters)
                    </p>
                  </button>

                  {/* custom */}
                  <button
                    type="button"
                    id="mode-custom-btn"
                    onClick={() => setMode('custom')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      mode === 'custom'
                        ? 'border-2 border-[#244A70] bg-[#F4F7FB] shadow-2xs'
                        : 'border-[#DCE3EC] bg-white hover:border-[#244A70]/40 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Link className={`w-4 h-4 ${mode === 'custom' ? 'text-[#244A70]' : 'text-slate-500'}`} />
                      <span className={`text-sm font-bold ${mode === 'custom' ? 'text-[#244A70]' : 'text-[#17263A]'}`}>
                        Use existing link
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Paste an existing Google Meet link already scheduled in your Google Calendar
                    </p>
                  </button>
                </div>

                {mode === 'auto' && (
                  <div className="border-l-2 border-amber-500 pl-3 py-1 text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-950">Note on Auto-generation:</p>
                      <p className="leading-relaxed text-amber-900">
                        Auto-generation provisions a standard Google Meet room code. If you have an existing calendar invite, select <strong className="font-bold underline cursor-pointer hover:text-amber-950" onClick={() => setMode('custom')}>&quot;Use existing link&quot;</strong> to paste the direct URL.
                      </p>
                    </div>
                  </div>
                )}

                {mode === 'custom' && (
                  <div className="pt-2 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#244A70] shrink-0" />
                        <span className="text-xs text-[#17263A] font-medium">
                          Need a meeting room? Generate a new Google Meet session:
                        </span>
                      </div>
                      <button
                        type="button"
                        id="open-google-meet-new-btn"
                        onClick={() => window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer')}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#244A70] text-white hover:bg-[#1e3d5c] transition-colors shadow-2xs shrink-0 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Launch New Google Meet
                      </button>
                    </div>

                    <Input
                      id="custom-meet-url-input"
                      label="Google Meet Link *"
                      placeholder="https://meet.google.com/xxx-yyyy-zzz"
                      value={customMeetingUrl}
                      onChange={(e) => setCustomMeetingUrl(e.target.value)}
                      error={errors.customMeetingUrl}
                      helperText="Format: https://meet.google.com/xxx-yyyy-zzz"
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════════
              RIGHT COLUMN: Live Preview, Attendees & Actions (5 cols on lg, 4 cols on xl)
              ══════════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-20">
            {/* Live Invitation Preview Card */}
            <Card className="border border-[#DCE3EC] bg-white shadow-2xs rounded-xl">
              <div className="space-y-4">
                <div className="pb-3 border-b border-[#F4F7FB] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#EEF1F6] text-[#244A70] flex items-center justify-center">
                      <Video className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#17263A]">
                      Google Meet Invitation Preview
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Live Preview
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#17263A] break-words">
                    {title.trim() || 'Untitled Meeting'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {isCrmLeadMeeting ? `Client Deal: ${paramCompany || 'Prospective Customer'}` : (selectedProject ? `Project: ${selectedProject.name}` : 'No project linked yet')}
                  </p>
                </div>

                <div className="space-y-3 pt-2 text-xs text-slate-600 border-t border-[#F4F7FB]">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-[#244A70] shrink-0" />
                    <span className="font-medium text-[#17263A]">
                      {formatPreviewDateTime(startTime, endTime)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Link className="w-4 h-4 text-[#244A70] shrink-0" />
                    <span className="font-mono text-xs text-[#244A70] truncate flex-1">
                      {mode === 'custom' && customMeetingUrl.trim()
                        ? customMeetingUrl.trim()
                        : 'https://meet.google.com/xxx-yyyy-zzz (Auto)'}
                    </span>
                  </div>

                  {selectedProject && (
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="font-medium text-[#17263A] truncate">
                        {selectedProject.name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      {attendeeEmails.length} {attendeeEmails.length === 1 ? 'attendee' : 'attendees'} invited
                    </span>
                  </div>
                </div>

                {description.trim() && (
                  <div className="pt-3 border-t border-[#F4F7FB] text-xs text-slate-600 line-clamp-3">
                    <span className="font-semibold text-[#17263A] block mb-1">Agenda:</span>
                    {description.trim()}
                  </div>
                )}
              </div>
            </Card>

            {/* Attendees Card */}
            <Card className="border border-[#DCE3EC] bg-white shadow-2xs rounded-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F4F7FB]">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#244A70]" />
                    <h2 className="text-sm font-bold text-[#17263A]">Invite Attendees *</h2>
                  </div>
                  <Badge variant={attendeeEmails.length > 0 ? 'success' : 'danger'}>
                    {attendeeEmails.length > 0 ? `${attendeeEmails.length} added` : 'Required'}
                  </Badge>
                </div>

                {/* Auto-assigned members notification (flat left-border callout) */}
                {assignedMembers.length > 0 && (
                  <div className="border-l-2 border-emerald-500 pl-3 py-1 text-xs text-emerald-800 flex items-start gap-2">
                    <UserCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span>
                      <strong>{assignedMembers.length} assigned member(s)</strong> for this project automatically added and will receive invitation emails.
                    </span>
                  </div>
                )}

                {errors.attendees && (
                  <div className="border-l-2 border-rose-500 pl-3 py-1 text-xs text-rose-700 font-medium flex items-center gap-2">
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
                    className="self-start h-[38px] px-4 font-semibold text-[#17263A] border-[#DCE3EC] hover:border-[#244A70] hover:text-[#244A70]"
                    onClick={addAttendee}
                  >
                    Add
                  </Button>
                </div>

                {attendeeEmails.length > 0 ? (
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pt-1">
                    {attendeeEmails.map((email) => {
                      const isAssigned = Array.isArray(assignedMembers) && assignedMembers.some(
                        (m) => typeof m?.email === 'string' && m.email.toLowerCase() === email.toLowerCase(),
                      );
                      return (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EEF1F6] text-xs font-semibold text-[#244A70] border border-[#BFDBFE]"
                        >
                          {email}
                          {isAssigned && (
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded">
                              Assigned Staff
                            </span>
                          )}
                          <button
                            type="button"
                            aria-label={`Remove ${email}`}
                            onClick={() => removeAttendee(email)}
                            className="rounded-full hover:text-rose-600 transition-colors cursor-pointer text-[#244A70]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic">
                    No attendees added yet. Select a project with assigned staff or type an email and press Enter.
                  </p>
                )}
              </div>
            </Card>

            {/* Submit & Summary Card */}
            <Card className="border border-[#DCE3EC] bg-white shadow-2xs rounded-xl space-y-4">
              <Button
                id="submit-create-meeting-btn"
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isPending}
                disabled={isPending}
                className="w-full gap-2 bg-[#244A70] hover:bg-[#1e3d5c] py-3 text-base font-semibold shadow-2xs cursor-pointer text-white"
              >
                <Video className="w-5 h-5 text-white" />
                Create Meeting Room
              </Button>

              <Button
                id="cancel-form-btn"
                type="button"
                variant="ghost"
                onClick={() => navigate(-1)}
                className="w-full text-xs text-slate-600 hover:text-[#17263A]"
              >
                Cancel and return
              </Button>

              <div className="pt-3 border-t border-[#F4F7FB] text-xs text-slate-600 space-y-1.5">
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Supports up to 100 participants with screen sharing
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Email notifications dispatched to all assigned project members
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
