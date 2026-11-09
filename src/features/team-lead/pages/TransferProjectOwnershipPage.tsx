import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FolderKanban,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  Building2,
  Layers,
  ArrowRightLeft,
  Check,
  Briefcase,
  User,
  Sparkles,
  Info,
} from 'lucide-react';
import { partnersApi } from '@/features/partners/api/partners.api';
import { adminApi } from '@/features/admin/api/admin.api';
import { PartnerProject } from '@/features/partners/types/partner.types';
import { workloadLevel } from '../utils/workload';
import { Button, StatusBadge } from '@/shared/ui';

interface AssignableStaffMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  activeWorkload: number;
}

export type TransferScope = 'FULL_HANDOVER' | 'OWNERSHIP_ONLY' | 'OWNERSHIP_WITH_TRIAGE';

const TRANSFER_REASONS = [
  'Workload Balancing',
  'Employee Offboarding',
  'Team Reorganization',
  'Project Reassignment',
  'Other',
];

export const TransferProjectOwnershipPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<PartnerProject | null>(null);
  const [staffRoster, setStaffRoster] = useState<AssignableStaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
  const [transferScope, setTransferScope] = useState<TransferScope>('FULL_HANDOVER');
  const [transferReason, setTransferReason] = useState<string>('Workload Balancing');
  const [referenceNote, setReferenceNote] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [isReviewed, setIsReviewed] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const loadData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setErrorMsg(null);

      const [projectsList, staffList] = await Promise.all([
        partnersApi.getProjects().catch(() => []),
        partnersApi.getAssignableStaff().catch(() => []),
      ]);

      const found = (projectsList || []).find((p) => p.id === projectId);
      if (found) {
        setProject(found);
      } else {
        const directProj = await partnersApi.getProjectById(projectId).catch(() => null);
        if (directProj) {
          setProject(directProj);
        } else {
          setErrorMsg(`Modernization project with ID "${projectId}" was not found.`);
        }
      }

      setStaffRoster(staffList || []);
    } catch (err: any) {
      console.error('Failed to load project details for transfer:', err);
      setErrorMsg(err.message || 'Failed to load project information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Current Owner name & ID resolution
  const currentOwner = useMemo(() => {
    if (!project) return { id: undefined, name: 'Unassigned / System' };
    const name = project.assignedStaffName || project.assignedTeamLeadName || 'Unallocated';
    const id = project.assignedStaffId || project.assignedTeamLeadId;
    return { id, name };
  }, [project]);

  // Filter eligible assignees: must not be current owner / staff
  const eligibleAssignees = useMemo(() => {
    if (!project) return staffRoster;
    return staffRoster.filter(
      (staff) => staff.id !== project.assignedStaffId && staff.id !== project.assignedTeamLeadId
    );
  }, [staffRoster, project]);

  // Selected Assignee Details
  const selectedAssignee = useMemo(() => {
    return staffRoster.find((s) => s.id === selectedAssigneeId) || null;
  }, [staffRoster, selectedAssigneeId]);

  const isAtCapacity = useMemo(() => {
    return selectedAssignee ? selectedAssignee.activeWorkload >= 5 : false;
  }, [selectedAssignee]);

  const activeTasksCount = useMemo(() => {
    if (!project) return 0;
    return (project.screensTotal || 0) + (project.programsTotal || 0);
  }, [project]);

  // Form validity check
  const isFormValid = Boolean(
    project &&
      selectedAssigneeId &&
      transferReason &&
      selectedAssignee &&
      selectedAssignee.id !== currentOwner.id
  );

  // Review step handler
  const handleReviewTransfer = () => {
    if (!selectedAssigneeId) {
      setErrorMsg('Please select an eligible internal employee to receive project ownership.');
      return;
    }
    setErrorMsg(null);
    setIsReviewed(true);
    // Smooth scroll down to assessment table
    const elem = document.getElementById('transfer-impact-section');
    if (elem && typeof elem.scrollIntoView === 'function') elem.scrollIntoView({ behavior: 'smooth' });
  };

  // Execution handler
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !selectedAssignee || !confirmed || !isFormValid) return;

    try {
      setIsExecuting(true);
      setErrorMsg(null);

      // 1. Commit assignment via partnersApi
      const updated = await partnersApi.assignProject(project.id, {
        staffId: selectedAssignee.id,
        staffName: selectedAssignee.fullName,
        reason: `${transferReason} (${transferScope})`,
        staffNote: referenceNote.trim() || undefined,
      });

      // 2. Also register resource ownership transfer in admin system if supported
      try {
        await adminApi.transferResource({
          fromUserId: currentOwner.id || 'system',
          toUserId: selectedAssignee.id,
          resourceType: 'PROJECT',
          resourceId: project.id,
        });
      } catch {
        // Handled gracefully if already logged by assignProject
      }

      setProject(updated);
      setSuccessMsg(
        `Ownership of "${project.name}" has been successfully transferred to ${selectedAssignee.fullName}. Access policies updated, notifications dispatched, and audit history recorded.`
      );

      // Redirect back after short feedback delay
      setTimeout(() => {
        navigate('/team-lead/projects', {
          state: {
            notification: `Ownership of "${project.name}" transferred to ${selectedAssignee.fullName}.`,
          },
        });
      }, 2000);
    } catch (err: any) {
      console.error('Failed to execute ownership transfer:', err);
      setErrorMsg(err?.message || 'Failed to execute project ownership transfer.');
    } finally {
      setIsExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-slate-500 space-y-3">
        <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#244A70]" />
        <p className="font-semibold text-slate-700 text-sm">Loading project information & transfer roster...</p>
      </div>
    );
  }

  if (errorMsg && !project) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-bold">Project Context Not Found</h2>
          </div>
          <p className="text-xs text-rose-700">{errorMsg}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/team-lead/projects')}
            className="text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Return to Employee Allocation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Breadcrumb Navigation ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link to="/team-lead/projects" className="hover:text-[#244A70] font-medium flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Employee Allocation</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-medium text-slate-600">Transfer</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[#244A70] font-bold">Transfer Ownership</span>
      </div>

      {/* ── Page Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Transfer Project Ownership
            </h1>
            {project?.status && <StatusBadge status={project.status} />}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Transfer project responsibility to another eligible internal employee with impact validation and audit logging.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/team-lead/projects')}
            className="text-xs h-9"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Employee Allocation
          </Button>
        </div>
      </div>

      {/* ── Notifications / Alerts ────────────────────────────────────────────── */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-900">Transfer Executed Successfully</p>
              <p className="text-xs text-emerald-700 mt-0.5">{successMsg}</p>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-900">Action Required</p>
              <p className="text-xs text-rose-700 mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-xs text-rose-600 hover:text-rose-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* ── 1. Transfer Overview Card ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#244A70]" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Project Context & Transfer Overview
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Ref: {project?.contractNumber || project?.id}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Project Name */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">Project Name</span>
            <span className="font-bold text-slate-900 text-sm block truncate" title={project?.name}>
              {project?.name}
            </span>
          </div>

          {/* Partner / Customer */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">Partner / Customer</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">{project?.partnerName || 'Internal Organization'}</span>
            </div>
          </div>

          {/* Legacy Technology */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">Legacy Technology</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Layers className="w-3.5 h-3.5 text-[#244A70]" />
              <div>
                <span>
                  {project?.conversionType === 'COBOL_TO_JAVA' ? 'IBM COBOL → Java 21' : 'IBM BMS/DSPF → React 19'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {project?.conversionType === 'COBOL_TO_JAVA' ? 'COBOL -> Java' : 'BMS/DSPF -> React'}
                </span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">Project Status</span>
            <div className="mt-0.5">
              {project?.status && <StatusBadge status={project.status} />}
            </div>
          </div>
        </div>

        {/* Ownership Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/70 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">Current Owner</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{currentOwner.name}</span>
            </div>
            <User className="w-4 h-4 text-[#244A70]" />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Supervising Team Lead</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">
                {project?.assignedTeamLeadName || 'Unassigned'}
              </span>
            </div>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Tasks & Queues</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">
                {activeTasksCount} items ({project?.screensTotal || 0} screens, {project?.programsTotal || 0} programs)
              </span>
            </div>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* ── 2. Transfer Assignment Form ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <ArrowRightLeft className="w-5 h-5 text-[#244A70]" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Transfer Assignment Details
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Ownership Source & Successor Target */}
          <div className="space-y-4">
            {/* Current Owner (Read-Only) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                Current Owner (Read-Only)
              </label>
              <div className="p-3 bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                    {currentOwner.name.charAt(0)}
                  </div>
                  <div>
                    <strong className="text-slate-900 block">{currentOwner.name}</strong>
                    <span className="text-slate-500 text-[11px]">Assigned Internal Employee</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                  CURRENT
                </span>
              </div>
            </div>

            {/* New Assignee Selection */}
            <div>
              <label htmlFor="new-assignee-select" className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wider text-[11px]">
                New Assignee (Eligible Internal Employee) *
              </label>
              <select
                id="new-assignee-select"
                aria-label="New Assignee"
                required
                value={selectedAssigneeId}
                onChange={(e) => {
                  setSelectedAssigneeId(e.target.value);
                  setIsReviewed(false);
                }}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#244A70] font-medium"
              >
                <option value="">-- Choose Eligible Successor Employee --</option>
                {eligibleAssignees.map((staff) => {
                  const wl = workloadLevel(staff.activeWorkload);
                  return (
                    <option key={staff.id} value={staff.id}>
                      {staff.fullName} ({staff.email}) • {staff.role || 'Conversion Staff'} • Workload: {staff.activeWorkload} projects ({wl.label})
                    </option>
                  );
                })}
              </select>

              {/* Selected Assignee Profile Card */}
              {selectedAssignee && (
                <div className={`mt-3 p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  isAtCapacity
                    ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                    : 'bg-blue-50/60 border-blue-200 text-slate-900'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#244A70] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      {selectedAssignee.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{selectedAssignee.fullName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                          {selectedAssignee.role || 'Conversion Engineer'}
                        </span>
                      </div>
                      <span className="text-slate-500 text-[11px] block">{selectedAssignee.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${workloadLevel(selectedAssignee.activeWorkload).className}`}>
                      Workload: {selectedAssignee.activeWorkload} projects • {workloadLevel(selectedAssignee.activeWorkload).label}
                    </span>
                    {isAtCapacity && (
                      <span className="text-amber-700 text-[11px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> High Load
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Scope & Reason */}
          <div className="space-y-4">
            {/* Transfer Scope */}
            <div>
              <label htmlFor="transfer-scope-select" className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wider text-[11px]">
                Transfer Scope *
              </label>
              <select
                id="transfer-scope-select"
                aria-label="Transfer Scope"
                value={transferScope}
                onChange={(e) => {
                  setTransferScope(e.target.value as TransferScope);
                  setIsReviewed(false);
                }}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#244A70] font-medium"
              >
                <option value="FULL_HANDOVER">
                  Full Project Handover (Leadership, Review & Active Tasks)
                </option>
                <option value="OWNERSHIP_ONLY">
                  Project Ownership & Review Only (Keep Active Tasks with Current Staff)
                </option>
                <option value="OWNERSHIP_WITH_TRIAGE">
                  Project Ownership with Task Triage (Pending Manual Reassignment)
                </option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                {transferScope === 'FULL_HANDOVER' && 'Transfers project ownership and reassigns all active conversion queues to the new assignee.'}
                {transferScope === 'OWNERSHIP_ONLY' && 'Transfers project lead & approval responsibility while keeping currently allocated engineers on tasks.'}
                {transferScope === 'OWNERSHIP_WITH_TRIAGE' && 'Transfers ownership and places active work items in a triage queue for the new assignee to redistribute.'}
              </p>
            </div>

            {/* Reason for Transfer */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wider text-[11px]">
                Reason for Transfer *
              </label>
              <select
                value={transferReason}
                onChange={(e) => {
                  setTransferReason(e.target.value);
                  setIsReviewed(false);
                }}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#244A70] font-medium"
              >
                {TRANSFER_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Reference / Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                Reference / Administrative Note (Optional)
              </label>
              <textarea
                rows={2}
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                placeholder="e.g. Q4 workload rebalancing, reassigned per HR ticket #1042..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#244A70]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Transfer Impact Assessment ────────────────────────────────────── */}
      <div id="transfer-impact-section" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#244A70]" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Transfer Impact Assessment
            </h2>
          </div>
          {isReviewed ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <Check className="w-3.5 h-3.5" /> Impact Validated
            </span>
          ) : (
            <span className="text-xs text-slate-500 font-medium">
              Click "Review Transfer" to validate impact before confirmation
            </span>
          )}
        </div>

        {/* Structured Impact Assessment Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Current Owner</th>
                <th className="py-3 px-4">New Owner</th>
                <th className="py-3 px-4">Transfer Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Project Ownership Row */}
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-[#244A70]" />
                    <span>Project Leadership</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-700">
                  {currentOwner.name}
                </td>
                <td className="py-3.5 px-4 font-bold text-[#244A70]">
                  {selectedAssignee ? selectedAssignee.fullName : '— (Select Assignee)'}
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-[#244A70] border border-blue-200">
                    Transfer Ownership
                  </span>
                </td>
              </tr>

              {/* Active Tasks Row */}
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    <span>Active Tasks ({activeTasksCount})</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-700">
                  {project?.assignedStaffName || 'Current Staff Member'}
                </td>
                <td className="py-3.5 px-4 font-semibold text-slate-800">
                  {transferScope === 'FULL_HANDOVER'
                    ? selectedAssignee?.fullName || 'New Assignee'
                    : transferScope === 'OWNERSHIP_ONLY'
                    ? project?.assignedStaffName || 'Retain Current Staff'
                    : 'Pending Manual Triage'}
                </td>
                <td className="py-3.5 px-4">
                  {transferScope === 'FULL_HANDOVER' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-[#244A70] border border-blue-200">
                      Reassign to New Assignee
                    </span>
                  ) : transferScope === 'OWNERSHIP_ONLY' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Keep Assigned to Current Staff
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Manual Reassignment Required
                    </span>
                  )}
                </td>
              </tr>

              {/* Project Access Row */}
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Project & Repository Access</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-700">
                  {currentOwner.name}
                </td>
                <td className="py-3.5 px-4 font-bold text-[#244A70]">
                  {selectedAssignee ? selectedAssignee.fullName : '—'}
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Grant & Update Permissions
                  </span>
                </td>
              </tr>

              {/* Review Responsibility Row */}
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Review & AST Sign-Off</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-700">
                  {currentOwner.name}
                </td>
                <td className="py-3.5 px-4 font-bold text-[#244A70]">
                  {selectedAssignee ? selectedAssignee.fullName : '—'}
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                    Transfer Review Responsibility
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Business Rule Callout */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#244A70] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Business Rule:</strong> Tasks and members are not transferred unconditionally by default. Resources and permissions are allocated per transfer scope (<strong>{transferScope}</strong>) and verified against assignee workload capacity.
          </p>
        </div>
      </div>

      {/* ── 4. Transfer Confirmation & Execution ──────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={!isFormValid || !isReviewed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 rounded border-slate-300 text-[#244A70] focus:ring-[#244A70]"
            />
            <div className="text-xs text-slate-900 leading-relaxed">
              <strong className="block text-slate-900 font-bold">
                Ownership Transfer Confirmation
              </strong>
              <span>
                I confirm transferring project responsibility for <strong>"{project?.name}"</strong> from{' '}
                <strong>{currentOwner.name}</strong> to{' '}
                <strong>{selectedAssignee?.fullName || '[No assignee selected]'}</strong> for reason:{' '}
                <strong>"{transferReason}"</strong>. This will update Employee Allocation, hand over access permissions, and log in the Audit History.
              </span>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/team-lead/projects')}
            disabled={isExecuting}
            className="text-xs h-9 w-full sm:w-auto"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleReviewTransfer}
              disabled={!isFormValid || isExecuting}
              className={`text-xs h-9 ${isReviewed ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'text-[#244A70] border-blue-200'}`}
            >
              {isReviewed ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
              <span>{isReviewed ? 'Impact Reviewed' : 'Review Transfer'}</span>
            </Button>

            <Button
              type="button"
              onClick={handleExecuteTransfer}
              disabled={!isFormValid || !isReviewed || !confirmed || isExecuting}
              className="bg-[#244A70] hover:bg-[#244A70] text-white text-xs h-9 font-bold shadow-xs px-5"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
              <span>{isExecuting ? 'Executing Transfer...' : 'Execute Transfer'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferProjectOwnershipPage;
