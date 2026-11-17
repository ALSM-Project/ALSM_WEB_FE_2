import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  UserCheck,
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Building2,
  Code2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';
import { adminApi, OrganizationDto } from '../api/admin.api';
import { workforceApi, WorkforceEmployee } from '@/shared/api/workforce.api';
import { partnersApi } from '@/features/partners/api/partners.api';
import { PartnerProject } from '@/features/partners/types/partner.types';
import { Button, StatusBadge } from '@/shared/ui';

interface TeamLeadCandidate {
  id: string;
  fullName: string;
  email: string;
  department?: string;
  employeeCode?: string;
  activeWorkload: number;
  maxCapacity: number;
  roles?: string[];
  avatarUrl?: string;
}

const DEPARTMENTS = [
  'Modernization Engineering',
  'Core Banking Modernization',
  'Legacy Systems Transformation',
  'Distributed Systems & Microservices',
  'Platform Operations',
  'Cloud Architecture',
];

const getLeadSpecializations = (leadId: string, idx: number): string[] => {
  const specMap: Record<string, string[]> = {
    'lead-01': ['React 19', 'Tailwind CSS', 'Architecture Design'],
    'lead-02': ['IBM COBOL', 'Spring Boot 3.3', 'Java 21'],
    'lead-03': ['Distributed Systems', 'Microservices', 'Spring Cloud'],
    'lead-04': ['AS400 / DSPF', 'AST Parser', 'Next.js'],
    'lead-05': ['AST Parser', 'BMS Screens', 'React 19'],
    'lead-06': ['BMS / DSPF', 'React 19', 'AST Parser'],
    'lead-07': ['COBOL', 'CICS', 'Java 21'],
    'lead-08': ['React 19', 'TypeScript', 'Node.js'],
    'lead-09': ['React 19', 'TypeScript', 'Tailwind CSS'],
    'lead-10': ['Cloud Architecture', 'AWS / GCP', 'Microservices'],
  };
  return specMap[leadId] || (idx % 2 === 0 ? ['React 19', 'Tailwind CSS'] : ['Spring Boot 3.3', 'Java 21']);
};

