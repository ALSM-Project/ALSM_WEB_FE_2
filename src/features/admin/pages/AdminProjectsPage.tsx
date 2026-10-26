import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FolderKanban, UserCheck, Search, RefreshCw, 
  AlertCircle, CheckCircle2, Building2, ExternalLink,
  Users, ShieldAlert, Check, ArrowRightLeft
} from 'lucide-react';
import { adminApi } from '../api/admin.api';
import { rbacApi, UserRbacDto } from '@/features/rbac/api/rbac.api';
import { partnersApi } from '@/features/partners/api/partners.api';
import { Button, Modal, Input } from '@/shared/ui';
import { StatusBadge } from '@/shared/ui/Badge';
import { ResourceTransferModal, CandidateAssignee } from '../components/ResourceTransferModal';

export interface UnifiedProjectItem {
  id: string;
  name: string;
  description?: string;
  conversionType?: 'BMS_DSPF_TO_FRONTEND' | 'COBOL_TO_JAVA';
  partnerId?: string;
  partnerName?: string;
  organizationId: string;
  targetFramework?: string;
  status: string;
  assignedTeamLeadId?: string;
  assignedTeamLeadName?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  screensTotal?: number;
  screensCompleted?: number;
  programsTotal?: number;
  programsCompleted?: number;
  isDemo?: boolean;
  createdAt: string;
  lastUpdated?: string;
}

