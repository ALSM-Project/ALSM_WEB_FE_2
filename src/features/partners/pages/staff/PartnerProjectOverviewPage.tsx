import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FolderKanban,
  UploadCloud,
  Play,
  DownloadCloud,
  FileCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
} from 'lucide-react';
import { partnersApi } from '../../api/partners.api';
import { PartnerProject, PartnerConversionItem, ExportBundleInfo } from '../../types/partner.types';
import { PartnerStatusBadge } from '../../components/PartnerStatusBadge';
import { ProgressBar } from '../../components/ProgressBar';
import { AssignStaffModal } from '../../components/AssignStaffModal';
import { ExportDialog } from '../../components/ExportDialog';
import { Button } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const PartnerProjectOverviewPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [project, setProject] = useState<PartnerProject | null>(null);
  const [items, setItems] = useState<PartnerConversionItem[]>([]);
  const [exportBundle, setExportBundle] = useState<ExportBundleInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const loadData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [proj, itms, bundle] = await Promise.all([
        partnersApi.getProjectById(projectId),
        partnersApi.getProjectItems(projectId),
        partnersApi.getExportBundleByProjectId(projectId),
      ]);
      setProject(proj);
      setItems(itms);
      setExportBundle(bundle);
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
        <RefreshCw className="w-6 h-6 animate-spin text-[#0652CC] mx-auto mb-2" />
        <p className="text-xs text-[#6B778C]">Loading project overview...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-[#E5EAF0]">
        <FolderKanban className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-[#091E42]">Project Not Found</h3>
        <p className="text-xs text-[#6B778C] mt-1">The specified project could not be located.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/partners')} className="mt-4">
          Return to Partners
        </Button>
      </div>
    );
  }

  const completedScreens = items.filter((i) => i.type === 'SCREEN' && i.status === 'COMPLETED').length;
  const completedPrograms = items.filter((i) => i.type === 'PROGRAM' && i.status === 'COMPLETED').length;

  const isAssigned = Boolean(project.assignedTeamLeadName || project.assignedStaffName);
  const hasFiles = items.length > 0;
  const hasCompletedConversions = completedScreens > 0 || completedPrograms > 0;
  const isExportReady = project.status === 'READY_FOR_EXPORT' || project.status === 'COMPLETED';

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#6B778C]">
            <Link to="/partners" className="hover:text-[#0652CC] transition-colors">
              Partners
            </Link>
            <span>/</span>
            <Link to={`/partners/${project.partnerId}`} className="hover:text-[#0652CC] transition-colors">
              {project.partnerName}
            </Link>
            <span>/</span>
            <span className="text-[#091E42] font-semibold">{project.name}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-[#091E42]">{project.name}</h1>
            <PartnerStatusBadge status={project.status} type="project" />
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-gray-100 text-[#4A5568]">
              {project.conversionType === 'COBOL_TO_JAVA' ? 'COBOL -> Java' : 'BMS/DSPF -> React'}
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
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
            className="text-xs bg-[#0652CC] hover:bg-[#0655FF] flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Open Workspace</span>
          </Button>
        </div>
      </div>

      {/* Mandatory Workflow Journey Stage Tracker */}
      <div className="bg-white border border-[#D9E2EC] rounded-xl p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E5EAF0]">
          <span className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
            Project Lifecycle &amp; Delivery Workflow
          </span>
          <span className="text-[11px] font-medium text-[#6B778C]">
            End-to-End Modernization Lifecycle
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          {/* Stage 1: Created */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/partners/${project.partnerId}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate(`/partners/${project.partnerId}`);
            }}
            className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/40 space-y-1 cursor-pointer hover:border-emerald-400 hover:shadow-xs transition-all"
            title="Click to view partner organization details"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">Stage 1</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="font-semibold text-[#091E42]">Scope Initialized</p>
            <p className="text-[11px] text-[#6B778C]">Partner linked</p>
          </div>

          {/* Stage 2: Staff Allocated */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsAssignModalOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setIsAssignModalOpen(true);
            }}
            className={`p-2.5 rounded-lg border space-y-1 cursor-pointer hover:shadow-xs transition-all ${
              isAssigned
                ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'
                : 'border-amber-200 bg-amber-50/40 ring-1 ring-amber-400/30 hover:border-amber-400'
            }`}
            title="Click to allocate/reassign staff"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-700 uppercase">Stage 2</span>
              {isAssigned ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              )}
            </div>
            <p className="font-semibold text-[#091E42]">Team Allocation</p>
            <p className="text-[11px] text-[#6B778C]">
              {isAssigned ? project.assignedStaffName || 'Staff allocated' : 'Awaiting assignment'}
            </p>
          </div>

          {/* Stage 3: Sources Uploaded */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/partners/projects/${project.id}/upload`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate(`/partners/projects/${project.id}/upload`);
            }}
            className={`p-2.5 rounded-lg border space-y-1 cursor-pointer hover:shadow-xs transition-all ${
              hasFiles ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400' : 'border-gray-200 bg-gray-50/50 hover:border-[#0652CC]'
            }`}
            title="Click to upload source files"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Stage 3</span>
              {hasFiles ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-300" />
              )}
            </div>
            <p className="font-semibold text-[#091E42]">Sources Uploaded</p>
            <p className="text-[11px] text-[#6B778C]">
              {hasFiles ? `${items.length} file(s) parsed` : 'Pending upload'}
            </p>
          </div>

          {/* Stage 4: Conversion & AST Review */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/partners/projects/${project.id}/workspace`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate(`/partners/projects/${project.id}/workspace`);
            }}
            className={`p-2.5 rounded-lg border space-y-1 cursor-pointer hover:shadow-xs transition-all ${
              hasCompletedConversions
                ? 'border-blue-200 bg-blue-50/40 hover:border-[#0652CC]'
                : 'border-gray-200 bg-gray-50/50 hover:border-[#0652CC]'
            }`}
            title="Click to open conversion workspace"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-700 uppercase">Stage 4</span>
              {hasCompletedConversions ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0652CC]" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-300" />
              )}
            </div>
            <p className="font-semibold text-[#091E42]">AST Conversion</p>
            <p className="text-[11px] text-[#6B778C]">
              {completedScreens + completedPrograms} completed
            </p>
          </div>

          {/* Stage 5: Partner Delivery */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsExportDialogOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setIsExportDialogOpen(true);
            }}
            className={`p-2.5 rounded-lg border space-y-1 cursor-pointer hover:shadow-xs transition-all ${
              project.isExported
                ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'
                : 'border-gray-200 bg-gray-50/50 hover:border-[#0652CC]'
            }`}
            title="Click to export delivery bundle"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Stage 5</span>
              {project.isExported ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-300" />
              )}
            </div>
            <p className="font-semibold text-[#091E42]">Partner Export</p>
            <p className="text-[11px] text-[#6B778C]">
              {project.isExported ? 'Bundle published' : 'Pending review'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Details (7 cols) + Team Lead Allocation & Delivery (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Scope & Items Table (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Project Details Card */}
          <div className="bg-white border border-[#D9E2EC] rounded-xl p-5 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
              Project Configuration &amp; Scope
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#F7F9FC] border border-[#E5EAF0]">
                <span className="text-[11px] text-[#6B778C]">Partner Organization:</span>
                <p className="font-semibold text-[#091E42]">
                  <Link
                    to={`/partners/${project.partnerId}`}
                    className="hover:text-[#0652CC] transition-colors"
                  >
                    {project.partnerName}
                  </Link>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#F7F9FC] border border-[#E5EAF0]">
                <span className="text-[11px] text-[#6B778C]">Target Framework &amp; Stack:</span>
                <p className="font-semibold text-[#091E42]">{project.targetFramework}</p>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-[#091E42]">Scope &amp; Architecture Notes:</span>
              <p className="text-xs text-[#42526E] mt-1 leading-relaxed bg-[#F7F9FC] p-3 rounded-lg border border-[#E5EAF0]">
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

          {/* Project Items Table */}
          <div className="bg-white border border-[#D9E2EC] rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
                Conversion Items ({items.length})
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/partners/projects/${project.id}/workspace`)}
                className="text-xs"
              >
                Full Workbench
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-[#D9E2EC] rounded-lg">
                <FileCode className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-[#091E42]">No source files uploaded yet</p>
                <p className="text-[11px] text-[#6B778C] mt-0.5">
                  Upload legacy mapsets or COBOL procedures to begin conversion.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/partners/projects/${project.id}/upload`)}
                  className="mt-3 text-xs bg-[#0652CC]"
                >
                  Upload First Files
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[#E5EAF0] border border-[#E5EAF0] rounded-lg overflow-hidden">
                {items.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/partners/projects/${project.id}/items/${item.id}/review`)}
                    className="p-3 flex items-center justify-between text-xs hover:bg-blue-50/50 cursor-pointer transition-colors group"
                    title="Click to review conversion findings & code"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#091E42] group-hover:text-[#0652CC] transition-colors">{item.name}</span>
                        <span className="text-[10px] font-mono text-gray-500 uppercase px-1.5 py-0.2 rounded bg-gray-100">
                          {item.type}
                        </span>
                        <PartnerStatusBadge status={item.status} type="item" />
                      </div>
                      <p className="text-[11px] font-mono text-[#6B778C]">{item.sourceFile}</p>
                    </div>

                    <span className="text-xs font-semibold text-[#0652CC] group-hover:underline">
                      Review Findings &rarr;
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Team Lead Allocation (Stage 3) & Export Delivery (Stage 6) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Stage 3: Team Lead Assignment Card */}
          <div className="bg-white border border-[#D9E2EC] rounded-xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF0]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0652CC]" />
                <h3 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
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
              <div className="p-3 rounded-lg border border-[#E5EAF0] bg-[#F7F9FC] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[#6B778C] uppercase block">
                    Assigned Team Lead
                  </span>
                  <span className="font-bold text-[#091E42] text-sm">
                    {project.assignedTeamLeadName || 'Unassigned'}
                  </span>
                  <span className="text-[11px] text-[#6B778C] block mt-0.5">
                    Supervision, quality sign-off, partner review
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#0652CC]/10 text-[#0652CC] flex items-center justify-center font-bold">
                  TL
                </div>
              </div>

              {/* Conversion Staff Engineer */}
              <div className="p-3 rounded-lg border border-[#E5EAF0] bg-[#F7F9FC] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[#6B778C] uppercase block">
                    Assigned Conversion Staff
                  </span>
                  <span className="font-bold text-[#091E42] text-sm">
                    {project.assignedStaffName || 'Unallocated (Assign Staff)'}
                  </span>
                  <span className="text-[11px] text-[#6B778C] block mt-0.5">
                    AST conversion, field mappings, validation triage
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  CS
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#6B778C] leading-normal">
              Team Leads monitor workload, assign modernization projects, and approve final code bundles before partner delivery.
            </p>
          </div>

          {/* Stage 6: Export & Partner Delivery Card */}
          <div className="bg-white border border-[#D9E2EC] rounded-xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF0]">
              <div className="flex items-center gap-2">
                <DownloadCloud className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
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
                  <p className="text-[11px] text-[#6B778C]">
                    Exported on: {new Date(exportBundle?.exportedAt || project.exportedAt || project.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="text-[#6B778C] text-[11px] leading-relaxed">
                  When all required screens and routines pass AST semantic linting, generate a signed ZIP bundle and notify partner contacts.
                </p>
              )}

              {hasPermission('conversion_result.export') && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsExportDialogOpen(true)}
                  className="w-full bg-[#0652CC] hover:bg-[#0655FF] flex items-center justify-center gap-1.5"
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
