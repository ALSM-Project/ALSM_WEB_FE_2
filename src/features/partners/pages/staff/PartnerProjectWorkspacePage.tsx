import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Play,
  UploadCloud,
  Package,
  RotateCcw,
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
} from 'lucide-react';
import { partnersApi, isServerProject } from '../../api/partners.api';
import { PartnerProject, PartnerConversionItem, FieldMappingRule } from '../../types/partner.types';
import { PartnerStatusBadge } from '../../components/PartnerStatusBadge';
import { ConversionStatusBadge } from '../../components/ConversionStatusBadge';
import { ProgressBar } from '../../components/ProgressBar';
import { ExportDialog } from '../../components/ExportDialog';
import { EditMappingModal } from '../../components/EditMappingModal';
import { Button, Tabs, ModernizationWorkflow, StatusBadge } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';

/** Refresh cadence while any item of a server project is still converting. */
export const WORKSPACE_POLL_INTERVAL_MS = 3000;

function safeMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export const PartnerProjectWorkspacePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [project, setProject] = useState<PartnerProject | null>(null);
  const [items, setItems] = useState<PartnerConversionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab & Filter states matching Web 1
  const [activeTab, setActiveTab] = useState<'screens' | 'programs' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & In-flight actions
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [editingMappingItem, setEditingMappingItem] = useState<PartnerConversionItem | null>(null);
  const [editingMappings, setEditingMappings] = useState<FieldMappingRule[]>([]);
  const [runningBulk, setRunningBulk] = useState(false);
  // Several rows can be triggered at once; each row only locks itself.
  const [retryingItemIds, setRetryingItemIds] = useState<ReadonlySet<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setProject(await partnersApi.getProjectById(projectId));
      setItems(await partnersApi.getProjectItems(projectId));
    } catch (err) {
      setActionError(safeMessage(err, 'The workspace could not be loaded. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const refreshProject = useCallback(async () => {
    if (!projectId) return;
    setProject(await partnersApi.getProjectById(projectId));
  }, [projectId]);

  // Live progress: queued/processing jobs finish in the background worker, so keep
  // re-reading the items until nothing is in flight.
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
    // Auto-reconvert AST with updated rules
    await handleConvertOrRetryItem(editingMappingItem.id);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-6 h-6 animate-spin text-[#0652CC] mx-auto mb-2" />
        <p className="text-xs text-[#6B778C]">Opening conversion workspace...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-[#E5EAF0]">
        <h3 className="text-sm font-bold text-[#091E42]">Project Not Found</h3>
        <Button variant="outline" size="sm" onClick={() => navigate('/partners')} className="mt-4">
          Return to Partners
        </Button>
      </div>
    );
  }

  // Domain groupings
  const screensList = items.filter((i) => i.type === 'SCREEN');
  const programsList = items.filter((i) => i.type === 'PROGRAM');

  const activeDomainList =
    activeTab === 'screens' ? screensList : activeTab === 'programs' ? programsList : items;

  // Filter application
  const filteredItems = activeDomainList.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sourceFile.toLowerCase().includes(searchTerm.toLowerCase());

    const itemStatus = item.status.toUpperCase();
    const filter = statusFilter.toUpperCase();

    let matchesStatus = true;
    if (filter === 'ALL') {
      matchesStatus = true;
    } else if (filter === 'COMPLETED' || filter === 'CONVERTED') {
      matchesStatus = itemStatus === 'COMPLETED' || itemStatus === 'CONVERTED';
    } else if (filter === 'ATTENTION' || filter === 'REVIEW REQUIRED') {
      matchesStatus = itemStatus === 'FAILED' || item.validationStatus === 'WARNINGS';
    } else if (filter === 'FAILED') {
      matchesStatus = itemStatus === 'FAILED' || itemStatus === 'DEAD_LETTER';
    } else if (filter === 'READY' || filter === 'PENDING') {
      matchesStatus = itemStatus === 'PENDING' || itemStatus === 'NOT_STARTED';
    } else if (filter === 'PROCESSING') {
      matchesStatus = itemStatus === 'PROCESSING' || itemStatus === 'IN_PROGRESS';
    }

    return matchesSearch && matchesStatus;
  });

  // Metrics for active domain
  const metrics = {
    total: activeDomainList.length,
    converted: activeDomainList.filter((i) => i.status === 'COMPLETED').length,
    reviewRequired: activeDomainList.filter((i) => i.status === 'FAILED' || i.validationStatus === 'WARNINGS').length,
    failed: activeDomainList.filter((i) => i.status === 'FAILED' || i.status === 'DEAD_LETTER').length,
  };

  const completedScreens = screensList.filter((i) => i.status === 'COMPLETED').length;
  const completedPrograms = programsList.filter((i) => i.status === 'COMPLETED').length;

  return (
    <div className="w-full space-y-6">
      {/* 1. Header Toolbar */}
      <div className="bg-white border border-[#E5EAF0] rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <Link
              to={`/partners/projects/${project.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0652CC] hover:text-[#0543A8] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Project Overview</span>
            </Link>

            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-[#091E42] tracking-tight">{project.name}</h1>
              <PartnerStatusBadge status={project.status} type="project" />
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#0652CC] border border-blue-200">
                {project.targetFramework}
              </span>
              {project.isExported && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Export Bundle Released
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B778C] mt-1">
              Partner: <strong className="text-[#091E42]">{project.partnerName}</strong> • Pipeline:{' '}
              <span className="font-semibold text-[#091E42]">
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
                className="text-xs flex items-center gap-1.5 border-[#0652CC] text-[#0652CC] hover:bg-blue-50"
              >
                <Play className="w-3.5 h-3.5" /> Run All Conversions
              </Button>
            )}

            {hasPermission('conversion_result.export') && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsExportDialogOpen(true)}
                className="text-xs flex items-center gap-1.5 bg-[#0652CC] hover:bg-[#0543A8]"
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

      {/* 2. Modernization Workflow Stepper */}
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

      {/* 3. Interactive Metric Cards (Web 1 pattern) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets -> Filter ALL */}
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`text-left bg-white border p-4 rounded-xl flex items-center space-x-3.5 shadow-2xs cursor-pointer transition-all hover:border-[#0652CC] ${
            statusFilter === 'ALL' ? 'border-[#0652CC] ring-2 ring-blue-100 bg-blue-50/20' : 'border-[#E5EAF0]'
          }`}
          title="Click to view all assets"
        >
          <div className="p-2.5 bg-[#E8F1FF] text-[#0652CC] rounded-lg border border-blue-100 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#42526E]">Total Assets</p>
            <p className="text-xl font-extrabold text-[#091E42] mt-0.5">
              {metrics.total} {activeTab === 'screens' ? 'Screens' : activeTab === 'programs' ? 'Programs' : 'Assets'}
            </p>
          </div>
        </button>

        {/* Converted -> Filter COMPLETED */}
        <button
          type="button"
          onClick={() => setStatusFilter('COMPLETED')}
          className={`text-left bg-white border p-4 rounded-xl flex items-center space-x-3.5 shadow-2xs cursor-pointer transition-all hover:border-emerald-500 ${
            statusFilter === 'COMPLETED' ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20' : 'border-[#E5EAF0]'
          }`}
          title="Click to filter by Converted status"
        >
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#42526E]">Converted</p>
            <p className="text-xl font-extrabold text-emerald-800 mt-0.5">{metrics.converted}</p>
          </div>
        </button>

        {/* Review Required -> Filter ATTENTION */}
        <button
          type="button"
          onClick={() => setStatusFilter('ATTENTION')}
          className={`text-left bg-white border p-4 rounded-xl flex items-center space-x-3.5 shadow-2xs cursor-pointer transition-all hover:border-amber-500 ${
            statusFilter === 'ATTENTION' ? 'border-amber-500 ring-2 ring-amber-100 bg-amber-50/20' : 'border-[#E5EAF0]'
          }`}
          title="Click to filter by Review Required status"
        >
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#42526E]">Review Required</p>
            <p className="text-xl font-extrabold text-amber-800 mt-0.5">{metrics.reviewRequired}</p>
          </div>
        </button>

        {/* Failed -> Filter FAILED */}
        <button
          type="button"
          onClick={() => setStatusFilter('FAILED')}
          className={`text-left bg-white border p-4 rounded-xl flex items-center space-x-3.5 shadow-2xs cursor-pointer transition-all hover:border-rose-400 ${
            statusFilter === 'FAILED' ? 'border-rose-500 ring-2 ring-rose-100 bg-rose-50/20' : 'border-[#E5EAF0]'
          }`}
          title="Click to filter by Failed status"
        >
          <div className="p-2.5 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#42526E]">Failed (Diagnostics)</p>
            <p className="text-xl font-extrabold text-rose-800 mt-0.5">{metrics.failed}</p>
          </div>
        </button>
      </div>

      {/* Dual Progress Bar for project-level scope */}
      <div className="bg-white p-4 rounded-xl border border-[#E5EAF0] shadow-2xs">
        <ProgressBar
          screensCompleted={completedScreens}
          screensTotal={screensList.length}
          programsCompleted={completedPrograms}
          programsTotal={programsList.length}
        />
      </div>

      {/* 4. Signature Pill Tabs */}
      <Tabs
        tabs={[
          { id: 'all', label: 'All Modernization Assets', count: items.length },
          { id: 'screens', label: 'Legacy Screens (BMS/DSPF)', count: screensList.length },
          { id: 'programs', label: 'COBOL Programs (Logic)', count: programsList.length },
        ]}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as 'screens' | 'programs' | 'all')}
      />

      {/* 5. Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5EAF0] shadow-2xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B778C]" />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'screens' ? 'screens' : activeTab === 'programs' ? 'programs' : 'assets'} by name or source...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F7F9FC] border border-[#D9E2EC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0652CC] text-[#091E42] placeholder-[#6B778C]"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#F7F9FC] border border-[#D9E2EC] text-[#091E42] text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0652CC] w-full sm:w-auto"
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

      {/* 6. Full-Width Enterprise Data Table (Web 1 Style) */}
      <div className="bg-white border border-[#E5EAF0] rounded-xl overflow-hidden shadow-2xs">
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
            <thead className="bg-[#F7F9FC] text-[#42526E] font-bold uppercase tracking-wider text-[11px] border-b border-[#E5EAF0]">
              <tr>
                <th className="py-3.5 px-4">{activeTab === 'programs' ? 'PROGRAM NAME' : 'SCREEN / PROGRAM NAME'}</th>
                <th className="py-3.5 px-4">LEGACY SOURCE</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4">VALIDATION</th>
                <th className="py-3.5 px-4 text-center">ATTEMPTS</th>
                <th className="py-3.5 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center text-[#6B778C]">
                    <FileCode className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-[#091E42]">No assets match your filters</p>
                    <p className="text-xs mt-1">Upload source files to populate this workspace.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/partners/projects/${project.id}/items/${item.id}/review`)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  >
                    {/* 1. Name & Source file */}
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#091E42]">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <FileCode className="w-4 h-4 text-[#0652CC] shrink-0" />
                        <div className="min-w-0">
                          <span className="group-hover:text-[#0652CC] group-hover:underline block truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-normal text-[#6B778C] block truncate">
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

                    {/* 2. Source Type */}
                    <td className="py-3.5 px-4 text-xs font-semibold text-[#42526E] font-mono truncate">
                      {item.type === 'SCREEN' ? 'BMS/DSPF' : 'COBOL'}
                    </td>

                    {/* 3. Status */}
                    <td className="py-3.5 px-4">
                      <ConversionStatusBadge status={item.status} />
                    </td>

                    {/* 4. Validation */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={item.validationStatus} />
                    </td>

                    {/* 5. Attempts */}
                    <td className="py-3.5 px-4 text-center text-[#6B778C]">
                      {item.attemptCount || 0} / {item.maxAttempts || 3}
                    </td>

                    {/* 6. Actions */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center space-x-1.5 shrink-0 whitespace-nowrap">
                        {/* Mapping Button */}
                        {hasPermission('conversion_result.manage_mappings') && (
                          <button
                            type="button"
                            onClick={() => handleOpenMappingModal(item)}
                            className="inline-flex items-center space-x-1 text-xs text-[#42526E] font-semibold hover:text-[#0652CC] bg-[#F7F9FC] px-2.5 py-1.5 rounded-lg border border-[#D9E2EC] transition-colors cursor-pointer"
                            title="Inspect Field Mapping"
                          >
                            <Code2 className="w-3.5 h-3.5" />
                            <span>Mapping</span>
                          </button>
                        )}

                        {/* Convert / Retry Button */}
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
                                : 'text-[#0652CC] bg-[#E8F1FF] border-blue-200 hover:bg-blue-100'
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

                        {/* Review / Result Button */}
                        {hasPermission('conversion_result.review') && (
                          <Link
                            to={`/partners/projects/${project.id}/items/${item.id}/review`}
                            className="inline-flex items-center space-x-1 text-xs text-[#091E42] font-semibold bg-white px-2.5 py-1.5 rounded-lg border border-[#D9E2EC] hover:bg-gray-50 transition-colors"
                            title="Review Result & Findings"
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