export const AdminProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<UnifiedProjectItem[]>([]);
  const [teamLeads, setTeamLeads] = useState<UserRbacDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [allocationFilter, setAllocationFilter] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED'>('ALL');
  const [pipelineFilter, setPipelineFilter] = useState<'ALL' | 'BMS_DSPF_TO_FRONTEND' | 'COBOL_TO_JAVA'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Assign Team Lead Modal
  const [assignTargetProject, setAssignTargetProject] = useState<UnifiedProjectItem | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [assigning, setAssigning] = useState<boolean>(false);
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  // Resource Ownership Transfer Modal (Section 2.C)
  const [transferTargetProject, setTransferTargetProject] = useState<UnifiedProjectItem | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Fetch partner projects and qualified users in parallel
      const [partnerProjects, fetchedUsers] = await Promise.all([
        partnersApi.getProjects(),
        rbacApi.getAllUsers().catch(() => []),
      ]);

      const allUsers: UserRbacDto[] = Array.isArray(fetchedUsers) ? fetchedUsers : [];
      const normalizedProjects: UnifiedProjectItem[] = (Array.isArray(partnerProjects) ? partnerProjects : []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        conversionType: p.conversionType,
        partnerId: p.partnerId,
        partnerName: p.partnerName,
        organizationId: p.organizationId || p.partnerId,
        targetFramework: p.targetFramework,
        status: p.status || 'IN_PROGRESS',
        assignedTeamLeadId: p.assignedTeamLeadId,
        assignedTeamLeadName: p.assignedTeamLeadName,
        assignedStaffId: p.assignedStaffId,
        assignedStaffName: p.assignedStaffName,
        screensTotal: p.screensTotal,
        screensCompleted: p.screensCompleted,
        programsTotal: p.programsTotal,
        programsCompleted: p.programsCompleted,
        createdAt: p.createdAt || new Date().toISOString(),
        lastUpdated: p.lastUpdated,
      }));

      setProjects(normalizedProjects);

      // Filter qualified Team Leads
      const leads = allUsers.filter((u) =>
        u.roles.some((r) =>
          r.toLowerCase().includes('lead') ||
          r.toLowerCase().includes('admin') ||
          r.toLowerCase().includes('manager')
        )
      );
      const fallbackLeads: UserRbacDto[] = [
        { id: 'lead-01', fullName: 'Sarah Jenkins', email: 'teamlead@alsm.io', roles: ['TEAM_LEAD'] } as any,
        { id: 'lead-02', fullName: 'David Chen', email: 'd.chen@alsm.io', roles: ['TEAM_LEAD'] } as any,
      ];
      setTeamLeads(leads.length > 0 ? leads : (allUsers.length > 0 ? allUsers : fallbackLeads));
    } catch (err: any) {
      console.error('Failed to load projects/team leads:', err);
      setErrorMsg(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAssignModal = (proj: UnifiedProjectItem) => {
    setAssignTargetProject(proj);
    setSelectedLeadId(proj.assignedTeamLeadId || '');
    setIsReassigning(!!proj.assignedTeamLeadId);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetProject || !selectedLeadId) return;

    try {
      setAssigning(true);
      const selectedLead = teamLeads.find((l) => l.id === selectedLeadId);
      const leadName = selectedLead?.fullName || 'Assigned Team Lead';

      // Verify the global assignment before changing the partner project store.
      await adminApi.assignTeamLead(assignTargetProject.id, selectedLeadId);
      await partnersApi.assignProject(assignTargetProject.id, {
        teamLeadId: selectedLeadId,
        teamLeadName: leadName,
      });

      setSuccessMsg(
        `Project "${assignTargetProject.name}" allocated to Team Lead ${leadName}. Workflow notification sent & audit logged (UC-3.13.3).`
      );
      setAssignTargetProject(null);
      await fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign project to Team Lead');
    } finally {
      setAssigning(false);
    }
  };

  // Metrics
  const totalProjectsCount = projects.length;
  const unassignedCount = projects.filter((p) => !p.assignedTeamLeadId).length;
  const assignedCount = projects.filter((p) => !!p.assignedTeamLeadId).length;
  const partnerProjectsCount = projects.length;

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.partnerName && p.partnerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.organizationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.assignedTeamLeadName && p.assignedTeamLeadName.toLowerCase().includes(searchTerm.toLowerCase()));

    const isAssigned = !!p.assignedTeamLeadId;
    const matchesAllocation =
      allocationFilter === 'ALL' ||
      (allocationFilter === 'UNASSIGNED' && !isAssigned) ||
      (allocationFilter === 'ASSIGNED' && isAssigned);

    const matchesPipeline =
      pipelineFilter === 'ALL' || p.conversionType === pipelineFilter;

    const matchesStatus =
      statusFilter === 'ALL' || (p.status || 'ACTIVE') === statusFilter;

    return matchesSearch && matchesAllocation && matchesPipeline && matchesStatus;
  });

  const transferCandidates: CandidateAssignee[] = teamLeads.map((tl) => {
    const activeCount = projects.filter((p) => p.assignedTeamLeadId === tl.id).length;
    return {
      id: tl.id,
      fullName: tl.fullName,
      email: tl.email,
      role: 'Team Lead',
      isActive: tl.isActive !== false,
      isLocked: !!tl.isLocked,
      activeWorkload: activeCount,
      maxCapacity: 5,
    };
  });

  const handleTransferConfirm = async (
    resourceId: string,
    newAssignee: CandidateAssignee,
    reason: string,
    _notes: string
  ) => {
    await adminApi.allocateProject(resourceId, {
      teamLeadId: newAssignee.id,
      teamLeadName: newAssignee.fullName,
    });
    setProjects((prev) =>
      prev.map((p) =>
        p.id === resourceId
          ? {
              ...p,
              assignedTeamLeadId: newAssignee.id,
              assignedTeamLeadName: newAssignee.fullName,
            }
          : p
      )
    );
    setSuccessMsg(
      `Resource ownership for project "${resourceId}" successfully transferred to ${newAssignee.fullName} (${reason}).`
    );
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5EAF0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF2FC] text-[#0652CC] uppercase tracking-wider">
              Administration & Governance
            </span>
            <span className="text-[11px] text-[#6B778C]">UC-3.13.3 Hierarchy Enforcement</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091E42] mt-1">
            Project Allocation & Team Lead Assignment
          </h1>
          <p className="text-xs text-[#6B778C] mt-1 max-w-3xl">
            Enterprise oversight to allocate incoming projects to qualified Team Leads. Team Leads subsequently assign tasks to Conversion Staff who execute work in the full-width workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/team-lead/projects"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EAF0] bg-white px-3.5 py-2 text-xs font-semibold text-[#091E42] shadow-2xs hover:bg-[#F4F6F8] transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-[#0652CC]" />
            Team Lead Workspace
          </Link>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EAF0] bg-white px-3.5 py-2 text-xs font-semibold text-[#091E42] shadow-2xs hover:bg-[#F4F6F8] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin text-[#0652CC]' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setAllocationFilter('ALL');
            setPipelineFilter('ALL');
            setStatusFilter('ALL');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setAllocationFilter('ALL');
              setPipelineFilter('ALL');
              setStatusFilter('ALL');
            }
          }}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all hover:border-[#0652CC] hover:shadow-md ${
            allocationFilter === 'ALL' && pipelineFilter === 'ALL' && statusFilter === 'ALL'
              ? 'border-[#0652CC] ring-2 ring-[#0652CC]/20 bg-blue-50/10'
              : 'border-[#E5EAF0]'
          }`}
          title="Click to view all projects"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B778C]">Total Enterprise Projects</span>
            <FolderKanban className="w-4 h-4 text-[#0652CC]" />
          </div>
          <div className="text-2xl font-bold text-[#091E42] mt-2">{totalProjectsCount}</div>
          <div className="text-[11px] text-[#6B778C] mt-1">Platform-wide modernization scope</div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setAllocationFilter('UNASSIGNED');
            setPipelineFilter('ALL');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setAllocationFilter('UNASSIGNED');
              setPipelineFilter('ALL');
            }
          }}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all hover:border-amber-500 hover:shadow-md bg-linear-to-b from-white to-amber-50/20 ${
            allocationFilter === 'UNASSIGNED'
              ? 'border-amber-500 ring-2 ring-amber-400/30'
              : 'border-amber-200'
          }`}
          title="Click to filter projects awaiting Team Lead allocation"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Awaiting Team Lead Allocation</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">{unassignedCount}</div>
          <div className="text-[11px] text-amber-700/80 mt-1">Immediate action required by Admin</div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setAllocationFilter('ASSIGNED');
            setPipelineFilter('ALL');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setAllocationFilter('ASSIGNED');
              setPipelineFilter('ALL');
            }
          }}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all hover:border-[#0652CC] hover:shadow-md ${
            allocationFilter === 'ASSIGNED'
              ? 'border-[#0652CC] ring-2 ring-[#0652CC]/20 bg-blue-50/10'
              : 'border-[#E5EAF0]'
          }`}
          title="Click to filter projects assigned to Team Leads"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B778C]">Assigned to Team Leads</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-[#091E42] mt-2">{assignedCount}</div>
          <div className="text-[11px] text-[#6B778C] mt-1">Actively supervised by engineering leads</div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setAllocationFilter('ALL');
            setPipelineFilter('ALL');
            setStatusFilter('ALL');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setAllocationFilter('ALL');
              setPipelineFilter('ALL');
              setStatusFilter('ALL');
            }
          }}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all hover:border-purple-500 hover:shadow-md ${
            allocationFilter === 'ALL' && pipelineFilter === 'ALL'
              ? 'border-purple-500 ring-2 ring-purple-400/20 bg-purple-50/10'
              : 'border-[#E5EAF0]'
          }`}
          title="Click to view all Partner-Assisted engagements"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B778C]">Partner-Assisted Engagements</span>
            <Building2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-[#091E42] mt-2">{partnerProjectsCount}</div>
          <div className="text-[11px] text-[#6B778C] mt-1">Managed conversion SLA contracts</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 bg-white p-4 rounded-xl border border-[#E5EAF0] shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-64 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B778C]" />
            <Input
              placeholder="Search by project name, partner, org, or lead..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Allocation Segment Tabs */}
          <div className="flex items-center gap-1.5 bg-[#F4F6F8] p-1 rounded-xl border border-[#E5EAF0]">
            <button
              onClick={() => setAllocationFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                allocationFilter === 'ALL'
                  ? 'bg-white text-[#091E42] shadow-2xs'
                  : 'text-[#6B778C] hover:text-[#091E42]'
              }`}
            >
              All ({totalProjectsCount})
            </button>
            <button
              onClick={() => setAllocationFilter('UNASSIGNED')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                allocationFilter === 'UNASSIGNED'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-amber-700 hover:text-amber-900'
              }`}
            >
              <span>Awaiting Lead</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                allocationFilter === 'UNASSIGNED' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {unassignedCount}
              </span>
            </button>
            <button
              onClick={() => setAllocationFilter('ASSIGNED')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                allocationFilter === 'ASSIGNED'
                  ? 'bg-white text-[#091E42] shadow-2xs'
                  : 'text-[#6B778C] hover:text-[#091E42]'
              }`}
            >
              Assigned ({assignedCount})
            </button>
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E5EAF0]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#6B778C]">Conversion Pipeline:</span>
            <div className="flex items-center gap-1">
              {[
                { key: 'ALL', label: 'All Pipelines' },
                { key: 'BMS_DSPF_TO_FRONTEND', label: 'BMS/DSPF to React' },
                { key: 'COBOL_TO_JAVA', label: 'COBOL to Java 21' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setPipelineFilter(t.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    pipelineFilter === t.key
                      ? 'bg-[#0652CC] text-white font-semibold'
                      : 'bg-white border border-[#E5EAF0] text-[#6B778C] hover:text-[#091E42]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#6B778C]">Status:</span>
            <div className="flex items-center gap-1">
              {['ALL', 'ACTIVE', 'IN_PROGRESS', 'READY_FOR_EXPORT', 'COMPLETED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    statusFilter === st
                      ? 'bg-[#091E42] text-white font-semibold'
                      : 'bg-white border border-[#E5EAF0] text-[#6B778C] hover:text-[#091E42]'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="rounded-xl border border-[#E5EAF0] bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                <th className="py-3 px-4">Project & Category</th>
                <th className="py-3 px-4">Partner / Organization</th>
                <th className="py-3 px-4">Target Architecture</th>
                <th className="py-3 px-4">Status & Progress</th>
                <th className="py-3 px-4">Assigned Team Lead</th>
                <th className="py-3 px-4">Allocated Staff</th>
                <th className="py-3 px-4 text-right">Allocation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B778C]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin" />
                      <span>Loading unified modernization projects...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B778C]">
                    <FolderKanban className="w-8 h-8 mx-auto text-[#6B778C]/40 mb-2" />
                    No projects found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  const leadUser = teamLeads.find((l) => l.id === p.assignedTeamLeadId);
                  const isAssigned = !!p.assignedTeamLeadId;
                  const totalItems = (p.screensTotal || 0) + (p.programsTotal || 0);
                  const completedItems = (p.screensCompleted || 0) + (p.programsCompleted || 0);
                  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/partners/projects/${p.id}/workspace`)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                      title="Click to view project details & conversion workspace"
                    >
                      {/* Project Name & Category */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#091E42] group-hover:text-[#0652CC] transition-colors flex items-center gap-1.5">
                          {p.name}
                          {p.isDemo && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700">
                              DEMO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            <Building2 className="w-3 h-3" />
                            {p.conversionType === 'COBOL_TO_JAVA' ? 'COBOL -> Java' : 'BMS/DSPF -> React'}
                          </span>
                          <span className="text-[10px] font-mono text-[#6B778C]">{p.id}</span>
                        </div>
                      </td>

                      {/* Partner / Organization */}
                      <td className="py-3.5 px-4">
                        {p.partnerName ? (
                          <div>
                            <div className="font-semibold text-[#091E42]">{p.partnerName}</div>
                            <div className="text-[10px] font-mono text-[#6B778C]">{p.partnerId}</div>
                          </div>
                        ) : (
                          <span className="font-mono text-[#6B778C] text-[11px]">{p.organizationId}</span>
                        )}
                      </td>

                      {/* Target Architecture */}
                      <td className="py-3.5 px-4 text-[#091E42]">
                        <span className="inline-block px-2 py-0.5 rounded bg-[#F4F6F8] border border-[#E5EAF0] text-[11px] font-mono">
                          {p.targetFramework || 'React + NestJS'}
                        </span>
                      </td>

                      {/* Status & Progress */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <StatusBadge status={p.status} />
                          {totalItems > 0 && (
                            <div className="flex items-center gap-2 text-[10px] text-[#6B778C]">
                              <div className="w-16 h-1.5 bg-[#E5EAF0] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#0652CC] rounded-full"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span>{progressPct}%</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Assigned Team Lead */}
                      <td className="py-3.5 px-4">
                        {isAssigned ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-[#0652CC] flex items-center justify-center text-[10px] font-bold">
                              {(p.assignedTeamLeadName || leadUser?.fullName || 'TL').charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-[#091E42] flex items-center gap-1">
                                {p.assignedTeamLeadName || leadUser?.fullName}
                                <Check className="w-3 h-3 text-emerald-600" />
                              </div>
                              <div className="text-[10px] text-[#6B778C]">
                                {leadUser?.email || 'Engineering Lead'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3 h-3" />
                            Awaiting Team Lead
                          </span>
                        )}
                      </td>

                      {/* Allocated Staff */}
                      <td className="py-3.5 px-4">
                        {p.assignedStaffName ? (
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#0652CC]" />
                            <span className="font-medium text-[#091E42]">{p.assignedStaffName}</span>
                          </div>
                        ) : (
                          <span className="text-[#6B778C]/70 italic text-[11px]">Unallocated</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssignModal(p);
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              isAssigned
                                ? 'border border-[#E5EAF0] bg-white text-[#091E42] hover:bg-[#F4F6F8]'
                                : 'bg-[#0652CC] text-white hover:bg-[#0543A8] shadow-2xs'
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {isAssigned ? 'Reassign Lead' : 'Assign to Lead'}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTransferTargetProject(p);
                            }}
                            title="Transfer Resource Ownership (Section 2.C)"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[#E5EAF0] bg-white text-[#091E42] hover:bg-blue-50/50 hover:text-[#0652CC] transition-colors"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-[#0652CC]" />
                            Transfer
                          </button>

                          <Link
                            to={`/partners/projects/${p.id}/workspace`}
                            onClick={(e) => e.stopPropagation()}
                            title="Open Full Conversion Workspace"
                            className="p-1.5 rounded-lg border border-[#E5EAF0] bg-white text-[#6B778C] hover:text-[#0652CC] hover:bg-blue-50 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3.13.3 Assign Project Dialog */}
      <Modal
        isOpen={!!assignTargetProject}
        onClose={() => setAssignTargetProject(null)}
        title={isReassigning ? 'Reassign Project to Team Lead' : 'Allocate Project to Team Lead'}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <p className="text-xs text-[#6B778C]">
            Select a qualified Team Lead to oversee modernization, supervise conversion staff, and conduct final review quality sign-offs (UC-3.13.3).
          </p>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E5EAF0] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#6B778C]">Project Name:</span>
              <strong className="text-[#091E42]">{assignTargetProject?.name}</strong>
            </div>

            {assignTargetProject?.partnerName && (
              <div className="flex items-center justify-between">
                <span className="text-[#6B778C]">Partner Organization:</span>
                <span className="font-semibold text-purple-700">{assignTargetProject?.partnerName}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[#6B778C]">Target Framework:</span>
              <span className="font-mono text-[#091E42]">{assignTargetProject?.targetFramework || 'React 19 + Tailwind CSS'}</span>
            </div>

            <div className="flex items-center justify-between border-t border-[#E5EAF0] pt-1.5">
              <span className="text-[#6B778C]">Current Assignment:</span>
              <span className="font-semibold text-[#091E42]">
                {assignTargetProject?.assignedTeamLeadName ||
                  teamLeads.find((l) => l.id === assignTargetProject?.assignedTeamLeadId)?.fullName ||
                  'None (Awaiting Allocation)'}
              </span>
            </div>
          </div>

          {isReassigning && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Reassignment Alert:</strong> This project is already assigned. Changing the Team Lead will transfer primary managerial oversight and alert the new Team Lead in their work queue.
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#091E42] mb-1">
              Select Primary Team Lead *
            </label>
            <select
              required
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42] focus:outline-none focus:border-[#0652CC] focus:ring-2 focus:ring-[#0652CC]/20"
            >
              <option value="">-- Choose a Qualified Team Lead --</option>
              {teamLeads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.fullName} ({lead.email}) — Roles: {lead.roles.join(', ')}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5EAF0]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAssignTargetProject(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={assigning || !selectedLeadId}
              className="bg-[#0652CC] hover:bg-[#0543A8] text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {assigning ? 'Allocating...' : isReassigning ? 'Confirm Reassignment' : 'Allocate to Team Lead'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reusable Resource Ownership Transfer Modal (Section 2.C) */}
      <ResourceTransferModal
        isOpen={!!transferTargetProject}
        onClose={() => setTransferTargetProject(null)}
        resource={
          transferTargetProject
            ? {
                id: transferTargetProject.id,
                name: transferTargetProject.name,
                type: 'Modernization Project',
                currentOwnerId: transferTargetProject.assignedTeamLeadId,
                currentOwnerName: transferTargetProject.assignedTeamLeadName || 'Unassigned',
                details: `${transferTargetProject.conversionType || 'Modernization'} • ${transferTargetProject.organizationId}`,
              }
            : null
        }
        candidates={transferCandidates}
        onTransferConfirm={handleTransferConfirm}
      />
    </div>
  );
};
export default AdminProjectsPage;
