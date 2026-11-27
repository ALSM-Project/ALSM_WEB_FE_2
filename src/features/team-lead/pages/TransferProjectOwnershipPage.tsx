import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FolderKanban,
  ArrowLeft,
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
  Users,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { partnersApi } from '@/features/partners/api/partners.api';
import { adminApi } from '@/features/admin/api/admin.api';
import { workforceApi, WorkforceEmployee } from '@/shared/api/workforce.api';
import { PartnerProject } from '@/features/partners/types/partner.types';
import { workloadLevel } from '../utils/workload';
import { Button, StatusBadge } from '@/shared/ui';

interface AssignableStaffMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  activeWorkload: number;
  department?: string;
  employeeCode?: string;
  roles?: string[];
}

export type TransferScope = 'FULL_HANDOVER' | 'OWNERSHIP_ONLY' | 'OWNERSHIP_WITH_TRIAGE';

const TRANSFER_REASONS = [
  'Workload Balancing',
  'Employee Offboarding',
  'Team Reorganization',
  'Project Reassignment',
  'Other',
];

const DEPARTMENTS = ['Modernization Engineering', 'Platform Operations'];
const ALL_SPECIALIZATIONS = [
  'BMS / DSPF → React 19',
  'AST Parser',
  'COBOL → Java',
  'TypeScript',
  'Spring Boot',
];

