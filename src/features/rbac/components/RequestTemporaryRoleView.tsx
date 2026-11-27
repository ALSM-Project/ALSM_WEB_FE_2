import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  KeyRound,
  UserCheck,
  AlertCircle,
  FolderGit2,
} from 'lucide-react';
import { Button, Badge } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { partnersApi } from '@/features/partners/api/partners.api';
import {
  temporaryRolesApi,
  TemporaryRoleDto,
  ElevationRoleCatalogItem,
} from '../api/temporary-roles.api';

export interface ProjectOptionItem {
  id: string;
  name: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  status?: string;
  targetFramework?: string;
  partnerName?: string;
}

export interface RequestTemporaryRoleViewProps {
  onBack: () => void;
  onSuccess: (message?: string) => void;
  projectOptions?: ProjectOptionItem[];
  myActiveRole?: TemporaryRoleDto | null;
  userHasPendingRequest?: boolean;
}

const PREDEFINED_DURATIONS = [1, 4, 8, 12, 24];
const PLATFORM_ADMIN_ROLE_IDS = new Set(['platform_admin', 'system_admin', 'admin']);

export const RequestTemporaryRoleView: React.FC<RequestTemporaryRoleViewProps> = ({
  onBack,
  onSuccess,
  projectOptions = [],
  myActiveRole = null,
  userHasPendingRequest = false,
}) => {
  const { user } = useAuth();

  // Projects list management
  const [projectsList, setProjectsList] = useState<ProjectOptionItem[]>(projectOptions);

  useEffect(() => {
    if (projectOptions && projectOptions.length > 0) {
      setProjectsList(projectOptions);
    } else {
      let active = true;
      partnersApi
        .getProjects()
        .then((projs) => {
          if (active && Array.isArray(projs)) {
            setProjectsList(
              projs.map((p) => ({
                id: p.id,
                name: p.name,
                assignedStaffId: p.assignedStaffId,
                assignedStaffName: p.assignedStaffName,
                status: p.status,
                targetFramework: p.targetFramework,
                partnerName: p.partnerName,
              })),
            );
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }
  }, [projectOptions]);

  const currentUserId = String(user?.id || '');
  const currentUserFullName = (user?.fullName || '').toLowerCase().trim();
  const currentUserEmail = (user?.email || '').toLowerCase().trim();

  // All projects specifically assigned to this staff member
  const assignedProjects = useMemo(() => {
    if (!user) return [];
    return projectsList.filter((p) => {
      const matchId = p.assignedStaffId && String(p.assignedStaffId) === currentUserId;
      const matchName =
        p.assignedStaffName &&
        (p.assignedStaffName.toLowerCase().trim() === currentUserFullName ||
          p.assignedStaffName.toLowerCase().trim() === currentUserEmail);
      return Boolean(matchId || matchName);
    });
  }, [projectsList, user, currentUserId, currentUserFullName, currentUserEmail]);

  // Other system projects not assigned to this staff member
  const otherProjects = useMemo(() => {
    const assignedIds = new Set(assignedProjects.map((p) => p.id));
    return projectsList.filter((p) => !assignedIds.has(p.id));
  }, [projectsList, assignedProjects]);

  // Role Catalog Data
  const [roleCatalog, setRoleCatalog] = useState<ElevationRoleCatalogItem[]>([]);
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>('team_lead');
  const [durationHours, setDurationHours] = useState<number>(4);
  const [targetProjectId, setTargetProjectId] = useState<string>('');
  const [targetWorkflow, setTargetWorkflow] = useState<string>('');
  const [justification, setJustification] = useState<string>('');

  // Auto-select assigned project if available and not yet set
  useEffect(() => {
    if (assignedProjects.length > 0 && !targetProjectId) {
      setTargetProjectId(assignedProjects[0].id);
      setTargetWorkflow(assignedProjects[0].name);
    }
  }, [assignedProjects, targetProjectId]);

  const handleProjectSelect = (val: string) => {
    if (val === '__CUSTOM__' || val === '') {
      setTargetProjectId('');
      const isPresetName = projectsList.some((p) => p.name === targetWorkflow);
      if (isPresetName) {
        setTargetWorkflow('');
      }
    } else {
      setTargetProjectId(val);
      const found = projectsList.find((p) => p.id === val);
      if (found) {
        setTargetWorkflow(found.name);
      }
    }
  };

  // Confirmation & State
  const [confirmCheckbox, setConfirmCheckbox] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load elevation role catalog
  useEffect(() => {
    let active = true;
    const fetchCatalog = async () => {
      try {
        const catalog = await temporaryRolesApi.getElevationCatalog();
        if (active && catalog && catalog.length > 0) {
          setRoleCatalog(catalog);
        }
      } catch {
        // Fallback to safe static catalog below
      }
    };
    void fetchCatalog();
    return () => {
      active = false;
    };
  }, []);

  // Safe catalog of non-admin roles
  const safeCatalog = useMemo(() => {
    const list =
      roleCatalog.length > 0
        ? roleCatalog
        : [
            {
              id: 'team_lead',
              code: 'TEAM_LEAD',
              name: 'Team Lead',
              description:
                'Review peer conversion deliverables, supervise engineering allocations, and manage sprint milestones.',
              modules: ['Staff Allocation', 'Transfer Approvals', 'Quality Gate Review'],
              sensitivePermissions: ['team.assignments.manage'],
              permissions: ['team.view', 'team.assignments.manage', 'conversions.approve'],
            },
            {
              id: 'conversion_staff',
              code: 'CONVERSION_STAFF',
              name: 'Conversion Staff',
              description:
                'Execute modernization pipeline tasks, inspect AST conversion trees, and push code patches.',
              modules: ['Operations', 'Conversions', 'Queue Execution'],
              sensitivePermissions: [],
              permissions: ['conversions.queue.view', 'conversions.execute'],
            },
            {
              id: 'internal_support',
              code: 'INTERNAL_SUPPORT',
              name: 'Internal Support',
              description:
                'Investigate partner tickets, resolve customer escalation cases, and diagnose tenant jobs.',
              modules: ['Support', 'Customer Portal', 'Operational Logs'],
              sensitivePermissions: [],
              permissions: ['support.tickets.view', 'support.tickets.respond'],
            },
          ];

    return list.filter(
      (r) =>
        !PLATFORM_ADMIN_ROLE_IDS.has(r.id.toLowerCase()) &&
        !PLATFORM_ADMIN_ROLE_IDS.has(r.code.toLowerCase()) &&
        !PLATFORM_ADMIN_ROLE_IDS.has(r.name.toLowerCase()),
    );
  }, [roleCatalog]);

  // Selected role details
  const activeRoleDetails = useMemo(() => {
    const found = safeCatalog.find(
      (r) =>
        r.code.toLowerCase() === selectedRoleCode.toLowerCase() ||
        r.id.toLowerCase() === selectedRoleCode.toLowerCase(),
    );
    return (
      found || {
        id: selectedRoleCode,
        code: selectedRoleCode.toUpperCase(),
        name: selectedRoleCode,
        description: 'Temporary elevated operational privileges.',
        modules: ['Operations'],
      }
    );
  }, [safeCatalog, selectedRoleCode]);

  // Expiration calculation
  const expirationDate = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + durationHours);
    return d;
  }, [durationHours]);

  // Target project name if selected
  const selectedProjectName = useMemo(() => {
    if (!targetProjectId) return targetWorkflow || 'General Operational Workflow';
    const found = projectsList.find((p) => p.id === targetProjectId);
    return found ? found.name : targetWorkflow || 'Modernization Project';
  }, [targetProjectId, targetWorkflow, projectsList]);

  // Form submission handler
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (myActiveRole || userHasPendingRequest) return;

    if (justification.trim().length < 10) {
      setSubmitError('A detailed justification of at least 10 characters is required.');
      return;
    }
    if (durationHours < 1 || durationHours > 24) {
      setSubmitError('Requested duration must be between 1 and 24 hours.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const roleToSend = (activeRoleDetails.code || selectedRoleCode).toUpperCase();
      await temporaryRolesApi.requestRole({
        role: roleToSend,
        durationHours,
        reason: justification.trim(),
        ...(targetProjectId && targetProjectId !== '__CUSTOM__' ? { projectId: targetProjectId } : {}),
      });
      onSuccess('Temporary elevation request dispatched for Team Lead & Administrator approval.');
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to submit temporary role elevation request';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled =
    isSubmitting ||
    !!myActiveRole ||
    userHasPendingRequest ||
    justification.trim().length < 10;

  return (
    <div className="space-y-6 pb-12">
      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#17263A] tracking-tight">
            Request Temporary Role Elevation
          </h1>
          <p className="text-xs text-slate-600 max-w-prose leading-relaxed">
            Submit a temporary role delegation request for review by your Team Lead or Platform Administrator. Requests are strictly capped at 24 hours.
          </p>
        </div>
      </div>

      {/* ── NOTIFICATIONS & SERVER ERRORS ── */}
      {submitError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{submitError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            className="text-rose-500 font-bold hover:text-rose-700 text-sm cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Active Elevation Conflict Alert */}
      {myActiveRole && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-950 flex items-center gap-2">
                <span>Active Role Conflict: You already hold an active temporary elevation</span>
                <span className="font-mono font-bold bg-amber-100 px-2 py-0.5 rounded text-amber-900 text-xs">
                  {myActiveRole.role}
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Under platform security policy, only <strong>1 active temporary role</strong> is permitted per user. Elevated privileges expire at {new Date(myActiveRole.expiresAt).toLocaleTimeString()} ({new Date(myActiveRole.expiresAt).toLocaleDateString()}).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Request Alert */}
      {userHasPendingRequest && !myActiveRole && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-950">
              Pending Request Awaiting Review
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              You already have a pending elevation request awaiting Team Lead review. You cannot submit another request until the current request is reviewed.
            </p>
          </div>
        </div>
      )}

      {/* ── FORM CONTAINER ── */}
      <form onSubmit={handleFinalSubmit} className="space-y-8">
        {/* ══════════════════════════════════════════════════
            SECTION 1: REQUESTER PROFILE & SCOPE CONTEXT
           ══════════════════════════════════════════════════ */}
        <div className="bg-white border border-[#DCE3EC] rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="border-b border-[#DCE3EC] pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#244A70] text-white flex items-center justify-center font-bold text-xs">
                1
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#17263A]">
                  Requester Profile & Assignment Scope *
                </h2>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#244A70] border border-blue-200">
              Requester: {user?.fullName || user?.email || 'Self-Service'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Requester Dossier Panel (5 cols on lg) */}
            <div className="lg:col-span-5 border-l-2 border-[#244A70] pl-4 py-1 space-y-3">
              <div className="font-bold text-xs text-[#17263A] flex items-center gap-1.5 pb-2 border-b border-slate-200">
                <UserCheck className="w-4 h-4 text-[#244A70]" />
                <span>Requester Security Dossier</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="font-bold text-[#17263A] text-sm">
                    {user?.fullName || 'Internal Specialist'}
                  </div>
                  <div className="text-xs text-slate-600">{user?.email}</div>
                  <div className="text-xs font-mono text-[#244A70] font-bold mt-0.5">
                    {user?.id ? `EMP-${user.id.slice(-6).toUpperCase()}` : 'EMP-ALSM-01'}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Department:</span>
                    <span className="font-medium text-[#17263A]">Modernization Operations</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Baseline Roles:</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {user?.roles && user.roles.length > 0 ? (
                        user.roles.map((r: string) => (
                          <span
                            key={r}
                            className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs font-medium"
                          >
                            {r}
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs font-medium">
                          CONVERSION_STAFF
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Account Standing:</span>
                    <Badge variant="success">ACTIVE</Badge>
                  </div>
                </div>

                {myActiveRole ? (
                  <div className="border-l-2 border-amber-500 pl-2.5 py-1 text-amber-900 text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Has Active Elevation: {myActiveRole.role}</span>
                  </div>
                ) : userHasPendingRequest ? (
                  <div className="border-l-2 border-amber-500 pl-2.5 py-1 text-amber-900 text-xs font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Pending Request in Review</span>
                  </div>
                ) : user?.isPlatformAdmin ? (
                  <div className="border-l-2 border-blue-600 pl-2.5 py-1 text-blue-800 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                    <span className="font-semibold">Platform Administrator (Global Access Active)</span>
                  </div>
                ) : (
                  <div className="border-l-2 border-emerald-600 pl-2.5 py-1 text-emerald-800 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="font-semibold">Eligible to request temporary role elevation</span>
                  </div>
                )}
              </div>
            </div>

            {/* Target Project or Workflow Inputs (7 cols on lg) */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="target-project-select"
                    className="text-xs font-semibold text-[#17263A]"
                  >
                    Target Project (Assigned &amp; Queue Scope) *
                  </label>
                  {assignedProjects.length > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      ⭐ {assignedProjects.length} Assigned Project{assignedProjects.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <FolderGit2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
                  <select
                    id="target-project-select"
                    value={targetProjectId || (targetWorkflow ? '__CUSTOM__' : '')}
                    onChange={(e) => handleProjectSelect(e.target.value)}
                    disabled={!!myActiveRole || userHasPendingRequest}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl outline-none focus:bg-white focus:border-[#244A70] text-[#17263A] font-medium"
                  >
                    {assignedProjects.length > 0 && (
                      <optgroup label="⭐ Projects Assigned To Me (Dự án được phân công)">
                        {assignedProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            ⭐ {p.name} {p.targetFramework ? `[${p.targetFramework}]` : ''} {p.partnerName ? `— ${p.partnerName}` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {otherProjects.length > 0 && (
                      <optgroup label="📁 Other Available Modernization Projects (Dự án khác)">
                        {otherProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            📁 {p.name} {p.targetFramework ? `[${p.targetFramework}]` : ''} {p.partnerName ? `— ${p.partnerName}` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <optgroup label="🌐 General Operational Tasks">
                      <option value="__CUSTOM__">🌐 Custom / General Pipeline Operational Queue (No specific project)</option>
                    </optgroup>
                  </select>
                </div>

                {/* Quick Assigned Projects Pill Buttons */}
                {assignedProjects.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-medium text-slate-500">Quick select your assigned project:</span>
                    <div className="flex flex-wrap gap-2">
                      {assignedProjects.map((p) => {
                        const isSelected = targetProjectId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleProjectSelect(p.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-[#244A70] text-white shadow-xs ring-2 ring-[#244A70]/20'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            <span>⭐ {p.name}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="target-workflow-input"
                  className="text-xs font-semibold text-[#17263A] block mb-1.5"
                >
                  Target Project or Workflow *
                </label>
                <input
                  id="target-workflow-input"
                  required
                  value={targetWorkflow}
                  onChange={(e) => setTargetWorkflow(e.target.value)}
                  disabled={!!myActiveRole || userHasPendingRequest}
                  placeholder="e.g. Core Banking Modernization AST Inspection"
                  className="w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl outline-none focus:bg-white focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70] text-[#17263A]"
                />
                <p className="text-xs text-slate-600 mt-1.5 max-w-prose leading-relaxed">
                  Confirm the modernization project or operational sprint that requires elevated privileges.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 2: CONFIGURE PRIVILEGE & DURATION
           ══════════════════════════════════════════════════ */}
        <div className="bg-white border border-[#DCE3EC] rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="border-b border-[#DCE3EC] pb-3 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#244A70] text-white flex items-center justify-center font-bold text-xs">
              2
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#17263A]">
                Configure Privilege & Scope *
              </h2>
            </div>
          </div>

          {/* Role Selection Dropdown + Cards */}
          <div className="space-y-3">
            <label
              htmlFor="elevation-role-select"
              className="text-xs font-semibold text-[#17263A] block"
            >
              Requested Role *
            </label>

            {/* Standard Accessible Select with Options */}
            <select
              id="elevation-role-select"
              value={selectedRoleCode}
              onChange={(e) => setSelectedRoleCode(e.target.value.toLowerCase())}
              disabled={!!myActiveRole || userHasPendingRequest}
              className="w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl outline-none focus:bg-white focus:border-[#244A70] text-[#17263A]"
            >
              {safeCatalog.map((r) => (
                <option key={r.id} value={r.code.toLowerCase()}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>

            {/* Visual Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {safeCatalog.map((role) => {
                const isSelected =
                  selectedRoleCode.toLowerCase() === role.code.toLowerCase() ||
                  selectedRoleCode.toLowerCase() === role.id.toLowerCase();
                return (
                  <div
                    key={role.id}
                    onClick={() => {
                      if (!myActiveRole && !userHasPendingRequest) {
                        setSelectedRoleCode(role.code.toLowerCase());
                      }
                    }}
                    className={`p-3.5 rounded-lg border-l-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 border-l-[#244A70]'
                        : 'bg-[#F8FAFC] border-l-slate-300 hover:bg-slate-100/70'
                    } ${myActiveRole || userHasPendingRequest ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-xs text-[#17263A]">{role.name}</span>
                      <span
                        className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${
                          isSelected ? 'bg-[#244A70] text-white' : 'bg-slate-200/80 text-slate-700'
                        }`}
                      >
                        {role.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed mb-2 max-w-prose">
                      {role.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-200/70">
                      {role.modules.map((m) => (
                        <span key={m} className="text-xs bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Duration Selector */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#17263A] block">
                Requested Duration (Max 24h Ceiling) *
              </label>
              <span className="text-xs text-[#244A70] font-semibold">
                Estimated Expiry: {expirationDate.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {PREDEFINED_DURATIONS.map((hrs) => {
                const isSelected = durationHours === hrs;
                return (
                  <button
                    key={hrs}
                    type="button"
                    disabled={!!myActiveRole || userHasPendingRequest}
                    onClick={() => setDurationHours(hrs)}
                    className={`p-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#244A70] text-white border-[#244A70] shadow-xs'
                        : 'bg-[#F8FAFC] text-[#17263A] border-[#DCE3EC] hover:bg-slate-100'
                    } ${myActiveRole || userHasPendingRequest ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-sm">{hrs} Hours</div>
                    <div
                      className={`text-xs font-medium mt-0.5 ${
                        isSelected ? 'text-white/90' : 'text-slate-600'
                      }`}
                    >
                      {hrs === 1
                        ? 'Hotfix'
                        : hrs === 4
                        ? 'Half Shift'
                        : hrs === 8
                        ? 'Standard Shift'
                        : hrs === 24
                        ? 'Max Limit'
                        : 'Temporary'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Business Need & Justification Input */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="request-justification-textarea"
                className="text-xs font-semibold text-[#17263A] block"
              >
                Business Need &amp; Justification (Minimum 10 characters) *
              </label>
              <span
                className={`text-xs font-mono font-bold ${
                  justification.trim().length >= 10 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {justification.trim().length >= 10
                  ? '✓ Justification valid'
                  : `${justification.trim().length} / 10 min`}
              </span>
            </div>
            <textarea
              id="request-justification-textarea"
              rows={3}
              required
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              disabled={!!myActiveRole || userHasPendingRequest}
              placeholder="Explain why temporary elevated permissions are necessary for this task..."
              className="w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl outline-none focus:bg-white focus:border-[#244A70] text-[#17263A]"
            />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 3: SECURITY REVIEW & SUBMISSION
           ══════════════════════════════════════════════════ */}
        <div className="bg-white border border-[#DCE3EC] rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="border-b border-[#DCE3EC] pb-3 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#244A70] text-white flex items-center justify-center font-bold text-xs">
              3
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#17263A]">
                Security Review & Submission
              </h2>
            </div>
          </div>

          {/* Summary Preview Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-3 border-t border-slate-200 text-xs">
            <div>
              <span className="text-xs text-slate-600 font-semibold block">Requester Staff</span>
              <span className="font-bold text-[#17263A] truncate block">
                {user?.fullName || user?.email || 'Current Specialist'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-600 font-semibold block">Requested Privilege</span>
              <span className="font-bold text-[#244A70] font-mono">{activeRoleDetails.code}</span>
            </div>
            <div>
              <span className="text-xs text-slate-600 font-semibold block">Target Scope</span>
              <span className="font-bold text-[#17263A] truncate block" title={selectedProjectName}>
                {selectedProjectName}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-600 font-semibold block">Duration Requested</span>
              <span className="font-bold text-[#17263A]">{durationHours} hours (ceiling)</span>
            </div>
            <div>
              <span className="text-xs text-slate-600 font-semibold block">Estimated Expiration</span>
              <span className="font-bold text-[#244A70]">{expirationDate.toLocaleString()}</span>
            </div>
          </div>

          {/* Compliance Alert */}
          <div className="border-l-2 border-amber-500 bg-amber-50/60 pl-3.5 pr-3 py-2.5 text-amber-950 flex items-start gap-2.5 text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed max-w-prose">
              This delegation request requires formal approval from your Team Lead or Platform Administrator before permissions take effect. All actions undertaken with elevated credentials are logged to the immutable audit trail.
            </p>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="confirm-elevation-checkbox"
              checked={confirmCheckbox}
              onChange={(e) => setConfirmCheckbox(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#244A70] focus:ring-[#244A70] cursor-pointer"
            />
            <label
              htmlFor="confirm-elevation-checkbox"
              className="text-xs text-[#17263A] font-semibold cursor-pointer select-none leading-relaxed max-w-prose"
            >
              I confirm submitting this temporary role delegation request for review by my Team Lead or Platform Administrator. I certify that elevated permissions will be used strictly for the stated business need.
            </label>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onBack}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitDisabled}
              className="bg-[#244A70] hover:bg-[#244A70] text-white flex items-center gap-2 font-bold px-6 py-2.5 shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting Request...' : 'Submit Elevation Request'}</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
