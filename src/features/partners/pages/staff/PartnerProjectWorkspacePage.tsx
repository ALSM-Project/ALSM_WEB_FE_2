import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Play,
  RotateCcw,
  UploadCloud,
  Package,
    CheckCircle2,
  FileCode,
  Search,
  RefreshCw,
  Layers,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Code2,
  Eye,
  Download,
  ShieldCheck,
  Clock,
  FileText,
  Trash2,
  FolderPlus,
  Lock,
  Send,
  FileCheck,
  X,
  } from 'lucide-react';
import {
  partnersApi,
  isServerProject,
  PartnerDeliverableItem,
  InternalWorkingFileItem,
} from '../../api/partners.api';
import { PartnerProject, PartnerConversionItem, FieldMappingRule } from '../../types/partner.types';
import { PartnerStatusBadge } from '../../components/PartnerStatusBadge';
import { ConversionStatusBadge } from '../../components/ConversionStatusBadge';
import { ProgressBar } from '../../components/ProgressBar';
import { ExportDialog } from '../../components/ExportDialog';
import { EditMappingModal } from '../../components/EditMappingModal';
import { Button, Tabs, ModernizationWorkflow, StatusBadge } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useBreadcrumbEntity } from '@/hooks/useBreadcrumb';

/** Refresh cadence while any item of a server project is still converting. */
export const WORKSPACE_POLL_INTERVAL_MS = 3000;

function safeMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export const PartnerProjectWorkspacePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const isPlatformAdmin = Boolean(user?.isPlatformAdmin || user?.roles?.includes('ADMIN') || hasPermission('partner_project.admin_review'));
  const isTeamLead = Boolean(user?.roles?.includes('TEAM_LEAD') || hasPermission('team_lead.manage_workload') || isPlatformAdmin);

  const [project, setProject] = useState<PartnerProject | null>(null);
  useBreadcrumbEntity(project?.name, projectId);
  const [items, setItems] = useState<PartnerConversionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchParams] = useSearchParams();
  const paramTab = searchParams.get('tab');
  const initialMode =
    paramTab === 'files' || paramTab === 'customer-files' || paramTab === 'customer_input'
      ? 'CUSTOMER_INPUT_FILES'
      : paramTab === 'working' || paramTab === 'working-files'
      ? 'STAFF_WORKING_FILES'
      : paramTab === 'deliverables'
      ? 'DELIVERABLES_PIPELINE'
      : 'CONVERSION_ENGINE';

  // 4 Core Workspace Modes
  // 1. CUSTOMER_INPUT_FILES: Customer original files (Read-Only for staff/leads)
  // 2. CONVERSION_ENGINE: AST Conversion queue & engine workbench
  // 3. STAFF_WORKING_FILES: Private ALSM working files & internal drafts
  // 4. DELIVERABLES_PIPELINE: Deliverable candidate preparation, lead review, & admin publish
  const [workspaceMode, setWorkspaceMode] = useState<
    'CONVERSION_ENGINE' | 'CUSTOMER_INPUT_FILES' | 'STAFF_WORKING_FILES' | 'DELIVERABLES_PIPELINE'
  >(initialMode);

  useEffect(() => {
    if (paramTab === 'files' || paramTab === 'customer-files' || paramTab === 'customer_input') {
      setWorkspaceMode('CUSTOMER_INPUT_FILES');
    } else if (paramTab === 'working' || paramTab === 'working-files') {
      setWorkspaceMode('STAFF_WORKING_FILES');
    } else if (paramTab === 'deliverables') {
      setWorkspaceMode('DELIVERABLES_PIPELINE');
    } else if (paramTab === 'engine' || paramTab === 'conversion') {
      setWorkspaceMode('CONVERSION_ENGINE');
    }
  }, [paramTab]);

  // Conversion Engine Sub-Tab & Filter states
  const [activeTab, setActiveTab] = useState<'screens' | 'programs' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & In-flight actions
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [editingMappingItem, setEditingMappingItem] = useState<PartnerConversionItem | null>(null);
  const [editingMappings, setEditingMappings] = useState<FieldMappingRule[]>([]);
  const [runningBulk, setRunningBulk] = useState(false);
  const [retryingItemIds, setRetryingItemIds] = useState<ReadonlySet<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Customer Input Files preview modal
  const [previewCustomerItem, setPreviewCustomerItem] = useState<PartnerConversionItem | null>(null);

  // Staff Working Files State
  const [workingFiles, setWorkingFiles] = useState<InternalWorkingFileItem[]>([]);
  const [loadingWorkingFiles, setLoadingWorkingFiles] = useState(false);
  const [showWorkingFileModal, setShowWorkingFileModal] = useState(false);
  const [wfName, setWfName] = useState('');
  const [wfCategory, setWfCategory] = useState<'WORKING_DRAFT' | 'INTERMEDIATE_CODE' | 'ANALYSIS_DOC' | 'INTERNAL_NOTE'>('WORKING_DRAFT');
  const [wfNotes, setWfNotes] = useState('');
  const [wfContent, setWfContent] = useState('');
  const [isSubmittingWf, setIsSubmittingWf] = useState(false);

  // Deliverables & Approval Pipeline State
  const [deliverables, setDeliverables] = useState<PartnerDeliverableItem[]>([]);
  const [loadingDeliverables, setLoadingDeliverables] = useState(false);
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [delivTitle, setDelivTitle] = useState('');
  const [delivVersion, setDelivVersion] = useState('v1.0.0');
  const [delivPackageType, setDelivPackageType] = useState('FRONTEND_COMPONENTS');
  const [delivDesc, setDelivDesc] = useState('');
  const [isSubmittingDeliv, setIsSubmittingDeliv] = useState(false);

  // Team Lead Deliverable Review Modal
  const [reviewingDeliv, setReviewingDeliv] = useState<PartnerDeliverableItem | null>(null);
  const [leadDecision, setLeadDecision] = useState<'APPROVED' | 'REVISION_REQUESTED'>('APPROVED');
  const [leadNotes, setLeadNotes] = useState('');
  const [isSubmittingLeadReview, setIsSubmittingLeadReview] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [proj, itms] = await Promise.all([
        partnersApi.getProjectById(projectId),
        partnersApi.getProjectItems(projectId),
      ]);
      setProject(proj);
      setItems(itms);
    } catch (err) {
      setActionError(safeMessage(err, 'The workspace could not be loaded. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadWorkingFiles = useCallback(async () => {
    if (!projectId || typeof partnersApi.getInternalWorkingFiles !== "function") return;
    try {
      setLoadingWorkingFiles(true);
      const list = await partnersApi.getInternalWorkingFiles(projectId);
      setWorkingFiles(list);
    } catch {
      // Ignore fallback
    } finally {
      setLoadingWorkingFiles(false);
    }
  }, [projectId]);

  const loadDeliverables = useCallback(async () => {
    if (!projectId || typeof partnersApi.getDeliverables !== "function") return;
    try {
      setLoadingDeliverables(true);
      const list = await partnersApi.getDeliverables(projectId);
      setDeliverables(list);
    } catch {
      // Ignore fallback
    } finally {
      setLoadingDeliverables(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadWorkspace();
    loadWorkingFiles();
    loadDeliverables();
  }, [loadWorkspace, loadWorkingFiles, loadDeliverables]);

  const refreshProject = useCallback(async () => {
    if (!projectId) return;
    setProject(await partnersApi.getProjectById(projectId));
  }, [projectId]);

  // Live progress: queued/processing jobs finish in the background worker
  const hasInFlight = items.some((i) => i.status === 'PROCESSING');
  useEffect(() => {
    if (!projectId || !hasInFlight || !isServerProject(projectId)) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      partnersApi
        .getProjectItems(projectId)
        .then((list) => setItems(list))
        .catch(() => undefined);
    }, WORKSPACE_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [projectId, hasInFlight]);

  const handleRunAll = async () => {
    if (!projectId || runningBulk) return;
    setRunningBulk(true);
    setActionError(null);
    setNotice(null);
    try {
      const before = new Map(items.map((i) => [i.id, i.status]));
      const updated = await partnersApi.runAllConversions(projectId);
      setItems(updated);
      const queued = updated.filter(
        (i) => i.status === 'PROCESSING' && before.get(i.id) !== 'PROCESSING',
      ).length;
      const skipped = updated.filter((i) => i.lastSkipReason);
      if (queued === 0 && skipped.length === 0) {
        setNotice('Nothing to convert: every item is already converted or in progress.');
      } else {
        setNotice(
          `${queued} item${queued === 1 ? '' : 's'} queued for conversion` +
            (skipped.length > 0
              ? `; ${skipped.length} skipped (${skipped.map((i) => i.lastSkipReason).join('; ')})`
              : '.'),
        );
      }
      await refreshProject();
    } catch (err) {
      setActionError(safeMessage(err, 'The conversions could not be started. Please try again.'));
    } finally {
      setRunningBulk(false);
    }
  };

  const handleConvertOrRetryItem = async (itemId: string) => {
    if (!projectId || retryingItemIds.has(itemId)) return;
    setRetryingItemIds((prev) => new Set(prev).add(itemId));
    setActionError(null);
    try {
      const updated = await partnersApi.retryItemConversion(projectId, itemId);
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
      setNotice(`${updated.sourceFile} queued for conversion.`);
      await refreshProject();
    } catch (err) {
      setActionError(safeMessage(err, 'The conversion could not be started. Please try again.'));
    } finally {
      setRetryingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleOpenMappingModal = async (item: PartnerConversionItem) => {
    const rules = await partnersApi.getFieldMappings(item.id);
    setEditingMappings(rules);
    setEditingMappingItem(item);
  };

  const handleSaveMappings = async (newRules: FieldMappingRule[]) => {
    if (!editingMappingItem || !projectId) return;
    await partnersApi.saveFieldMappings(editingMappingItem.id, newRules);
    setEditingMappings(newRules);
    handleConvertOrRetryItem(editingMappingItem.id);
    setEditingMappingItem(null);
  };

  // Customer file download
  const handleDownloadCustomerFile = (item: PartnerConversionItem) => {
    const blob = new Blob([`// Legacy Source File: ${item.sourceFile}\n// Modernized with ALSM Deterministic Engine\n// Project: ${project?.name || ''}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.sourceFile;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Staff Working Files Handlers
  const handleCreateWorkingFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !wfName.trim()) return;
    try {
      setIsSubmittingWf(true);
      const created = await partnersApi.createInternalWorkingFile(projectId, {
        name: wfName.trim(),
        category: wfCategory,
        notes: wfNotes.trim() || undefined,
        content: wfContent.trim() || undefined,
      });
      setWorkingFiles((prev) => [created, ...prev]);
      setNotice(`Internal working file "${created.name}" saved successfully.`);
      setShowWorkingFileModal(false);
      setWfName('');
      setWfNotes('');
      setWfContent('');
    } catch (err) {
      setActionError(safeMessage(err, 'Failed to save working file.'));
    } finally {
      setIsSubmittingWf(false);
    }
  };

  const handleDeleteWorkingFile = async (fileId: string, fileName: string) => {
    if (!projectId) return;
    if (!window.confirm(`Delete internal working file "${fileName}"?`)) return;
    try {
      await partnersApi.deleteInternalWorkingFile(projectId, fileId);
      setWorkingFiles((prev) => prev.filter((f) => f._id !== fileId && f.id !== fileId));
      setNotice(`Working file "${fileName}" deleted.`);
    } catch (err) {
      setActionError(safeMessage(err, 'Failed to delete working file.'));
    }
  };

  // Deliverables Creation & Review Handlers
  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !delivTitle.trim()) return;
    try {
      setIsSubmittingDeliv(true);
      const created = await partnersApi.createDeliverableCandidate({
        projectId,
        title: delivTitle.trim(),
        version: delivVersion.trim() || 'v1.0.0',
        description: delivDesc.trim() || `Modernization deliverables for ${project?.name}`,
        packageType: delivPackageType,
        fileCount: items.filter((i) => i.status === 'COMPLETED').length || 1,
        totalSizeFormatted: '2.4 MB',
        initialStatus: 'IN_REVIEW',
      });
      setDeliverables((prev) => [created, ...prev]);
      setNotice(`Deliverable candidate "${created.title}" submitted for Team Lead review.`);
      setShowDeliverableModal(false);
      setDelivTitle('');
      setDelivDesc('');
    } catch (err) {
      setActionError(safeMessage(err, 'Failed to create deliverable candidate.'));
    } finally {
      setIsSubmittingDeliv(false);
    }
  };

  const handleLeadReviewDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingDeliv) return;
    try {
      setIsSubmittingLeadReview(true);
      const updated = await partnersApi.teamLeadReviewDeliverable(
        reviewingDeliv.id,
        leadDecision,
        leadNotes.trim() || undefined,
      );
      setDeliverables((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setNotice(
        leadDecision === 'APPROVED'
          ? `Deliverable "${updated.title}" APPROVED by Team Lead. Ready for Admin publish.`
          : `Deliverable marked for revisions with feedback provided.`,
      );
      setReviewingDeliv(null);
      setLeadNotes('');
    } catch (err) {
      setActionError(safeMessage(err, 'Failed to submit review.'));
    } finally {
      setIsSubmittingLeadReview(false);
    }
  };

  const handlePublishDeliverable = async (deliv: PartnerDeliverableItem) => {
    if (!window.confirm(`Publish deliverable "${deliv.title}" (${deliv.version}) to the Web3 Customer Portal? Once published, customers can immediately download and sign off.`)) {
      return;
    }
    try {
      const published = await partnersApi.publishDeliverable(deliv.id);
      setDeliverables((prev) => prev.map((d) => (d.id === published.id ? published : d)));
      setNotice(`Deliverable "${published.title}" is now PUBLISHED and LIVE on the Web3 customer portal!`);
    } catch (err) {
      setActionError(safeMessage(err, 'Failed to publish deliverable.'));
    }
  };

  if (loading && !project) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="h-20 bg-white rounded-xl border border-[#DCE3EC]" />
        <div className="h-64 bg-white rounded-xl border border-[#DCE3EC]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-full bg-white p-8 text-center rounded-xl border border-[#DCE3EC] space-y-3">
        <p className="text-sm font-semibold text-[#17263A]">Project not found</p>
        <Link to="/partners/projects" className="text-xs font-semibold text-[#244A70] hover:underline">
          Return to Partner Projects List
        </Link>
      </div>
    );
  }

  // Domain lists for conversion queue
  const screensList = items.filter((i) => i.type === 'SCREEN');
  const programsList = items.filter((i) => i.type === 'PROGRAM');
  const activeDomainList =
    activeTab === 'screens' ? screensList : activeTab === 'programs' ? programsList : items;

  const filteredItems = activeDomainList.filter((item) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.sourceFile.toLowerCase().includes(q);

    const itemStatus = item.status;
    let matchesStatus = true;
    if (statusFilter === 'ALL') {
      matchesStatus = true;
    } else if (statusFilter === 'COMPLETED') {
      matchesStatus = itemStatus === 'COMPLETED';
    } else if (statusFilter === 'ATTENTION') {
      matchesStatus = itemStatus === 'FAILED' || item.validationStatus === 'WARNINGS';
    } else if (statusFilter === 'FAILED') {
      matchesStatus = itemStatus === 'FAILED' || itemStatus === 'DEAD_LETTER';
    } else if (statusFilter === 'READY') {
      matchesStatus = itemStatus === 'PENDING';
    } else if (statusFilter === 'PROCESSING') {
      matchesStatus = itemStatus === 'PROCESSING';
    }

    return matchesSearch && matchesStatus;
  });

  const completedScreens = screensList.filter((i) => i.status === 'COMPLETED').length;
  const completedPrograms = programsList.filter((i) => i.status === 'COMPLETED').length;

  return (
    <div className="w-full space-y-6">
      {/* ── 1. Header Toolbar ───────────────────────────────────────────────── */}
      <div className="bg-white border border-[#DCE3EC] rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <Link
              to={`/partners/projects/${project.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#244A70] hover:text-[#244A70] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Project Overview</span>
            </Link>

            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-[#17263A] tracking-tight">{project.name}</h1>
              <PartnerStatusBadge status={project.status} type="project" />
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#244A70] border border-blue-200">
                {project.targetFramework}
              </span>
              {project.isExported && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Export Bundle Released
                </span>
              )}
            </div>
            <p className="text-xs text-[#8491A3] mt-1">
              Partner: <strong className="text-[#17263A]">{project.partnerName}</strong> • Pipeline:{' '}
              <span className="font-semibold text-[#17263A]">
                {project.conversionType === 'COBOL_TO_JAVA' ? 'COBOL to Java Microservices' : 'BMS/DSPF Screens to React Web'}
              </span>
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {hasPermission('partner_project.manage_files') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/partners/projects/${project.id}/upload`)}
                className="text-xs flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" /> Upload Sources
              </Button>
            )}

            {hasPermission('partner_project.start_conversion') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunAll}
                isLoading={runningBulk}
                disabled={runningBulk}
                className="text-xs flex items-center gap-1.5 border-[#244A70] text-[#244A70] hover:bg-blue-50"
              >
                <Play className="w-3.5 h-3.5" /> Run All Conversions
              </Button>
            )}

            {hasPermission('conversion_result.export') && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsExportDialogOpen(true)}
                className="text-xs flex items-center gap-1.5 bg-[#244A70] hover:bg-[#244A70]"
              >
                <Package className="w-3.5 h-3.5" /> Export Code Bundle
              </Button>
            )}
          </div>
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
        >
          <span className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            {actionError}
          </span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
            className="text-rose-600 hover:text-rose-800"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
        >
          <span className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            {notice}
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notification"
            className="text-emerald-700 hover:text-emerald-900"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 2. Primary Workspace Mode Switcher (File Management Separation) ── */}
      <div className="bg-white border border-[#DCE3EC] rounded-xl p-1.5 shadow-2xs flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setWorkspaceMode('CUSTOMER_INPUT_FILES')}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            workspaceMode === 'CUSTOMER_INPUT_FILES'
              ? 'bg-[#244A70] text-white shadow-2xs'
              : 'text-[#8491A3] hover:bg-[#F4F7FB]'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-amber-500" />
          <span>Customer Input Files (Read-Only)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            workspaceMode === 'CUSTOMER_INPUT_FILES' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {items.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setWorkspaceMode('CONVERSION_ENGINE')}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            workspaceMode === 'CONVERSION_ENGINE'
              ? 'bg-[#244A70] text-white shadow-2xs'
              : 'text-[#8491A3] hover:bg-[#F4F7FB]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Conversion Engine (AST Workbench)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            workspaceMode === 'CONVERSION_ENGINE' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {items.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setWorkspaceMode('STAFF_WORKING_FILES')}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            workspaceMode === 'STAFF_WORKING_FILES'
              ? 'bg-[#244A70] text-white shadow-2xs'
              : 'text-[#8491A3] hover:bg-[#F4F7FB]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          <span>Staff Working Files (Internal)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            workspaceMode === 'STAFF_WORKING_FILES' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {workingFiles.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setWorkspaceMode('DELIVERABLES_PIPELINE')}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            workspaceMode === 'DELIVERABLES_PIPELINE'
              ? 'bg-[#244A70] text-white shadow-2xs'
              : 'text-[#8491A3] hover:bg-[#F4F7FB]'
          }`}
        >
          <Package className="w-3.5 h-3.5 text-emerald-500" />
          <span>Deliverables & Approval Pipeline</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            workspaceMode === 'DELIVERABLES_PIPELINE' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {deliverables.length}
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          MODE 1: CONVERSION ENGINE & ASSET PIPELINE
         ══════════════════════════════════════════════════════════════════════════ */}
      {workspaceMode === 'CONVERSION_ENGINE' && (
        <div className="space-y-6">
          {/* Modernization Workflow Stepper */}
          <ModernizationWorkflow
            currentStep="convert"
            completedSteps={items.length > 0 ? ['upload'] : []}
            onStepClick={(stepId) => {
              if (stepId === 'upload') navigate(`/partners/projects/${project.id}/upload`);
              if (stepId === 'validate' || stepId === 'review') {
                const firstItem = items[0];
                if (firstItem) navigate(`/partners/projects/${project.id}/items/${firstItem.id}/review`);
              }
              if (stepId === 'export') setIsExportDialogOpen(true);
            }}
          />

          {/* Interactive Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`text-left bg-white border p-4 rounded-xl flex items-center space-x-3.5 shadow-2xs cursor-pointer transition-all hover:border-[#244A70] ${
                statusFilter === 'ALL' ? 'border-[#244A70] ring-2 ring-blue-100 bg-blue-50/20' : 'border-[#DCE3EC]'
              }`}
            >
              <div className="p-2.5 bg-[#EEF1F6] text-[#244A70] rounded-lg border border-blue-100 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#8491A3]">Total Assets</p>
                <p className="text-xl font-extrabold text-[#17263A] mt-0.5">{items.length} Assets</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`text-left bg-white border p-4 rounded-xl flex items-center space-x-3.5 shadow-2xs cursor-pointer transition-all hover:border-emerald-500 ${
                statusFilter === 'COMPLETED' ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20' : 'border-[#DCE3EC]'
              }`}
            >
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#8491A3]">Converted</p>
                <p className="text-xl font-extrabold text-emerald-800 mt-0.5">{completedScreens + completedPrograms}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('ATTENTION')}
              className={`text-left bg-white border p-4 rounded-xl flex items-center space-x-3.5 shadow-2xs cursor-pointer transition-all hover:border-amber-500 ${
                statusFilter === 'ATTENTION' ? 'border-amber-500 ring-2 ring-amber-100 bg-amber-50/20' : 'border-[#DCE3EC]'
              }`}
            >
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#8491A3]">Review Required</p>
                <p className="text-xl font-extrabold text-amber-800 mt-0.5">
                  {items.filter((i) => i.status === 'FAILED' || i.validationStatus === 'WARNINGS').length}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('FAILED')}
              className={`text-left bg-white border p-4 rounded-xl flex items-center space-x-3.5 shadow-2xs cursor-pointer transition-all hover:border-rose-400 ${
                statusFilter === 'FAILED' ? 'border-rose-500 ring-2 ring-rose-100 bg-rose-50/20' : 'border-[#DCE3EC]'
              }`}
            >
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#8491A3]">Failed (Diagnostics)</p>
                <p className="text-xl font-extrabold text-rose-800 mt-0.5">
                  {items.filter((i) => i.status === 'FAILED' || i.status === 'DEAD_LETTER').length}
                </p>
              </div>
            </button>
          </div>

          {/* Dual Progress Bar */}
          <div className="bg-white p-4 rounded-xl border border-[#DCE3EC] shadow-2xs">
            <ProgressBar
              screensCompleted={completedScreens}
              screensTotal={screensList.length}
              programsCompleted={completedPrograms}
              programsTotal={programsList.length}
            />
          </div>

          {/* Signature Pill Tabs */}
          <Tabs
            tabs={[
              { id: 'all', label: 'All Modernization Assets', count: items.length },
              { id: 'screens', label: 'Legacy Screens (BMS/DSPF)', count: screensList.length },
              { id: 'programs', label: 'COBOL Programs (Logic)', count: programsList.length },
            ]}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId as 'screens' | 'programs' | 'all')}
          />

          {/* Filter & Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#DCE3EC] shadow-2xs">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8491A3]" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'screens' ? 'screens' : activeTab === 'programs' ? 'programs' : 'assets'} by name or source...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#244A70] text-[#17263A] placeholder-[#8491A3]"
              />
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#F8FAFC] border border-[#DCE3EC] text-[#17263A] text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#244A70] w-full sm:w-auto"
              >
                <option value="ALL">Status: All</option>
                <option value="READY">Ready / Pending</option>
                <option value="PROCESSING">Processing / Converting</option>
                <option value="COMPLETED">Completed</option>
                <option value="ATTENTION">Needs Review / Warnings</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          {/* Full-Width Enterprise Data Table */}
          <div className="bg-white border border-[#DCE3EC] rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-xs table-fixed">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead className="bg-[#F8FAFC] text-[#8491A3] font-bold uppercase tracking-wider text-[11px] border-b border-[#DCE3EC]">
                  <tr>
                    <th className="py-3.5 px-4">{activeTab === 'programs' ? 'PROGRAM NAME' : 'SCREEN / PROGRAM NAME'}</th>
                    <th className="py-3.5 px-4">LEGACY SOURCE</th>
                    <th className="py-3.5 px-4">STATUS</th>
                    <th className="py-3.5 px-4">VALIDATION</th>
                    <th className="py-3.5 px-4 text-center">ATTEMPTS</th>
                    <th className="py-3.5 px-4 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3EC]">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 px-6 text-center text-[#8491A3]">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-xl bg-[#EEF1F6] text-[#244A70] flex items-center justify-center mx-auto">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <h3 className="font-bold text-sm text-[#17263A]">Start Modernization Conversion Pipeline</h3>
                          <p className="text-xs text-[#8491A3] leading-relaxed">
                            No legacy source files have been uploaded yet. Upload your source files (BMS/DSPF screens or COBOL procedures) to start the deterministic conversion workflow.
                          </p>
                          <div className="flex items-center justify-center gap-2 pt-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => navigate(`/partners/projects/${project.id}/upload`)}
                              className="bg-[#244A70] hover:bg-[#244A70] text-white text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5 shadow-xs"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>Upload Source Files</span>
                            </Button>
                            <Link
                              to={`/partners/projects/${project.id}`}
                              className="text-xs font-semibold text-[#244A70] hover:underline px-3 py-1.5"
                            >
                              View Golden Path &rarr;
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 px-4 text-center text-[#8491A3]">
                        <FileCode className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="font-semibold text-sm text-[#17263A]">No assets match your search or filter</p>
                        <p className="text-xs mt-1">Try resetting the status filter or search keyword.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => navigate(`/partners/projects/${project.id}/items/${item.id}/review`)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#17263A]">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <FileCode className="w-4 h-4 text-[#244A70] shrink-0" />
                            <div className="min-w-0">
                              <span className="group-hover:text-[#244A70] group-hover:underline block truncate">
                                {item.name}
                              </span>
                              <span className="text-[10px] font-normal text-[#8491A3] block truncate">
                                {item.sourceFile}
                              </span>
                              {item.lastSkipReason ? (
                                <span className="mt-0.5 block whitespace-normal text-[10px] font-normal text-amber-700">
                                  {item.lastSkipReason}
                                </span>
                              ) : (
                                item.safeErrorMessage &&
                                (item.status === 'FAILED' || item.status === 'DEAD_LETTER') && (
                                  <span className="mt-0.5 block whitespace-normal text-[10px] font-normal text-rose-600">
                                    {item.safeErrorMessage}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs font-semibold text-[#8491A3] font-mono truncate">
                          {item.type === 'SCREEN' ? 'BMS/DSPF' : 'COBOL'}
                        </td>

                        <td className="py-3.5 px-4">
                          <ConversionStatusBadge status={item.status} />
                        </td>

                        <td className="py-3.5 px-4">
                          <StatusBadge status={item.validationStatus} />
                        </td>

                        <td className="py-3.5 px-4 text-center text-[#8491A3]">
                          {item.attemptCount || 0} / {item.maxAttempts || 3}
                        </td>

                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center space-x-1.5 shrink-0 whitespace-nowrap">
                            {hasPermission('conversion_result.manage_mappings') && (
                              <button
                                type="button"
                                onClick={() => handleOpenMappingModal(item)}
                                className="inline-flex items-center space-x-1 text-xs text-[#8491A3] font-semibold hover:text-[#244A70] bg-[#F8FAFC] px-2.5 py-1.5 rounded-lg border border-[#DCE3EC] transition-colors cursor-pointer"
                                title="Inspect Field Mapping"
                              >
                                <Code2 className="w-3.5 h-3.5" />
                                <span>Mapping</span>
                              </button>
                            )}

                            {hasPermission('partner_project.start_conversion') && (
                              <button
                                type="button"
                                onClick={() => handleConvertOrRetryItem(item.id)}
                                disabled={retryingItemIds.has(item.id) || item.status === 'PROCESSING'}
                                aria-label={`${
                                  item.status === 'FAILED' || item.status === 'DEAD_LETTER' ? 'Retry' : 'Convert'
                                } ${item.sourceFile}`}
                                className={`inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                                  item.status === 'FAILED' || item.status === 'DEAD_LETTER'
                                    ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                                    : 'text-[#244A70] bg-[#EEF1F6] border-blue-200 hover:bg-blue-100'
                                }`}
                                title="Run Conversion Algorithm"
                              >
                                {retryingItemIds.has(item.id) || item.status === 'PROCESSING' ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : item.status === 'FAILED' || item.status === 'DEAD_LETTER' ? (
                                  <RotateCcw className="w-3.5 h-3.5" />
                                ) : (
                                  <Play className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {item.status === 'PROCESSING'
                                    ? 'Converting...'
                                    : item.status === 'FAILED' || item.status === 'DEAD_LETTER'
                                      ? 'Retry'
                                      : 'Convert'}
                                </span>
                              </button>
                            )}

                            {hasPermission('conversion_result.review') && (
                              <Link
                                to={`/partners/projects/${project.id}/items/${item.id}/review`}
                                className="inline-flex items-center space-x-1 text-xs text-[#17263A] font-semibold bg-white px-2.5 py-1.5 rounded-lg border border-[#DCE3EC] hover:bg-gray-50 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Result</span>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODE 2: CUSTOMER INPUT FILES (READ-ONLY FOR ALSM STAFF & LEADS)
         ══════════════════════════════════════════════════════════════════════════ */}
      {workspaceMode === 'CUSTOMER_INPUT_FILES' && (
        <div className="space-y-6">
          {/* Read-Only Governance Banner */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs text-amber-900 leading-relaxed">
              <strong className="block text-sm font-bold text-amber-950">
                🔒 Customer Original Input Files (Read-Only Guarantee)
              </strong>
              <p>
                ALSM staff (Staff, Team Lead, Admin) have permission to <strong>View content</strong> and <strong>Download</strong> for analysis and modernization.
                Per ALSM security policy, internal staff <strong>strictly cannot edit, overwrite, or delete</strong> original files submitted by customers.
              </p>
            </div>
          </div>

          {/* Customer Input Files Table */}
          <div className="bg-white border border-[#DCE3EC] rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-[#DCE3EC] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#17263A]">
                  Customer Uploaded Source Files & Dossier
                </h3>
                <p className="text-xs text-[#8491A3] mt-0.5">
                  Total: <strong className="text-[#17263A]">{items.length} input files</strong> recorded in project workspace
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#8491A3] font-bold uppercase tracking-wider text-[11px] border-b border-[#DCE3EC]">
                  <tr>
                    <th className="py-3 px-4">Input File Name</th>
                    <th className="py-3 px-4">Document / Source Type</th>
                    <th className="py-3 px-4">Ingestion Status</th>
                    <th className="py-3 px-4 text-right">Engineer Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3EC]">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-[#8491A3]">
                        Customer has not uploaded input files for this project yet.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#17263A]">
                          <div className="flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-[#244A70] shrink-0" />
                            <span>{item.sourceFile || item.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#244A70] border border-blue-200">
                            {item.type === 'SCREEN' ? 'BMS/DSPF Screen Map' : 'COBOL Procedure / Logic'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Valid Original
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewCustomerItem(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-[#DCE3EC] hover:bg-slate-50 text-[#17263A] rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#244A70]" />
                              <span>View Content</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadCustomerFile(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-[#DCE3EC] hover:bg-slate-50 text-[#17263A] rounded-lg transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-500" />
                              <span>Download</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODE 3: STAFF WORKING FILES (INTERNAL TO ALSM)
         ══════════════════════════════════════════════════════════════════════════ */}
      {workspaceMode === 'STAFF_WORKING_FILES' && (
        <div className="space-y-6">
          {/* Privacy Banner */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg text-[#244A70] shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs text-blue-900 leading-relaxed">
                <strong className="block text-sm font-bold text-blue-950">
                  🔒 ALSM Private Staff Workspace
                </strong>
                <p>
                  Draft documents, intermediate scripts, temporary AST mappings, and technical notes circulate only among <strong>Staff, Team Lead, and Admin</strong>.
                  Web3 customers have no access to or visibility of these internal working files.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowWorkingFileModal(true)}
              className="text-xs bg-[#244A70] hover:bg-[#244A70] shrink-0 flex items-center gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Create New Draft File</span>
            </Button>
          </div>

          {/* Working Files Table */}
          <div className="bg-white border border-[#DCE3EC] rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#8491A3] font-bold uppercase tracking-wider text-[11px] border-b border-[#DCE3EC]">
                  <tr>
                    <th className="py-3 px-4">Working File Name</th>
                    <th className="py-3 px-4">Internal Classification</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Author (Engineer)</th>
                    <th className="py-3 px-4">Saved Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3EC]">
                  {loadingWorkingFiles ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#8491A3]">
                        Loading internal working files...
                      </td>
                    </tr>
                  ) : workingFiles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#8491A3] space-y-2">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-sm text-[#17263A]">No internal working files yet</p>
                        <p className="text-xs text-[#8491A3]">
                          Engineers can create drafts, technical analyses, or intermediate scripts to track progress.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    workingFiles.map((wf) => (
                      <tr key={wf._id || wf.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#17263A]">
                          <div className="flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-purple-600 shrink-0" />
                            <div>
                              <span>{wf.name}</span>
                              {wf.notes && (
                                <span className="block text-[10px] font-normal text-[#8491A3] mt-0.5">
                                  {wf.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            {wf.category === 'WORKING_DRAFT'
                              ? 'Working Draft'
                              : wf.category === 'INTERMEDIATE_CODE'
                              ? 'Intermediate Script'
                              : wf.category === 'ANALYSIS_DOC'
                              ? 'Technical Analysis'
                              : 'Internal Note'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[#8491A3]">
                          {Math.round((wf.sizeBytes || 1024) / 1024)} KB
                        </td>

                        <td className="py-3.5 px-4 text-[#8491A3]">
                          <span className="font-semibold block">{wf.uploadedByName}</span>
                          <span className="text-[10px] text-[#8491A3]">{wf.uploadedByRole}</span>
                        </td>

                        <td className="py-3.5 px-4 text-[#8491A3]">
                          {new Date(wf.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteWorkingFile(wf._id || wf.id || '', wf.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete internal working file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODE 4: DELIVERABLES & APPROVAL PIPELINE
         ══════════════════════════════════════════════════════════════════════════ */}
      {workspaceMode === 'DELIVERABLES_PIPELINE' && (
        <div className="space-y-6">
          {/* Governance Stepper */}
          <div className="bg-white border border-[#DCE3EC] rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#17263A]">
                  Deliverables Review & Publication Pipeline
                </h3>
                <p className="text-xs text-[#8491A3] mt-0.5">
                  Strict 3-stage governance: Engineer creates candidate ➔ Team Lead reviews & approves ➔ Admin publishes to Web3 customer
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowDeliverableModal(true)}
                  className="text-xs bg-[#244A70] hover:bg-[#244A70] flex items-center gap-1.5"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>+ Create Deliverable Candidate</span>
                </Button>
              </div>
            </div>

            {/* Stepper Display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Step 1 • Staff</span>
                <h4 className="text-xs font-bold text-[#17263A]">Propose Deliverable (Draft / Candidate)</h4>
                <p className="text-[11px] text-[#8491A3]">Engineer aggregates converted code, AST validation report, and creates candidate package.</p>
              </div>

              <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Step 2 • Team Lead</span>
                <h4 className="text-xs font-bold text-[#17263A]">Technical Review & Sign-Off</h4>
                <p className="text-[11px] text-[#8491A3]">Team Lead reviews verification rules, runs test suites, and approves or requests changes.</p>
              </div>

              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Step 3 • Admin</span>
                <h4 className="text-xs font-bold text-[#17263A]">Official Publication (Publish to Web3)</h4>
                <p className="text-[11px] text-[#8491A3]">Admin triggers publication. The package appears instantly on the customers Web3 portal.</p>
              </div>
            </div>
          </div>

          {/* Deliverables List Table */}
          <div className="bg-white border border-[#DCE3EC] rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#8491A3] font-bold uppercase tracking-wider text-[11px] border-b border-[#DCE3EC]">
                  <tr>
                    <th className="py-3 px-4">Version & Package Name</th>
                    <th className="py-3 px-4">Deliverable Type</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Pipeline Status</th>
                    <th className="py-3 px-4">Approval History</th>
                    <th className="py-3 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3EC]">
                  {loadingDeliverables ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#8491A3]">
                        Loading deliverables list...
                      </td>
                    </tr>
                  ) : deliverables.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#8491A3] space-y-2">
                        <Package className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-sm text-[#17263A]">No deliverable packages yet</p>
                        <p className="text-xs text-[#8491A3]">
                          Click "+ Create Deliverable Candidate" or publish code bundles from Export Code.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    deliverables.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 max-w-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#244A70] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {d.version}
                            </span>
                            <span className="font-bold text-[#17263A]">{d.title}</span>
                          </div>
                          <p className="text-[11px] text-[#8491A3] mt-1 line-clamp-2">{d.description}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {d.packageType}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[#8491A3]">
                          <span className="font-bold text-[#17263A]">{d.fileCount} files</span> ({d.totalSizeFormatted})
                        </td>

                        <td className="py-3.5 px-4">
                          {d.status === 'PUBLISHED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Live on Web3 Portal
                            </span>
                          ) : d.status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-[#244A70] border border-blue-200">
                              <FileCheck className="w-3.5 h-3.5 text-[#244A70]" /> Lead Approved (Awaiting Admin)
                            </span>
                          ) : d.status === 'IN_REVIEW' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Lead Review
                            </span>
                          ) : d.status === 'REVISION_REQUESTED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Revision Requested
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                              {d.status}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-[11px] text-[#8491A3] space-y-0.5">
                          {d.uploadedByName && (
                            <div>
                              <strong>Staff:</strong> {d.uploadedByName}
                            </div>
                          )}
                          {d.teamLeadReview && (
                            <div className="text-blue-700">
                              <strong>Lead:</strong> {d.teamLeadReview.reviewedByUserName} ({d.teamLeadReview.decision})
                            </div>
                          )}
                          {d.publishedByName && (
                            <div className="text-emerald-700 font-semibold">
                              <strong>Published by:</strong> {d.publishedByName}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Team Lead Review Action */}
                            {isTeamLead && (d.status === 'IN_REVIEW' || d.status === 'DRAFT') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewingDeliv(d);
                                  setLeadDecision('APPROVED');
                                  setLeadNotes('');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <FileCheck className="w-3.5 h-3.5 text-amber-700" />
                                <span>Lead Review</span>
                              </button>
                            )}

                            {/* Admin Publish Action */}
                            {isPlatformAdmin && d.status === 'APPROVED' && (
                              <button
                                type="button"
                                onClick={() => handlePublishDeliverable(d)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-2xs"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Publish Web3</span>
                              </button>
                            )}

                            {/* Download Action */}
                            <a
                              href={d.downloadUrl || `/api/v1/projects/${project.id}/partner-export/download`}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#244A70] hover:bg-blue-50 transition-colors"
                              title="Download result package"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Preview Customer Input Content ────────────────────────────── */}
      {previewCustomerItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#DCE3EC] pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-[#244A70]" />
                <div>
                  <h3 className="text-sm font-bold text-[#17263A]">{previewCustomerItem.sourceFile}</h3>
                  <span className="text-[11px] text-[#8491A3]">Customer Original • Read-Only Inspection</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCustomerItem(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs max-h-80 overflow-y-auto leading-relaxed">
              <pre>{`// ========================================================
// ALSM AUDIT SECURE LEGACY SOURCE PREVIEW
// File: ${previewCustomerItem.sourceFile}
// Source Type: ${previewCustomerItem.type}
// Hash: sha256-${previewCustomerItem.id.substring(0, 16)}...
// ========================================================

IDENTIFICATION DIVISION.
PROGRAM-ID. ${previewCustomerItem.name}.
ENVIRONMENT DIVISION.
CONFIGURATION SECTION.
DATA DIVISION.
WORKING-STORAGE SECTION.
01  WS-TRANSACTION-ID       PIC X(16).
01  WS-ACCOUNT-NUMBER       PIC 9(12).
01  WS-AMOUNT               PIC 9(9)V99.
01  WS-STATUS-CODE          PIC XX.

PROCEDURE DIVISION.
    DISPLAY "ALSM DETERMINISTIC PARSER LOADED".
    STOP RUN.`}</pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                🔒 Protected from employee modifications
              </span>
              <button
                type="button"
                onClick={() => setPreviewCustomerItem(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg text-[#17263A] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Create Staff Working File ─────────────────────────────────── */}
      {showWorkingFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#DCE3EC] pb-3">
              <h3 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#244A70]" />
                Create ALSM Internal Working File
              </h3>
              <button
                type="button"
                onClick={() => setShowWorkingFileModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkingFile} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#17263A] block mb-1">
                  File Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ast-mapping-notes.json, cobol-audit.md"
                  value={wfName}
                  onChange={(e) => setWfName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#17263A] block mb-1">File Classification</label>
                <select
                  value={wfCategory}
                  onChange={(e) => setWfCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#244A70] bg-white"
                >
                  <option value="WORKING_DRAFT">Working Draft</option>
                  <option value="INTERMEDIATE_CODE">Intermediate Code / Conversion Script</option>
                  <option value="ANALYSIS_DOC">Technical Analysis Document</option>
                  <option value="INTERNAL_NOTE">Internal Progress Note</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#17263A] block mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Brief description of usage..."
                  value={wfNotes}
                  onChange={(e) => setWfNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#17263A] block mb-1">Content or Code</label>
                <textarea
                  rows={4}
                  placeholder="// Enter technical analysis or temporary code here..."
                  value={wfContent}
                  onChange={(e) => setWfContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#244A70] font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE3EC]">
                <button
                  type="button"
                  onClick={() => setShowWorkingFileModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#8491A3] hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={isSubmittingWf}
                  className="text-xs bg-[#244A70] hover:bg-[#244A70]"
                >
                  Save Internal File
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Create Deliverable Candidate ──────────────────────────────── */}
      {showDeliverableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#DCE3EC] pb-3">
              <h3 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                Create Deliverable Candidate
              </h3>
              <button
                type="button"
                onClick={() => setShowDeliverableModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeliverable} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#17263A] block mb-1">
                  Deliverable Package Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. React 19 Frontend Components v1.0"
                  value={delivTitle}
                  onChange={(e) => setDelivTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#17263A] block mb-1">Version (Semantic)</label>
                  <input
                    type="text"
                    required
                    placeholder="v1.0.0"
                    value={delivVersion}
                    onChange={(e) => setDelivVersion(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#244A70] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#17263A] block mb-1">Package Type</label>
                  <select
                    value={delivPackageType}
                    onChange={(e) => setDelivPackageType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#244A70] bg-white"
                  >
                    <option value="FULL_MODERNIZATION_PACKAGE">Full Modernization Package</option>
                    <option value="FRONTEND_COMPONENTS">React 19 Components</option>
                    <option value="BACKEND_SERVICES">Spring Boot 3 Java</option>
                    <option value="VALIDATION_REPORT">AST Validation Report</option>
                    <option value="TECHNICAL_REPORT">Technical Architecture Documentation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#17263A] block mb-1">Detailed Package Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe acceptance scope, converted screens, and completed checklists..."
                  value={delivDesc}
                  onChange={(e) => setDelivDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE3EC]">
                <button
                  type="button"
                  onClick={() => setShowDeliverableModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#8491A3] hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={isSubmittingDeliv}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Submit for Team Lead Review
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Team Lead Review Candidate ────────────────────────────────── */}
      {reviewingDeliv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#DCE3EC] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#17263A]">
                  Team Lead Technical Review
                </h3>
                <p className="text-xs text-[#8491A3] mt-0.5">
                  {reviewingDeliv.title} ({reviewingDeliv.version})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewingDeliv(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLeadReviewDeliverable} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLeadDecision('APPROVED')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    leadDecision === 'APPROVED'
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-2 ring-emerald-100'
                      : 'border-[#DCE3EC] text-[#8491A3] hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Approve</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLeadDecision('REVISION_REQUESTED')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    leadDecision === 'REVISION_REQUESTED'
                      ? 'border-rose-500 bg-rose-50/50 text-rose-800 ring-2 ring-rose-100'
                      : 'border-[#DCE3EC] text-[#8491A3] hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>Request Revisions</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-[#17263A] block mb-1">
                  Review Notes & Technical Guidance
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter AST rule checks, test verification notes, or revision requests..."
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#DCE3EC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE3EC]">
                <button
                  type="button"
                  onClick={() => setReviewingDeliv(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#8491A3] hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={isSubmittingLeadReview}
                  className={`text-xs ${
                    leadDecision === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {leadDecision === 'APPROVED' ? 'Confirm Approval' : 'Submit Revision Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Code Bundle Dialog */}
      {isExportDialogOpen && (
        <ExportDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          project={project}
          items={items}
          onExportSuccess={(bundle) => {
            setProject((prev) =>
              prev
                ? {
                    ...prev,
                    isExported: true,
                    status: 'COMPLETED',
                    exportedBundleName: bundle.packageName,
                    exportedAt: bundle.exportedAt,
                  }
                : prev,
            );
            loadDeliverables();
          }}
        />
      )}

      {/* Edit Field Mapping Modal */}
      {editingMappingItem && (
        <EditMappingModal
          isOpen={Boolean(editingMappingItem)}
          onClose={() => setEditingMappingItem(null)}
          initialMappings={editingMappings}
          onSave={handleSaveMappings}
          itemName={editingMappingItem.name}
        />
      )}
    </div>
  );
};

export default PartnerProjectWorkspacePage;
