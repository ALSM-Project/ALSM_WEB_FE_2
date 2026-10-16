import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FolderKanban, UserCheck, Search, RefreshCw, 
  AlertCircle, CheckCircle2, ExternalLink,
  Users, ShieldAlert, Check, ArrowRightLeft, Copy,
  Plus, X, RotateCcw, Activity, Eye
} from 'lucide-react';
import { adminApi, OrganizationDto, isManagedModernizationOrg, isManagedModernizationProject } from '../api/admin.api';
import { UserRbacDto } from '@/features/rbac/api/rbac.api';
import { workforceApi } from '@/shared/api/workforce.api';
import { partnersApi } from '@/features/partners/api/partners.api';
import { Button, Modal, Input } from '@/shared/ui';
import { StatusBadge } from '@/shared/ui/Badge';
import { ResourceTransferModal, CandidateAssignee } from '../components/ResourceTransferModal';

export const CANONICAL_9_STAGES = [
  { key: 'REQUIREMENTS_GATHERING', step: 1, label: 'Requirements Gathering', pct: 11, desc: 'Collecting customer files and specifications' },
  { key: 'LEGACY_ANALYSIS', step: 2, label: 'Legacy Analysis', pct: 22, desc: 'BMS screen and COBOL syntax analysis' },
  { key: 'CONVERSION', step: 3, label: 'Conversion', pct: 33, desc: 'Transforming legacy code into modern target' },
  { key: 'TESTING_VALIDATION', step: 4, label: 'Testing & Validation', pct: 44, desc: 'Automated verification & UI regression test' },
  { key: 'TEAM_LEAD_REVIEW', step: 5, label: 'Team Lead Review', pct: 56, desc: 'Engineering review and architecture validation' },
  { key: 'ADMIN_DELIVERY_REVIEW', step: 6, label: 'Admin Delivery Review', pct: 67, desc: 'ALSM delivery readiness review' },
  { key: 'CUSTOMER_REVIEW', step: 7, label: 'Customer Review', pct: 78, desc: 'Interactive customer preview and feedback' },
  { key: 'ACCEPTANCE', step: 8, label: 'Acceptance', pct: 89, desc: 'Customer sign-off and formal acceptance' },
  { key: 'DELIVERY', step: 9, label: 'Delivery', pct: 100, desc: 'Final bundle delivery and project completion' },
];

export interface UnifiedProjectItem {
  id: string;
  name: string;
  description?: string;
  conversionType?: 'BMS_DSPF_TO_FRONTEND' | 'COBOL_TO_JAVA';
  partnerId?: string;
  partnerName?: string;
  organizationId: string;
  organizationName?: string;
  organizationType?: string;
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
  contractNumber?: string;
  contractId?: string;
  serviceType?: 'SELF_SERVICE' | 'MANAGED';
  currentStage?: string;
  stageIndex?: number;
  progressPct?: number;
  submittedAt?: string;
  submittedBy?: string;
  businessRequirements?: string;
  adminReviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  teamLeadAssignedBy?: string;
  teamLeadAssignedByName?: string;
  teamLeadAssignedAt?: string;
  teamLeadAssignmentNote?: string;
  teamLeadAssignmentStatus?: string;
  files?: Array<{
    fileId: string;
    originalName: string;
    fileSize: number;
    mimeType?: string;
    category?: string;
    storageKey?: string;
    uploadedAt?: string;
  }>;
  acceptance?: {
    accepted: boolean;
    acceptedBy?: string;
    acceptedByName?: string;
    acceptedAt?: string;
    notes?: string;
  };
  createdAt: string;
  lastUpdated?: string;
}