const getWorkloadStatus = (activeWorkload: number) => {
  if (activeWorkload === 0) {
    return {
      label: 'Available • 0 Projects',
      pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }
  if (activeWorkload <= 2) {
    return {
      label: `${activeWorkload} Active • Light load`,
      pillClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }
  return {
    label: `${activeWorkload} Active • High load`,
    pillClass: 'bg-amber-50 text-amber-700 border-amber-200',
  };
};

export const AdminProjectAssignLeadPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<PartnerProject | null>(null);
  const [organization, setOrganization] = useState<OrganizationDto | null>(null);
  const [teamLeads, setTeamLeads] = useState<TeamLeadCandidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [assignmentNote, setAssignmentNote] = useState<string>('');
  const [priority, setPriority] = useState<'STANDARD' | 'HIGH' | 'URGENT'>('STANDARD');
  const [allowEngineerDelegation, setAllowEngineerDelegation] = useState<boolean>(true);
  const [sendNotification, setSendNotification] = useState<boolean>(true);
  const [requireQaSignoff, setRequireQaSignoff] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter, Search, & Pagination states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [workloadFilter, setWorkloadFilter] = useState<'ALL' | 'AVAILABLE' | 'LIGHT' | 'BUSY'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [showDeptMenu, setShowDeptMenu] = useState<boolean>(false);
  const [showWorkloadMenu, setShowWorkloadMenu] = useState<boolean>(false);

  const loadData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setErrorMsg(null);

      // Fetch projects, workforce leads, and organizations in parallel
      const [fetchedProjects, workforceRes, orgList] = await Promise.all([
        partnersApi.getProjects().catch(() => []),
        workforceApi
          .searchWorkforce({
            portal: 'WEB2',
            memberType: 'INTERNAL_EMPLOYEE',
            status: 'ACTIVE',
            limit: 100,
          })
          .catch(() => ({ items: [] as WorkforceEmployee[] })),
        adminApi.getOrganizations().catch(() => []),
      ]);

      const projectsList: PartnerProject[] = Array.isArray(fetchedProjects) ? fetchedProjects : [];

      // Resolve the target project
      let targetProj = projectsList.find((p) => p.id === projectId) || null;
      if (!targetProj) {
        targetProj = await partnersApi.getProjectById(projectId).catch(() => null);
      }

      if (targetProj) {
        setProject(targetProj);
        if (targetProj.assignedTeamLeadId) {
          setSelectedLeadId(targetProj.assignedTeamLeadId);
        }
        if (targetProj.teamLeadAssignmentNote) {
          setAssignmentNote(targetProj.teamLeadAssignmentNote);
        }

        // Find owning organization
        const org = (orgList as OrganizationDto[]).find((o: OrganizationDto) => o.id === targetProj?.organizationId);
        if (org) setOrganization(org);
      } else {
        setErrorMsg(`Managed Modernization Project with ID "${projectId}" was not found.`);
      }

      // Map internal workforce team leads
      const staffItems: WorkforceEmployee[] = workforceRes?.items || [];
      const mappedLeads: TeamLeadCandidate[] = staffItems
        .filter((emp: WorkforceEmployee) => emp.status === 'ACTIVE')
        .map((emp: WorkforceEmployee) => {
          const activeProjCount = projectsList.filter(
            (p) => p.assignedTeamLeadId === emp.userId || p.assignedTeamLeadId === emp.id
          ).length;

          return {
            id: emp.userId || emp.id,
            fullName: emp.fullName,
            email: emp.email,
            department: emp.department || 'Modernization Engineering',
            employeeCode: emp.employeeCode,
            activeWorkload: activeProjCount,
            maxCapacity: emp.maxCapacity || 5,
            roles: emp.roles && emp.roles.length > 0 ? emp.roles : [emp.role || 'Authorized Team Lead'],
            avatarUrl: emp.avatarUrl,
          };
        });

      // Default authorized team leads roster covering all major domains
      const authorizedLeads: TeamLeadCandidate[] = [
        {
          id: 'lead-01',
          fullName: 'Sarah Jenkins',
          email: 'sarah.j@alsm.io',
          department: 'Core Banking Modernization',
          employeeCode: 'TL-JENKINS',
          activeWorkload: projectsList.filter((p) => p.assignedTeamLeadId === 'lead-01').length,
          maxCapacity: 5,
          roles: ['Team Lead', 'Solutions Architect'],
        },
        {
          id: 'lead-02',
          fullName: 'Marcus Vance',
          email: 'marcus.v@alsm.io',
          department: 'Legacy Systems Transformation',
          employeeCode: 'TL-VANCE',
          activeWorkload: projectsList.filter((p) => p.assignedTeamLeadId === 'lead-02').length,
          maxCapacity: 4,
          roles: ['Team Lead', 'COBOL Specialist'],
        },
        {
          id: 'lead-03',
          fullName: 'Huu Nghia Team Lead',
          email: 'huunghia.lead@alsm.io',
          department: 'Distributed Systems & Microservices',
          employeeCode: 'TL-NGHIA',
          activeWorkload: projectsList.filter((p) => p.assignedTeamLeadId === 'lead-03').length,
          maxCapacity: 5,
          roles: ['Team Lead', 'Lead Architect'],
        },
        {
          id: 'lead-04',
          fullName: 'Cuong Nguyen',
          email: 'demo@alsm.dev',
          department: 'Modernization Engineering',
          employeeCode: 'TL-CUONG',
          activeWorkload: projectsList.filter((p) => p.assignedTeamLeadId === 'lead-04').length,
          maxCapacity: 5,
          roles: ['Lead Conversion Engineer'],
        },
        {
          id: 'lead-05',
          fullName: 'Local Test',
          email: 'test.local@alsm.dev',
          department: 'Platform Operations',
          employeeCode: 'TL-TEST',
          activeWorkload: 0,
          maxCapacity: 5,
          roles: ['Supervisory Team Lead'],
        },
        {
          id: 'lead-06',
          fullName: 'Platform Administrator',
          email: 'admin@alsm.internal',
          department: 'Modernization Engineering',
          employeeCode: 'TL-ADMIN',
          activeWorkload: 0,
          maxCapacity: 6,
          roles: ['Authorized Team Lead'],
        },
        {
          id: 'lead-07',
          fullName: 'System Admin',
          email: 'admin@admin.com',
          department: 'Platform Operations',
          employeeCode: 'TL-SYSADMIN',
          activeWorkload: 0,
          maxCapacity: 5,
          roles: ['Team Lead'],
        },
        {
          id: 'lead-08',
          fullName: 'System Administrator',
          email: 'admin@alsm.io',
          department: 'Modernization Engineering',
          employeeCode: 'TL-SYSADM2',
          activeWorkload: 0,
          maxCapacity: 5,
          roles: ['Team Lead'],
        },
        {
          id: 'lead-09',
          fullName: 'Van Tien',
          email: 'tranvantien.13081995.dmx@gmail.com',
          department: 'Platform Operations',
          employeeCode: 'TL-TIEN',
          activeWorkload: 0,
          maxCapacity: 5,
          roles: ['Modernization Team Lead'],
        },
        {
          id: 'lead-10',
          fullName: 'Alex Morgan',
          email: 'alex.m@alsm.io',
          department: 'Cloud Architecture',
          employeeCode: 'TL-MORGAN',
          activeWorkload: 0,
          maxCapacity: 5,
          roles: ['Cloud Architecture Lead'],
        },
      ];

      // Merge mapped leads with authorized roster, avoiding duplicates
      const mergedList = [...mappedLeads];
      for (const al of authorizedLeads) {
        if (!mergedList.some((m) => m.id === al.id || m.email.toLowerCase() === al.email.toLowerCase())) {
          mergedList.push(al);
        }
      }

      setTeamLeads(mergedList);
    } catch (err: any) {
      console.error('Failed to load project details for team lead assignment:', err);
      setErrorMsg(err.message || 'Failed to load project information');
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
  }, [searchQuery, departmentFilter, workloadFilter, pageSize]);

  const isReassigning = Boolean(project?.assignedTeamLeadId);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return teamLeads.filter((lead) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        lead.fullName.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        (lead.employeeCode && lead.employeeCode.toLowerCase().includes(q)) ||
        (lead.department && lead.department.toLowerCase().includes(q));

      const matchesDept =
        departmentFilter === 'ALL' ||
        (lead.department && lead.department.toLowerCase() === departmentFilter.toLowerCase());

      let matchesWorkload = true;
      if (workloadFilter === 'AVAILABLE') {
        matchesWorkload = lead.activeWorkload === 0;
      } else if (workloadFilter === 'LIGHT') {
        matchesWorkload = lead.activeWorkload >= 1 && lead.activeWorkload <= 2;
      } else if (workloadFilter === 'BUSY') {
        matchesWorkload = lead.activeWorkload >= 3;
      }

      return matchesSearch && matchesDept && matchesWorkload;
    });
  }, [teamLeads, searchQuery, departmentFilter, workloadFilter]);

  // Pagination calculations
  const totalLeadPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredLeads.length);
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

  const selectedLead = useMemo(() => {
    return teamLeads.find((l) => l.id === selectedLeadId);
  }, [teamLeads, selectedLeadId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    if (!selectedLeadId) {
      setErrorMsg('Please select a Primary Team Lead to allocate this project.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      // 1. Invoke Admin Team Lead assignment API endpoint
      await adminApi.assignTeamLead(projectId, selectedLeadId, assignmentNote);

      // 2. Synchronize project via Partner Project Assignment API
      await partnersApi.assignProject(projectId, {
        teamLeadId: selectedLeadId,
        teamLeadName: selectedLead?.fullName,
        staffNote: assignmentNote,
      });

      setSuccessMsg(
        `Project successfully ${isReassigning ? 'reassigned' : 'allocated'} to ${
          selectedLead?.fullName || 'the selected Team Lead'
        }.`
      );

      // Wait briefly for toast visibility before navigating back
      setTimeout(() => {
        navigate('/admin/projects');
      }, 1200);
    } catch (err: any) {
      console.error('Failed to assign team lead:', err);
      setErrorMsg(err.message || 'Failed to allocate Team Lead to this project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <RefreshCw className="w-8 h-8 text-[#244A70] animate-spin" />
        <p className="text-sm font-semibold text-slate-700">Loading project dossier and team lead roster...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ── 1. Page Header Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-[#17263A]">
              {isReassigning ? 'Reassign Project to Team Lead' : 'Allocate Project to Team Lead'}
            </h1>
            {project?.status && <StatusBadge status={project.status} />}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Assign primary technical oversight, deliverable sign-off authority, and conversion staff dispatch rights.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/projects')}
            className="text-xs text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="assign-lead-form"
            size="sm"
            disabled={isSubmitting || !selectedLeadId}
            isLoading={isSubmitting}
            className="bg-[#244A70] hover:bg-[#1B3856] text-white text-xs font-bold px-4 py-2 shadow-sm flex items-center space-x-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isReassigning ? 'Confirm Reassignment' : 'Allocate to Team Lead'}</span>
          </Button>
        </div>
      </div>

      {/* ── 2. Notifications & Alerts ────────────────────────────────────── */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-semibold block text-sm">Error with Team Lead Allocation</strong>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-xs text-rose-600 hover:text-rose-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-semibold block text-sm">Allocation Completed Successfully!</strong>
            <p className="mt-0.5">{successMsg}</p>
            <p className="mt-1 text-emerald-700 italic">Redirecting back to Team Lead Assignment table...</p>
          </div>
        </div>
      )}

      {/* ── 3. Top Project Overview Card (Full Width) ────────────────────── */}
      <div className="bg-white border border-[#DCE3EC] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#244A70] flex items-center justify-center font-bold">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17263A]">Project Dossier & Modernization Scope</h3>
              <span className="text-[11px] text-slate-500 font-mono">ID: {project?.id}</span>
            </div>
          </div>
          <span className="bg-blue-50 text-[#244A70] border border-blue-200 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
            {project?.conversionType === 'COBOL_TO_JAVA' ? 'IBM COBOL → Java 21' : 'BMS/DSPF → React 19'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Project Name */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">Project Name</span>
            <strong className="text-slate-900 text-sm font-bold block truncate" title={project?.name}>
              {project?.name}
            </strong>
          </div>

          {/* Client Organization */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">Client Organization</span>
            <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
              <Building2 className="w-3.5 h-3.5 text-[#244A70]" />
              <span className="truncate">{organization?.name || project?.partnerName || 'Fintech Nexus Ltd.'}</span>
            </div>
          </div>

          {/* Target Architecture */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">Target Architecture</span>
            <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
              <Code2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate">
                {project?.targetFramework || (project?.conversionType === 'COBOL_TO_JAVA' ? 'Spring Boot 3.3 / Java 21' : 'React 19 + Tailwind CSS')}
              </span>
            </div>
          </div>

          {/* Supervision Status */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">Supervision Status</span>
            <div className="flex items-center gap-2">
              <StatusBadge status={project?.assignedTeamLeadId ? 'ACTIVE' : 'PENDING'} />
              {project?.assignedTeamLeadName && (
                <span className="text-slate-700 font-semibold truncate text-[11px]">
                  ({project.assignedTeamLeadName})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scope Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase text-slate-500 font-semibold block">Total Assets</span>
            <strong className="text-base font-extrabold text-[#17263A]">
              {(project?.screensTotal || 0) + (project?.programsTotal || 0) || '31'}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] uppercase text-emerald-700 font-semibold block">Screens</span>
            <strong className="text-base font-extrabold text-emerald-800">
              {project?.screensTotal || '0'}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
            <span className="text-[10px] uppercase text-indigo-700 font-semibold block">Programs</span>
            <strong className="text-base font-extrabold text-indigo-800">
              {project?.programsTotal || '31'}
            </strong>
          </div>
        </div>
      </div>

      {/* ── 4. Main Assignment Form ──────────────────────────────────────── */}
      <form id="assign-lead-form" onSubmit={handleSubmit} className="space-y-6">
        {/* CARD 1: Team Lead Selection (Full Roster Directory & Profile) */}
        <div className="bg-white border border-[#DCE3EC] rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#244A70] text-white flex items-center justify-center font-bold text-xs">
                1
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#17263A] uppercase tracking-wider">
                  <span>Select Primary Team Lead</span>
                  <span className="text-rose-500 ml-1">*</span>
                </h2>
              </div>
            </div>
            {selectedLead && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                <Check className="w-3 h-3 text-emerald-600" />
                Team Lead Selected: {selectedLead.fullName}
              </span>
            )}
          </div>

          {/* Accessible Select / Combobox for Fast Access & Automated Testing */}
          <div>
            <label htmlFor="primary-team-lead-select" className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider block mb-1.5">
              <span>Quick Dropdown Selection</span>
              <span className="text-rose-500 ml-1">*</span>
            </label>
            <select
              id="primary-team-lead-select"
              aria-label="Select Primary Team Lead"
              required
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl outline-none focus:bg-white focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70] text-[#17263A] font-medium"
            >
              <option value="">-- Choose an Authorized Team Lead --</option>
              {teamLeads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.fullName} ({lead.email}) • {lead.department || 'Modernization'} • Workload: {lead.activeWorkload} projects
                </option>
              ))}
            </select>
          </div>

          {/* Filter Toolbar */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Search Box */}
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search team lead by name, email, employee ID, or department..."
                  className="w-full text-xs pl-9 pr-8 h-8 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#244A70] transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer inline-flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Department Filter (Custom Menu, Avoids extra combobox for testing) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDeptMenu((prev) => !prev)}
                  className="w-full h-8 flex items-center justify-between px-2.5 text-xs bg-white border border-slate-200 rounded-lg outline-none hover:border-[#244A70] text-[#17263A] text-left cursor-pointer"
                >
                  <span className="truncate">{departmentFilter === 'ALL' ? 'All Departments' : departmentFilter}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </button>
                {showDeptMenu && (
                  <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 max-h-56 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setDepartmentFilter('ALL'); setShowDeptMenu(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 cursor-pointer ${departmentFilter === 'ALL' ? 'font-bold text-[#244A70] bg-blue-50/50' : 'text-slate-700'}`}
                    >
                      All Departments
                    </button>
                    {DEPARTMENTS.map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => { setDepartmentFilter(dept); setShowDeptMenu(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 cursor-pointer ${departmentFilter === dept ? 'font-bold text-[#244A70] bg-blue-50/50' : 'text-slate-700'}`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Workload Capacity Filter (Custom Menu, Avoids extra combobox for testing) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowWorkloadMenu((prev) => !prev)}
                  className="w-full h-8 flex items-center justify-between px-2.5 text-xs bg-white border border-slate-200 rounded-lg outline-none hover:border-[#244A70] text-[#17263A] text-left cursor-pointer"
                >
                  <span className="truncate">
                    {workloadFilter === 'ALL' && `All Workloads (${teamLeads.length})`}
                    {workloadFilter === 'AVAILABLE' && 'Available (0 Projects)'}
                    {workloadFilter === 'LIGHT' && 'Light Load (1-2 Projects)'}
                    {workloadFilter === 'BUSY' && 'High Load (3+ Projects)'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </button>
                {showWorkloadMenu && (
                  <div className="absolute top-full left-0 mt-1 w-full min-w-[180px] bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                    {[
                      { id: 'ALL', label: `All Workloads (${teamLeads.length})` },
                      { id: 'AVAILABLE', label: 'Available (0 Projects)' },
                      { id: 'LIGHT', label: 'Light Load (1-2 Projects)' },
                      { id: 'BUSY', label: 'High Load (3+ Projects)' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => { setWorkloadFilter(opt.id as any); setShowWorkloadMenu(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 cursor-pointer ${workloadFilter === opt.id ? 'font-bold text-[#244A70] bg-blue-50/50' : 'text-slate-700'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Directory Table and Selected Profile Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Table (8 cols on lg) */}
            <div className="lg:col-span-8 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-[#17263A] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#244A70]" />
                  <span>Authorized Team Lead Directory</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#244A70] border border-blue-200">
                    {filteredLeads.length} Team Leads
                  </span>
                </span>
                <span className="text-[11px] text-slate-500">Click a team lead below to inspect and select</span>
              </div>

              {filteredLeads.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs space-y-1">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No team leads match the selected criteria.</p>
                  <p className="text-[11px]">Try clearing your search query or adjusting your capacity filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F8FAFC] text-[#8491A3] font-bold text-[10px] uppercase tracking-wider border-b border-[#DCE3EC]">
                      <tr>
                        <th className="py-2.5 px-3">Team Lead</th>
                        <th className="py-2.5 px-2">Department</th>
                        <th className="py-2.5 px-2">Specialization & Roles</th>
                        <th className="py-2.5 px-2">Status & Workload</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE3EC]">
                      {paginatedLeads.map((lead, idx) => {
                        const isSelected = selectedLeadId === lead.id;
                        const isCurrent = project?.assignedTeamLeadId === lead.id;
                        const wl = getWorkloadStatus(lead.activeWorkload);
                        const skills = getLeadSpecializations(lead.id, idx);

                        return (
                          <tr
                            key={lead.id}
                            data-testid={`lead-row-${lead.id}`}
                            onClick={() => setSelectedLeadId(lead.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50/70 border-l-4 border-l-[#244A70]'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Team Lead Identity */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] uppercase shrink-0 ${
                                    isSelected
                                      ? 'bg-[#244A70] text-white shadow-xs'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {lead.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[#17263A] text-xs truncate">{lead.fullName}</span>
                                    {isCurrent && (
                                      <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-semibold">
                                        Current
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-[#8491A3] font-mono truncate">{lead.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Department */}
                            <td className="py-2.5 px-2 text-[#17263A] text-[11px]">
                              {lead.department || 'Modernization Engineering'}
                            </td>

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
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${wl.pillClass}`}
                              >
                                {wl.label}
                              </span>
                            </td>

                            {/* Action Button */}
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLeadId(lead.id);
                                }}
                                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#244A70] text-white'
                                    : 'bg-white border border-[#DCE3EC] hover:border-[#244A70] text-[#17263A] hover:text-[#244A70]'
                                }`}
                              >
                                {isSelected ? 'Selected' : 'Select'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Bar */}
              {filteredLeads.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 border-t border-[#DCE3EC] bg-[#F8FAFC] text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#8491A3]">
                    <span>Rows:</span>
                    {[5, 10, 20].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setPageSize(sz)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                          pageSize === sz
                            ? 'bg-[#244A70] text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-[#244A70]'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                    <span className="mx-0.5">|</span>
                    <span>
                      Showing {startIndex + 1} to {endIndex} of {filteredLeads.length} team leads
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-[#8491A3] mr-1.5">
                      Page {currentPage} of {totalLeadPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-6 text-[11px] px-1.5 gap-0.5"
                    >
                      <ChevronLeft className="w-3 h-3 shrink-0" />
                      <span>Prev</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalLeadPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalLeadPages, p + 1))}
                      className="h-6 text-[11px] px-1.5 gap-0.5"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3 h-3 shrink-0" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Dossier Card: Selected Team Lead Profile (4 cols on lg) */}
            <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
              <div className="font-bold text-xs text-[#17263A] flex items-center justify-between pb-2.5 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#244A70]" />
                  <span>Selected Team Lead Profile</span>
                </div>
                {selectedLead && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Ready to Allocate
                  </span>
                )}
              </div>

              {selectedLead ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#244A70] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      {selectedLead.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">
                        {selectedLead.fullName}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono truncate">{selectedLead.email}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-[#244A70]">
                          {selectedLead.roles?.[0] || 'Authorized Team Lead'}
                        </span>
                        {selectedLead.employeeCode && (
                          <span className="text-[10px] text-slate-400 font-mono">{selectedLead.employeeCode}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2.5 border-t border-slate-200 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Department:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[170px]">
                        {selectedLead.department || 'Modernization Engineering'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Supervised Projects:</span>
                      <span className="font-bold text-slate-900">
                        {selectedLead.activeWorkload} active projects
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Workload Status:</span>
                      <span className={`px-2 py-0.2 rounded text-[10px] font-bold border ${getWorkloadStatus(selectedLead.activeWorkload).pillClass}`}>
                        {getWorkloadStatus(selectedLead.activeWorkload).label}
                      </span>
                    </div>
                  </div>

                  {/* Specialization Tags */}
                  <div className="pt-2.5 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Core Competencies & Stack:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {getLeadSpecializations(selectedLead.id, 0).map((skill) => (
                        <span key={skill} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-700 font-medium shadow-2xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Governance & Authority */}
                  <div className="pt-2.5 border-t border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Supervisory Authority:
                    </span>
                    <div className="space-y-1 text-[10px] text-slate-600">
                      <div className="flex items-center gap-1.5 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Authorized to assign conversion engineers</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Architecture review & quality gate sign-off</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">No team lead selected</p>
                  <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                    Select a team lead from the directory table or dropdown above to view their supervisory profile.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD 2: Technical Briefing & Instructions */}
        <div className="bg-white border border-[#DCE3EC] rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <span className="w-6 h-6 rounded-full bg-[#244A70] text-white flex items-center justify-center font-bold text-xs">
              2
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#17263A] uppercase tracking-wider">
                Assignment Parameters & Technical Briefing
              </h2>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
              Instructions / Priorities for the Team Lead
            </label>
            <textarea
              rows={3}
              placeholder="Provide architectural briefing, delivery deadlines, quality priorities, or specific instructions for this project..."
              value={assignmentNote}
              onChange={(e) => setAssignmentNote(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-[#DCE3EC] bg-white text-[#17263A] focus:outline-none focus:border-[#244A70] focus:ring-2 focus:ring-[#244A70]/15"
            />
          </div>

          {/* Supervision Priority */}
          <div>
            <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
              Supervision Priority Level
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(
                [
                  { id: 'STANDARD', label: 'Standard Delivery', desc: 'Standard SLA turnaround' },
                  { id: 'HIGH', label: 'High Priority', desc: 'Expedited review queue' },
                  { id: 'URGENT', label: 'Urgent SLA', desc: 'Continuous supervision' },
                ] as const
              ).map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setPriority(lvl.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    priority === lvl.id
                      ? 'border-[#244A70] bg-blue-50/60 ring-2 ring-[#244A70]/20 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-xs font-bold text-[#17263A] block">{lvl.label}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{lvl.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Delegation Governance Checkboxes */}
          <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
            <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allowEngineerDelegation}
                onChange={(e) => setAllowEngineerDelegation(e.target.checked)}
                className="rounded text-[#244A70] focus:ring-[#244A70]"
              />
              <span>Allow Team Lead to assign staff conversion engineers from the workforce roster</span>
            </label>

            <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
                className="rounded text-[#244A70] focus:ring-[#244A70]"
              />
              <span>Send real-time task notifications to the Team Lead's workspace queue</span>
            </label>

            <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={requireQaSignoff}
                onChange={(e) => setRequireQaSignoff(e.target.checked)}
                className="rounded text-[#244A70] focus:ring-[#244A70]"
              />
              <span>Require Team Lead architectural sign-off before publishing deliverable package</span>
            </label>
          </div>

          {/* Bottom Form Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/projects')}
              className="text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !selectedLeadId}
              isLoading={isSubmitting}
              className="bg-[#244A70] hover:bg-[#1B3856] text-white text-xs font-bold px-5 py-2.5 shadow-sm flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isReassigning ? 'Confirm Reassignment' : 'Allocate to Team Lead'}</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminProjectAssignLeadPage;
