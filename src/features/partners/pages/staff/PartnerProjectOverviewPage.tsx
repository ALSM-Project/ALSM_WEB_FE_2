import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FolderKanban,
  UploadCloud,
  Play,
  DownloadCloud,
  FileCode,
  CheckCircle2,
  RefreshCw,
  Users,
  FolderDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { partnersApi, withItemCounts } from '../../api/partners.api';
import { PartnerProject, PartnerConversionItem, ExportBundleInfo } from '../../types/partner.types';
import { PartnerStatusBadge } from '../../components/PartnerStatusBadge';
import { ProgressBar } from '../../components/ProgressBar';
import { AssignStaffModal } from '../../components/AssignStaffModal';
import { ExportDialog } from '../../components/ExportDialog';
import { Button } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useBreadcrumbEntity } from '@/hooks/useBreadcrumb';

export const PartnerProjectOverviewPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [project, setProject] = useState<PartnerProject | null>(null);
  useBreadcrumbEntity(project?.name, projectId);
  const [items, setItems] = useState<PartnerConversionItem[]>([]);
  const [exportBundle, setExportBundle] = useState<ExportBundleInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Pagination and search for conversion items / customer files
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategory, setItemCategory] = useState<'ALL' | 'SCREEN' | 'PROGRAM'>('ALL');
  const [itemPage, setItemPage] = useState<number>(1);
  const [itemPageSize, setItemPageSize] = useState<number>(10);

  useEffect(() => {
    setItemPage(1);
  }, [itemSearch, itemCategory, itemPageSize]);

  const loadData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [proj, itms, bundle] = await Promise.all([
        partnersApi.fetchProject(projectId).catch((err) => {
          console.error('Failed to load project:', err);
          return null;
        }),
        partnersApi.getProjectItems(projectId).catch((err) => {
          console.error('Failed to load project items:', err);
          return [];
        }),
        partnersApi.getExportBundleByProjectId(projectId).catch(() => null),
      ]);
      const projectWithCounts = proj ? withItemCounts(proj, itms || []) : null;
      setProject(projectWithCounts);
      setItems(itms || []);
      setExportBundle(bundle);
    } catch (err) {
      console.error('Failed to load project data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-6 h-6 animate-spin text-[#244A70] mx-auto mb-2" />
        <p className="text-xs text-[#8491A3]">Loading project overview...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <FolderKanban className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-[#17263A]">Project Not Found</h3>
        <p className="text-xs text-[#8491A3] mt-1">The specified project could not be located.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/partners')} className="mt-4">
          Return to Partners
        </Button>
      </div>
    );
  }

  const completedScreens = items.filter((i) => i.type === 'SCREEN' && i.status === 'COMPLETED').length;
  const completedPrograms = items.filter((i) => i.type === 'PROGRAM' && i.status === 'COMPLETED').length;

  const screenCount = items.filter((i) => i.type === 'SCREEN').length;
  const programCount = items.filter((i) => i.type === 'PROGRAM').length;

  const filteredItems = items.filter((item) => {
    const matchesCategory =
      itemCategory === 'ALL' || item.type === itemCategory;
    const matchesSearch =
      !itemSearch ||
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.sourceFile.toLowerCase().includes(itemSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalItemPages = Math.ceil(filteredItems.length / itemPageSize) || 1;
  const itemStartIndex = (itemPage - 1) * itemPageSize;
  const itemEndIndex = Math.min(itemStartIndex + itemPageSize, filteredItems.length);
  const paginatedItems = filteredItems.slice(itemStartIndex, itemEndIndex);

  const isAssigned = Boolean(project.assignedTeamLeadName || project.assignedStaffName);
  const isExportReady = project.status === 'READY_FOR_EXPORT' || project.status === 'COMPLETED';

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#8491A3]">
            <Link to="/partners" className="hover:text-[#244A70] transition-colors">
              Partners
            </Link>
            <span>/</span>
            <Link to={`/partners/${project.partnerId}`} className="hover:text-[#244A70] transition-colors">
              {project.partnerName}
            </Link>
            <span>/</span>
            <span className="text-[#17263A] font-semibold">{project.name}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17263A]">{project.name}</h1>
            <PartnerStatusBadge status={project.status} type="project" />
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-gray-100 text-[#8491A3]">
              {project.conversionType === 'COBOL_TO_JAVA' ? 'COBOL -> Java' : 'BMS/DSPF -> React'}
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/partners/projects/${project.id}/workspace?tab=files`)}
            className="text-xs flex items-center gap-1.5 text-blue-700 bg-blue-50/70 border-blue-200 hover:bg-blue-100/70"
            title="View all legacy source files and specifications submitted by Web3 customer"
          >
            <FolderDown className="w-3.5 h-3.5 text-blue-600" />
            <span>Customer Files ({items.length})</span>
          </Button>

          {hasPermission('partner_project.manage_files') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/partners/projects/${project.id}/upload`)}
              className="text-xs flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Sources</span>
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/partners/projects/${project.id}/workspace`)}
            className="text-xs bg-[#244A70] hover:bg-[#244A70] flex items-center gap-1.5 shadow-xs rounded-md"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Open Workspace</span>
          </Button>
        </div>
      </div>

      {/* Quick Metrics - Clickable Interactive Cards (Web 1 Pattern) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => navigate(`/partners/projects/${project.id}/workspace`)}
          className="bg-white border border-[#DCE3EC] hover:border-[#244A70] p-3.5 rounded-xl text-left cursor-pointer transition-all hover:shadow-xs group"
          title="Click to view all assets in workspace"
        >
          <div className="text-xs font-semibold text-[#8491A3] group-hover:text-[#244A70] transition-colors">Total Assets</div>
          <div className="text-xl font-extrabold text-[#17263A] mt-1">{items.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{items.filter((i) => i.type === 'SCREEN').length} screens, {items.filter((i) => i.type === 'PROGRAM').length} programs</div>
        </button>

        <button
          type="button"
          onClick={() => navigate(`/partners/projects/${project.id}/workspace`)}
          className="bg-emerald-50/50 border border-emerald-200 hover:border-emerald-500 p-3.5 rounded-xl text-left cursor-pointer transition-all hover:shadow-xs group"
          title="Click to view converted assets"
        >
          <div className="text-xs font-bold text-emerald-700">Converted</div>
          <div className="text-xl font-extrabold text-emerald-800 mt-1">{completedScreens + completedPrograms}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Automated code generated</div>
        </button>

        <button
          type="button"
          onClick={() => navigate(`/partners/projects/${project.id}/workspace`)}
          className="bg-amber-50/50 border border-amber-200 hover:border-amber-500 p-3.5 rounded-xl text-left cursor-pointer transition-all hover:shadow-xs group"
          title="Click to view assets needing review"
        >
          <div className="text-xs font-bold text-amber-700">Review Required</div>
          <div className="text-xl font-extrabold text-amber-800 mt-1">
            {items.filter((i) => i.status === 'FAILED' || i.validationStatus === 'WARNINGS').length}
          </div>
          <div className="text-[11px] text-amber-600 mt-0.5">Pending engineer sign-off</div>
        </button>

        <button
          type="button"
          onClick={() => navigate(`/partners/projects/${project.id}/workspace`)}
          className="bg-rose-50/50 border border-rose-200 hover:border-rose-400 p-3.5 rounded-xl text-left cursor-pointer transition-all hover:shadow-xs group"
          title="Click to view failed conversions"
        >
          <div className="text-xs font-bold text-rose-700">Failed / Errors</div>
          <div className="text-xl font-extrabold text-rose-800 mt-1">
            {items.filter((i) => i.status === 'FAILED' || i.status === 'DEAD_LETTER').length}
          </div>
          <div className="text-[11px] text-rose-600 mt-0.5">Syntax or parser diagnostics</div>
        </button>
      </div>

      {/* Main Grid: Details (7 cols) + Team Lead Allocation & Delivery (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Scope & Items Table (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Project Details Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-[#17263A] uppercase tracking-wider">
              Project Configuration &amp; Scope
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200">
                <span className="text-[11px] text-[#8491A3]">Partner Organization:</span>
                <p className="font-semibold text-[#17263A]">
                  <Link
                    to={`/partners/${project.partnerId}`}
                    className="hover:text-[#244A70] transition-colors"
                  >
                    {project.partnerName}
                  </Link>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200">
                <span className="text-[11px] text-[#8491A3]">Target Framework &amp; Stack:</span>
                <p className="font-semibold text-[#17263A]">{project.targetFramework}</p>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-[#17263A]">Scope &amp; Architecture Notes:</span>
              <p className="text-xs text-[#8491A3] mt-1 leading-relaxed bg-slate-50/80 p-3 rounded-lg border border-slate-200">
                {project.description || 'No additional scope notes provided for this project.'}
              </p>
            </div>

            {/* Dual Metric Progress */}
            <div className="pt-2">
              <ProgressBar
                screensTotal={project.screensTotal}
                screensCompleted={project.screensCompleted}
                programsTotal={project.programsTotal}
                programsCompleted={project.programsCompleted}
              />
            </div>
          </div>

          {/* Project Items Table with Search & Pagination */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold text-[#17263A] uppercase tracking-wider">
                  Client Intake Files &amp; Conversion Items ({items.length})
                </h2>
                <p className="text-[11px] text-[#8491A3]">
                  Source files uploaded by customer for modernization
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/partners/projects/${project.id}/upload`)}
                  className="text-xs"
                >
                  <UploadCloud className="w-3.5 h-3.5 mr-1" />
                  Upload Source
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/partners/projects/${project.id}/workspace`)}
                  className="text-xs"
                >
                  Full Workbench &rarr;
                </Button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            {items.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search file name, program, screen..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#244A70] focus:bg-white"
                  />
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setItemCategory('ALL')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      itemCategory === 'ALL'
                        ? 'bg-[#244A70] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({items.length})
                  </button>
                  <button
                    onClick={() => setItemCategory('SCREEN')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      itemCategory === 'SCREEN'
                        ? 'bg-[#244A70] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Screens ({screenCount})
                  </button>
                  <button
                    onClick={() => setItemCategory('PROGRAM')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      itemCategory === 'PROGRAM'
                        ? 'bg-[#244A70] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Programs ({programCount})
                  </button>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 rounded-md bg-slate-50/50">
                <FileCode className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#17263A]">No source files uploaded yet</p>
                <p className="text-[11px] text-[#8491A3] mt-1">
                  Upload legacy mapsets (BMS/DSPF) or COBOL procedures to begin conversion.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/partners/projects/${project.id}/upload`)}
                  className="mt-3 text-xs bg-[#244A70]"
                >
                  <UploadCloud className="w-3.5 h-3.5 mr-1" />
                  Upload First Files
                </Button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-6 text-center border border-slate-200 rounded-md bg-slate-50/50 text-slate-500 text-xs">
                No files match your search criteria.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="divide-y divide-[#DCE3EC] border border-slate-200 rounded-lg overflow-hidden bg-white">
                  {paginatedItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/partners/projects/${project.id}/items/${item.id}/review`)}
                      className="p-3 flex items-center justify-between text-xs hover:bg-blue-50/50 cursor-pointer transition-colors group"
                      title="Click to review conversion findings & code"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#17263A] group-hover:text-[#244A70] transition-colors">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500 uppercase px-1.5 py-0.5 rounded bg-gray-100">
                            {item.type}
                          </span>
                          <PartnerStatusBadge status={item.status} type="item" />
                        </div>
                        <p className="text-[11px] font-mono text-[#8491A3]">{item.sourceFile}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#244A70] group-hover:underline">
                          Review Findings &rarr;
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span>Rows:</span>
                    <select
                      value={itemPageSize}
                      onChange={(e) => setItemPageSize(Number(e.target.value))}
                      className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#244A70]"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <span className="text-slate-400">|</span>
                    <span>
                      Showing <strong className="font-semibold text-slate-900">{itemStartIndex + 1}</strong> to{' '}
                      <strong className="font-semibold text-slate-900">{itemEndIndex}</strong> of{' '}
                      <strong className="font-semibold text-slate-900">{filteredItems.length}</strong> files
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setItemPage((p) => Math.max(p - 1, 1))}
                      disabled={itemPage <= 1}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Prev
                    </button>

                    <div className="flex items-center gap-1 px-1.5">
                      <span className="font-semibold text-slate-900">{itemPage}</span>
                      <span className="text-slate-400">/</span>
                      <span>{totalItemPages}</span>
                    </div>

                    <button
                      onClick={() => setItemPage((p) => Math.min(p + 1, totalItemPages))}
                      disabled={itemPage >= totalItemPages}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Team Lead Allocation (Stage 3) & Export Delivery (Stage 6) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Stage 3: Team Lead Assignment Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#244A70]" />
                <h3 className="text-xs font-bold text-[#17263A] uppercase tracking-wider">
                  Staff Allocation &amp; Ownership
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAssignModalOpen(true)}
                className="text-xs"
              >
                {isAssigned ? 'Reassign' : 'Assign Staff'}
              </Button>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Team Lead */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[#8491A3] uppercase block">
                    Assigned Team Lead
                  </span>
                  <span className="font-bold text-[#17263A] text-sm">
                    {project.assignedTeamLeadName || 'Unassigned'}
                  </span>
                  <span className="text-[11px] text-[#8491A3] block mt-0.5">
                    Supervision, quality sign-off, partner review
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#244A70]/10 text-[#244A70] flex items-center justify-center font-bold">
                  TL
                </div>
              </div>

              {/* Conversion Staff Engineer */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[#8491A3] uppercase block">
                    Assigned Conversion Staff
                  </span>
                  <span className="font-bold text-[#17263A] text-sm">
                    {project.assignedStaffName || 'Unallocated (Assign Staff)'}
                  </span>
                  <span className="text-[11px] text-[#8491A3] block mt-0.5">
                    AST conversion, field mappings, validation triage
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  CS
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#8491A3] leading-normal">
              Team Leads monitor workload, assign modernization projects, and approve final code bundles before partner delivery.
            </p>
          </div>

          {/* Stage 6: Export & Partner Delivery Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <DownloadCloud className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-[#17263A] uppercase tracking-wider">
                  Partner Delivery &amp; Export
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {project.isExported ? 'Delivered' : isExportReady ? 'Ready' : 'In Progress'}
              </span>
            </div>

            <div className="text-xs space-y-2">
              {project.isExported ? (
                <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Bundle Published to Partner Portal</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-mono">
                    Package: {exportBundle?.packageName || project.exportedBundleName || 'modernization_bundle_v1.zip'}
                  </p>
                  <p className="text-[11px] text-[#8491A3]">
                    Exported on: {new Date(exportBundle?.exportedAt || project.exportedAt || project.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="text-[#8491A3] text-[11px] leading-relaxed">
                  When all required screens and routines pass AST semantic linting, generate a signed ZIP bundle and notify partner contacts.
                </p>
              )}

              {hasPermission('conversion_result.export') && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsExportDialogOpen(true)}
                  className="w-full bg-[#244A70] hover:bg-[#244A70] flex items-center justify-center gap-1.5 shadow-xs rounded-md"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>{project.isExported ? 'Re-Export Bundle' : 'Export & Notify Partner'}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {project && (
        <>
          <AssignStaffModal
            isOpen={isAssignModalOpen}
            onClose={() => setIsAssignModalOpen(false)}
            project={project}
            onAssigned={(updated) => setProject(updated)}
          />
          <ExportDialog
            isOpen={isExportDialogOpen}
            onClose={() => setIsExportDialogOpen(false)}
            project={project}
            items={items}
            onExportSuccess={(bundle) => {
              setExportBundle(bundle);
              loadData();
            }}
          />
        </>
      )}
    </div>
  );
};
