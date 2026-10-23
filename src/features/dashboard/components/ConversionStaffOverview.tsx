import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Briefcase,
  Cpu,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  FolderKanban,
  Search,
  ArrowRight,
  KeyRound,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { StatusBadge } from '@/shared/ui/Badge';
import { partnersApi } from '@/features/partners/api/partners.api';
import { PartnerProject } from '@/features/partners/types/partner.types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { temporaryRolesApi } from '@/features/rbac/api/temporary-roles.api';

export const ConversionStaffOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Load projects from API
  const { data: rawProjects = [], isLoading: loadingProjects } = useQuery<PartnerProject[]>({
    queryKey: ['staff', 'dashboard', 'projects'],
    queryFn: () => partnersApi.getProjects(),
    staleTime: 15000,
  });

  // Load temporary elevations for staff (UC-95)
  const { data: myElevations = [] } = useQuery({
    queryKey: ['temporary-roles', 'my-elevations'],
    queryFn: () => temporaryRolesApi.getMyRequests().catch(() => []),
    staleTime: 15000,
  });

  const activeElevation = useMemo(() => {
    return myElevations.find((e) => e.status === 'ACTIVE');
  }, [myElevations]);

  const pendingElevation = useMemo(() => {
    return myElevations.find((e) => e.status === 'PENDING');
  }, [myElevations]);

  const allProjects = Array.isArray(rawProjects) ? rawProjects : [];

  // Filter projects assigned to this staff member
  const myProjects = useMemo(() => {
    return allProjects.filter(
      (p) => p.assignedStaffId === user?.id || !p.assignedStaffId || p.status === 'IN_PROGRESS'
    );
  }, [allProjects, user?.id]);

  const activeProjects = useMemo(
    () => myProjects.filter((p) => p.status === 'IN_PROGRESS'),
    [myProjects]
  );
  const reviewProjects = useMemo(
    () => myProjects.filter((p) => p.status === 'READY_FOR_EXPORT'),
    [myProjects]
  );
  const failedProjects = useMemo(
    () => myProjects.filter((p) => p.status === 'FAILED'),
    [myProjects]
  );

  // Filtered list based on user search and status tabs
  const filteredProjects = useMemo(() => {
    return myProjects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.partnerName && p.partnerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.targetFramework && p.targetFramework.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [myProjects, searchTerm, statusFilter]);

  // Reset to first page when filtering or searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredProjects.length);

  const paginatedProjects = useMemo(() => {
    return filteredProjects.slice(startIndex, endIndex);
  }, [filteredProjects, startIndex, endIndex]);

  const web1Url = import.meta.env.VITE_CONVERSION_WORKSPACE_URL || 'http://localhost:5173';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── 1. Compact Engineering Workspace Launch Bar ────────────────── */}
      <div className="bg-white border border-[#DCE3EC] border-l-4 border-l-[#244A70] rounded-lg p-4 sm:p-5 shadow-xs transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#17263A] tracking-tight">
                Web 1 Conversion Workspace
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Engine Ready</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-center flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/admin/temporary-roles')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-[#DCE3EC] text-[#17263A] hover:bg-[#F4F7FB] transition-colors shadow-2xs cursor-pointer"
              title="Request Temporary Role"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#244A70]" />
              <span>Request Elevation</span>
            </button>
            <a
              href={web1Url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#244A70] text-white hover:bg-[#1B3856] transition-colors shadow-2xs"
              title="Open Conversion Workspace in new tab"
            >
              <span>Open Workspace</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => navigate('/employee/queue')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-[#DCE3EC] text-[#17263A] hover:bg-[#F4F7FB] transition-colors shadow-2xs cursor-pointer"
            >
              <span>My Work Queue</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Active or Pending Temporary Role Notice (UC-95) ───────────── */}
      {activeElevation && (
        <div className="bg-white border border-blue-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#EEF1F6] text-[#244A70] flex items-center justify-center font-bold shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-[#17263A] flex flex-wrap items-center gap-2">
                <span>Active Temporary Role:</span>
                <span className="font-mono text-[#244A70] bg-[#EEF1F6] px-2 py-0.5 rounded border border-[#DCE3EC] text-xs font-bold">
                  {activeElevation.role}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-[#244A70] border border-blue-200">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Expires at {new Date(activeElevation.expiresAt).toLocaleTimeString()} ({new Date(activeElevation.expiresAt).toLocaleDateString()}). Reason: {activeElevation.reason}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/temporary-roles')}
            className="text-xs font-semibold text-[#244A70] hover:underline cursor-pointer shrink-0"
          >
            Manage Roles &rarr;
          </button>
        </div>
      )}

      {pendingElevation && !activeElevation && (
        <div className="bg-white border border-amber-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-800 flex items-center justify-center font-bold shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-[#17263A] flex flex-wrap items-center gap-2">
                <span>Pending Elevation Request:</span>
                <span className="font-mono text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 text-xs font-bold">
                  {pendingElevation.role} ({pendingElevation.durationHours}h)
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300">
                  Pending
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Requested at {new Date(pendingElevation.createdAt).toLocaleTimeString()} ({new Date(pendingElevation.createdAt).toLocaleDateString()}). Awaiting Team Lead review.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/temporary-roles')}
            className="text-xs font-semibold text-amber-800 hover:underline cursor-pointer shrink-0"
          >
            View Request &rarr;
          </button>
        </div>
      )}

      {/* ── 2. KPI Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Assigned Projects */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/employee/queue')}
          className="alsm-metric-card cursor-pointer group"
          title="View all assigned projects"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Assigned Projects
            </span>
            <div className="w-8 h-8 rounded-md bg-[#EEF1F6] text-[#244A70] flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#17263A] mt-2">
            {loadingProjects ? '...' : myProjects.length}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 mt-2 pt-2 border-t border-[#EEF1F6]">
            <span className="font-medium text-[#244A70]">
              {activeProjects.length} In Progress
            </span>
            <span className="text-[#244A70] group-hover:translate-x-0.5 transition-transform">
              &rarr;
            </span>
          </div>
        </div>

        {/* Metric 2: Conversions Running */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/queue')}
          className="alsm-metric-card cursor-pointer group"
          title="View conversion queue"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Active Conversions
            </span>
            <div className="w-8 h-8 rounded-md bg-[#EEF1F6] text-[#244A70] flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#17263A] mt-2">
            {activeProjects.length}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 mt-2 pt-2 border-t border-[#EEF1F6]">
            <span className="font-medium text-[#17263A]">
              AST Parse &amp; Code Gen
            </span>
            <span className="text-[#244A70] group-hover:translate-x-0.5 transition-transform">
              &rarr;
            </span>
          </div>
        </div>

        {/* Metric 3: Needs Review & Validation */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/employee/queue')}
          className="alsm-metric-card cursor-pointer group hover:border-amber-300"
          title="Review quality validation items"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Pending Review
            </span>
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-800 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#17263A] mt-2">
            {reviewProjects.length}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 mt-2 pt-2 border-t border-[#EEF1F6]">
            <span className="font-medium text-amber-800">
              AST &amp; Diff Review
            </span>
            <span className="text-amber-800 group-hover:translate-x-0.5 transition-transform">
              &rarr;
            </span>
          </div>
        </div>

        {/* Metric 4: Conversion Errors */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/employee/queue')}
          className="alsm-metric-card cursor-pointer group hover:border-rose-300"
          title="View conversion errors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Failed Conversions
            </span>
            <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-800 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#17263A] mt-2">
            {failedProjects.length}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 mt-2 pt-2 border-t border-[#EEF1F6]">
            <span className="font-medium text-rose-800">
              Requires Rule Fix
            </span>
            <span className="text-rose-800 group-hover:translate-x-0.5 transition-transform">
              &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Actionable Priority Alert (Real Data Only) ──────────────── */}
      {(failedProjects.length > 0 || reviewProjects.length > 0) && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0" />
            <span>
              <strong>Priority Action:</strong> <b>{failedProjects.length}</b> failed conversions and <b>{reviewProjects.length}</b> items awaiting quality review.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {failedProjects.length > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('FAILED')}
                className="px-2.5 py-1 bg-white border border-amber-300 text-amber-900 rounded font-semibold text-xs hover:bg-amber-100/50 transition-colors cursor-pointer"
              >
                View Failed
              </button>
            )}
            {reviewProjects.length > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('READY_FOR_EXPORT')}
                className="px-2.5 py-1 bg-white border border-amber-300 text-amber-900 rounded font-semibold text-xs hover:bg-amber-100/50 transition-colors cursor-pointer"
              >
                View Pending Review
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Main Section: Data Table of Assigned Projects ──────────── */}
      <div className="bg-white border border-[#DCE3EC] rounded-lg shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[#EEF1F6] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-[#244A70]" />
            <h2 className="text-base font-bold text-[#17263A]">
              Assigned Modernization Projects
            </h2>
            <span className="text-xs text-slate-600 font-medium ml-1">
              ({filteredProjects.length}/{myProjects.length})
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8491A3] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search projects, partners, frameworks..."
                className="w-full sm:w-60 pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-md text-[#17263A] placeholder-[#8491A3] focus:bg-white focus:border-[#244A70] outline-none transition-colors"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="inline-flex items-center p-0.5 rounded-md bg-[#EEF1F6] border border-[#DCE3EC] text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-[#17263A] shadow-xs'
                    : 'text-slate-600 hover:text-[#17263A]'
                }`}
              >
                All Projects
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('IN_PROGRESS')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'IN_PROGRESS'
                    ? 'bg-white text-[#244A70] shadow-xs'
                    : 'text-slate-600 hover:text-[#17263A]'
                }`}
              >
                In Progress
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('READY_FOR_EXPORT')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'READY_FOR_EXPORT'
                    ? 'bg-white text-[#244A70] shadow-xs'
                    : 'text-slate-600 hover:text-[#17263A]'
                }`}
              >
                Pending Review
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('FAILED')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'FAILED'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-[#17263A]'
                }`}
              >
                Failed
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC]">
                <th className="py-3 px-3.5 font-semibold text-xs uppercase tracking-wider text-slate-700 w-1/3">Project / System ID</th>
                <th className="py-3 px-3.5 font-semibold text-xs uppercase tracking-wider text-slate-700">Partner</th>
                <th className="py-3 px-3.5 font-semibold text-xs uppercase tracking-wider text-slate-700">Target Tech</th>
                <th className="py-3 px-3.5 font-semibold text-xs uppercase tracking-wider text-slate-700">Screen Progress</th>
                <th className="py-3 px-3.5 font-semibold text-xs uppercase tracking-wider text-slate-700">Status</th>
                <th className="py-3 px-3.5 font-semibold text-xs uppercase tracking-wider text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDF4]">
              {loadingProjects ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-600">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-[#244A70] border-t-transparent rounded-full animate-spin" />
                      <span>Loading projects...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-600">
                    No projects match the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((p) => {
                  const screensDone = p.screensCompleted || 0;
                  const screensTotal = p.screensTotal || 0;
                  const progressPct = screensTotal > 0 ? Math.round((screensDone / screensTotal) * 100) : 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#F4F7FB] transition-colors"
                    >
                      <td className="py-3 px-3.5 font-semibold text-[#17263A]">
                        <div>
                          <p className="font-bold text-xs">{p.name}</p>
                          <p className="text-xs font-mono text-slate-500 mt-0.5">ID: {p.id}</p>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-xs text-[#17263A]">{p.partnerName || 'Not linked to partner'}</td>
                      <td className="py-3 px-3.5">
                        <span className="font-mono text-xs font-semibold text-[#244A70] bg-[#EEF1F6] px-2 py-0.5 rounded border border-[#DCE3EC]">
                          {p.targetFramework || 'React'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="w-32">
                          <div className="flex justify-between text-xs text-slate-600 font-medium mb-1">
                            <span>{screensDone}/{screensTotal} screens</span>
                            <span>{progressPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#DCE3EC] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#244A70] rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <StatusBadge status={p.status || 'IN_PROGRESS'} />
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/partners/projects/${p.id}`)}
                          className="px-2.5 py-1 bg-white border border-[#DCE3EC] text-[#244A70] hover:bg-[#F4F7FB] rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Open Workspace</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredProjects.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[#F8FAFC] border-t border-[#DCE3EC] text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-[#DCE3EC] rounded px-2 py-1 text-xs font-semibold text-[#17263A] focus:outline-none focus:border-[#244A70] cursor-pointer shadow-2xs"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-slate-300">|</span>
              <span>
                Showing <strong className="font-semibold text-[#17263A]">{filteredProjects.length === 0 ? 0 : startIndex + 1}</strong> to{' '}
                <strong className="font-semibold text-[#17263A]">{endIndex}</strong> of{' '}
                <strong className="font-semibold text-[#17263A]">{filteredProjects.length}</strong> projects
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={safeCurrentPage <= 1}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#DCE3EC] bg-white text-xs font-semibold text-[#17263A] hover:bg-[#F4F7FB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1 px-2 text-xs">
                <span className="font-semibold text-[#17263A]">{safeCurrentPage}</span>
                <span className="text-slate-400">/</span>
                <span>{totalPages}</span>
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={safeCurrentPage >= totalPages}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#DCE3EC] bg-white text-xs font-semibold text-[#17263A] hover:bg-[#F4F7FB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversionStaffOverview;