export const AdminProjectsPage: React.FC = () => {
  const navigate = useNavigate();

  // Core Data States
  const [projects, setProjects] = useState<UnifiedProjectItem[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationDto[]>([]);
  const [teamLeads, setTeamLeads] = useState<UserRbacDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [allocationFilter, setAllocationFilter] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED'>('ALL');
  const [pipelineFilter, setPipelineFilter] = useState<'ALL' | 'BMS_DSPF_TO_FRONTEND' | 'COBOL_TO_JAVA'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLeadFilter, setSelectedLeadFilter] = useState<string>('ALL');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('ALL');
  const [metricFilter, setMetricFilter] = useState<string>('ALL');

  // Assign / Reassign Team Lead Modal
  const [assignTargetProject, setAssignTargetProject] = useState<UnifiedProjectItem | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [assigning, setAssigning] = useState<boolean>(false);
  const isReassigning = Boolean(assignTargetProject?.assignedTeamLeadId);

  // Resource Ownership Transfer Modal
  const [transferTargetProject, setTransferTargetProject] = useState<UnifiedProjectItem | null>(null);

  // View Project Details Modal
  const [detailsTargetProject, setDetailsTargetProject] = useState<UnifiedProjectItem | null>(null);

  // Admin Intake & Review Modal (Step 2 of Managed Modernization)
  const [intakeTargetProject, setIntakeTargetProject] = useState<UnifiedProjectItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REQUEST_INFO' | 'REJECT'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Team Lead Assignment Notes
  const [assignmentNote, setAssignmentNote] = useState('');

  // Create Enterprise Project Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    organizationId: '',
    conversionType: 'COBOL_TO_JAVA' as 'BMS_DSPF_TO_FRONTEND' | 'COBOL_TO_JAVA',
    targetFramework: 'Spring Boot 3.3 / Java 21',
    description: '',
    initialLeadId: '',
  });

  // Clipboard copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((curr) => (curr === id ? null : curr));
      }, 1500);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Fetch partner projects, users, and organizations in parallel
      const [partnerProjects, internalStaff, fetchedOrgs] = await Promise.all([
        partnersApi.getProjects(),
        workforceApi.getInternalStaff().catch(() => []),
        adminApi.getOrganizations().catch(() => []),
      ]);

      const orgList: OrganizationDto[] = Array.isArray(fetchedOrgs) ? fetchedOrgs : [];
      setOrganizations(orgList);

      const orgMap = new Map<string, OrganizationDto>();
      orgList.forEach((o) => {
        if (o.id) orgMap.set(o.id, o);
      });

      // Strictly map internal ALSM workforce leads
      const leads: UserRbacDto[] = (internalStaff || [])
        .filter((emp) => emp.status === 'ACTIVE')
        .map((emp) => ({
          id: emp.userId,
          fullName: emp.fullName,
          email: emp.email,
          roles: emp.roles && emp.roles.length > 0 ? emp.roles : [emp.role],
          isPlatformAdmin: false,
          isActive: true,
          isLocked: false,
        } as unknown as UserRbacDto));

      const fallbackLeads: UserRbacDto[] = [
        { id: 'lead-01', fullName: 'Sarah Jenkins', email: 'sarah.j@alsm.io', roles: ['Team Lead'], isPlatformAdmin: false, isActive: true, isLocked: false } as any,
        { id: 'lead-02', fullName: 'Marcus Vance', email: 'marcus.v@alsm.io', roles: ['Team Lead'], isPlatformAdmin: false, isActive: true, isLocked: false } as any,
      ];

      setTeamLeads(leads.length > 0 ? leads : fallbackLeads);

      // MANDATORY BUSINESS RULE: Web 2 ONLY manages Web 3 Managed Modernization Services projects.
      // Self-service projects, Personal Workspaces, and uncontracted accounts are strictly excluded.
      const rawProjects = Array.isArray(partnerProjects) ? partnerProjects : [];
      const hasLoadedOrgs = orgList.length > 0;
      const normalizedProjects: UnifiedProjectItem[] = rawProjects
        .filter((p) => {
          const org = orgMap.get(p.organizationId);
          return isManagedModernizationProject(p, org, hasLoadedOrgs);
        })
        .map((p) => {
          const org = orgMap.get(p.organizationId);
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            conversionType: p.conversionType,
            partnerId: p.partnerId,
            partnerName: org?.name || p.partnerName,
            organizationId: p.organizationId || p.partnerId,
            organizationName: org?.name || p.partnerName || 'Enterprise Workspace',
            organizationType: org?.type || 'ENTERPRISE',
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
            contractNumber: p.contractNumber,
            contractId: p.contractId,
            serviceType: p.serviceType,
            currentStage: p.currentStage,
            stageIndex: p.stageIndex,
            progressPct: p.progressPct,
            submittedAt: p.submittedAt,
            submittedBy: p.submittedBy,
            businessRequirements: p.businessRequirements,
            adminReviewNotes: p.adminReviewNotes,
            reviewedBy: p.reviewedBy,
            reviewedAt: p.reviewedAt,
            teamLeadAssignedBy: p.teamLeadAssignedBy,
            teamLeadAssignedByName: p.teamLeadAssignedByName,
            teamLeadAssignedAt: p.teamLeadAssignedAt,
            teamLeadAssignmentNote: p.teamLeadAssignmentNote,
            teamLeadAssignmentStatus: p.teamLeadAssignmentStatus,
            files: p.files,
            acceptance: p.acceptance,
            createdAt: p.createdAt || new Date().toISOString(),
            lastUpdated: p.lastUpdated,
          };
        });

      setProjects(normalizedProjects);
    } catch (err: any) {
      console.error('Failed to load enterprise projects/team leads:', err);
      setErrorMsg(err.message || 'Failed to load enterprise projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Set default organization for project creation modal when organizations load
  useEffect(() => {
    if (organizations.length > 0 && !createForm.organizationId) {
      const enterpriseOrg = organizations.find((o) => isManagedModernizationOrg(o)) || organizations[0];
      if (enterpriseOrg) {
        setCreateForm((prev) => ({ ...prev, organizationId: enterpriseOrg.id }));
      }
    }
  }, [organizations]);

  // Modal & Navigation Handlers
  const openAssignModal = (proj: UnifiedProjectItem) => {
    navigate(`/admin/projects/${proj.id}/assign-lead`);
  };

  const openIntakeModal = (proj: UnifiedProjectItem) => {
    setIntakeTargetProject(proj);
    setReviewAction('APPROVE');
    setReviewNotes(proj.adminReviewNotes || '');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeTargetProject) return;
    try {
      setReviewing(true);
      await adminApi.reviewProject(intakeTargetProject.id, {
        action: reviewAction,
        notes: reviewNotes,
      });
      setSuccessMsg(
        reviewAction === 'APPROVE'
          ? `Project "${intakeTargetProject.name}" approved and marked READY FOR ASSIGNMENT.`
          : reviewAction === 'REQUEST_INFO'
          ? `Additional information requested from client for "${intakeTargetProject.name}".`
          : `Project request "${intakeTargetProject.name}" rejected.`
      );
      setIntakeTargetProject(null);
      setReviewNotes('');
      await fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit review');
    } finally {
      setReviewing(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetProject || !selectedLeadId) return;

    try {
      setAssigning(true);
      const selectedLead = teamLeads.find((l) => l.id === selectedLeadId);
      const leadName = selectedLead?.fullName || 'Assigned Team Lead';

      // Verify the global assignment with assignment notes
      await adminApi.assignTeamLead(assignTargetProject.id, selectedLeadId, assignmentNote);
      await partnersApi.assignProject(assignTargetProject.id, {
        teamLeadId: selectedLeadId,
        teamLeadName: leadName,
      });

      setSuccessMsg(
        `Project "${assignTargetProject.name}" allocated to Team Lead ${leadName}. Workflow notification sent & audit logged.`
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

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.organizationId) return;

    try {
      setCreating(true);
      const selectedOrg = organizations.find((o) => o.id === createForm.organizationId);

      const created = await partnersApi.createProject({
        partnerId: createForm.organizationId,
        partnerName: selectedOrg?.name || 'Enterprise Client',
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        conversionType: createForm.conversionType,
        targetFramework: createForm.targetFramework,
      });

      // If initial Team Lead is assigned
      if (createForm.initialLeadId) {
        const lead = teamLeads.find((l) => l.id === createForm.initialLeadId);
        await adminApi.assignTeamLead(created.id, createForm.initialLeadId);
        await partnersApi.assignProject(created.id, {
          teamLeadId: createForm.initialLeadId,
          teamLeadName: lead?.fullName || 'Team Lead',
        });
      }

      setSuccessMsg(`Enterprise Project "${createForm.name}" created successfully.`);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        organizationId: organizations.find((o) => isManagedModernizationOrg(o))?.id || '',
        conversionType: 'COBOL_TO_JAVA',
        targetFramework: 'Spring Boot 3.3 / Java 21',
        description: '',
        initialLeadId: '',
      });
      await fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create Enterprise Project');
    } finally {
      setCreating(false);
    }
  };

  // 5 Real Backend Metric Counters (Enterprise / Managed Modernization Services ONLY)
  const totalEnterpriseCount = projects.length;
  const unassignedCount = projects.filter((p) => !p.assignedTeamLeadId).length;
  const assignedCount = projects.filter((p) => !!p.assignedTeamLeadId).length;
  const inProgressCount = projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'ACTIVE').length;
  const completedCount = projects.filter((p) => p.status === 'COMPLETED').length;

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchTerm('');
    setAllocationFilter('ALL');
    setPipelineFilter('ALL');
    setStatusFilter('ALL');
    setSelectedLeadFilter('ALL');
    setSelectedOrgFilter('ALL');
    setMetricFilter('ALL');
  };

  const isAnyFilterActive = 
    searchTerm.trim() !== '' ||
    allocationFilter !== 'ALL' ||
    pipelineFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    selectedLeadFilter !== 'ALL' ||
    selectedOrgFilter !== 'ALL' ||
    metricFilter !== 'ALL';

  // Multi-dimensional Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Search
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.partnerName && p.partnerName.toLowerCase().includes(term)) ||
        (p.organizationName && p.organizationName.toLowerCase().includes(term)) ||
        p.organizationId.toLowerCase().includes(term) ||
        (p.assignedTeamLeadName && p.assignedTeamLeadName.toLowerCase().includes(term)) ||
        (p.assignedStaffName && p.assignedStaffName.toLowerCase().includes(term));

      // Allocation Status
      const isAssigned = !!p.assignedTeamLeadId;
      const matchesAllocation =
        allocationFilter === 'ALL' ||
        (allocationFilter === 'UNASSIGNED' && !isAssigned) ||
        (allocationFilter === 'ASSIGNED' && isAssigned);

      // Conversion Pipeline
      const matchesPipeline =
        pipelineFilter === 'ALL' || p.conversionType === pipelineFilter;

      // Project Status
      const matchesStatus =
        statusFilter === 'ALL' || 
        (statusFilter === 'IN_PROGRESS' && (p.status === 'IN_PROGRESS' || p.status === 'ACTIVE')) ||
        p.status === statusFilter;

      // Team Lead
      const matchesLead =
        selectedLeadFilter === 'ALL' || p.assignedTeamLeadId === selectedLeadFilter;

      // Organization / Partner
      const matchesOrg =
        selectedOrgFilter === 'ALL' ||
        p.organizationId === selectedOrgFilter ||
        p.partnerId === selectedOrgFilter;

      return matchesSearch && matchesAllocation && matchesPipeline && matchesStatus && matchesLead && matchesOrg;
    });
  }, [projects, searchTerm, allocationFilter, pipelineFilter, statusFilter, selectedLeadFilter, selectedOrgFilter]);

  // Transfer Candidates
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

  // Filtered Leads in Assign Modal
  const modalFilteredLeads = useMemo(() => {
    if (!leadSearchQuery.trim()) return teamLeads;
    const query = leadSearchQuery.toLowerCase();
    return teamLeads.filter(
      (l) => l.fullName.toLowerCase().includes(query) || l.email.toLowerCase().includes(query)
    );
  }, [teamLeads, leadSearchQuery]);

  // Unique enterprise organizations for filter
  const enterpriseOrgs = useMemo(() => {
    return organizations.filter((o) => isManagedModernizationOrg(o));
  }, [organizations]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17263A]">
            Team Lead Assignment
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 bg-[#244A70] hover:bg-[#244A70] text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Enterprise Project
          </Button>

          <Link
            to="/team-lead/projects"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE3EC] bg-white px-3.5 py-2 text-xs font-semibold text-[#17263A] shadow-2xs hover:bg-[#F8FAFC] transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-[#244A70]" />
            Team Lead Workspace
          </Link>

          <button
            onClick={fetchData}
            title="Refresh Enterprise Projects"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE3EC] bg-white px-3.5 py-2 text-xs font-semibold text-[#17263A] shadow-2xs hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin text-[#244A70]' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Section IV: 5 Clickable KPI Metric Cards (Managed Modernization Services ONLY) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Total Enterprise Projects */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setMetricFilter('ALL');
            setAllocationFilter('ALL');
            setStatusFilter('ALL');
          }}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all hover:border-[#244A70] hover:shadow-sm ${
            metricFilter === 'ALL' && allocationFilter === 'ALL' && statusFilter === 'ALL'
              ? 'border-[#244A70] ring-2 ring-[#244A70]/15 bg-blue-50/15'
              : 'border-[#DCE3EC]'
          }`}
          title="Click to view all Enterprise Projects"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8491A3]">Total Enterprise Projects</span>
            <FolderKanban className="w-4 h-4 text-[#244A70]" />
          </div>
          <div className="text-2xl font-bold text-[#17263A] mt-2">{totalEnterpriseCount}</div>
          <div className="text-[10px] text-[#8491A3] mt-1">Platform Managed Modernization Services scope</div>
        </div>

        {/* Metric 2: Awaiting Team Lead Allocation */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setMetricFilter('UNASSIGNED');
            setAllocationFilter('UNASSIGNED');
            setStatusFilter('ALL');
          }}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all hover:border-amber-500 hover:shadow-sm ${
            allocationFilter === 'UNASSIGNED'
              ? 'border-amber-500 ring-2 ring-amber-400/20 bg-amber-50/15'
              : 'border-[#DCE3EC]'
          }`}
          title="Click to filter projects awaiting Team Lead allocation"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-800">Awaiting Team Lead Allocation</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">{unassignedCount}</div>
          <div className="text-[10px] text-amber-700/80 mt-1">Immediate action required by Admin</div>
        </div>

        {/* Metric 3: Assigned to Team Leads */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setMetricFilter('ASSIGNED');
            setAllocationFilter('ASSIGNED');
            setStatusFilter('ALL');
          }}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all hover:border-emerald-600 hover:shadow-sm ${
            allocationFilter === 'ASSIGNED'
              ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/15'
              : 'border-[#DCE3EC]'
          }`}
          title="Click to view assigned enterprise projects"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-800">Assigned to Team Leads</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{assignedCount}</div>
          <div className="text-[10px] text-emerald-700/80 mt-1">Under engineering supervision</div>
        </div>

        {/* Metric 4: Projects In Progress */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setMetricFilter('IN_PROGRESS');
            setStatusFilter('IN_PROGRESS');
            setAllocationFilter('ALL');
          }}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all hover:border-blue-600 hover:shadow-sm ${
            statusFilter === 'IN_PROGRESS'
              ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/15'
              : 'border-[#DCE3EC]'
          }`}
          title="Click to view in-progress conversions"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-800">Projects In Progress</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-2">{inProgressCount}</div>
          <div className="text-[10px] text-blue-700/80 mt-1">Partner-Assisted Engagements</div>
        </div>

        {/* Metric 5: Completed Projects */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setMetricFilter('COMPLETED');
            setStatusFilter('COMPLETED');
            setAllocationFilter('ALL');
          }}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all hover:border-purple-600 hover:shadow-sm ${
            statusFilter === 'COMPLETED'
              ? 'border-purple-600 ring-2 ring-purple-500/20 bg-purple-50/15'
              : 'border-[#DCE3EC]'
          }`}
          title="Click to view completed enterprise projects"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-purple-800">Completed Projects</span>
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-2">{completedCount}</div>
          <div className="text-[10px] text-purple-700/80 mt-1">Delivered & verified exports</div>
        </div>
      </div>

      {/* Section V: Advanced Multi-dimensional Filter Toolbar */}
      <div className="space-y-3 bg-white p-4 rounded-xl border border-[#DCE3EC] shadow-2xs">
        {/* Row 1: Search + Allocation Segment Tabs + Clear All */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-64 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8491A3]" />
            <Input
              placeholder="Search by project name, ID, partner, org, or lead..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Allocation Segment Tabs */}
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] p-1 rounded-xl border border-[#DCE3EC]">
              <button
                onClick={() => setAllocationFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  allocationFilter === 'ALL'
                    ? 'bg-white text-[#17263A] shadow-2xs'
                    : 'text-[#8491A3] hover:text-[#17263A]'
                }`}
              >
                All ({totalEnterpriseCount})
              </button>
              <button
                onClick={() => setAllocationFilter('UNASSIGNED')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  allocationFilter === 'UNASSIGNED'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                <span>Awaiting Lead</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  allocationFilter === 'UNASSIGNED' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {unassignedCount}
                </span>
              </button>
              <button
                onClick={() => setAllocationFilter('ASSIGNED')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  allocationFilter === 'ASSIGNED'
                    ? 'bg-white text-[#17263A] shadow-2xs'
                    : 'text-[#8491A3] hover:text-[#17263A]'
                }`}
              >
                Assigned ({assignedCount})
              </button>
            </div>

            {/* Clear All Filters */}
            {isAnyFilterActive && (
              <button
                onClick={handleClearAllFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Reset all active filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Secondary Dropdown & Pipeline Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#DCE3EC]">
          {/* Conversion Pipeline Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#8491A3]">Pipeline:</span>
            <div className="flex items-center gap-1">
              {[
                { key: 'ALL', label: 'All Pipelines' },
                { key: 'BMS_DSPF_TO_FRONTEND', label: 'BMS/DSPF to React' },
                { key: 'COBOL_TO_JAVA', label: 'COBOL to Java 21' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setPipelineFilter(t.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    pipelineFilter === t.key
                      ? 'bg-[#17263A] text-white font-semibold shadow-2xs'
                      : 'bg-white border border-[#DCE3EC] text-[#8491A3] hover:text-[#17263A]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Team Lead Pills */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-[#8491A3] mr-0.5">Lead:</span>
              <button
                type="button"
                onClick={() => setSelectedLeadFilter('ALL')}
                className={`px-2 py-0.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  selectedLeadFilter === 'ALL'
                    ? 'bg-[#17263A] text-white font-semibold'
                    : 'bg-white border border-[#DCE3EC] text-[#8491A3] hover:text-[#17263A]'
                }`}
              >
                All
              </button>
              {teamLeads.slice(0, 3).map((tl) => (
                <button
                  key={tl.id}
                  type="button"
                  onClick={() => setSelectedLeadFilter(tl.id)}
                  className={`px-2 py-0.5 rounded-lg text-xs transition-colors cursor-pointer max-w-[110px] truncate ${
                    selectedLeadFilter === tl.id
                      ? 'bg-[#244A70] text-white font-semibold shadow-2xs'
                      : 'bg-white border border-[#DCE3EC] text-[#8491A3] hover:text-[#17263A]'
                  }`}
                  title={tl.fullName}
                >
                  {tl.fullName.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Filter by Project Status Pills */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-[#8491A3] mr-0.5">Status:</span>
              {[
                { key: 'ALL', label: 'All' },
                { key: 'IN_PROGRESS', label: 'In Progress' },
                { key: 'COMPLETED', label: 'Completed' },
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStatusFilter(st.key)}
                  className={`px-2 py-0.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    statusFilter === st.key
                      ? 'bg-[#17263A] text-white font-semibold shadow-2xs'
                      : 'bg-white border border-[#DCE3EC] text-[#8491A3] hover:text-[#17263A]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results summary bar with active filter chips */}
        <div className="flex flex-wrap items-center justify-between text-xs text-[#8491A3] pt-2 border-t border-slate-100">
          <div>
            Showing <strong className="text-[#17263A]">{filteredProjects.length}</strong> of{' '}
            <strong className="text-[#17263A]">{totalEnterpriseCount}</strong> Managed Modernization Projects
          </div>

          {isAnyFilterActive && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">Active filters:</span>
              {allocationFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  Allocation: {allocationFilter === 'UNASSIGNED' ? 'Awaiting Lead' : 'Assigned'}
                  <button onClick={() => setAllocationFilter('ALL')} className="hover:text-amber-950">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {pipelineFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                  {pipelineFilter === 'COBOL_TO_JAVA' ? 'COBOL → Java' : 'BMS/DSPF → React'}
                  <button onClick={() => setPipelineFilter('ALL')} className="hover:text-blue-950">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {statusFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('ALL')} className="hover:text-slate-950">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {selectedLeadFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-800 border border-indigo-200">
                  Lead: {teamLeads.find((l) => l.id === selectedLeadFilter)?.fullName || selectedLeadFilter}
                  <button onClick={() => setSelectedLeadFilter('ALL')} className="hover:text-indigo-950">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section VI: Projects Table (7 Enterprise Columns) */}
      <div className="rounded-xl border border-[#DCE3EC] bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[10px] font-bold text-[#8491A3] uppercase tracking-wider">
                <th className="py-3 px-4 min-w-[240px] max-w-[320px]">Project & Category</th>
                <th className="py-3 px-4">Partner / Organization</th>
                <th className="py-3 px-4">Target Architecture</th>
                <th className="py-3 px-4">Status & Progress</th>
                <th className="py-3 px-4">Assigned Team Lead</th>
                <th className="py-3 px-4">Allocated Staff</th>
                <th className="py-3 px-4 text-right">Allocation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3EC]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8491A3]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-[#244A70] border-t-transparent rounded-full animate-spin" />
                      <span>Loading enterprise modernization projects...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8491A3]">
                    <FolderKanban className="w-8 h-8 mx-auto text-[#8491A3]/40 mb-2" />
                    <p className="font-semibold text-slate-700">No Enterprise Projects Found</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isAnyFilterActive
                        ? 'No projects match your current filters. Try resetting the filters.'
                        : 'No Managed Modernization Services enterprise projects have been created yet.'}
                    </p>
                    {isAnyFilterActive && (
                      <button
                        onClick={handleClearAllFilters}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#244A70] text-white rounded-lg text-xs font-semibold hover:bg-[#244A70] transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Clear All Filters
                      </button>
                    )}
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
                      title="Click row to open conversion workspace"
                    >
                      {/* Column 1: Project & Category (Two-Tier Structured Architecture) */}
                      <td className="py-3 px-4 min-w-[240px] max-w-[320px]">
                        {/* Tier 1: Project Name */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="font-semibold text-[#17263A] group-hover:text-[#244A70] transition-colors truncate text-xs"
                            title={p.name}
                          >
                            {p.name}
                          </span>
                          {p.isDemo && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200/80 shrink-0"
                              title="Demonstration / Sample Project"
                            >
                              DEMO
                            </span>
                          )}
                        </div>

                        {/* Tier 2: Project Metadata (Category Badge + Monospace ID) */}
                        <div className="flex items-center gap-2 mt-1 min-w-0">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap shrink-0 border ${
                              p.conversionType === 'COBOL_TO_JAVA'
                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200/80'
                            }`}
                            title={
                              p.conversionType === 'COBOL_TO_JAVA'
                                ? 'Category: COBOL to Java Modernization Pipeline'
                                : 'Category: BMS/DSPF to React Modernization Pipeline'
                            }
                          >
                            {p.conversionType === 'COBOL_TO_JAVA' ? 'COBOL → Java' : 'BMS/DSPF → React'}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleCopyId(p.id, e)}
                            className="inline-flex items-center gap-1 font-mono text-[10px] text-[#64748B] hover:text-[#17263A] bg-transparent hover:bg-slate-100/80 px-1 py-0.5 rounded transition-colors group/id shrink min-w-0 cursor-pointer"
                            title={copiedId === p.id ? 'Copied to clipboard!' : `Project ID: ${p.id} (Click to copy)`}
                          >
                            <span className="truncate max-w-[120px] sm:max-w-[150px]">{p.id}</span>
                            {copiedId === p.id ? (
                              <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 text-[#94A3B8] group-hover/id:text-[#17263A] opacity-0 group-hover/id:opacity-100 transition-opacity shrink-0" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Column 2: Partner / Organization */}
                      <td className="py-3 px-4">
                        <div className="min-w-0">
                          <div className="font-semibold text-[#17263A] truncate max-w-[200px]" title={p.organizationName || p.partnerName}>
                            {p.organizationName || p.partnerName || 'Enterprise Client'}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] font-mono text-[#8491A3]">
                            <span className="truncate max-w-[140px]" title={`Org ID: ${p.organizationId}`}>{p.organizationId}</span>
                            {p.partnerName && (
                              <span className="px-1 py-0.2 rounded text-[9px] bg-purple-50 text-purple-700 font-sans border border-purple-200">
                                Partner
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Target Architecture */}
                      <td className="py-3 px-4 text-[#17263A]">
                        <span className="inline-block px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#DCE3EC] text-[11px] font-mono whitespace-nowrap">
                          {p.targetFramework || (p.conversionType === 'COBOL_TO_JAVA' ? 'Spring Boot 3.3 / Java 21' : 'React 19 + Tailwind CSS')}
                        </span>
                      </td>

                      {/* Column 4: Status & Progress */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <StatusBadge status={p.status} />
                          {totalItems > 0 && (
                            <div className="flex items-center gap-2 text-[10px] text-[#8491A3]">
                              <div className="w-16 h-1.5 bg-[#DCE3EC] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#244A70] rounded-full transition-all"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span className="font-medium font-mono">{progressPct}%</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 5: Assigned Team Lead */}
                      <td className="py-3 px-4">
                        {isAssigned ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-[#244A70] flex items-center justify-center text-[10px] font-bold shrink-0">
                              {(p.assignedTeamLeadName || leadUser?.fullName || 'TL').charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[#17263A] flex items-center gap-1 truncate max-w-[150px]">
                                <span className="truncate" title={p.assignedTeamLeadName || leadUser?.fullName}>
                                  {p.assignedTeamLeadName || leadUser?.fullName}
                                </span>
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              </div>
                              <div className="text-[10px] text-[#8491A3] truncate max-w-[150px]" title={leadUser?.email || 'Engineering Lead'}>
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

                      {/* Column 6: Allocated Staff */}
                      <td className="py-3 px-4">
                        {p.assignedStaffName ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Users className="w-3.5 h-3.5 text-[#244A70] shrink-0" />
                            <span className="font-medium text-[#17263A] truncate max-w-[130px]" title={p.assignedStaffName}>
                              {p.assignedStaffName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#8491A3]/70 italic text-[11px]">Unallocated</span>
                        )}
                      </td>

                      {/* Column 7: Allocation Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Admin Intake Review Button for submitted / pending projects */}
                          {(p.status === 'SUBMITTED' || p.status === 'PENDING_REVIEW' || p.status === 'NEEDS_INFO' || p.status === 'READY_FOR_ASSIGNMENT') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openIntakeModal(p);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="Review Customer Submission"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Review Intake
                            </button>
                          )}

                          {/* Assign / Reassign Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssignModal(p);
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              isAssigned
                                ? 'border border-[#DCE3EC] bg-white text-[#17263A] hover:bg-[#F8FAFC]'
                                : 'bg-[#244A70] text-white hover:bg-[#244A70] shadow-2xs'
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {isAssigned ? 'Reassign Lead' : 'Assign to Lead'}
                          </button>

                          {/* Transfer Resource Ownership */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTransferTargetProject(p);
                            }}
                            title="Transfer Resource Ownership"
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border border-[#DCE3EC] bg-white text-[#17263A] hover:bg-blue-50/50 hover:text-[#244A70] transition-colors cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-[#244A70]" />
                            Transfer
                          </button>

                          {/* View Project Details Modal */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailsTargetProject(p);
                            }}
                            title="View Project Details Dossier"
                            className="p-1.5 rounded-lg border border-[#DCE3EC] bg-white text-[#8491A3] hover:text-[#244A70] hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Jump to Workspace */}
                          <Link
                            to={`/partners/projects/${p.id}/workspace`}
                            onClick={(e) => e.stopPropagation()}
                            title="Open Full Conversion Workspace"
                            className="p-1.5 rounded-lg border border-[#DCE3EC] bg-white text-[#8491A3] hover:text-[#244A70] hover:bg-blue-50 transition-colors"
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

      {/* Section VII.1: Create Enterprise Project Modal (Managed Modernization Services) */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Enterprise Modernization Project"
      >
        <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
          <p className="text-xs text-[#8491A3]">
            Initiate a managed enterprise conversion project under the Managed Modernization Services SLA pipeline. Platform-based modernization projects are strictly separated.
          </p>

          <div>
            <label className="block text-xs font-semibold text-[#17263A] mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CoreBanking-BMS-Migration"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-[#DCE3EC] bg-white text-[#17263A] focus:outline-none focus:border-[#244A70] focus:ring-2 focus:ring-[#244A70]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17263A] mb-1">
              Enterprise Client Organization *
            </label>
            <select
              required
              value={createForm.organizationId}
              onChange={(e) => setCreateForm({ ...createForm, organizationId: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-[#DCE3EC] bg-white text-[#17263A] focus:outline-none focus:border-[#244A70] focus:ring-2 focus:ring-[#244A70]/20"
            >
              <option value="">-- Select Client Organization --</option>
              {enterpriseOrgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.type || 'ENTERPRISE'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#17263A] mb-1">
                Conversion Pipeline *
              </label>
              <select
                value={createForm.conversionType}
                onChange={(e) => {
                  const type = e.target.value as 'BMS_DSPF_TO_FRONTEND' | 'COBOL_TO_JAVA';
                  setCreateForm({
                    ...createForm,
                    conversionType: type,
                    targetFramework: type === 'COBOL_TO_JAVA' ? 'Spring Boot 3.3 / Java 21' : 'React 19 + Tailwind CSS',
                  });
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-[#DCE3EC] bg-white text-[#17263A] focus:outline-none focus:border-[#244A70]"
              >
                <option value="COBOL_TO_JAVA">COBOL → Java 21</option>
                <option value="BMS_DSPF_TO_FRONTEND">BMS/DSPF → React 19</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17263A] mb-1">
                Target Architecture
              </label>
              <input
                type="text"
                value={createForm.targetFramework}
                onChange={(e) => setCreateForm({ ...createForm, targetFramework: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-[#DCE3EC] bg-white text-[#17263A] focus:outline-none focus:border-[#244A70]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17263A] mb-1">
              Assign Initial Team Lead (Optional)
            </label>
            <select
              value={createForm.initialLeadId}
              onChange={(e) => setCreateForm({ ...createForm, initialLeadId: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-[#DCE3EC] bg-white text-[#17263A] focus:outline-none focus:border-[#244A70]"
            >
              <option value="">-- Leave Unassigned (Allocate Later) --</option>
              {teamLeads.map((tl) => (
                <option key={tl.id} value={tl.id}>
                  {tl.fullName} ({tl.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17263A] mb-1">
              Description / Conversion Scope Notes
            </label>
            <textarea
              rows={2}
              placeholder="Modernization goals, legacy subsystem inventory, or compliance notes..."
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-[#DCE3EC] bg-white text-[#17263A] focus:outline-none focus:border-[#244A70]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3EC]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={creating || !createForm.name.trim() || !createForm.organizationId}
              className="bg-[#244A70] hover:bg-[#244A70] text-xs text-white"
            >
              {creating ? 'Creating Project...' : 'Create Enterprise Project'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Section VII.2 & VII.3: Assign / Reassign Team Lead Modal */}
      <Modal
        isOpen={!!assignTargetProject}
        onClose={() => setAssignTargetProject(null)}
        title={isReassigning ? 'Reassign Project to Team Lead' : 'Allocate Project to Team Lead'}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <p className="text-xs text-[#8491A3]">
            Select an authorized engineering Team Lead to supervise this Managed Modernization Services project, delegate staff engineers, and perform conversion quality review.
          </p>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-[#DCE3EC] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#8491A3]">Project Name:</span>
              <strong className="text-[#17263A]">{assignTargetProject?.name}</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#8491A3]">Category & Pipeline:</span>
              <span className="font-semibold text-slate-800">
                {assignTargetProject?.conversionType === 'COBOL_TO_JAVA' ? 'COBOL → Java 21' : 'BMS/DSPF → React 19'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#8491A3]">Client Organization:</span>
              <span className="font-medium text-slate-800">
                {assignTargetProject?.organizationName || assignTargetProject?.partnerName || assignTargetProject?.organizationId}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-[#DCE3EC] pt-1.5">
              <span className="text-[#8491A3]">Current Assignment:</span>
              <span className="font-semibold text-[#17263A]">
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
                <strong>Reassignment Notice:</strong> This project is currently assigned. Selecting a new Team Lead will transfer primary managerial oversight and alert the new Team Lead in their workspace queue.
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#17263A] mb-1">
              Select Primary Team Lead *
            </label>

            {/* Quick search inside lead list */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search team lead by name or email..."
                value={leadSearchQuery}
                onChange={(e) => setLeadSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#244A70]"
              />
            </div>

            {/* Standard Accessible Combobox for Testing & Form Submission */}
            <select
              required
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-[#DCE3EC] bg-white text-[#17263A] focus:outline-none focus:border-[#244A70] focus:ring-2 focus:ring-[#244A70]/20"
            >
              <option value="">-- Choose an Authorized Team Lead --</option>
              {modalFilteredLeads.map((lead) => {
                const activeLoad = projects.filter((p) => p.assignedTeamLeadId === lead.id).length;
                return (
                  <option key={lead.id} value={lead.id}>
                    {lead.fullName} ({lead.email}) — Workload: {activeLoad} active projects
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17263A] mb-1">
              Assignment Notes / Technical Briefing
            </label>
            <textarea
              rows={2}
              placeholder="Provide technical briefing, priorities, or specific instructions for the Team Lead..."
              value={assignmentNote}
              onChange={(e) => setAssignmentNote(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-[#DCE3EC] bg-white text-[#17263A] focus:outline-none focus:border-[#244A70]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3EC]">
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
              className="bg-[#244A70] hover:bg-[#244A70] text-xs text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {assigning ? 'Allocating...' : isReassigning ? 'Confirm Reassignment' : 'Allocate to Team Lead'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Section VII.5: View Project Details Dossier Modal */}
      <Modal
        isOpen={!!detailsTargetProject}
        onClose={() => setDetailsTargetProject(null)}
        title="Enterprise Project Dossier"
      >
        {detailsTargetProject && (
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#17263A]">{detailsTargetProject.name}</span>
                <StatusBadge status={detailsTargetProject.status} />
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                <span>Project ID: {detailsTargetProject.id}</span>
                <button
                  onClick={(e) => handleCopyId(detailsTargetProject.id, e)}
                  className="hover:text-blue-600 transition-colors"
                  title="Copy ID"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Grid properties */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Client Organization</span>
                <p className="font-semibold text-slate-800">{detailsTargetProject.organizationName || 'Enterprise Workspace'}</p>
                <p className="text-[10px] font-mono text-slate-500">{detailsTargetProject.organizationId}</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Conversion Pipeline</span>
                <p className="font-semibold text-slate-800">
                  {detailsTargetProject.conversionType === 'COBOL_TO_JAVA' ? 'COBOL → Java 21' : 'BMS/DSPF → React 19'}
                </p>
                <p className="text-[10px] font-mono text-slate-500">{detailsTargetProject.targetFramework || 'Default Framework'}</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Team Lead</span>
                <p className="font-semibold text-slate-800">
                  {detailsTargetProject.assignedTeamLeadName || 'Awaiting Team Lead'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {detailsTargetProject.assignedTeamLeadId ? 'Active Management' : 'Needs Allocation'}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Allocated Staff</span>
                <p className="font-semibold text-slate-800">
                  {detailsTargetProject.assignedStaffName || 'Unallocated'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {detailsTargetProject.assignedStaffId ? 'Conversion in progress' : 'Awaiting Staff'}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="p-3 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700">Conversion & Verification Progress</span>
                <span className="font-mono font-bold text-[#244A70]">
                  {(detailsTargetProject.screensCompleted || 0) + (detailsTargetProject.programsCompleted || 0)} / {(detailsTargetProject.screensTotal || 0) + (detailsTargetProject.programsTotal || 0)} items completed
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#244A70] rounded-full transition-all"
                  style={{
                    width: `${
                      (detailsTargetProject.screensTotal || 0) + (detailsTargetProject.programsTotal || 0) > 0
                        ? Math.round(
                            (((detailsTargetProject.screensCompleted || 0) + (detailsTargetProject.programsCompleted || 0)) /
                              ((detailsTargetProject.screensTotal || 0) + (detailsTargetProject.programsTotal || 0))) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Created: {new Date(detailsTargetProject.createdAt).toLocaleDateString()}</span>
              {detailsTargetProject.lastUpdated && (
                <span>Updated: {new Date(detailsTargetProject.lastUpdated).toLocaleDateString()}</span>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setDetailsTargetProject(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const pid = detailsTargetProject.id;
                  setDetailsTargetProject(null);
                  navigate(`/partners/projects/${pid}/workspace`);
                }}
                className="bg-[#244A70] text-white text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Open Conversion Workspace
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Admin Intake & Review Modal */}
      <Modal
        isOpen={!!intakeTargetProject}
        onClose={() => setIntakeTargetProject(null)}
        title="Admin Intake & Project Review"
      >
        {intakeTargetProject && (
          <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-[#DCE3EC] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#8491A3]">Project Name:</span>
                <strong className="text-[#17263A]">{intakeTargetProject.name}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8491A3]">Client Organization:</span>
                <span className="font-semibold">{intakeTargetProject.organizationName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8491A3]">Contract Reference:</span>
                <span className="font-mono font-bold text-[#244A70]">
                  {intakeTargetProject.contractNumber || 'ALSM-CTR-2026-9A52'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8491A3]">Modernization Pipeline:</span>
                <span className="font-semibold">{intakeTargetProject.conversionType === 'COBOL_TO_JAVA' ? 'COBOL → Java 21' : 'BMS/DSPF → React 19'}</span>
              </div>
              {intakeTargetProject.businessRequirements && (
                <div className="pt-2 border-t border-[#DCE3EC]">
                  <span className="text-[#8491A3] block mb-1">Business Requirements:</span>
                  <div className="p-2 bg-white rounded border border-[#DCE3EC] text-slate-700">
                    {intakeTargetProject.businessRequirements}
                  </div>
                </div>
              )}
              {intakeTargetProject.files && intakeTargetProject.files.length > 0 && (
                <div className="pt-2 border-t border-[#DCE3EC]">
                  <span className="text-[#8491A3] block mb-1 font-semibold">
                    Legacy Files & Supporting Documents ({intakeTargetProject.files.length}):
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1">
                    {intakeTargetProject.files.map((f, i) => (
                      <div key={i} className="flex justify-between items-center p-1.5 bg-white rounded border border-slate-200">
                        <span className="font-mono text-[11px] truncate">{f.originalName}</span>
                        <span className="text-[10px] text-slate-500 font-sans">{f.category || 'SOURCE_CODE'} ({Math.round(f.fileSize / 1024)} KB)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17263A] mb-1">Review Decision *</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewAction('APPROVE')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    reviewAction === 'APPROVE'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Approve Project
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction('REQUEST_INFO')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    reviewAction === 'REQUEST_INFO'
                      ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Request Info
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction('REJECT')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    reviewAction === 'REJECT'
                      ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Reject Request
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17263A] mb-1">
                Review Feedback / Explanation Notes
              </label>
              <textarea
                rows={3}
                required={reviewAction !== 'APPROVE'}
                placeholder={reviewAction === 'APPROVE' ? 'Approval notes or briefing for Team Lead assignment...' : 'Specify missing inputs or rejection rationale...'}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#DCE3EC] bg-white text-[#17263A] focus:outline-none focus:border-[#244A70]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3EC]">
              <Button type="button" variant="outline" size="sm" onClick={() => setIntakeTargetProject(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={reviewing || (reviewAction !== 'APPROVE' && !reviewNotes.trim())}
                className={reviewAction === 'APPROVE' ? 'bg-emerald-600 text-white' : reviewAction === 'REQUEST_INFO' ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'}
              >
                {reviewing ? 'Submitting Review...' : reviewAction === 'APPROVE' ? 'Approve for Assignment' : reviewAction === 'REQUEST_INFO' ? 'Send Request to Customer' : 'Confirm Rejection'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reusable Resource Ownership Transfer Modal */}
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
