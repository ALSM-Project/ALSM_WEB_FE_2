import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FolderKanban,
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Building2,
  ArrowRight,
  Check,
  UserCheck,
  ChevronRight,
  ArrowLeft,
  Briefcase,
  Layers,
  Code2,
  AlertTriangle,
} from 'lucide-react';
import { partnersApi } from '@/features/partners/api/partners.api';
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

export const ProjectStaffAllocationPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<PartnerProject | null>(null);
  const [allProjects, setAllProjects] = useState<PartnerProject[]>([]);
  const [staffRoster, setStaffRoster] = useState<AssignableStaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [assignmentRole, setAssignmentRole] = useState<'LEAD_ENGINEER' | 'SECONDARY_ENGINEER' | 'AST_REVIEWER'>('LEAD_ENGINEER');
  const [assignmentPriority, setAssignmentPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [assignmentNote, setAssignmentNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [workloadFilter, setWorkloadFilter] = useState<'ALL' | 'LIGHT' | 'MODERATE' | 'OVERLOADED'>('ALL');

  const loadData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setErrorMsg(null);

      const [fetchedProjects, fetchedStaff] = await Promise.all([
        partnersApi.getProjects(),
        partnersApi.getAssignableStaff(),
      ]);

      const projectsList = fetchedProjects || [];
      setAllProjects(projectsList);

      const target = projectsList.find((p) => p.id === projectId) || null;
      if (target) {
        setProject(target);
        if (target.assignedStaffId) {
          setSelectedStaffId(target.assignedStaffId);
        }
        if (target.staffAssignmentNote) {
          setAssignmentNote(target.staffAssignmentNote);
        }
      } else {
        // Fallback try direct fetch
        const directProj = await partnersApi.getProjectById(projectId);
        if (directProj) {
          setProject(directProj);
          if (directProj.assignedStaffId) setSelectedStaffId(directProj.assignedStaffId);
          if (directProj.staffAssignmentNote) setAssignmentNote(directProj.staffAssignmentNote);
        } else {
          setErrorMsg(`Project with ID "${projectId}" was not found.`);
        }
      }

      setStaffRoster(fetchedStaff || []);
    } catch (err: any) {
      console.error('Failed to load project staff allocation details:', err);
      setErrorMsg(err.message || 'Failed to load project allocation information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Map active projects currently assigned to each staff member
  const projectsByStaff = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of allProjects) {
      if (p.assignedStaffId) {
        const list = map.get(p.assignedStaffId) || [];
        list.push(p.name);
        map.set(p.assignedStaffId, list);
      }
    }
    return map;
  }, [allProjects]);

  // Selected staff object
  const selectedStaff = useMemo(() => {
    return staffRoster.find((s) => s.id === selectedStaffId) || null;
  }, [staffRoster, selectedStaffId]);

  // Filter staff roster
  const filteredStaff = useMemo(() => {
    return staffRoster.filter((staff) => {
      // 1. Workload filter
      if (workloadFilter === 'LIGHT' && staff.activeWorkload > 1) return false;
      if (workloadFilter === 'MODERATE' && (staff.activeWorkload <= 1 || staff.activeWorkload > 3)) return false;
      if (workloadFilter === 'OVERLOADED' && staff.activeWorkload <= 3) return false;

      // 2. Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = staff.fullName.toLowerCase().includes(term);
        const matchesEmail = staff.email.toLowerCase().includes(term);
        const matchesRole = staff.role.toLowerCase().includes(term);
        if (!matchesName && !matchesEmail && !matchesRole) return false;
      }

      return true;
    });
  }, [staffRoster, workloadFilter, searchTerm]);

  // Workload statistics
  const workloadStats = useMemo(() => {
    const light = staffRoster.filter((s) => s.activeWorkload <= 1).length;
    const moderate = staffRoster.filter((s) => s.activeWorkload > 1 && s.activeWorkload <= 3).length;
    const overloaded = staffRoster.filter((s) => s.activeWorkload > 3).length;
    return { total: staffRoster.length, light, moderate, overloaded };
  }, [staffRoster]);

  const handleConfirmAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !selectedStaffId) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const staffMember = staffRoster.find((s) => s.id === selectedStaffId);
      const staffName = staffMember?.fullName || 'Conversion Staff';

      const updated = await partnersApi.assignProject(project.id, {
        staffId: selectedStaffId,
        staffName,
        staffNote: assignmentNote,
      });

      setProject(updated);
      setSuccessMsg(
        `Staff member "${staffName}" has been successfully assigned to "${project.name}". Work items have been dispatched to their engineering queue.`
      );

      // Refresh staff roster active workloads
      const refreshedStaff = await partnersApi.getAssignableStaff();
      setStaffRoster(refreshedStaff || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete staff allocation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#244A70]" />
        <p className="font-medium text-slate-700">Loading project details and employee allocation roster...</p>
      </div>
    );
  }

  if (errorMsg && !project) {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-bold">Project Not Found</h2>
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
    <div className="space-y-6">
      {/* ── Breadcrumb Navigation ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link to="/team-lead/projects" className="hover:text-[#244A70] font-medium flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Employee Allocation</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-700 truncate max-w-xs">{project?.name}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[#244A70] font-bold">Staff Allocation Details</span>
      </div>

      {/* ── Page Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Allocate Conversion Staff to Project
            </h1>
            {project?.status && <StatusBadge status={project.status} />}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Assign qualified modernization engineers to execute AST parsing, field mapping, and interactive code conversions with real-time capacity and workload tracking.
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
            Back to Projects
          </Button>
          {project && (
            <Link
              to={`/partners/projects/${project.id}/workspace`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#244A70] text-white hover:bg-[#244A70] text-xs font-semibold shadow-xs transition-colors h-9"
            >
              <span>Open Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* ── Alerts ────────────────────────────────────────────────────────────── */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-900">Staff Allocation Succeeded</p>
              <p className="text-xs text-emerald-700 mt-0.5">{successMsg}</p>
            </div>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-xs text-emerald-600 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-900">Allocation Error</p>
              <p className="text-xs text-rose-700 mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-xs text-rose-600 hover:text-rose-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── 1. Target Project Overview Card ────────────────────────────────────── */}
      {project && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#244A70] flex items-center justify-center font-bold">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Project Profile</span>
                <h2 className="text-base font-bold text-slate-900">{project.name}</h2>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-400">ID: {project.id}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Client / Partner */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Partner Client</span>
              <div className="font-semibold text-slate-800 mt-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{project.partnerName || 'Not linked to a partner'}</span>
              </div>
            </div>

            {/* Framework & Engine */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Target Framework</span>
              <div className="font-mono font-semibold text-slate-800 mt-1 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-blue-500" />
                <span>{project.targetFramework || 'React 19 + Tailwind CSS'}</span>
              </div>
            </div>

            {/* Scope & Volume */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Modernization Scope</span>
              <div className="font-semibold text-slate-800 mt-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  {(project.screensTotal || 0) > 0 ? `${project.screensCompleted || 0}/${project.screensTotal} screens` : `${project.programsCompleted || 0}/${project.programsTotal || 0} programs`}
                </span>
              </div>
            </div>

            {/* Current Staff Assignment Status */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Currently Allocated Staff</span>
              <div className="mt-1">
                {project.assignedStaffName ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{project.assignedStaffName}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>None (Unallocated)</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Main Two-Column Layout: Full Staff Roster & Allocation Form ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Comprehensive Employee Roster (8 cols) ─────────────── */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#244A70]" />
                  <span>Eligible Conversion Staff Roster</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#244A70] border border-blue-200">
                    {staffRoster.length} Engineers
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select an engineer to inspect their workload capacity and dispatch this project.
                </p>
              </div>

              {/* Workload Capacity Stats Pills */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setWorkloadFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    workloadFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({workloadStats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setWorkloadFilter('LIGHT')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    workloadFilter === 'LIGHT'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  Available ({workloadStats.light})
                </button>
                <button
                  type="button"
                  onClick={() => setWorkloadFilter('MODERATE')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    workloadFilter === 'MODERATE'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  Optimal ({workloadStats.moderate})
                </button>
                <button
                  type="button"
                  onClick={() => setWorkloadFilter('OVERLOADED')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    workloadFilter === 'OVERLOADED'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  High ({workloadStats.overloaded})
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#244A70]/20 focus:border-[#244A70] transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Staff Cards Grid */}
            <div className="space-y-3">
              {filteredStaff.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No matching staff members found</p>
                  <p className="mt-1">Try clearing your search query or adjusting your capacity filter.</p>
                </div>
              ) : (
                filteredStaff.map((staff) => {
                  const isSelected = selectedStaffId === staff.id;
                  const isCurrentlyAssigned = project?.assignedStaffId === staff.id;
                  const activeLoadInfo = workloadLevel(staff.activeWorkload);
                  const assignedProjects = projectsByStaff.get(staff.id) || [];

                  return (
                    <div
                      key={staff.id}
                      onClick={() => setSelectedStaffId(staff.id)}
                      data-testid={`staff-card-${staff.id}`}
                      className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-[#244A70] bg-blue-50/40 ring-2 ring-[#244A70]/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Member Identity */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm shrink-0 shadow-xs ${
                              isSelected
                                ? 'bg-[#244A70] text-white'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {staff.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900">{staff.fullName}</h4>
                              {isCurrentlyAssigned && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3 h-3" />
                                  Currently Assigned
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{staff.email}</p>
                          </div>
                        </div>

                        {/* Workload Status & Selection Action */}
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          {/* Workload Badge */}
                          <div className="text-right">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${activeLoadInfo.className}`}
                            >
                              {staff.activeWorkload} Active Project{staff.activeWorkload === 1 ? '' : 's'} • {activeLoadInfo.label}
                            </span>
                          </div>

                          {/* Radio / Selection Indicator */}
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'border-[#244A70] bg-[#244A70] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      </div>

                      {/* Skills & Current Project Load */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Specialization:</span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                            BMS / DSPF → React 19
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                            AST Parser
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                            COBOL → Java
                          </span>
                        </div>

                        {assignedProjects.length > 0 && (
                          <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            <span>Carries: </span>
                            <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                              {assignedProjects.slice(0, 2).join(', ')}
                              {assignedProjects.length > 2 && ` +${assignedProjects.length - 2} more`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Right Column: Staff Allocation Configuration Form (4-5 cols) ───── */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <form
            onSubmit={handleConfirmAllocation}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5 sticky top-6"
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#244A70]" />
                <span>Allocation Parameters</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure role, priorities, and technical instructions.
              </p>
            </div>

            {/* Selected Engineer Preview Card */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Staff Engineer *
              </label>
              {selectedStaff ? (
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#244A70] text-white flex items-center justify-center font-bold text-xs">
                        {selectedStaff.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{selectedStaff.fullName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{selectedStaff.email}</div>
                      </div>
                    </div>
                    <span
                      data-testid="selected-staff-badge"
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${workloadLevel(selectedStaff.activeWorkload).className}`}
                    >
                      {workloadLevel(selectedStaff.activeWorkload).label}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-[11px] text-[#244A70]">
                    <span className="font-medium">Capacity Impact:</span>
                    <span className="font-bold">
                      {selectedStaff.activeWorkload} → {selectedStaff.activeWorkload + 1} projects
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400 bg-slate-50">
                  <Users className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                  <span>Please choose an engineer from the roster on the left.</span>
                </div>
              )}
            </div>

            {/* Role in Project */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assignment Role
              </label>
              <select
                value={assignmentRole}
                onChange={(e: any) => setAssignmentRole(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#244A70]/20 focus:border-[#244A70]"
              >
                <option value="LEAD_ENGINEER">Lead Conversion Engineer (Primary Ownership)</option>
                <option value="SECONDARY_ENGINEER">Secondary Modernization Specialist (Pair / Co-Worker)</option>
                <option value="AST_REVIEWER">AST Parity & Quality Reviewer (Validation Only)</option>
              </select>
            </div>

            {/* Priority Level */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Workload Priority & Urgency
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAssignmentPriority('NORMAL')}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                    assignmentPriority === 'NORMAL'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentPriority('HIGH')}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                    assignmentPriority === 'HIGH'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  High (SLA)
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentPriority('URGENT')}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                    assignmentPriority === 'URGENT'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Urgent
                </button>
              </div>
            </div>

            {/* Engineering Notes & Technical Briefing */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Engineering Notes & Technical Priorities
              </label>
              <textarea
                rows={4}
                value={assignmentNote}
                onChange={(e) => setAssignmentNote(e.target.value)}
                placeholder="e.g. Focus on DSPF header validation first; ensure BigDecimal precision in financial routines; verify React 19 forwardRef patterns."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#244A70]/20 focus:border-[#244A70]"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                These notes will be delivered directly to the engineer's queue and workspace dashboard.
              </span>
            </div>

            {/* Submit Action */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !selectedStaffId}
                className="w-full bg-[#244A70] hover:bg-[#244A70] text-xs h-10 shadow-xs justify-center font-bold"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                    Allocating Staff...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Confirm Staff Allocation
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/team-lead/projects')}
                className="w-full text-xs h-9 justify-center text-slate-600"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProjectStaffAllocationPage;
