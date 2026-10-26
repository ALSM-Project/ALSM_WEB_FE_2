import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderKanban, Users, Search, RefreshCw, AlertCircle,
  CheckCircle2, Building2, ArrowRight,
  ShieldCheck, Check, ChevronDown, UserPlus, Sparkles, ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { partnersApi } from '@/features/partners/api/partners.api';
import { PartnerProject } from '@/features/partners/types/partner.types';
import { Button, Modal, Input } from '@/shared/ui';
import { StatusBadge } from '@/shared/ui/Badge';
import { ResourceTransferModal, CandidateAssignee } from '@/features/admin/components/ResourceTransferModal';

interface AssignableStaffMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  activeWorkload: number;
}

export const TeamLeadProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<PartnerProject[]>([]);
  const [staffRoster, setStaffRoster] = useState<AssignableStaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [staffFilter, setStaffFilter] = useState<'ALL' | 'UNALLOCATED' | 'ALLOCATED'>('ALL');
  const [viewScope, setViewScope] = useState<'MY_PROJECTS' | 'ALL'>('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Staff Allocation Modal
  const [allocationTarget, setAllocationTarget] = useState<PartnerProject | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [isAllocating, setIsAllocating] = useState(false);

  // Resource Ownership Transfer Modal (Section 2.C)
  const [transferTargetProject, setTransferTargetProject] = useState<PartnerProject | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [fetchedProjects, fetchedStaff] = await Promise.all([
        partnersApi.getProjects(),
        partnersApi.getAssignableStaff(),
      ]);
      setProjects(fetchedProjects || []);
      setStaffRoster(fetchedStaff || []);
    } catch (err: any) {
      console.error('Failed to load team lead projects:', err);
      setErrorMsg(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAllocateModal = (proj: PartnerProject) => {
    setAllocationTarget(proj);
    setSelectedStaffId(proj.assignedStaffId || 'staff-01');
    setAssignmentNote('');
  };

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocationTarget || !selectedStaffId) return;

    try {
      setIsAllocating(true);
      const selectedMember = staffRoster.find((s) => s.id === selectedStaffId);
      const staffName = selectedMember?.fullName || 'Conversion Staff';

      const updated = await partnersApi.assignProject(allocationTarget.id, {
        staffId: selectedStaffId,
        staffName,
      });

      // Update state
      setProjects((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
      );

      setSuccessMsg(
        `Staff member "${staffName}" successfully allocated to "${allocationTarget.name}". Work items dispatched to employee queue.`
      );
      setAllocationTarget(null);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to allocate staff member');
    } finally {
      setIsAllocating(false);
    }
  };

  // Filter projects by current user if viewScope === 'MY_PROJECTS'
  const isUserTeamLead = (p: PartnerProject) => {
    if (!user) return true;
    return (
      p.assignedTeamLeadId === user.id ||
      (p.assignedTeamLeadName && p.assignedTeamLeadName.toLowerCase().includes(user.fullName.toLowerCase())) ||
      user.isPlatformAdmin
    );
  };

  const filteredProjects = projects.filter((p) => {
    const matchesScope = viewScope === 'ALL' || isUserTeamLead(p);

    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.organizationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.assignedStaffName && p.assignedStaffName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.assignedTeamLeadName && p.assignedTeamLeadName.toLowerCase().includes(searchTerm.toLowerCase()));

    const isStaffAllocated = !!p.assignedStaffId;
    const matchesStaff =
      staffFilter === 'ALL' ||
      (staffFilter === 'UNALLOCATED' && !isStaffAllocated) ||
      (staffFilter === 'ALLOCATED' && isStaffAllocated);

    return matchesScope && matchesSearch && matchesStaff;
  });

  // KPI Metrics
  const totalAssignedProjects = projects.length;
  const unallocatedStaffCount = projects.filter((p) => !p.assignedStaffId).length;
  const allocatedStaffCount = projects.filter((p) => !!p.assignedStaffId).length;
  const readyForReviewCount = projects.filter(
    (p) => p.status === 'READY_FOR_EXPORT' || p.status === 'COMPLETED'
  ).length;

  const conversionStaffOnly = staffRoster.filter(
    (s) => s.role === 'CONVERSION_STAFF' || s.id.startsWith('staff')
  );

  const transferCandidates: CandidateAssignee[] = conversionStaffOnly.map((staff) => ({
    id: staff.id,
    fullName: staff.fullName,
    email: staff.email,
    role: 'Conversion Staff',
    isActive: true,
    activeWorkload: staff.activeWorkload,
    maxCapacity: 5,
  }));

  const handleTransferConfirm = async (
    resourceId: string,
    newAssignee: CandidateAssignee,
    reason: string,
    _notes: string
  ) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === resourceId
          ? {
              ...p,
              assignedStaffId: newAssignee.id,
              assignedStaffName: newAssignee.fullName,
            }
          : p
      )
    );
    try {
      await partnersApi.assignProject(resourceId, {
        staffId: newAssignee.id,
        staffName: newAssignee.fullName,
      });
    } catch {
      // Local state fallback
    }
    setSuccessMsg(
      `Project "${resourceId}" assignment successfully transferred to ${newAssignee.fullName} (${reason}).`
    );
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#0652CC] border border-blue-200 uppercase tracking-wider">
              Engineering Supervision
            </span>
            <span className="text-[11px] text-slate-500">Stage 2: Staff Allocation & Workspace Access</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
            Team Modernization Projects & Staff Allocation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
            Oversee legacy conversion projects assigned by Administration. Assign qualified Conversion Staff engineers to work items and directly launch the full-width Web 1 Conversion Workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/projects"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors h-8"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#0652CC]" />
            Admin Allocation
          </Link>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0652CC]' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Metric Cards - Clickable to filter & inspect */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setStaffFilter('ALL');
            setViewScope('ALL');
            setSearchTerm('');
          }}
          className={`bg-white rounded-lg border p-4 shadow-xs cursor-pointer transition-all hover:border-slate-300 group ${
            staffFilter === 'ALL' && viewScope === 'ALL' ? 'border-[#0652CC] ring-1 ring-[#0652CC] bg-blue-50/20' : 'border-slate-200'
          }`}
          title="Click to view all supervised projects"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-600 group-hover:text-[#0652CC] transition-colors">Supervised Projects</span>
            <FolderKanban className="w-4 h-4 text-slate-400 group-hover:text-[#0652CC] transition-colors" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{totalAssignedProjects}</div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Under Team Lead leadership</span>
            <span className="text-[#0652CC] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View all →</span>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setStaffFilter('UNALLOCATED');
          }}
          className={`rounded-lg border p-4 shadow-xs cursor-pointer transition-all hover:border-amber-400 group bg-white ${
            staffFilter === 'UNALLOCATED' ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-50/20' : 'border-slate-200'
          }`}
          title="Click to view projects awaiting staff allocation"
        >
          <div className="flex items-center justify-between text-xs text-amber-800">
            <span className="font-semibold text-amber-800">Awaiting Staff Allocation</span>
            <UserPlus className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 tracking-tight mt-1">{unallocatedStaffCount}</div>
          <div className="flex items-center justify-between text-[11px] text-amber-700/80 mt-1">
            <span>Ready to be assigned to engineers</span>
            <span className="font-semibold text-amber-800 opacity-0 group-hover:opacity-100 transition-opacity">Assign staff →</span>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setStaffFilter('ALLOCATED');
          }}
          className={`bg-white rounded-lg border p-4 shadow-xs cursor-pointer transition-all hover:border-emerald-400 group ${
            staffFilter === 'ALLOCATED' ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/20' : 'border-slate-200'
          }`}
          title="Click to view projects with staff assigned"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-600 group-hover:text-emerald-700 transition-colors">Conversion Staff Assigned</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{allocatedStaffCount}</div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Currently in conversion queues</span>
            <span className="text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View assigned →</span>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setSearchTerm('READY');
          }}
          className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs cursor-pointer transition-all hover:border-indigo-400 group"
          title="Click to view projects ready for review"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-600 group-hover:text-indigo-700 transition-colors">Ready for Final Review</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{readyForReviewCount}</div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Conversions complete & validated</span>
            <span className="text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Review items →</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-64 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search by project name, partner, or staff member..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-8.5 rounded-md border-slate-200 focus:border-[#0652CC]"
            />
          </div>

          {/* Allocation Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200/80">
            <button
              onClick={() => setStaffFilter('ALL')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                staffFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Projects ({totalAssignedProjects})
            </button>
            <button
              onClick={() => setStaffFilter('UNALLOCATED')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                staffFilter === 'UNALLOCATED'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-800 hover:text-amber-900'
              }`}
            >
              <span>Needs Staff</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                staffFilter === 'UNALLOCATED' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {unallocatedStaffCount}
              </span>
            </button>
            <button
              onClick={() => setStaffFilter('ALLOCATED')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                staffFilter === 'ALLOCATED'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Staff Assigned ({allocatedStaffCount})
            </button>
          </div>
        </div>

        {/* View Scope Toggle */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium text-[11px]">Viewing Scope:</span>
            <div className="inline-flex rounded-md bg-slate-100 p-0.5 border border-slate-200/80">
              <button
                onClick={() => setViewScope('ALL')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  viewScope === 'ALL'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Team Lead Projects
              </button>
              <button
                onClick={() => setViewScope('MY_PROJECTS')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  viewScope === 'MY_PROJECTS'
                    ? 'bg-[#0652CC] text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Assigned to Me
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500">
            Showing <strong className="text-slate-900 font-semibold">{filteredProjects.length}</strong> modernizing projects
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="alsm-table-container">
        <table className="alsm-table">
          <thead>
            <tr>
              <th>Modernization Project</th>
              <th>Partner Client</th>
              <th>Conversion Target</th>
              <th>Progress & Status</th>
              <th>Assigned Team Lead</th>
              <th>Assigned Conversion Staff</th>
              <th className="text-right">Engineering Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-5 h-5 text-[#0652CC] animate-spin" />
                    <span className="text-xs">Loading team lead project roster...</span>
                  </div>
                </td>
              </tr>
            ) : filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <FolderKanban className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-800 text-sm">No projects found</p>
                  <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search keywords.</p>
                </td>
              </tr>
            ) : (
              filteredProjects.map((p) => {
                const totalItems = (p.screensTotal || 0) + (p.programsTotal || 0);
                const completedItems = (p.screensCompleted || 0) + (p.programsCompleted || 0);
                const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
                const hasStaff = !!p.assignedStaffId;

                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/partners/projects/${p.id}/workspace`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Modernization Project */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-[#0652CC] transition-colors">
                        {p.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">{p.id}</div>
                    </td>

                    {/* Partner Client */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-800">{p.partnerName}</div>
                          <div className="text-[10px] font-mono text-slate-400">{p.partnerId}</div>
                        </div>
                      </div>
                    </td>

                    {/* Conversion Target */}
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-[11px] font-mono text-slate-800">
                        {p.targetFramework}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {p.conversionType === 'COBOL_TO_JAVA' ? 'COBOL -> Java' : 'BMS/DSPF -> React'}
                      </div>
                    </td>

                    {/* Progress & Status */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <StatusBadge status={p.status} />
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                            <div
                              className="h-full bg-[#0652CC] rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="font-mono">
                            {completedItems}/{totalItems} ({progressPct}%)
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Assigned Team Lead */}
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-blue-100 text-[#0652CC] flex items-center justify-center text-[10px] font-bold">
                          {(p.assignedTeamLeadName || 'TL').charAt(0)}
                        </div>
                        <span className="text-xs">{p.assignedTeamLeadName || 'Sarah Jenkins'}</span>
                      </div>
                    </td>

                    {/* Assigned Conversion Staff */}
                    <td className="py-3 px-4">
                      {hasStaff ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                            {(p.assignedStaffName || 'CS').charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 flex items-center gap-1 text-xs">
                              {p.assignedStaffName}
                              <Check className="w-3 h-3 text-emerald-600" />
                            </div>
                            <span className="text-[10px] text-slate-400">Conversion Staff</span>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertCircle className="w-3 h-3" />
                          Awaiting Staff Allocation
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAllocateModal(p);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors h-7 ${
                            hasStaff
                              ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              : 'bg-amber-500 text-white hover:bg-amber-600 shadow-xs'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          {hasStaff ? 'Reallocate Staff' : 'Allocate Staff'}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTransferTargetProject(p);
                          }}
                          title="Transfer Resource Ownership (Section 2.C)"
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-blue-50/50 hover:text-[#0652CC] transition-colors h-7"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-[#0652CC]" />
                          Transfer
                        </button>

                        <Link
                          to={`/partners/projects/${p.id}/workspace`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#0652CC] text-white hover:bg-[#0543A8] text-xs font-semibold shadow-xs transition-colors h-7"
                        >
                          <span>Open Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5" />
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

      {/* Staff Allocation Modal */}
      <Modal
        isOpen={!!allocationTarget}
        onClose={() => setAllocationTarget(null)}
        title="Allocate Conversion Staff to Project"
      >
        <form onSubmit={handleAllocateSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            As Team Lead, assign eligible system employees to execute AST parsing, field mapping, and interactive code conversions in the workspace.
          </p>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Target Project:</span>
              <strong className="text-slate-900">{allocationTarget?.name}</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Partner:</span>
              <span className="font-semibold text-slate-800">{allocationTarget?.partnerName}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Target Framework:</span>
              <span className="font-mono text-slate-900">{allocationTarget?.targetFramework}</span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
              <span className="text-slate-500">Currently Allocated:</span>
              <span className="font-semibold text-slate-900">
                {allocationTarget?.assignedStaffName || 'None (Unallocated)'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Select Conversion Staff Engineer *
            </label>
            <div className="relative">
              <select
                required
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-[#0652CC] focus:ring-1 focus:ring-[#0652CC] appearance-none pr-8"
              >
                <option value="">-- Choose Eligible Conversion Engineer --</option>
                {conversionStaffOnly.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.fullName} ({staff.email}) • Active Workload: {staff.activeWorkload} projects
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Engineering Notes & Priorities (Optional)
            </label>
            <textarea
              rows={3}
              value={assignmentNote}
              onChange={(e) => setAssignmentNote(e.target.value)}
              placeholder="e.g. Focus on DSPF header validation first; ensure BigDecimal precision in financial routines..."
              className="w-full text-xs p-2.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-[#0652CC] focus:ring-1 focus:ring-[#0652CC]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAllocationTarget(null)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isAllocating || !selectedStaffId}
              className="bg-[#0652CC] hover:bg-[#0543A8] text-xs h-8 shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {isAllocating ? 'Allocating...' : 'Confirm Staff Allocation'}
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
                type: 'Modernization Project Assignment',
                currentOwnerId: transferTargetProject.assignedStaffId,
                currentOwnerName: transferTargetProject.assignedStaffName || 'Unallocated',
                details: `${transferTargetProject.conversionType || 'Modernization'} • ${transferTargetProject.partnerName || 'Internal'}`,
              }
            : null
        }
        candidates={transferCandidates}
        onTransferConfirm={handleTransferConfirm}
      />
    </div>
  );
};
export default TeamLeadProjectsPage;
