import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  FolderKanban,
  Building2,
  Plus,
  Search,
  RefreshCw,
  Play,
  UploadCloud,
  CheckCircle2,
  Clock,
  Users,
  AlertCircle,
  PackageCheck,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { partnersApi } from '../../api/partners.api';
import { Partner, PartnerProject, ConversionType } from '../../types/partner.types';
import { PartnerStatusBadge } from '../../components/PartnerStatusBadge';
import { ProgressBar } from '../../components/ProgressBar';
import { CreatePartnerProjectModal } from '../../components/CreatePartnerProjectModal';
import { CreateDemoProjectModal } from '../../components/CreateDemoProjectModal';
import { Button, Input } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSupportView } from '@/features/admin/context/SupportViewContext';

export const PartnerProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, hasPermission } = useAuth();
  const canCreateDemo = user ? hasPermission('projects.demo.create') : true;
  const canViewDemo = user ? hasPermission('projects.demo.view') : true;
  const { isSupportReadOnly, supportOrg } = useSupportView();

  const [projects, setProjects] = useState<PartnerProject[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ConversionType>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'CUSTOMER' | 'DEMO'>(
    searchParams.get('scope') === 'demo' ? 'DEMO' : 'ALL'
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (searchParams.get('scope') === 'demo') {
      setScopeFilter('DEMO');
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [allProjects, allPartners] = await Promise.all([
        partnersApi.getProjects(),
        partnersApi.getPartners(),
      ]);

      // Load stored demo projects
      let storedDemos: PartnerProject[] = [];
      try {
        const raw = localStorage.getItem('alsm_demo_projects');
        if (raw) storedDemos = JSON.parse(raw);
      } catch {
        // Ignore parse error
      }

      // Merge and deduplicate
      const projectMap = new Map<string, PartnerProject>();
      allProjects.forEach((p) => projectMap.set(p.id, p));
      storedDemos.forEach((d) => projectMap.set(d.id, d));

      setProjects(Array.from(projectMap.values()));
      setPartners(allPartners);
    } catch (err) {
      setProjects([]);
      setLoadError(err instanceof Error ? err.message : 'The projects could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics
  const totalProjects = projects.length;
  const activeCount = projects.filter(
    (p) => p.status === 'IN_PROGRESS' || p.status === 'NOT_STARTED' || p.status === 'DRAFT'
  ).length;
  const readyForExportCount = projects.filter((p) => p.status === 'READY_FOR_EXPORT').length;
  const completedCount = projects.filter(
    (p) => p.status === 'COMPLETED' || p.isExported
  ).length;

  // Filter logic
  const filteredProjects = projects.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      p.name.toLowerCase().includes(term) ||
      p.partnerName.toLowerCase().includes(term) ||
      (p.targetFramework && p.targetFramework.toLowerCase().includes(term)) ||
      p.id.toLowerCase().includes(term);

    const matchesType = typeFilter === 'ALL' || p.conversionType === typeFilter;

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') {
      matchesStatus =
        p.status === 'IN_PROGRESS' || p.status === 'NOT_STARTED' || p.status === 'DRAFT';
    } else if (statusFilter === 'READY') {
      matchesStatus = p.status === 'READY_FOR_EXPORT';
    } else if (statusFilter === 'COMPLETED') {
      matchesStatus = p.status === 'COMPLETED' || Boolean(p.isExported);
    } else if (statusFilter !== 'ALL') {
      matchesStatus = p.status === statusFilter;
    }

    let matchesScope = true;
    if (scopeFilter === 'DEMO') {
      matchesScope = Boolean(p.isDemo);
    } else if (scopeFilter === 'CUSTOMER') {
      matchesScope = !p.isDemo;
    }

    return matchesSearch && matchesType && matchesStatus && matchesScope;
  });

  return (
    <div className="space-y-6">
      {loadError && (
        <div role="alert" className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800">
          {loadError}
        </div>
      )}
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5EAF0]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#6B778C]">
            <Link to="/partners" className="hover:text-[#0652CC] transition-colors">
              Partner Management
            </Link>
            <span>/</span>
            <span className="text-[#091E42] font-semibold">Partner Projects</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091E42] mt-1">
            Partner Modernization Projects
          </h1>
          <p className="text-xs text-[#6B778C] mt-1 max-w-3xl">
            Track and execute modernization projects commissioned by enterprise partners. Each project maintains its partner linkage, supervising Team Lead, allocated conversion staff, and conversion workspace.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/partners"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EAF0] bg-white px-3.5 py-2 text-xs font-semibold text-[#091E42] shadow-2xs hover:bg-[#F4F6F8] transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-[#0652CC]" />
            Partner Directory
          </Link>

          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EAF0] bg-white px-3.5 py-2 text-xs font-semibold text-[#091E42] shadow-2xs hover:bg-[#F4F6F8] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin text-[#0652CC]' : ''}`} />
            Refresh
          </button>

          {/* Create Demo Project Sandbox Action */}
          {canCreateDemo && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDemoModalOpen(true)}
              disabled={isSupportReadOnly}
              title={isSupportReadOnly ? 'Disabled in Read-Only Support View' : 'Create internal demo project'}
              className="text-xs flex items-center gap-1.5 border-purple-200 text-purple-900 bg-purple-50/70 hover:bg-purple-100 shadow-2xs disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-700" />
              Create Demo Project
            </Button>
          )}

          {hasPermission('partner_project.create') && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              disabled={isSupportReadOnly}
              title={isSupportReadOnly ? 'Disabled in Read-Only Support View' : 'Create new partner project'}
              className="text-xs flex items-center gap-1.5 bg-[#0652CC] hover:bg-[#0543A8] shadow-2xs disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              New Partner Project
            </Button>
          )}
        </div>
      </div>

      {/* Support View Notice if active */}
      {isSupportReadOnly && supportOrg && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Read-Only Support View Active for {supportOrg.name}.</strong> You are browsing customer projects in inspection mode. Project creation, file upload, and modification actions are disabled.
          </span>
        </div>
      )}

      {/* 2. KPI Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Partner Projects */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setStatusFilter('ALL');
            setTypeFilter('ALL');
            setScopeFilter('ALL');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setStatusFilter('ALL');
              setTypeFilter('ALL');
              setScopeFilter('ALL');
            }
          }}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all hover:border-[#0652CC] hover:shadow-md ${
            statusFilter === 'ALL' && typeFilter === 'ALL' && scopeFilter === 'ALL'
              ? 'border-[#0652CC] ring-2 ring-[#0652CC]/15'
              : 'border-[#E5EAF0]'
          }`}
          title="Click to view all projects"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B778C]">Total Partner Projects</span>
            <FolderKanban className="w-4 h-4 text-[#0652CC]" />
          </div>
          <div className="text-2xl font-bold text-[#091E42] mt-2">{totalProjects}</div>
          <div className="text-[11px] text-[#6B778C] mt-1">Across all registered partners</div>
        </div>

        {/* In Active Conversion */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter('ACTIVE')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setStatusFilter('ACTIVE');
          }}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all hover:border-blue-500 hover:shadow-md ${
            statusFilter === 'ACTIVE'
              ? 'border-blue-500 ring-2 ring-blue-400/20 bg-blue-50/10'
              : 'border-[#E5EAF0]'
          }`}
          title="Click to filter active projects"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">In Active Conversion</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-2">{activeCount}</div>
          <div className="text-[11px] text-blue-700/80 mt-1">Undergoing transformation & testing</div>
        </div>

        {/* Ready for Code Export */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter('READY')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setStatusFilter('READY');
          }}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all hover:border-amber-500 hover:shadow-md ${
            statusFilter === 'READY'
              ? 'border-amber-500 ring-2 ring-amber-400/20 bg-amber-50/10'
              : 'border-[#E5EAF0]'
          }`}
          title="Click to filter ready for export"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Ready for Code Export</span>
            <PackageCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">{readyForExportCount}</div>
          <div className="text-[11px] text-amber-700/80 mt-1">Passed validation quality criteria</div>
        </div>

        {/* Completed & Shipped */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter('COMPLETED')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setStatusFilter('COMPLETED');
          }}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all hover:border-emerald-500 hover:shadow-md ${
            statusFilter === 'COMPLETED'
              ? 'border-emerald-500 ring-2 ring-emerald-400/20 bg-emerald-50/10'
              : 'border-[#E5EAF0]'
          }`}
          title="Click to filter completed & delivered bundles"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Completed & Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{completedCount}</div>
          <div className="text-[11px] text-emerald-700/80 mt-1">Export bundle delivered to partner</div>
        </div>
      </div>

      {/* 3. Search and Filters Bar */}
      <div className="space-y-3 bg-white p-4 rounded-xl border border-[#E5EAF0] shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-64 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B778C]" />
            <Input
              placeholder="Search by project name, partner, target stack..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Scope Filters: All vs Customer vs Demo */}
          <div className="flex items-center gap-1 bg-[#F4F6F8] p-1 rounded-xl border border-[#E5EAF0]">
            {[
              { key: 'ALL', label: 'All Projects' },
              { key: 'CUSTOMER', label: 'Customer Projects' },
              ...(canViewDemo ? [{ key: 'DEMO', label: 'Demo Sandboxes' }] : []),
            ].map((sc) => (
              <button
                key={sc.key}
                type="button"
                onClick={() => setScopeFilter(sc.key as any)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  scopeFilter === sc.key
                    ? 'bg-white text-[#091E42] shadow-2xs'
                    : 'text-[#6B778C] hover:text-[#091E42]'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-[#F4F6F8] p-1 rounded-xl border border-[#E5EAF0]">
            {[
              { key: 'ALL', label: `All (${totalProjects})` },
              { key: 'ACTIVE', label: `Active (${activeCount})` },
              { key: 'READY', label: `Ready for Export (${readyForExportCount})` },
              { key: 'COMPLETED', label: `Delivered (${completedCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-white text-[#091E42] shadow-2xs'
                    : 'text-[#6B778C] hover:text-[#091E42]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter: Conversion Stack */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E5EAF0]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#6B778C]">Conversion Pipeline:</span>
            <div className="flex items-center gap-1">
              {[
                { key: 'ALL', label: 'All Pipelines' },
                { key: 'BMS_DSPF_TO_FRONTEND', label: 'BMS/DSPF to React' },
                { key: 'COBOL_TO_JAVA', label: 'COBOL to Java 21' },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setTypeFilter(p.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    typeFilter === p.key
                      ? 'bg-[#0652CC] text-white font-semibold'
                      : 'bg-white border border-[#E5EAF0] text-[#6B778C] hover:text-[#091E42]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-[#6B778C]">
            Showing <strong className="text-[#091E42]">{filteredProjects.length}</strong> of{' '}
            {totalProjects} projects
          </div>
        </div>
      </div>

      {/* 4. Partner Projects Table */}
      <div className="rounded-xl border border-[#E5EAF0] bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                <th className="py-3 px-4">Project & Stack</th>
                <th className="py-3 px-4">Associated Partner</th>
                <th className="py-3 px-4">Supervising Lead</th>
                <th className="py-3 px-4">Allocated Staff</th>
                <th className="py-3 px-4">Conversion Progress</th>
                <th className="py-3 px-4">Status & Delivery</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B778C]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin" />
                      <span>Loading partner modernization projects...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B778C]">
                    <FolderKanban className="w-8 h-8 mx-auto text-[#6B778C]/40 mb-2" />
                    No partner projects found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/partners/projects/${p.id}/workspace`)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                      title="Click to open Conversion Workspace"
                    >
                      {/* Project Name & Target Framework */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#091E42] group-hover:text-[#0652CC] transition-colors flex items-center gap-1.5 flex-wrap">
                          <span>{p.name}</span>
                          {p.isDemo && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                              DEMO SANDBOX
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-[#4A5568]">
                            {p.conversionType === 'COBOL_TO_JAVA' ? 'COBOL -> Java' : 'BMS/DSPF -> React'}
                          </span>
                          <span className="text-[10px] text-[#6B778C] font-mono">{p.id}</span>
                        </div>
                        <p className="text-[11px] text-[#6B778C] mt-0.5 truncate max-w-xs">
                          {p.targetFramework}
                        </p>
                      </td>

                      {/* Associated Partner */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/partners/${p.partnerId}`}
                          className="font-semibold text-[#091E42] hover:text-[#0652CC] flex items-center gap-1"
                        >
                          <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>{p.partnerName}</span>
                        </Link>
                        <span className="text-[10px] font-mono text-[#6B778C] block mt-0.5">
                          {p.partnerId}
                        </span>
                      </td>

                      {/* Supervising Team Lead */}
                      <td className="py-3.5 px-4">
                        {p.assignedTeamLeadName ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-[#0652CC] flex items-center justify-center text-[10px] font-bold shrink-0">
                              {p.assignedTeamLeadName.charAt(0)}
                            </div>
                            <span className="font-medium text-[#091E42] truncate max-w-[120px]">
                              {p.assignedTeamLeadName}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3 h-3" />
                            Awaiting Lead
                          </span>
                        )}
                      </td>

                      {/* Allocated Conversion Staff */}
                      <td className="py-3.5 px-4">
                        {p.assignedStaffName ? (
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#0652CC] shrink-0" />
                            <span className="font-medium text-[#091E42] truncate max-w-[130px]">
                              {p.assignedStaffName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#6B778C]/70 italic text-[11px]">Unallocated</span>
                        )}
                      </td>

                      {/* Conversion Progress */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 min-w-[140px] max-w-[180px]">
                          {(p.screensTotal > 0 || p.programsTotal > 0) ? (
                            <>
                              <div className="flex items-center justify-between text-[10px] text-[#6B778C] mb-0.5">
                                <span>
                                  {p.screensTotal > 0 && `${p.screensCompleted}/${p.screensTotal} screens`}
                                  {p.screensTotal > 0 && p.programsTotal > 0 && ' · '}
                                  {p.programsTotal > 0 && `${p.programsCompleted}/${p.programsTotal} programs`}
                                </span>
                              </div>
                              <ProgressBar
                                screensCompleted={p.screensCompleted}
                                screensTotal={p.screensTotal}
                                programsCompleted={p.programsCompleted}
                                programsTotal={p.programsTotal}
                                showLabels={false}
                              />
                            </>
                          ) : (
                            <span className="text-[11px] text-[#6B778C] italic">No items queued</span>
                          )}
                        </div>
                      </td>

                      {/* Status & Delivery */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <PartnerStatusBadge status={p.status} />
                          {p.isExported && (
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                              Export Delivered
                            </div>
                          )}
                          <div className="text-[10px] text-[#6B778C]">
                            Updated: {new Date(p.lastUpdated).toLocaleDateString()}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/partners/projects/${p.id}/workspace`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0652CC] text-white text-xs font-semibold hover:bg-[#0543A8] transition-colors shadow-2xs"
                            title="Open Full Conversion Workspace"
                          >
                            <Play className="w-3 h-3" />
                            Workspace
                          </Link>

                          {!isSupportReadOnly && (
                            <Link
                              to={`/partners/projects/${p.id}/upload`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5EAF0] bg-white text-[#091E42] text-xs font-semibold hover:bg-[#F4F6F8] transition-colors"
                              title="Upload source files"
                            >
                              <UploadCloud className="w-3.5 h-3.5 text-[#6B778C]" />
                            </Link>
                          )}
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

      {/* Create Partner Project Modal */}
      <CreatePartnerProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        partnersList={partners}
        onSuccess={(newProject) => {
          setProjects((prev) => [newProject, ...prev]);
          navigate(`/partners/projects/${newProject.id}/upload`);
        }}
      />

      {/* Create Demo Project Sandbox Modal */}
      <CreateDemoProjectModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onSuccess={(newDemo) => {
          setProjects((prev) => [newDemo, ...prev]);
        }}
      />
    </div>
  );
};
export default PartnerProjectsPage;
