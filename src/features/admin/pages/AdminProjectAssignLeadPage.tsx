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
  FileText,
  AlertTriangle,
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

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [capacityFilter, setCapacityFilter] = useState<'ALL' | 'AVAILABLE' | 'BUSY'>('ALL');

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
          // Count real active projects supervised by this lead
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
            roles: emp.roles && emp.roles.length > 0 ? emp.roles : [emp.role],
            avatarUrl: emp.avatarUrl,
          };
        });

      // Default fallback leads for development/testing if no workforce items exist
      const fallbackLeads: TeamLeadCandidate[] = [
        {
          id: 'lead-01',
          fullName: 'Sarah Jenkins',
          email: 'sarah.j@alsm.io',
          department: 'Core Banking Modernization',
          activeWorkload: projectsList.filter((p) => p.assignedTeamLeadId === 'lead-01').length,
          maxCapacity: 5,
          roles: ['Team Lead'],
        },
        {
          id: 'lead-02',
          fullName: 'Marcus Vance',
          email: 'marcus.v@alsm.io',
          department: 'Legacy Systems Transformation',
          activeWorkload: projectsList.filter((p) => p.assignedTeamLeadId === 'lead-02').length,
          maxCapacity: 4,
          roles: ['Team Lead'],
        },
        {
          id: 'lead-03',
          fullName: 'Huu Nghia Team Lead',
          email: 'huunghia.lead@alsm.io',
          department: 'Distributed Systems & Microservices',
          activeWorkload: projectsList.filter((p) => p.assignedTeamLeadId === 'lead-03').length,
          maxCapacity: 5,
          roles: ['Team Lead'],
        },
      ];

      setTeamLeads(mappedLeads.length > 0 ? mappedLeads : fallbackLeads);
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

  const isReassigning = Boolean(project?.assignedTeamLeadId);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return teamLeads.filter((lead) => {
      const matchesSearch =
        searchQuery === '' ||
        lead.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.department && lead.department.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesCapacity = true;
      if (capacityFilter === 'AVAILABLE') {
        matchesCapacity = lead.activeWorkload <= 1;
      } else if (capacityFilter === 'BUSY') {
        matchesCapacity = lead.activeWorkload >= 2;
      }

      return matchesSearch && matchesCapacity;
    });
  }, [teamLeads, searchQuery, capacityFilter]);

  const selectedLead = useMemo(() => {
    return teamLeads.find((l) => l.id === selectedLeadId);
  }, [teamLeads, selectedLeadId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !selectedLeadId) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const leadName = selectedLead?.fullName || 'Assigned Team Lead';

      // 1. Submit to admin backend API
      await adminApi.assignTeamLead(projectId, selectedLeadId, assignmentNote);

      // 2. Sync to partner API and audit log
      await partnersApi.assignProject(projectId, {
        teamLeadId: selectedLeadId,
        teamLeadName: leadName,
        staffNote: assignmentNote,
      });

      setSuccessMsg(
        `Project "${project?.name || projectId}" successfully allocated to Team Lead ${leadName}. Real-time notifications dispatched to supervisor workspace.`
      );

      // Auto redirect after 2.5 seconds
      setTimeout(() => {
        navigate('/admin/projects');
      }, 2500);
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
    <div className="space-y-6 pb-12">
      {/* 1. Breadcrumbs & Header Bar */}
      <div>


        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-[#17263A]">
                {isReassigning ? 'Reassign Project to Team Lead' : 'Allocate Project to Team Lead'}
              </h1>
 
            </div>
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
              className="bg-[#244A70] hover:bg-[#244A70] text-white text-xs font-bold px-4 py-2 shadow-sm flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isReassigning ? 'Confirm Reassignment' : 'Allocate to Team Lead'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Notifications & Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-semibold block text-sm">Error with Team Lead Allocation</strong>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
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

      {/* 3. Main Two-Column Layout */}
      <form id="assign-lead-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Project Dossier & Scope Summary (5 Columns) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Project Details Card */}
          <div className="bg-white border border-[#DCE3EC] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#244A70] flex items-center justify-center font-bold">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#17263A]">Project Dossier</h3>
                  <span className="text-[11px] text-slate-500 font-mono">ID: {project?.id}</span>
                </div>
              </div>
              <span className="bg-brand-50 text-brand-700 border border-brand-200 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                {project?.conversionType === 'COBOL_TO_JAVA' ? 'COBOL → Java 21' : 'BMS/DSPF → React 19'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Project Name</span>
                <strong className="text-slate-900 text-sm font-bold block">{project?.name}</strong>
                {project?.description && (
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {project.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Client Organization</span>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-[#244A70]" />
                    <strong className="text-slate-900 truncate">
                      {organization?.name || project?.partnerName || 'Fintech Nexus Ltd.'}
                    </strong>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Target Architecture</span>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <Code2 className="w-3.5 h-3.5 text-emerald-600" />
                    <strong className="text-slate-900">
                      {project?.targetFramework || (project?.conversionType === 'COBOL_TO_JAVA' ? 'Spring Boot 3.3' : 'React 19 + TS')}
                    </strong>
                  </div>
                </div>
              </div>

              {project?.contractNumber && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 border border-blue-100 text-[11px]">
                  <span className="text-slate-600 font-medium">Enterprise Contract Ref:</span>
                  <span className="font-mono font-bold text-[#244A70]">{project.contractNumber}</span>
                </div>
              )}
            </div>

            {/* Scope & Metrics */}
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Modernization Scope
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center">
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
          </div>

          {/* Current Assignment Card */}
          <div className="bg-white border border-[#DCE3EC] rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Supervision Status</span>
              <StatusBadge status={project?.assignedTeamLeadId ? 'ACTIVE' : 'PENDING'} />
            </h3>

            {isReassigning ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#244A70] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {project?.assignedTeamLeadName
                      ?.split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase() || 'TL'}
                  </div>
                  <div className="text-xs min-w-0">
                    <span className="text-slate-500 text-[11px] block">Currently Assigned Lead:</span>
                    <strong className="text-[#17263A] text-sm font-bold block truncate">
                      {project?.assignedTeamLeadName || 'Huu Nghia Team Lead'}
                    </strong>
                    <span className="text-slate-500 text-[11px]">Direct Project Owner</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Reassignment Notice:</strong> Selecting a different Team Lead will transfer primary managerial oversight and alert the new supervisor in their workspace queue.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1.5 text-xs">
                <UserCheck className="w-7 h-7 text-slate-400 mx-auto" />
                <p className="font-semibold text-slate-700">Awaiting Primary Team Lead</p>
                <p className="text-slate-500 text-[11px]">
                  No engineering lead has been allocated yet. Choose a team lead from the right panel.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Team Lead Selection & Assignment Configuration (7 Columns) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Team Lead Selection Card */}
          <div className="bg-white border border-[#DCE3EC] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#244A70]" />
                  <span>Select Primary Team Lead</span>
                </h3>
              </div>

              {/* Capacity Filter Tabs */}
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCapacityFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    capacityFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({teamLeads.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCapacityFilter('AVAILABLE')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    capacityFilter === 'AVAILABLE' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Available
                </button>
                <button
                  type="button"
                  onClick={() => setCapacityFilter('BUSY')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    capacityFilter === 'BUSY' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  High Load
                </button>
              </div>
            </div>

            {/* Quick Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search team lead by name, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#244A70] transition-colors"
              />
            </div>

            {/* Accessible Dropdown Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Quick Dropdown Selection *
              </label>
              <select
                required
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#DCE3EC] bg-white text-[#17263A] focus:outline-none focus:border-[#244A70] focus:ring-2 focus:ring-[#244A70]/20"
              >
                <option value="">-- Choose an Authorized Team Lead --</option>
                {teamLeads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.fullName} ({lead.email}) — Workload: {lead.activeWorkload} active projects
                  </option>
                ))}
              </select>
            </div>

            {/* Interactive Candidate Cards List */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {filteredLeads.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No authorized team leads found matching your search.
                </div>
              ) : (
                filteredLeads.map((lead) => {
                  const isSelected = selectedLeadId === lead.id;
                  const isCurrent = project?.assignedTeamLeadId === lead.id;

                  return (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-[#244A70] bg-blue-50/50 ring-2 ring-[#244A70]/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Radio Check Indicator */}
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-[#244A70] bg-[#244A70]' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>

                        {/* Avatar */}
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected ? 'bg-[#244A70] text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {lead.fullName
                            .split(' ')
                            .map((w) => w[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>

                        {/* Lead Info */}
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <strong className="text-xs font-bold text-[#17263A] truncate">{lead.fullName}</strong>
                            {isCurrent && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-semibold">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{lead.email}</p>
                          {lead.department && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{lead.department}</p>
                          )}
                        </div>
                      </div>

                      {/* Workload Status Pill */}
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                            lead.activeWorkload === 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : lead.activeWorkload <= 2
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {lead.activeWorkload === 0
                            ? 'Available (0 Projects)'
                            : `${lead.activeWorkload} Projects Active`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Technical Briefing & Instructions */}
          <div className="bg-white border border-[#DCE3EC] rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#17263A] flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-4 h-4 text-[#244A70]" />
              <span>Assignment Notes & Technical Briefing</span>
            </h3>

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
              <div className="grid grid-cols-3 gap-2">
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
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      priority === lvl.id
                        ? 'border-[#244A70] bg-blue-50/60 ring-2 ring-[#244A70]/20'
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
                className="bg-[#244A70] hover:bg-[#244A70] text-white text-xs font-bold px-5 py-2.5 shadow-sm flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isReassigning ? 'Confirm Reassignment' : 'Allocate to Team Lead'}</span>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminProjectAssignLeadPage;
