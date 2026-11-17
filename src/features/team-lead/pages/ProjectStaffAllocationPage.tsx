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
  ArrowLeft,
  Layers,
  Code2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { partnersApi } from '@/features/partners/api/partners.api';
import { PartnerProject } from '@/features/partners/types/partner.types';
import { workloadLevel } from '../utils/workload';
import { Button } from '@/shared/ui';

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

  // Filter & Pagination states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [workloadFilter, setWorkloadFilter] = useState<'ALL' | 'LIGHT' | 'MODERATE' | 'OVERLOADED'>('ALL');
  const [specializationFilter, setSpecializationFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

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

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, workloadFilter, specializationFilter, departmentFilter, pageSize]);

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

  // Specialization helper based on index/id for consistent rich display
  const getStaffSpecializations = (staffId: string, idx: number) => {
    const skillSets = [
      ['BMS / DSPF → React 19', 'AST Parser', 'COBOL → Java'],
      ['COBOL', 'Java 21', 'Spring Boot 3.3', 'MicroFocus'],
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

  // Filter staff roster
  const filteredStaff = useMemo(() => {
    return staffRoster.filter((staff, idx) => {
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
  }, [staffRoster, workloadFilter, departmentFilter, specializationFilter, searchTerm]);

  // Workload statistics for quick pill filters
  const workloadStats = useMemo(() => {
    const light = staffRoster.filter((s) => s.activeWorkload <= 1).length;
    const moderate = staffRoster.filter((s) => s.activeWorkload > 1 && s.activeWorkload <= 3).length;
    const overloaded = staffRoster.filter((s) => s.activeWorkload > 3).length;
    return { total: staffRoster.length, light, moderate, overloaded };
  }, [staffRoster]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredStaff.length);
  const paginatedStaff = filteredStaff.slice(startIndex, endIndex);

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
    <div className="space-y-6 pb-12">
      {/* ── Page Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Allocate Conversion Staff to Project
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch modernization tasks to qualified engineers with clear capacity and specialization metrics.
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
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#244A70] text-white hover:bg-[#1B3654] text-xs font-semibold shadow-xs transition-colors h-9"
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

      {/* ── Target Project Profile Card ─────────────────────────────────────── */}
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

      {/* ── FORM: SECTION 1 (Target Staff Selection) & SECTION 2 (Allocation Parameters) ── */}
      <form onSubmit={handleConfirmAllocation} className="space-y-6">
        {/* ══════════════════════════════════════════════════
            SECTION 1: TARGET CONVERSION STAFF ENGINEER SELECTION
           ══════════════════════════════════════════════════ */}
        <div className="bg-white border border-[#DCE3EC] rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="border-b border-[#DCE3EC] pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#244A70] text-white flex items-center justify-center font-bold text-xs">
                1
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#17263A]">
                  Target Internal Staff Member *
                </h2>
              </div>
            </div>
            {selectedStaff && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                Staff Selected: {selectedStaff.fullName}
              </span>
            )}
          </div>

          {/* Accessible Select / Combobox for Quick Pick & Test Automation */}
          <div>
            <label
              htmlFor="target-staff-combobox"
              className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider block mb-1.5"
            >
              Target Internal Staff User *
            </label>
            <select
              id="target-staff-combobox"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl outline-none focus:bg-white focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70] text-[#17263A]"
            >
              <option value="">Select an eligible staff member...</option>
              {staffRoster.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email}) — {u.activeWorkload} Active Project{u.activeWorkload === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Toolbar for Directory */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
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
                  <option value="Modernization Engineering">Modernization Engineering</option>
                  <option value="Platform Operations">Platform Operations</option>
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
                  <option value="BMS">BMS / DSPF → React</option>
                  <option value="AST">AST Parser</option>
                  <option value="COBOL">COBOL → Java</option>
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
            <div className="lg:col-span-8 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-[#17263A] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#244A70]" />
                  <span>Eligible Conversion Staff Roster</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#244A70] border border-blue-200">
                    {filteredStaff.length} Engineers
                  </span>
                </span>
                <span className="text-[11px] text-slate-500">Click a staff member below to inspect and select</span>
              </div>

              {filteredStaff.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs space-y-1">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No staff members match the selected criteria.</p>
                  <p className="text-[11px]">Try clearing your search query or adjusting your capacity filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F8FAFC] text-[#8491A3] font-bold text-[10px] uppercase tracking-wider border-b border-[#DCE3EC]">
                      <tr>
                        <th className="py-2.5 px-3">Staff Member</th>
                        <th className="py-2.5 px-2">Department</th>
                        <th className="py-2.5 px-2">Specialization</th>
                        <th className="py-2.5 px-2">Status & Workload</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE3EC]">
                      {paginatedStaff.map((staff, idx) => {
                        const isSelected = selectedStaffId === staff.id;
                        const isCurrentlyAssigned = project?.assignedStaffId === staff.id;
                        const activeLoadInfo = workloadLevel(staff.activeWorkload);
                        const skills = getStaffSpecializations(staff.id, idx);
                        const department = idx % 2 === 0 ? 'Modernization Engineering' : 'Platform Operations';

                        return (
                          <tr
                            key={staff.id}
                            data-testid={`staff-card-${staff.id}`}
                            onClick={() => setSelectedStaffId(staff.id)}
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
                                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] uppercase shrink-0 ${
                                    isSelected
                                      ? 'bg-[#244A70] text-white'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {staff.fullName ? staff.fullName.charAt(0) : 'S'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[#17263A] text-xs">{staff.fullName}</span>
                                    {isCurrentlyAssigned && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                                        Assigned
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-[#8491A3] font-mono">{staff.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Department */}
                            <td className="py-2.5 px-2 text-[#17263A] text-[11px]">{department}</td>

                            {/* Specialization Tags */}
                            <td className="py-2.5 px-2">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {skills.slice(0, 2).map((sk) => (
                                  <span
                                    key={sk}
                                    className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-medium"
                                  >
                                    {sk}
                                  </span>
                                ))}
                                {skills.length > 2 && (
                                  <span className="text-[9px] text-slate-400 font-mono">+{skills.length - 2}</span>
                                )}
                              </div>
                            </td>

                            {/* Workload Status */}
                            <td className="py-2.5 px-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${activeLoadInfo.className}`}
                              >
                                {staff.activeWorkload} Active • {activeLoadInfo.label}
                              </span>
                            </td>

                            {/* Action Button */}
                            <td className="py-2.5 px-3 text-right">
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#244A70] text-white rounded text-[11px] font-semibold">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  Selected
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStaffId(staff.id);
                                  }}
                                  className="px-2.5 py-1 bg-white border border-[#DCE3EC] hover:border-[#244A70] text-[#17263A] hover:text-[#244A70] rounded text-[11px] font-medium transition-colors"
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
              {filteredStaff.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-2 border-t border-[#DCE3EC] bg-[#F8FAFC] text-xs">
                  <div className="flex items-center gap-2 text-[11px] text-[#8491A3]">
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 outline-none"
                    >
                      <option value={5}>5</option>
                      <option value={6}>6</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                    <span>|</span>
                    <span>
                      Showing {startIndex + 1} to {endIndex} of {filteredStaff.length} engineers
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#8491A3] mr-2">
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
            <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
              <div className="font-bold text-xs text-[#17263A] flex items-center gap-1.5 pb-2 border-b border-slate-200">
                <UserCheck className="w-4 h-4 text-[#244A70]" />
                <span>Selected Staff Profile</span>
              </div>

              {selectedStaff ? (
                <div className="space-y-3 text-xs">
                  {/* Avatar & Identifiers */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#244A70] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      {selectedStaff.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-[#17263A] text-sm">{selectedStaff.fullName}</div>
                      <div className="text-[11px] text-[#8491A3] font-mono">{selectedStaff.email}</div>
                      <div className="text-[10px] font-mono text-[#244A70] font-bold mt-0.5">
                        EMP-{selectedStaff.id.slice(-6).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Attributes breakdown */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Department:</span>
                      <span className="font-medium text-[#17263A]">Modernization Engineering</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Baseline Role:</span>
                      <span className="font-semibold text-slate-800">Conversion Staff</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Workload Capacity:</span>
                      <span
                        data-testid="selected-staff-badge"
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${workloadLevel(selectedStaff.activeWorkload).className}`}
                      >
                        {workloadLevel(selectedStaff.activeWorkload).label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 text-[#244A70]">
                      <span className="font-medium">Capacity Impact:</span>
                      <span className="font-bold">
                        {selectedStaff.activeWorkload} → {selectedStaff.activeWorkload + 1} projects
                      </span>
                    </div>
                  </div>

                  {/* Projects carried */}
                  {(projectsByStaff.get(selectedStaff.id) || []).length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Currently Assigned Projects:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(projectsByStaff.get(selectedStaff.id) || []).map((pName) => (
                          <span
                            key={pName}
                            className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 truncate max-w-[220px]"
                          >
                            {pName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Specialization Tags */}
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Technical Specializations:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {getStaffSpecializations(selectedStaff.id, 0).map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 rounded bg-blue-50 text-[#244A70] border border-blue-200 text-[10px] font-medium"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#8491A3] space-y-1">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                  <p className="font-medium text-slate-600">No staff member selected</p>
                  <p className="text-[11px]">Select a staff member from the directory or dropdown to view their profile.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 2: ALLOCATION PARAMETERS & TECHNICAL INSTRUCTIONS
           ══════════════════════════════════════════════════ */}
        <div className="bg-white border border-[#DCE3EC] rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="border-b border-[#DCE3EC] pb-3 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#244A70] text-white flex items-center justify-center font-bold text-xs">
              2
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#17263A]">
                Allocation Parameters & Technical Instructions *
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Target Staff Engineer Display */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Staff Engineer *
              </label>
              {selectedStaff ? (
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#244A70] text-white flex items-center justify-center font-bold text-xs">
                      {selectedStaff.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{selectedStaff.fullName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{selectedStaff.email}</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <Check className="w-3 h-3 text-emerald-600" />
                    Selected
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-xs text-slate-400 text-center">
                  Please choose an engineer from Section 1 above.
                </div>
              )}
            </div>

            {/* Assignment Role */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assignment Role
              </label>
              <select
                value={assignmentRole}
                onChange={(e: any) => setAssignmentRole(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#244A70]/20 focus:border-[#244A70]"
              >
                <option value="LEAD_ENGINEER">Lead Conversion Engineer [Primary Ownership]</option>
                <option value="SECONDARY_ENGINEER">Secondary Modernization Specialist [Pair / Co-Worker]</option>
                <option value="AST_REVIEWER">AST Parity & Quality Reviewer [Validation Only]</option>
              </select>
            </div>
          </div>

          {/* Workload Priority & Urgency */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Workload Priority & Urgency
            </label>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setAssignmentPriority('NORMAL')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
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
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
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
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
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

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/team-lead/projects')}
              className="text-xs h-9 px-4 text-slate-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !selectedStaffId}
              className="bg-[#244A70] hover:bg-[#1B3654] text-white text-xs h-9 px-5 shadow-xs font-bold flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Allocating Staff...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Staff Allocation</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProjectStaffAllocationPage;