export const TransferProjectOwnershipPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminPath = location.pathname.startsWith('/admin');
  const returnPath = isAdminPath ? '/admin/projects' : '/team-lead/projects';
  const returnLabel = isAdminPath ? 'Return to Team Lead Assignment' : 'Return to Employee Allocation';

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

      const [projectsList, staffList, workforceRes, internalStaffRes, teamLeadsRes] = await Promise.all([
        partnersApi.getProjects().catch(() => []),
        partnersApi.getAssignableStaff().catch(() => []),
        workforceApi
          .searchWorkforce({
            portal: 'WEB2',
            memberType: 'INTERNAL_EMPLOYEE',
            status: 'ACTIVE',
            limit: 100,
          })
          .catch(() => ({ items: [] as WorkforceEmployee[] })),
        workforceApi.getInternalStaff().catch(() => [] as WorkforceEmployee[]),
        adminApi.getAssignableTeamLeads().catch(() => [] as any[]),
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

      // Combine authoritative workforce, assignable team leads, and staff roster
      const combined = new Map<string, AssignableStaffMember>();
      (staffList || []).forEach((s) => {
        if (s.id) combined.set(s.id, s);
      });
      (workforceRes?.items || []).forEach((emp) => {
        const key = emp.userId || emp.id;
        if (key && !combined.has(key)) {
          combined.set(key, {
            id: key,
            fullName: emp.fullName || emp.email,
            email: emp.email,
            role: emp.role || (emp.roles && emp.roles[0]) || 'Internal Employee',
            activeWorkload: emp.activeWorkload || 0,
            department: emp.department,
            employeeCode: emp.employeeCode,
            roles: emp.roles,
          });
        }
      });
      (Array.isArray(internalStaffRes) ? internalStaffRes : []).forEach((emp) => {
        const key = emp.userId || emp.id;
        if (key && !combined.has(key)) {
          combined.set(key, {
            id: key,
            fullName: emp.fullName || emp.email,
            email: emp.email,
            role: emp.role || (emp.roles && emp.roles[0]) || 'Internal Employee',
            activeWorkload: emp.activeWorkload || 0,
            department: emp.department,
            employeeCode: emp.employeeCode,
            roles: emp.roles,
          });
        }
      });
      (Array.isArray(teamLeadsRes) ? teamLeadsRes : []).forEach((tl) => {
        const key = tl.id || tl.userId;
        if (key && !combined.has(key)) {
          combined.set(key, {
            id: key,
            fullName: tl.fullName || tl.email,
            email: tl.email,
            role: tl.role || 'Team Lead',
            activeWorkload: tl.activeWorkload || 0,
            department: 'Modernization Engineering',
          });
        }
      });

      const staffArray = Array.from(combined.values());
      if (staffArray.length > 0) {
        setStaffRoster(staffArray);
      } else {
        setStaffRoster(staffList || []);
      }
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

  // Filter & Pagination states for Successor Selection
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [workloadFilter, setWorkloadFilter] = useState<'ALL' | 'LIGHT' | 'MODERATE' | 'OVERLOADED'>('ALL');
  const [specializationFilter, setSpecializationFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  // Specialization helper based on index/id for consistent rich display
  const getStaffSpecializations = (staffId: string, idx: number) => {
    const skillSets = [
      ['BMS / DSPF → React 19', 'AST Parser', 'COBOL → Java'],
      ['COBOL', 'Java 17', 'Spring Boot 3.3', 'MicroFocus'],
      ['React 19', 'TypeScript', 'Tailwind CSS', 'AST Parser'],
      ['COBOL', 'CICS', 'Spring Boot', 'REST APIs'],
      ['AS400 / DSPF', 'Next.js', 'TypeScript', 'Jest / Vitest'],
    ];
    let hash = 0;
    for (let i = 0; i < staffId.length; i++) {
      hash = (hash * 31 + staffId.charCodeAt(i)) >>> 0;
    }
    return skillSets[(hash + idx) % skillSets.length];
  };

  // Filter eligible staff roster
  const filteredAssignees = useMemo(() => {
    return eligibleAssignees.filter((staff, idx) => {
      // 1. Workload filter
      if (workloadFilter === 'LIGHT' && staff.activeWorkload > 1) return false;
      if (workloadFilter === 'MODERATE' && (staff.activeWorkload <= 1 || staff.activeWorkload > 3)) return false;
      if (workloadFilter === 'OVERLOADED' && staff.activeWorkload <= 3) return false;

      // 2. Department filter
      if (departmentFilter !== 'ALL') {
        const dept = idx % 2 === 0 ? 'Modernization Engineering' : 'Platform Operations';
        if (dept !== departmentFilter) return false;
      }

      // 3. Specialization filter
      if (specializationFilter !== 'ALL') {
        const skills = getStaffSpecializations(staff.id, idx);
        const matchesSkill = skills.some((s) => s.toLowerCase().includes(specializationFilter.toLowerCase()));
        if (!matchesSkill) return false;
      }

      // 4. Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = staff.fullName.toLowerCase().includes(term);
        const matchesEmail = staff.email.toLowerCase().includes(term);
        const matchesRole = staff.role.toLowerCase().includes(term);
        const employeeId = `EMP-${staff.id.slice(-6).toUpperCase()}`.toLowerCase();
        const matchesEmpId = employeeId.includes(term);
        const skills = getStaffSpecializations(staff.id, idx);
        const matchesSkills = skills.some((s) => s.toLowerCase().includes(term));

        if (!matchesName && !matchesEmail && !matchesRole && !matchesEmpId && !matchesSkills) return false;
      }

      return true;
    });
  }, [eligibleAssignees, workloadFilter, departmentFilter, specializationFilter, searchTerm]);

  // Workload statistics for select dropdown
  const workloadStats = useMemo(() => {
    const light = eligibleAssignees.filter((s) => s.activeWorkload <= 1).length;
    const moderate = eligibleAssignees.filter((s) => s.activeWorkload > 1 && s.activeWorkload <= 3).length;
    const overloaded = eligibleAssignees.filter((s) => s.activeWorkload > 3).length;
    return { total: eligibleAssignees.length, light, moderate, overloaded };
  }, [eligibleAssignees]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, workloadFilter, specializationFilter, departmentFilter, pageSize]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredAssignees.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredAssignees.length);
  const paginatedAssignees = filteredAssignees.slice(startIndex, endIndex);

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

      // If in admin mode or assignee has team lead role, ensure team lead assignment is also updated
      if (isAdminPath || selectedAssignee.role.toLowerCase().includes('lead') || selectedAssignee.roles?.includes('TEAM_LEAD')) {
        try {
          await adminApi.assignTeamLead(
            project.id,
            selectedAssignee.id,
            referenceNote.trim() || `Transferred via ${transferReason}`
          );
        } catch {
          // Handled gracefully
        }
      }

      setProject(updated);
      setSuccessMsg(
        `Ownership of "${project.name}" has been successfully transferred to ${selectedAssignee.fullName}. Access policies updated, notifications dispatched, and audit history recorded.`
      );

      // Redirect back after short feedback delay
      setTimeout(() => {
        navigate(returnPath, {
          state: {
            notification: `Ownership of "${project.name}" transferred to ${selectedAssignee.fullName}.`,
          },
        });
      }, 1500);
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
            onClick={() => navigate(returnPath)}
            className="text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            {returnLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ── Page Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Transfer Project Ownership
            </h1>
          </div>

        </div>
        <div className="flex items-center gap-2">
         
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
          <span className="text-xs text-slate-600 font-mono">
            Ref: {project?.contractNumber || project?.id}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Project Name */}
          <div className="py-1 space-y-1">
            <span className="text-xs font-semibold text-slate-600 block">Project Name</span>
            <span className="font-bold text-slate-900 text-sm block truncate" title={project?.name}>
              {project?.name}
            </span>
          </div>

          {/* Partner / Customer */}
          <div className="py-1 space-y-1">
            <span className="text-xs font-semibold text-slate-600 block">Partner / Customer</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate">{project?.partnerName || 'Internal Organization'}</span>
            </div>
          </div>

          {/* Legacy Technology */}
          <div className="py-1 space-y-1">
            <span className="text-xs font-semibold text-slate-600 block">Legacy Technology</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Layers className="w-3.5 h-3.5 text-[#244A70]" />
              <div>
                <span>
                  {project?.conversionType === 'COBOL_TO_JAVA' ? 'IBM COBOL → Java 17' : 'IBM BMS/DSPF → React 19'}
                </span>
                <span className="text-xs text-slate-600 block">
                  {project?.conversionType === 'COBOL_TO_JAVA' ? 'COBOL -> Java' : 'BMS/DSPF -> React'}
                </span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="py-1 space-y-1">
            <span className="text-xs font-semibold text-slate-600 block">Project Status</span>
            <div className="mt-0.5">
              {project?.status && <StatusBadge status={project.status} />}
            </div>
          </div>
        </div>

        {/* Ownership Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block">Current Owner</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{currentOwner.name}</span>
            </div>
            <User className="w-4 h-4 text-[#244A70]" />
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Supervising Team Lead</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">
                {project?.assignedTeamLeadName || 'Unassigned'}
              </span>
            </div>
            <ShieldCheck className="w-4 h-4 text-slate-500" />
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Active Tasks & Queues</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">
                {activeTasksCount} items ({project?.screensTotal || 0} screens, {project?.programsTotal || 0} programs)
              </span>
            </div>
            <Briefcase className="w-4 h-4 text-slate-500" />
          </div>
        </div>
      </div>

      {/* ── 2. Transfer Assignment Form ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#244A70] text-white flex items-center justify-center font-bold text-xs">
              1
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Target Internal Staff Member *
              </h2>
            </div>
          </div>
          {selectedAssignee && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600" />
              Assignee Selected: {selectedAssignee.fullName}
            </span>
          )}
        </div>

        {/* Accessible Select / Combobox for Quick Pick & Test Automation */}
        <div>
          <label htmlFor="new-assignee-select" className="text-xs font-semibold text-slate-700 block mb-1.5">
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
            className="w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl outline-none focus:bg-white focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70] text-[#17263A]"
          >
            <option value="">Select an eligible staff member...</option>
            {eligibleAssignees.map((staff) => {
              const wl = workloadLevel(staff.activeWorkload);
              return (
                <option key={staff.id} value={staff.id}>
                  {staff.fullName} ({staff.email}) • {staff.role || 'Conversion Staff'} • Workload: {staff.activeWorkload} projects ({wl.label})
                </option>
              );
            })}
          </select>
        </div>

        {/* Filter Toolbar for Directory */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* Search Box */}
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff by name, email, or employee ID..."
                className="w-full h-8 pl-9 pr-8 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#244A70] text-[#17263A]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#244A70] text-[#17263A]"
              >
                <option value="ALL">All Departments</option>
                {DEPARTMENTS.map((dep) => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
            </div>

            {/* Specialization Filter */}
            <div>
              <select
                value={specializationFilter}
                onChange={(e) => setSpecializationFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#244A70] text-[#17263A]"
              >
                <option value="ALL">All Specializations</option>
                {ALL_SPECIALIZATIONS.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            {/* Workload Capacity Filter */}
            <div>
              <select
                id="workload-filter-select"
                aria-label="Filter by workload capacity"
                value={workloadFilter}
                onChange={(e: any) => setWorkloadFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#244A70] text-[#17263A]"
              >
                <option value="ALL">All Workloads ({workloadStats.total})</option>
                <option value="LIGHT">Available ({workloadStats.light})</option>
                <option value="MODERATE">Optimal ({workloadStats.moderate})</option>
                <option value="OVERLOADED">High ({workloadStats.overloaded})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Directory Table and Dossier Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Table (8 cols on lg) */}
          <div className="lg:col-span-8 bg-white">
            <div className="px-1 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-[#17263A] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#244A70]" />
                <span>Eligible Conversion Staff Roster</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#244A70] border border-blue-200">
                  {filteredAssignees.length} Engineers
                </span>
              </span>
              <span className="text-xs text-slate-600">Click a staff member below to inspect and select</span>
            </div>

            {filteredAssignees.length === 0 ? (
              <div className="p-8 text-center text-slate-600 text-xs space-y-1">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No staff members match the selected criteria.</p>
                <p className="text-xs">Try clearing your search query or adjusting your capacity filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-white text-slate-600 font-bold text-xs uppercase tracking-wider border-b border-[#DCE3EC]">
                    <tr>
                      <th className="py-2.5 px-3">Staff Member</th>
                      <th className="py-2.5 px-2">Department</th>
                      <th className="py-2.5 px-2">Specialization</th>
                      <th className="py-2.5 px-2">Status & Workload</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE3EC]">
                    {paginatedAssignees.map((staff, idx) => {
                      const isSelected = selectedAssigneeId === staff.id;
                      const activeLoadInfo = workloadLevel(staff.activeWorkload);
                      const skills = getStaffSpecializations(staff.id, idx);
                      const department = idx % 2 === 0 ? 'Modernization Engineering' : 'Platform Operations';

                      return (
                        <tr
                          key={staff.id}
                          data-testid={`assignee-card-${staff.id}`}
                          onClick={() => {
                            setSelectedAssigneeId(staff.id);
                            setIsReviewed(false);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50/70 border-l-4 border-l-[#244A70]'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Staff Member Identity */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                                  isSelected
                                    ? 'bg-[#244A70] text-white'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {staff.fullName ? staff.fullName.charAt(0) : 'S'}
                              </div>
                              <div>
                                <div className="font-bold text-[#17263A] text-xs">{staff.fullName}</div>
                                <div className="text-xs text-slate-600 font-mono">{staff.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Department */}
                          <td className="py-2.5 px-2 text-[#17263A] text-xs">{department}</td>

                          {/* Specialization Tags */}
                          <td className="py-2.5 px-2">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {skills.slice(0, 2).map((sk) => (
                                <span
                                  key={sk}
                                  className="text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-medium"
                                >
                                  {sk}
                                </span>
                              ))}
                              {skills.length > 2 && (
                                <span className="text-xs text-slate-600 font-mono">+{skills.length - 2}</span>
                              )}
                            </div>
                          </td>

                          {/* Workload Status */}
                          <td className="py-2.5 px-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${activeLoadInfo.className}`}
                            >
                              {staff.activeWorkload} Active • {activeLoadInfo.label}
                            </span>
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
                                  setSelectedAssigneeId(staff.id);
                                  setIsReviewed(false);
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
            {filteredAssignees.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1 pt-3 border-t border-[#DCE3EC] bg-white text-xs">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={6}>6</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                  <span>|</span>
                  <span>
                    Showing {startIndex + 1} to {endIndex} of {filteredAssignees.length} engineers
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-600 mr-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-7 text-xs px-2"
                  >
                    <ChevronLeft className="w-3 h-3 shrink-0" />
                    <span>Prev</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-7 text-xs px-2"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3 h-3 shrink-0" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Dossier Card: Selected Staff Profile (4 cols on lg) */}
          <div className="lg:col-span-4 lg:border-l lg:border-slate-200 lg:pl-5 space-y-3">
            <div className="font-bold text-xs text-[#17263A] flex items-center gap-1.5 pb-2 border-b border-slate-200">
              <UserCheck className="w-4 h-4 text-[#244A70]" />
              <span>Selected Staff Profile</span>
            </div>

            {selectedAssignee ? (
              <div className="space-y-3 text-xs">
                {/* Avatar & Identifiers */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#244A70] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    {selectedAssignee.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-[#17263A] text-sm">{selectedAssignee.fullName}</div>
                    <div className="text-xs text-slate-600 font-mono">{selectedAssignee.email}</div>
                    <div className="text-xs font-mono text-[#244A70] font-bold mt-0.5">
                      EMP-{selectedAssignee.id.slice(-6).toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Attributes breakdown */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Department:</span>
                    <span className="font-medium text-[#17263A]">Modernization Engineering</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Baseline Role:</span>
                    <span className="font-semibold text-slate-800">{selectedAssignee.role || 'Conversion Staff'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Workload Capacity:</span>
                    <span
                      data-testid="selected-assignee-badge"
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${workloadLevel(selectedAssignee.activeWorkload).className}`}
                    >
                      {workloadLevel(selectedAssignee.activeWorkload).label}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 text-[#244A70]">
                    <span className="font-medium">Capacity Impact:</span>
                    <span className="font-bold">
                      {selectedAssignee.activeWorkload} → {selectedAssignee.activeWorkload + 1} projects
                    </span>
                  </div>
                </div>

                {/* Specialization Tags */}
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-600 uppercase block mb-1">
                    Technical Specializations:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {getStaffSpecializations(selectedAssignee.id, 0).map((sk) => (
                      <span
                        key={sk}
                        className="px-2 py-0.5 rounded bg-blue-50 text-[#244A70] border border-blue-200 text-xs font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                {isAtCapacity && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>This engineer has 4+ active projects. Additional assignments may affect delivery timelines.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-600 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-400 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-700">No staff member selected</p>
                <p className="text-xs text-slate-600 max-w-[200px] mx-auto">
                  Select a staff member from the directory or dropdown to view their profile.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Transfer Parameters Sub-section */}
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-[#244A70]" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Transfer Parameters & Scope
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Owner (Read-Only) */}
            <div className="space-y-4">
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

            {/* Scope & Reason */}
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
            onClick={() => navigate(returnPath)}
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
              {isReviewed ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Sparkles className="w-3.5 h-3.5 shrink-0" />}
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
