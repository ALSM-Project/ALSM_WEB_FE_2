import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Layers,
  Send,
  Users,
  CheckCircle2,
  Clock,
  Briefcase,
  Key,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  UserCheck,
} from 'lucide-react';
import {
  offboardingApprovalApi,
  OffboardingType,
  DocumentationStatus,
} from '../api/offboarding-approval.api';
import { OffboardingLiveSummary } from '../api/offboarding-approval.api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/shared/ui/Button';
import { workforceApi } from '@/shared/api/workforce.api';
import { partnersApi } from '@/features/partners/api/partners.api';
import { workloadLevel } from '../utils/workload';

interface StaffCandidate {
  id: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  activeWorkload: number;
  employeeCode?: string;
  status: string;
}

const DEPARTMENTS = ['Modernization Engineering', 'Platform Operations'];
const ALL_SPECIALIZATIONS = [
  'BMS / DSPF → React 19',
  'AST Parser',
  'COBOL → Java',
  'TypeScript',
  'Spring Boot',
];

export const CreateOffboardingRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: actor } = useAuth();

  // Selected employee state
  const [staffRoster, setStaffRoster] = useState<StaffCandidate[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffCandidate | null>(null);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [liveSummary, setLiveSummary] = useState<OffboardingLiveSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  // Filters & Pagination for Directory
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [workloadFilter, setWorkloadFilter] = useState<'ALL' | 'LIGHT' | 'MODERATE' | 'OVERLOADED'>('ALL');
  const [specializationFilter, setSpecializationFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  // Form Fields
  const [offboardingType, setOffboardingType] = useState<OffboardingType>('Resignation');
  const [offboardingReason, setOffboardingReason] = useState<string>('');
  const [proposedSuccessorId, setProposedSuccessorId] = useState<string>('');
  const [handoverDeadline, setHandoverDeadline] = useState<string>('');
  const [pendingTasks, setPendingTasks] = useState<string>('');
  const [documentationStatus, setDocumentationStatus] = useState<DocumentationStatus>('In Progress');
  const [projectSuccessors, setProjectSuccessors] = useState<Record<string, string>>({});

  // 14 days standard offboarding notice default
  const [effectiveDate, setEffectiveDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  // Today string for default request date
  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch staff roster on mount
  useEffect(() => {
    let isMounted = true;
    const loadStaff = async () => {
      try {
        setLoadingRoster(true);
        let items: StaffCandidate[] = [];
        try {
          const wfResp = await workforceApi.searchWorkforce({
            portal: 'WEB2',
            memberType: 'INTERNAL_EMPLOYEE',
            status: 'ACTIVE',
            limit: 100,
          });
          if (wfResp?.items && wfResp.items.length > 0) {
            items = wfResp.items.map((emp, idx) => ({
              id: emp.userId,
              fullName: emp.fullName,
              email: emp.email,
              department: emp.department || (idx % 2 === 0 ? 'Modernization Engineering' : 'Platform Operations'),
              role: emp.role || 'Conversion Staff',
              activeWorkload: emp.activeWorkload || 0,
              employeeCode: emp.employeeCode || `EMP-${emp.userId.slice(-6).toUpperCase()}`,
              status: emp.status || 'ACTIVE',
            }));
          }
        } catch {
          // ignore workforceApi error, fallback to partnersApi
        }

        if (items.length === 0) {
          try {
            const assignable = await partnersApi.getAssignableStaff();
            items = (assignable || []).map((s, idx) => ({
              id: s.id,
              fullName: s.fullName,
              email: s.email,
              department: idx % 2 === 0 ? 'Modernization Engineering' : 'Platform Operations',
              role: s.role || 'Conversion Staff',
              activeWorkload: s.activeWorkload || 0,
              employeeCode: `EMP-${s.id.slice(-6).toUpperCase()}`,
              status: 'ACTIVE',
            }));
          } catch {
            // fallback
          }
        }

        if (isMounted) {
          setStaffRoster(items);
        }
      } finally {
        if (isMounted) setLoadingRoster(false);
      }
    };
    loadStaff();
    return () => {
      isMounted = false;
    };
  }, []);

  // Specialization helper based on index/id
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
      if (workloadFilter === 'LIGHT' && staff.activeWorkload > 1) return false;
      if (workloadFilter === 'MODERATE' && (staff.activeWorkload <= 1 || staff.activeWorkload > 3)) return false;
      if (workloadFilter === 'OVERLOADED' && staff.activeWorkload <= 3) return false;

      if (departmentFilter !== 'ALL' && staff.department !== departmentFilter) return false;

      if (specializationFilter !== 'ALL') {
        const skills = getStaffSpecializations(staff.id, idx);
        const matchesSpec = skills.some((s) => s.toLowerCase().includes(specializationFilter.toLowerCase()));
        if (!matchesSpec) return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = staff.fullName.toLowerCase().includes(term);
        const matchesEmail = staff.email.toLowerCase().includes(term);
        const matchesRole = staff.role.toLowerCase().includes(term);
        const matchesDept = staff.department.toLowerCase().includes(term);
        const matchesCode = (staff.employeeCode || '').toLowerCase().includes(term);
        const skills = getStaffSpecializations(staff.id, idx);
        const matchesSkills = skills.some((s) => s.toLowerCase().includes(term));

        if (!matchesName && !matchesEmail && !matchesRole && !matchesDept && !matchesCode && !matchesSkills) {
          return false;
        }
      }

      return true;
    });
  }, [staffRoster, workloadFilter, departmentFilter, specializationFilter, searchTerm]);

  // Workload statistics for filter
  const workloadStats = useMemo(() => {
    const light = staffRoster.filter((s) => s.activeWorkload <= 1).length;
    const moderate = staffRoster.filter((s) => s.activeWorkload > 1 && s.activeWorkload <= 3).length;
    const overloaded = staffRoster.filter((s) => s.activeWorkload > 3).length;
    return { total: staffRoster.length, light, moderate, overloaded };
  }, [staffRoster]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, workloadFilter, specializationFilter, departmentFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredStaff.length);
  const paginatedStaff = filteredStaff.slice(startIndex, endIndex);

  // Handle staff selection
  const handleSelectStaffId = (id: string) => {
    setSelectedUserId(id);
    const found = staffRoster.find((s) => s.id === id) || null;
    setSelectedStaff(found);
    setProjectSuccessors({});
    setProposedSuccessorId('');
  };

  // Auto-fetch summary when selected staff changes
  useEffect(() => {
    if (!selectedUserId) {
      setLiveSummary(null);
      return;
    }

    const fetchSummary = async () => {
      try {
        setLoadingSummary(true);
        setErrorMsg(null);
        const summary = await offboardingApprovalApi.getUserOffboardingSummary(selectedUserId);
        setLiveSummary(summary);
      } catch (err: unknown) {
        console.error('Failed to load user offboarding summary:', err);
        setLiveSummary(null);
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchSummary();
  }, [selectedUserId]);

  // Filter eligible successors (all other internal conversion staff except target staff)
  const eligibleSuccessors = useMemo(() => {
    if (!liveSummary?.eligibleStaff) {
      return staffRoster.filter((s) => s.id !== selectedUserId);
    }
    return liveSummary.eligibleStaff.filter((s: any) => s.id !== selectedUserId);
  }, [liveSummary, staffRoster, selectedUserId]);

  const handleProjectSuccessorChange = (projectId: string, successorStaffId: string) => {
    setProjectSuccessors((prev) => ({
      ...prev,
      [projectId]: successorStaffId,
    }));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setErrorMsg('Please select a staff member to offboard.');
      return;
    }

    if (!offboardingReason.trim()) {
      setErrorMsg('Please specify a formal offboarding reason/justification.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      // Build project transfers list
      const projectTransfers = Object.entries(projectSuccessors)
        .filter(([, sId]) => Boolean(sId))
        .map(([projId, sId]) => {
          const matchedSuccessor = eligibleSuccessors.find((c: any) => c.id === sId);
          const matchedProject = (liveSummary?.assignedProjects || []).find((p: any) => p.id === projId);
          return {
            projectId: projId,
            projectName: matchedProject?.name,
            targetStaffId: sId,
            targetStaffName: matchedSuccessor?.fullName,
            reason: `Reassignment for offboarding ${selectedStaff?.fullName || selectedUserId}`,
          };
        });

      const payload = {
        targetUserId: selectedUserId,
        offboardingType,
        reason: offboardingReason.trim(),
        effectiveDate,
        handoverDeadline: handoverDeadline || undefined,
        pendingTasks: pendingTasks.trim() || undefined,
        documentationStatus,
        transferToUserId: proposedSuccessorId || undefined,
        projectTransfers: projectTransfers.length > 0 ? projectTransfers : undefined,
      };

      const result = await offboardingApprovalApi.createRequest(payload);
      navigate(`/admin/offboarding-approvals/${result.id}`);
    } catch (err: any) {
      console.error('Failed to create offboarding request:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to create offboarding request.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center space-x-3">
 
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Create Offboarding Request
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/offboarding-approvals')}
            disabled={isSubmitting}
            className="text-sm font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedUserId}
            className="bg-[#244A70] hover:bg-[#1B3856] text-white text-sm font-semibold shadow-xs"
          >
            {isSubmitting ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit Request
          </Button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start space-x-3">
          <div className="w-5 h-5 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
            !
          </div>
          <div>
            <h4 className="text-sm font-semibold">Action Required</h4>
            <p className="text-sm mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ══════════════════════════════════════════════════
            SECTION 1: TARGET INTERNAL STAFF MEMBER SELECTION
           ══════════════════════════════════════════════════ */}
        <div className="bg-white border border-[#DCE3EC] rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="border-b border-[#DCE3EC] pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#244A70] text-white flex items-center justify-center font-bold text-xs">
                1
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#17263A] uppercase tracking-wider">
                  Target Internal Staff Member *
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loadingRoster && (
                <span className="inline-flex items-center text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-medium">
                  <Clock className="w-3.5 h-3.5 mr-1 animate-spin" /> Loading staff roster...
                </span>
              )}
              {selectedStaff && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Staff Selected: {selectedStaff.fullName}
                </span>
              )}
            </div>
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
              value={selectedUserId}
              onChange={(e) => handleSelectStaffId(e.target.value)}
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
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
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
            <div className="lg:col-span-8 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-[#17263A] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#244A70]" />
                  <span>Eligible Internal Staff Roster</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#244A70] border border-blue-200">
                    {filteredStaff.length} Employees
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
                        const isSelected = selectedUserId === staff.id;
                        const activeLoadInfo = workloadLevel(staff.activeWorkload);
                        const skills = getStaffSpecializations(staff.id, idx);

                        return (
                          <tr
                            key={staff.id}
                            data-testid={`offboarding-staff-card-${staff.id}`}
                            onClick={() => handleSelectStaffId(staff.id)}
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
                                  <div className="font-bold text-[#17263A] text-xs">{staff.fullName}</div>
                                  <div className="text-[10px] text-[#8491A3] font-mono">{staff.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Department */}
                            <td className="py-2.5 px-2 text-[#17263A] text-[11px]">{staff.department}</td>

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
                                    handleSelectStaffId(staff.id);
                                  }}
                                  className="px-2.5 py-1 bg-white border border-[#DCE3EC] hover:border-[#244A70] text-[#17263A] hover:text-[#244A70] rounded text-[11px] font-medium transition-colors cursor-pointer"
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
                      Showing {startIndex + 1} to {endIndex} of {filteredStaff.length} employees
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
                        {selectedStaff.employeeCode || `EMP-${selectedStaff.id.slice(-6).toUpperCase()}`}
                      </div>
                    </div>
                  </div>

                  {/* Attributes breakdown */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Department:</span>
                      <span className="font-medium text-[#17263A]">{selectedStaff.department}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Baseline Role:</span>
                      <span className="font-semibold text-slate-800">{selectedStaff.role}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Workload Capacity:</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${workloadLevel(selectedStaff.activeWorkload).className}`}
                      >
                        {workloadLevel(selectedStaff.activeWorkload).label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 text-[#244A70]">
                      <span className="font-medium">Active Deliverables:</span>
                      <span className="font-bold">
                        {liveSummary ? (liveSummary.assignedProjects || []).length : selectedStaff.activeWorkload} projects
                      </span>
                    </div>
                  </div>

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

                  {/* Live impact summary pills */}
                  {loadingSummary && (
                    <div className="p-2 rounded bg-blue-50 text-blue-700 text-[11px] flex items-center gap-1.5 animate-pulse">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading offboarding impact analysis...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-slate-600">No staff member selected</p>
                  <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                    Select a staff member from the directory or dropdown to view their profile.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: OFFBOARDING DETAILS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative z-20">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
              2
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Offboarding Details</h3>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Offboarding Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={offboardingType}
                  onChange={(e) => setOffboardingType(e.target.value as OffboardingType)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15"
                >
                  <option value="Resignation">Resignation (Employee Voluntary Departure)</option>
                  <option value="Contract Expiration">Contract Expiration (Fixed-term completed)</option>
                  <option value="Internal Transfer">Internal Transfer (Department/Role reassignment)</option>
                  <option value="Termination">Termination (Involuntary separation)</option>
                  <option value="Retirement">Retirement</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Effective Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Offboarding Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={offboardingReason}
                onChange={(e) => setOffboardingReason(e.target.value)}
                placeholder="Provide a formal justification for initiating this offboarding request (e.g. End of 12-month modernization consultant contract)..."
                required
                className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center space-x-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <Users className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="text-xs text-slate-500 block">Requested By</span>
                  <span className="font-semibold text-slate-800">
                    {actor?.fullName || actor?.email || 'Operations Admin'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <Calendar className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="text-xs text-slate-500 block">Request Date</span>
                  <span className="font-semibold text-slate-800">{todayStr}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: PROJECT & RESOURCE IMPACT */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative z-10">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                3
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Project & Resource Impact</h3>
              </div>
            </div>
            {liveSummary && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {(liveSummary.assignedProjects || []).length} Assigned Project(s)
              </span>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Metric Overview Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/40 flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">
                    Active Modernization Projects
                  </span>
                  <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                    {liveSummary ? (liveSummary.assignedProjects || []).length : '-'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/40 flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">
                    Active User Sessions
                  </span>
                  <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                    {liveSummary ? liveSummary.activeSessionsCount : '-'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-purple-200/80 bg-purple-50/40 flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">
                    API Credentials / Tokens
                  </span>
                  <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                    {liveSummary ? liveSummary.apiCredentialsCount : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Assigned Projects Table */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Assigned Modernization Projects</h4>
              {!liveSummary || (liveSummary.assignedProjects || []).length === 0 ? (
                <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    {liveSummary
                      ? 'No active projects assigned to this staff member'
                      : 'Search and select an employee above to inspect their active project assignments.'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    No open conversion deliverables will be disrupted by offboarding.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Project Name & Code</th>
                        <th className="px-4 py-3">Current Assignment</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Successor Assignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(liveSummary.assignedProjects || []).map((proj: any) => {
                        const currentVal = projectSuccessors[proj.id] || proposedSuccessorId || '';
                        return (
                          <tr key={proj.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-900 block">{proj.name}</span>
                              <span className="text-xs font-mono text-slate-500">
                                {proj.code || proj.id.slice(-8).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                {proj.role || 'Conversion Lead'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                {proj.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={currentVal}
                                onChange={(e) => handleProjectSuccessorChange(proj.id, e.target.value)}
                                className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#244A70] focus:outline-none"
                              >
                                <option value="">-- Inherit Proposed Successor --</option>
                                {eligibleSuccessors.map((cand: any) => (
                                  <option key={cand.id} value={cand.id}>
                                    {cand.fullName} ({cand.email})
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 4: HANDOVER PLAN */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative z-0">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
              4
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Handover Plan</h3>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Proposed Primary Successor
                </label>
                <select
                  value={proposedSuccessorId}
                  onChange={(e) => setProposedSuccessorId(e.target.value)}
                  disabled={!selectedUserId || eligibleSuccessors.length === 0}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {!selectedUserId
                      ? '-- Select an employee first to view eligible successors --'
                      : eligibleSuccessors.length === 0
                      ? '-- No candidate successors available --'
                      : '-- Select a primary successor staff member --'}
                  </option>
                  {eligibleSuccessors.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.email}) - {s.roles?.join(', ') || 'Staff'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Responsible for receiving project handovers, documents, and ongoing responsibilities.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Handover Deadline
                </label>
                <input
                  type="date"
                  value={handoverDeadline}
                  onChange={(e) => setHandoverDeadline(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Date by which all documentation and task handovers must be completed.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Documentation Status
                </label>
                <select
                  value={documentationStatus}
                  onChange={(e) => setDocumentationStatus(e.target.value as DocumentationStatus)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15"
                >
                  <option value="In Progress">In Progress (Documentation being prepared)</option>
                  <option value="Not Started">Not Started (Pending handover kickoff)</option>
                  <option value="Completed">Completed (All documentation uploaded)</option>
                  <option value="Not Required">Not Required (No specialized documentation)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Pending Tasks & Deliverables
                </label>
                <textarea
                  rows={2}
                  value={pendingTasks}
                  onChange={(e) => setPendingTasks(e.target.value)}
                  placeholder="e.g. Finish AST review on Cobol batch module; merge pull request #142..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
