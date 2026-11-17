import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  UserMinus,
  ShieldAlert,
  CheckCircle2,
  FolderKanban,
  KeyRound,
  RefreshCw,
  UserCheck,
  Briefcase,
  Laptop,
  Search,
  FileText,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNavigation } from '@/hooks/useNavigation';
import {
  usersApi,
  UserOffboardingSummaryDto,
  OffboardingAssignedProjectDto,
  OffboardingActiveSessionDto,
  OffboardingEligibleSuccessorDto,
  UserOffboardingResultDto,
} from '../api/users.api';
import { offboardingApprovalApi, OffboardingType, DocumentationStatus } from '@/features/team-lead/api/offboarding-approval.api';

const OFFBOARDING_TYPES: Array<{ value: OffboardingType; label: string; desc: string }> = [
  { value: 'Resignation', label: 'Voluntary Resignation', desc: 'Employee initiated departure / career transition' },
  { value: 'Contract Expiration', label: 'End of Contract Term', desc: 'Contract or project assignment completion' },
  { value: 'Termination', label: 'Performance / Involuntary', desc: 'Managed operational offboarding' },
  { value: 'Other', label: 'Department Restructuring', desc: 'Internal reorganization and capacity shift' },
];

export const UserOffboardPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { setCustomBreadcrumbs } = useNavigation();
  const { user: _actor } = useAuth();
  void _actor;

  // Loading & Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<UserOffboardingSummaryDto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<UserOffboardingResultDto | null>(null);

  // Successor Selection State
  const [selectedSuccessorId, setSelectedSuccessorId] = useState<string>('');
  const [projectSuccessors, setProjectSuccessors] = useState<Record<string, string>>({});
  const [successorSearch, setSuccessorSearch] = useState<string>('');

  // Handover & Governance Details
  const [offboardingType, setOffboardingType] = useState<OffboardingType>('Resignation');
  const [effectiveDate, setEffectiveDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [handoverDeadline, setHandoverDeadline] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [documentationStatus, setDocumentationStatus] = useState<DocumentationStatus>('In Progress');
  const [pendingTasks, setPendingTasks] = useState<string>('');
  const [offboardReason, setOffboardReason] = useState<string>('');
  const [confirmDeactivation, setConfirmDeactivation] = useState<boolean>(false);

  // Execution states
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);

  // Load live offboarding summary from server
  const loadSummary = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await usersApi.getOffboardingSummary(userId);
      setSummary(data);

      // Auto-select first eligible successor if available
      if (data.eligibleStaff && data.eligibleStaff.length > 0) {
        setSelectedSuccessorId(data.eligibleStaff[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load offboarding summary:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to load user offboarding dossier.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Departing User details
  const departingUser = summary?.user;

  // Sync breadcrumbs with top layout navigation header
  useEffect(() => {
    const isTeamLead = location.pathname.startsWith('/team-lead');
    const parentPath = isTeamLead ? '/team-lead/offboarding-approvals' : '/admin/users';
    const parentLabel = isTeamLead ? 'Offboarding Approvals' : 'User Management';
    const currentLabel = departingUser?.fullName ? `Offboard: ${departingUser.fullName}` : 'Offboard Staff';

    setCustomBreadcrumbs([
      { label: parentLabel, path: parentPath },
      { label: currentLabel },
    ]);

    return () => {
      setCustomBreadcrumbs(null);
    };
  }, [departingUser?.fullName, location.pathname, setCustomBreadcrumbs]);
  const assignedProjects: OffboardingAssignedProjectDto[] = summary?.assignedProjects || [];
  const activeSessions: OffboardingActiveSessionDto[] = summary?.activeSessions || [];
  const eligibleStaff: OffboardingEligibleSuccessorDto[] = summary?.eligibleStaff || [];

  // Filter eligible successors by search term
  const filteredSuccessors = useMemo(() => {
    if (!successorSearch.trim()) return eligibleStaff;
    const q = successorSearch.toLowerCase();
    return eligibleStaff.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.roles || []).some((r) => r.toLowerCase().includes(q)),
    );
  }, [eligibleStaff, successorSearch]);

  const designatedSuccessor = useMemo(() => {
    return eligibleStaff.find((s) => s.id === selectedSuccessorId) || null;
  }, [eligibleStaff, selectedSuccessorId]);

  // Handle per-project successor override
  const handleProjectSuccessorChange = (projectId: string, successorId: string) => {
    setProjectSuccessors((prev) => ({
      ...prev,
      [projectId]: successorId,
    }));
  };

  // Execute Immediate Controlled Offboarding
  const handleExecuteImmediate = async () => {
    if (!userId || !departingUser) return;
    if (assignedProjects.length > 0 && !selectedSuccessorId) {
      setErrorMsg('Please select a designated successor staff member to inherit active modernization projects.');
      return;
    }
    if (!offboardReason.trim() || offboardReason.trim().length < 5) {
      setErrorMsg('A detailed business justification of at least 5 characters is required.');
      return;
    }
    if (!confirmDeactivation) {
      setErrorMsg('Please check the confirmation box acknowledging immediate account deactivation and credential termination.');
      return;
    }

    try {
      setIsExecuting(true);
      setErrorMsg(null);

      // Execute transfers if per-project overrides are defined
      const projectEntries = Object.entries(projectSuccessors);
      for (const [projId, succId] of projectEntries) {
        if (succId && succId !== selectedSuccessorId) {
          try {
            await usersApi.transferResource({
              fromUserId: userId,
              toUserId: succId,
              resourceType: 'PROJECT',
              resourceId: projId,
            });
          } catch {
            // continue with primary transfer
          }
        }
      }

      const result = await usersApi.offboardUser(userId, {
        transferToUserId: selectedSuccessorId || undefined,
        reason: offboardReason.trim(),
        confirmDeactivation: true,
      });

      setSuccessResult(result);
    } catch (err: any) {
      console.error('Offboard execution failed:', err);
      const msg = err.response?.data?.message || err.message || 'Controlled offboarding procedure encountered an error.';
      setErrorMsg(msg);
    } finally {
      setIsExecuting(false);
    }
  };

  // Submit Formal Offboarding Request for Multi-party Approval
  const handleSubmitApprovalRequest = async () => {
    if (!userId || !departingUser) return;
    if (!offboardReason.trim()) {
      setErrorMsg('Please specify a formal offboarding reason/justification.');
      return;
    }

    try {
      setIsSubmittingApproval(true);
      setErrorMsg(null);

      const projectTransfers = Object.entries(projectSuccessors)
        .filter(([, sId]) => Boolean(sId))
        .map(([projId, sId]) => {
          const matchedSuccessor = eligibleStaff.find((c) => c.id === sId);
          const matchedProject = assignedProjects.find((p) => p.id === projId);
          return {
            projectId: projId,
            projectName: matchedProject?.name,
            targetStaffId: sId,
            targetStaffName: matchedSuccessor?.fullName,
            reason: `Reassignment for offboarding ${departingUser.fullName}`,
          };
        });

      const payload = {
        targetUserId: userId,
        offboardingType,
        reason: offboardReason.trim(),
        effectiveDate,
        handoverDeadline: handoverDeadline || undefined,
        pendingTasks: pendingTasks.trim() || undefined,
        documentationStatus,
        transferToUserId: selectedSuccessorId || undefined,
        projectTransfers: projectTransfers.length > 0 ? projectTransfers : undefined,
      };

      const result = await offboardingApprovalApi.createRequest(payload);
      navigate(`/admin/offboarding-approvals/${result.id}`);
    } catch (err: any) {
      console.error('Failed to submit approval request:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to submit formal offboarding request.';
      setErrorMsg(msg);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] space-y-4">
        <RefreshCw className="w-8 h-8 text-[#244A70] animate-spin" />
        <p className="text-xs font-semibold text-slate-600">
          Loading staff offboarding details...
        </p>
      </div>
    );
  }

  if (!departingUser && !loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Staff Member Not Found</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          The requested staff account does not exist, has already been purged, or you do not have permission to access it.
        </p>
        <Button onClick={() => navigate('/admin/users')} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to User Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16 animate-fade-in">
      {/* ── HEADER ── */}
      <div className="border-b border-[#DCE3EC] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-[#17263A] tracking-tight">
                  Staff Offboarding Dossier
                </h1>
          
              </div>
            
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
           
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSubmitApprovalRequest}
              disabled={isExecuting || isSubmittingApproval || !!successResult}
              className="text-xs font-semibold text-[#244A70] border-[#244A70]/30 hover:bg-[#EEF1F6]"
            >
              {isSubmittingApproval ? 'Submitting...' : 'Submit Approval Request'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleExecuteImmediate}
              disabled={isExecuting || isSubmittingApproval || !confirmDeactivation || !!successResult}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <UserMinus className="w-3.5 h-3.5" />
                  <span>Execute Offboard Immediately</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── NOTIFICATIONS & RESULTS ── */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 font-bold hover:text-rose-800 text-sm cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {successResult && (
        <div className="p-5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-emerald-950">
                Controlled Staff Offboarding Completed Successfully
              </h3>
              <p className="text-xs text-emerald-800">
                Staff member {departingUser?.fullName} has been fully deactivated. All security credentials were terminated and operational project assets were transferred.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-emerald-200 text-xs">
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Projects Reassigned</span>
              <strong className="text-base text-emerald-900">
                {successResult.operations?.projectsTransferred ?? assignedProjects.length}
              </strong>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Sessions Terminated</span>
              <strong className="text-base text-emerald-900">
                {successResult.operations?.sessionsRevoked ?? activeSessions.length}
              </strong>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">API Tokens Revoked</span>
              <strong className="text-base text-emerald-900">
                {successResult.operations?.apiCredentialsRevoked ?? summary?.apiCredentialsCount ?? 1}
              </strong>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Roles Cleared</span>
              <strong className="text-base text-emerald-900">
                {successResult.operations?.rolesRemoved ?? departingUser?.roles?.length ?? 1}
              </strong>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/users')}
              className="text-xs font-semibold"
            >
              Return to User Directory
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => navigate('/admin/offboarding-approvals')}
              className="bg-[#244A70] text-white text-xs font-semibold"
            >
              View Offboarding Approvals Ledger
            </Button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: DOSSIER & SECURITY AUDIT (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Departing Staff Profile */}
          <div className="bg-white border border-[#DCE3EC] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE3EC]">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#244A70]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#17263A]">
                  Staff Member Information
                </h2>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#EEF1F6] text-[#244A70] font-bold text-base flex items-center justify-center shrink-0 border border-[#DCE3EC]">
                {departingUser?.fullName
                  ? departingUser.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'ST'}
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="font-bold text-sm text-[#17263A] truncate">{departingUser?.fullName}</h3>
                <p className="text-xs text-[#8491A3] truncate font-mono">{departingUser?.email}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {departingUser?.roles && departingUser.roles.length > 0 ? (
                    departingUser.roles.map((r) => (
                      <span
                        key={r}
                        className="px-2 py-0.5 bg-[#EEF1F6] text-[#244A70] rounded-md text-[10px] font-semibold"
                      >
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold">
                      Conversion Staff
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-[#DCE3EC] text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-[#8491A3] uppercase font-bold block">Department</span>
                <span className="font-semibold text-[#17263A] mt-0.5 block truncate">
                  Modernization Operations
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-[#8491A3] uppercase font-bold block">Account Status</span>
                <span className="font-semibold text-emerald-700 mt-0.5 block">
                  {departingUser?.isActive ? 'Active Member' : 'Deactivated'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Security Credentials */}
          <div className="bg-white border border-[#DCE3EC] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE3EC]">
              <div className="flex items-center gap-2 text-[#17263A] font-bold text-xs uppercase tracking-wider">
                <KeyRound className="w-4 h-4 text-[#244A70]" />
                <span>Security & Credentials</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              All active sessions, developer API credentials, and internal roles will be revoked upon execution.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="font-semibold text-[#17263A] block">Active Web Browser Sessions</span>
                    <span className="text-[11px] text-[#8491A3]">Active browser sessions to be terminated</span>
                  </div>
                </div>
                <strong className="text-sm font-bold text-rose-700">
                  {summary?.activeSessionsCount ?? activeSessions.length} Session(s)
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="font-semibold text-[#17263A] block">API Tokens & Developer Keys</span>
                    <span className="text-[11px] text-[#8491A3]">Personal access tokens and keys</span>
                  </div>
                </div>
                <strong className="text-sm font-bold text-rose-700">
                  {summary?.apiCredentialsCount ?? 1} Key(s)
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="font-semibold text-[#17263A] block">Internal Roles & Permissions</span>
                    <span className="text-[11px] text-[#8491A3]">Clear role assignments</span>
                  </div>
                </div>
                <strong className="text-sm font-bold text-amber-700">
                  {departingUser?.roles?.length ?? 1} Role(s)
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ASSETS REALLOCATION & SUCCESSOR PLANNING (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 3: Assigned Projects */}
          <div className="bg-white border border-[#DCE3EC] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE3EC]">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-[#244A70]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#17263A]">
                  Assigned Projects ({assignedProjects.length})
                </h2>
              </div>
              {assignedProjects.length > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#244A70] border border-blue-200">
                  Reassignment Required
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600">
              Select an active staff member to receive ownership of each project.
            </p>

            {assignedProjects.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <span className="font-bold text-xs text-[#17263A] block">Zero Active Work Dependencies</span>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Staff member {departingUser?.fullName} currently has no active projects assigned.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedProjects.map((proj) => {
                  const effectiveSuccessorId = projectSuccessors[proj.id] || selectedSuccessorId;
                  const currentSuccessor = eligibleStaff.find((s) => s.id === effectiveSuccessorId);

                  return (
                    <div
                      key={proj.id}
                      className="p-4 rounded-xl border border-[#DCE3EC] bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#17263A]">{proj.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {proj.status || 'IN_PROGRESS'}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#8491A3] block font-mono">Project ID: {proj.id}</span>
                        </div>
                      </div>

                      {/* Successor selector per project */}
                      <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <span className="text-slate-500 font-medium">Reassign Project To:</span>
                        <select
                          value={effectiveSuccessorId}
                          onChange={(e) => handleProjectSuccessorChange(proj.id, e.target.value)}
                          className="px-3 py-1.5 bg-white border border-[#DCE3EC] rounded-xl text-xs font-semibold text-[#17263A] outline-none focus:border-[#244A70] max-w-xs cursor-pointer shadow-2xs"
                        >
                          <option value="">Choose successor for this project...</option>
                          {eligibleStaff.map((staff) => (
                            <option key={staff.id} value={staff.id}>
                              {staff.fullName} (Workload: {staff.activeWorkload})
                            </option>
                          ))}
                        </select>
                      </div>

                      {currentSuccessor && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Will be transferred to <strong>{currentSuccessor.fullName}</strong> ({currentSuccessor.email})</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card 4: Primary Successor Allocation & Workload Meter */}
          <div className="bg-white border border-[#DCE3EC] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE3EC]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#244A70]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#17263A]">
                  Designated Primary Successor
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider block mb-1.5">
                  Select Lead Successor Staff *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search candidate by name, email, or role..."
                    value={successorSearch}
                    onChange={(e) => setSuccessorSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl outline-none focus:bg-white focus:border-[#244A70] text-[#17263A] mb-2"
                  />
                </div>

                <select
                  value={selectedSuccessorId}
                  onChange={(e) => setSelectedSuccessorId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl outline-none focus:bg-white focus:border-[#244A70] text-[#17263A] font-semibold cursor-pointer"
                >
                  <option value="">Select internal engineer to inherit active projects...</option>
                  {filteredSuccessors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.email}) — Workload: {s.activeWorkload} project(s) — Roles: {s.roles.join(', ')}
                    </option>
                  ))}
                </select>
              </div>

              {designatedSuccessor && (
                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#17263A]">{designatedSuccessor.fullName}</span>
                    <span className="text-[10px] font-bold text-[#244A70] bg-blue-100 px-2 py-0.5 rounded">
                      Current Workload: {designatedSuccessor.activeWorkload} Projects
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Assigned to inherit active projects and responsibilities.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card 5: Transition Governance, Justification & Execution Confirmation */}
          <div className="bg-white border border-[#DCE3EC] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE3EC]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#244A70]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#17263A]">
                  Offboarding Details & Confirmation
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider block mb-1">
                  Offboarding Type *
                </label>
                <select
                  value={offboardingType}
                  onChange={(e) => setOffboardingType(e.target.value as OffboardingType)}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl outline-none focus:bg-white focus:border-[#244A70] text-[#17263A] font-semibold"
                >
                  {OFFBOARDING_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider block mb-1">
                  Documentation Status
                </label>
                <select
                  value={documentationStatus}
                  onChange={(e) => setDocumentationStatus(e.target.value as DocumentationStatus)}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl outline-none focus:bg-white focus:border-[#244A70] text-[#17263A] font-semibold"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed & Verified</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider block mb-1">
                  Effective Deactivation Date
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl outline-none focus:bg-white focus:border-[#244A70] text-[#17263A]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider block mb-1">
                  Handover Deadline
                </label>
                <input
                  type="date"
                  value={handoverDeadline}
                  onChange={(e) => setHandoverDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl outline-none focus:bg-white focus:border-[#244A70] text-[#17263A]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider block mb-1.5">
                Formal Offboarding Justification / Reason *
              </label>
              <textarea
                required
                rows={3}
                value={offboardReason}
                onChange={(e) => setOffboardReason(e.target.value)}
                placeholder="e.g. End of 12-month engineering assignment. Transitioning modernization ownership to senior specialist."
                className="w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl outline-none focus:bg-white focus:border-[#244A70] text-[#17263A] leading-relaxed"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider block mb-1.5">
                Pending Tasks & Handover Notes (Optional)
              </label>
              <input
                type="text"
                value={pendingTasks}
                onChange={(e) => setPendingTasks(e.target.value)}
                placeholder="e.g. Complete BMS conversion sprint review, hand over Jira tickets"
                className="w-full px-3.5 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl outline-none focus:bg-white focus:border-[#244A70] text-[#17263A]"
              />
            </div>

            {/* Mandatory Confirmation Box */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-amber-950">
                <input
                  type="checkbox"
                  checked={confirmDeactivation}
                  onChange={(e) => setConfirmDeactivation(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 mt-0.5 shrink-0"
                />
                <span className="leading-relaxed">
                  I confirm the offboarding of{' '}
                  <strong className="text-amber-950">{departingUser?.fullName}</strong>. All active sessions will be terminated and project workloads reassigned.
                </span>
              </label>
            </div>

            {/* Bottom Final Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-[#DCE3EC]">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/admin/users')}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleExecuteImmediate}
                  disabled={isExecuting || !confirmDeactivation || !!successResult}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Execute Controlled Offboarding</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserOffboardPage;
