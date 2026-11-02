import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderKanban, Users, Search, RefreshCw, AlertCircle,
  Building2,
  ShieldCheck, Check, UserPlus, Sparkles, ArrowRightLeft,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { partnersApi } from '@/features/partners/api/partners.api';
import { adminApi } from '@/features/admin/api/admin.api';
import { PartnerProject } from '@/features/partners/types/partner.types';
import { StatusBadge } from '@/shared/ui/Badge';

export const TeamLeadProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<PartnerProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [staffFilter, setStaffFilter] = useState<'ALL' | 'UNALLOCATED' | 'ALLOCATED'>('ALL');
  const [viewScope, setViewScope] = useState<'MY_PROJECTS' | 'ALL'>('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [fetchedProjects, fetchedOrgs] = await Promise.all([
        partnersApi.getProjects(),
        adminApi.getOrganizations().catch(() => []),
      ]);

      const orgMap = new Map<string, string>();
      (fetchedOrgs || []).forEach((o: any) => {
        if (o.id && o.name) orgMap.set(o.id, o.name);
      });

      // Filter and map ONLY real Managed Modernization Services projects (Web 3 / Contract Type 2)
      const managedOnly = (fetchedProjects || [])
        .map((p) => {
          const resolvedPartner =
            p.partnerName && p.partnerName !== 'Not linked to a partner'
              ? p.partnerName
              : orgMap.get(p.organizationId) || p.partnerName || 'Enterprise Client';
          return { ...p, partnerName: resolvedPartner };
        })
        .filter((p) => {
          // Exclude pure self-service projects without contracts or managed stages
          if (p.serviceType === 'SELF_SERVICE' && !p.contractNumber && !p.currentStage) {
            return false;
          }
          if (p.serviceType === 'MANAGED') return true;
          if (p.contractNumber || p.contractId) return true;
          if (p.currentStage) return true;
          if (p.partnerId && p.partnerId.trim().length > 0) return true;
          return false;
        });

      setProjects(managedOnly);
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
      (p.contractNumber && p.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, staffFilter, viewScope, pageSize]);

  // KPI Metrics
  const totalAssignedProjects = projects.length;
  const unallocatedStaffCount = projects.filter((p) => !p.assignedStaffId).length;
  const allocatedStaffCount = projects.filter((p) => !!p.assignedStaffId).length;
  const readyForReviewCount = projects.filter(
    (p) => p.status === 'READY_FOR_EXPORT' || p.status === 'COMPLETED'
  ).length;

  const totalPages = Math.ceil(filteredProjects.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredProjects.length);
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Employee Allocation
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#244A70] border border-blue-200">
              Managed Modernization Services (Web 3)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Allocate and supervise engineering staff for enterprise managed conversion projects under Contract Type 2.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/team-lead/resource-transfers"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors h-8"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#244A70]" />
            Transfer Approvals
          </Link>
          <Link
            to="/admin/projects"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors h-8"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#244A70]" />
            Admin Allocation
          </Link>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#244A70]' : ''}`} />
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
            staffFilter === 'ALL' && viewScope === 'ALL' ? 'border-[#244A70] ring-1 ring-[#244A70] bg-blue-50/20' : 'border-slate-200'
          }`}
          title="Click to view all supervised managed projects"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-600 group-hover:text-[#244A70] transition-colors">Supervised Projects</span>
            <FolderKanban className="w-4 h-4 text-slate-400 group-hover:text-[#244A70] transition-colors" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{totalAssignedProjects}</div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Managed Modernization</span>
            <span className="text-[#244A70] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View all →</span>
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
            <span className="text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Review →</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by project name, partner, or staff member..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#244A70] focus:border-transparent transition-all shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200 text-xs self-start sm:self-auto">
          <button
            onClick={() => setStaffFilter('ALL')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              staffFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Projects ({totalAssignedProjects})
          </button>
          <button
            onClick={() => setStaffFilter('UNALLOCATED')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              staffFilter === 'UNALLOCATED' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Needs Staff</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              {unallocatedStaffCount}
            </span>
          </button>
          <button
            onClick={() => setStaffFilter('ALLOCATED')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              staffFilter === 'ALLOCATED' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff Assigned ({allocatedStaffCount})
          </button>
        </div>
      </div>

      {/* Scope Toggles */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <div className="flex items-center gap-2">
          <span>Viewing Scope:</span>
          <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 shadow-xs">
            <button
              onClick={() => setViewScope('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                viewScope === 'ALL' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Team Lead Projects
            </button>
            <button
              onClick={() => setViewScope('MY_PROJECTS')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                viewScope === 'MY_PROJECTS' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Assigned to Me
            </button>
          </div>
        </div>
        <span>
          Showing {filteredProjects.length} modernizing {filteredProjects.length === 1 ? 'project' : 'projects'}
        </span>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4">Modernization Project</th>
              <th className="py-3 px-4">Partner Client</th>
              <th className="py-3 px-4">Conversion Target</th>
              <th className="py-3 px-4">Progress & Status</th>
              <th className="py-3 px-4">Assigned Team Lead</th>
              <th className="py-3 px-4">Assigned Conversion Staff</th>
              <th className="py-3 px-4 text-right">Engineering Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#244A70] mb-2" />
                  Loading managed modernization projects...
                </td>
              </tr>
            ) : filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  <FolderKanban className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700">No managed modernization projects found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {searchTerm ? 'Try adjusting your search criteria' : 'Managed projects created from Web 3 will appear here for staff allocation.'}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedProjects.map((p) => {
                const totalItems = (p.screensTotal || 0) + (p.programsTotal || 0);
                const completedItems = (p.screensCompleted || 0) + (p.programsCompleted || 0);
                const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : (p.progressPct || 0);
                const hasStaff = !!p.assignedStaffId;

                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/partners/projects/${p.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Modernization Project */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-[#244A70] transition-colors">
                        <Link
                          to={`/partners/projects/${p.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline flex items-center gap-1.5"
                          title="View Project Specifications & Details"
                        >
                          <FolderKanban className="w-4 h-4 text-[#244A70] shrink-0" />
                          <span>{p.name}</span>
                        </Link>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-400">{p.id}</span>
                        {p.contractNumber && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-50 text-[#244A70] border border-blue-200">
                            {p.contractNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Partner Client */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-800">
                            {p.partnerName && p.partnerName !== 'Not linked to a partner'
                              ? p.partnerName
                              : 'Enterprise Client'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {p.partnerId || p.organizationId}
                          </div>
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
                              className="h-full bg-[#244A70] rounded-full"
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
                        <div className="w-5 h-5 rounded-md bg-blue-100 text-[#244A70] flex items-center justify-center text-[10px] font-bold">
                          {(p.assignedTeamLeadName || 'TL').charAt(0)}
                        </div>
                        <span className="text-xs">{p.assignedTeamLeadName || 'Unassigned'}</span>
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
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {/* Allocate Staff -> directly navigates to /team-lead/projects/:projectId/allocate */}
                        <Link
                          to={`/team-lead/projects/${p.id}/allocate`}
                          title={hasStaff ? 'Reallocate Conversion Staff (Detailed Page)' : 'Allocate Conversion Staff (Detailed Page)'}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors h-7 ${
                            hasStaff
                              ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              : 'bg-amber-500 text-white hover:bg-amber-600 shadow-xs'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{hasStaff ? 'Reallocate Staff' : 'Allocate Staff'}</span>
                        </Link>

                        {/* Project Details -> navigates to /partners/projects/:projectId */}
                        <Link
                          to={`/partners/projects/${p.id}`}
                          title="View Project Specifications, Files & Deliverables"
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold border border-blue-200 bg-blue-50 text-[#244A70] hover:bg-blue-100 transition-colors h-7"
                        >
                          <FolderKanban className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </Link>

                        {/* Transfer Ownership -> navigates to /team-lead/projects/:projectId/transfer */}
                        <Link
                          to={`/team-lead/projects/${p.id}/transfer`}
                          title="Transfer Project Responsibility"
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-blue-50/50 hover:text-[#244A70] transition-colors h-7"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-[#244A70]" />
                          <span>Transfer</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {filteredProjects.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 border-t border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#244A70]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-slate-400">|</span>
              <span>
                Showing <strong className="font-semibold text-slate-900">{startIndex + 1}</strong> to{' '}
                <strong className="font-semibold text-slate-900">{endIndex}</strong> of{' '}
                <strong className="font-semibold text-slate-900">{filteredProjects.length}</strong> projects
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              
              <div className="flex items-center gap-1 px-2">
                <span className="font-semibold text-slate-900">{currentPage}</span>
                <span className="text-slate-400">/</span>
                <span>{totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamLeadProjectsPage;
