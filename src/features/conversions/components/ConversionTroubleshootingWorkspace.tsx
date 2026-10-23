import React, { useState } from 'react';
import { 
  ArrowLeft, FileCode, CheckCircle2, 
  AlertTriangle, Wrench, RefreshCw, Plus, Trash2
} from 'lucide-react';
import { Button, Modal, Input } from '@/shared/ui';
import { CodeViewer } from '@/features/partners/components/CodeViewer';
import { EnrichedQueueJob } from '../services/mock-queue-data';
import { FieldMappingEntry } from '../services/conversion-queue.service';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface ConversionTroubleshootingWorkspaceProps {
  job: EnrichedQueueJob;
  onBack: () => void;
  onJobUpdated: (updatedJob: EnrichedQueueJob) => void;
}

export const ConversionTroubleshootingWorkspace: React.FC<ConversionTroubleshootingWorkspaceProps> = ({
  job: initialJob,
  onBack,
  onJobUpdated,
}) => {
  const { user, hasPermission } = useAuth();
  const canValidateMapping = user ? hasPermission('conversions.mapping.validate') : true;
  const canApplyPatch = user ? hasPermission('conversions.support_patch.apply') : true;
  const canRetry = user ? hasPermission('conversions.retry') : true;

  const [currentJob, setCurrentJob] = useState<EnrichedQueueJob>(initialJob);
  const [activeTab, setActiveTab] = useState<'overview' | 'source' | 'mapping' | 'validation'>('overview');
  
  // Mapping state
  const [mappings, setMappings] = useState<FieldMappingEntry[]>(currentJob.fieldMappings || []);
  const [modifiedIndices, setModifiedIndices] = useState<Set<number>>(new Set());
  const [newSource, setNewSource] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newType, setNewType] = useState('string');
  const [newRule, setNewRule] = useState('');

  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    timestamp: string;
    errors: string[];
    warnings: string[];
    successMessage?: string;
  } | null>(null);

  // Modals for Support Actions
  const [showPatchConfirm, setShowPatchConfirm] = useState(false);
  const [showRetryConfirm, setShowRetryConfirm] = useState(false);
  const [patchSuccessMsg, setPatchSuccessMsg] = useState<string | null>(null);

  const targetIdentifier = currentJob.screenId || currentJob.programName || currentJob.id;

  // Add new mapping rule
  const handleAddMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.trim() || !newTarget.trim()) return;
    const newIdx = mappings.length;
    setMappings([
      ...mappings,
      {
        sourceField: newSource.trim().toUpperCase(),
        targetProperty: newTarget.trim(),
        dataType: newType,
        transformRule: newRule.trim() || undefined,
      },
    ]);
    setModifiedIndices((prev) => new Set(prev).add(newIdx));
    setNewSource('');
    setNewTarget('');
    setNewRule('');
  };

  const handleRemoveMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
    setModifiedIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((val) => {
        if (val < index) next.add(val);
        else if (val > index) next.add(val - 1);
      });
      return next;
    });
  };

  const handleUpdateMappingField = (index: number, key: keyof FieldMappingEntry, value: string) => {
    setMappings((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item))
    );
    setModifiedIndices((prev) => new Set(prev).add(index));
  };

  // Simulate Validation
  const handleRunValidation = () => {
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
      const errors: string[] = [];
      const warnings: string[] = [];

      // Basic semantic checks
      mappings.forEach((m, idx) => {
        if (!m.sourceField.trim()) {
          errors.push(`Row ${idx + 1}: Legacy source field cannot be empty`);
        }
        if (!m.targetProperty.trim()) {
          errors.push(`Row ${idx + 1}: Modern target property identifier cannot be empty`);
        }
        if (m.dataType === 'BigDecimal' && m.transformRule?.includes('toInt')) {
          warnings.push(`Row ${idx + 1} (${m.sourceField}): BigDecimal with toInt rule may truncate decimal points`);
        }
      });

      const isValid = errors.length === 0;
      setValidationResult({
        valid: isValid,
        timestamp: new Date().toLocaleTimeString(),
        errors,
        warnings,
        successMessage: isValid 
          ? `AST Syntax & Type Binding Verified: All ${mappings.length} mapping definitions passed schema validation without conflict.` 
          : undefined,
      });
    }, 700);
  };

  // Confirm Support Patch
  const handleConfirmApplyPatch = () => {
    setShowPatchConfirm(false);
    const updated: EnrichedQueueJob = {
      ...currentJob,
      fieldMappings: mappings,
      status: 'QUEUED',
      attemptCount: 0,
      errorMessage: undefined,
      errorCode: undefined,
      updatedAt: new Date().toISOString(),
      logs: [
        ...(currentJob.logs || []),
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'INFO',
          message: `SUPPORT PATCH APPLIED: ${mappings.length} mapping rules updated by Internal Support Staff. Re-queued for processing.`,
        },
      ],
    };
    setCurrentJob(updated);
    onJobUpdated(updated);
    setPatchSuccessMsg(
      `Support patch applied successfully! ${mappings.length} rule overrides saved. Job ${currentJob.id} reset and moved to QUEUED.`
    );
  };

  // Retry Conversion
  const handleConfirmRetryConversion = () => {
    setShowRetryConfirm(false);
    const updated: EnrichedQueueJob = {
      ...currentJob,
      status: 'QUEUED',
      attemptCount: 0,
      errorMessage: undefined,
      errorCode: undefined,
      updatedAt: new Date().toISOString(),
      logs: [
        ...(currentJob.logs || []),
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'INFO',
          message: 'MANUAL SUPPORT RETRY: Re-queue initiated by internal operations staff. Resetting worker attempts.',
        },
      ],
    };
    setCurrentJob(updated);
    onJobUpdated(updated);
    setPatchSuccessMsg(`Conversion job ${currentJob.id} re-queued for processing. Attempt count reset to 0/3.`);
  };

  return (
    <div className="space-y-5 w-full">
      {/* Top Breadcrumb & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="text-xs flex items-center gap-1.5 h-8 border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Queue
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-slate-500">
                {currentJob.id}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                currentJob.status === 'QUEUED' ? 'bg-blue-100 text-blue-800' :
                currentJob.status === 'DEAD' ? 'bg-rose-100 text-rose-800' :
                currentJob.status === 'FAILED' ? 'bg-amber-100 text-amber-800' :
                'bg-emerald-100 text-emerald-800'
              }`}>
                {currentJob.status}
              </span>
              {currentJob.status === 'DEAD' && (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  DEAD-LETTER LIMIT REACHED (3/3)
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
              Troubleshooting Workspace: {targetIdentifier}
            </h1>
          </div>
        </div>

        {/* Support Action Buttons */}
        <div className="flex items-center gap-2">
          {canRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRetryConfirm(true)}
              className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50 h-8"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#0652CC]" />
              Retry Conversion
            </Button>
          )}
          {canApplyPatch && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowPatchConfirm(true)}
              className="text-xs bg-[#0652CC] text-white hover:bg-[#0543A8] h-8 shadow-xs"
            >
              <Wrench className="w-3.5 h-3.5 mr-1" />
              Apply Support Patch
            </Button>
          )}
        </div>
      </div>

      {/* Success Feedback Alert */}
      {patchSuccessMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{patchSuccessMsg}</span>
          </div>
          <button
            onClick={() => setPatchSuccessMsg(null)}
            className="text-emerald-700 font-bold hover:text-emerald-900 cursor-pointer text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 text-xs">
        {[
          { key: 'overview', label: 'Overview & Diagnostics' },
          { key: 'source', label: 'Source Preview (Read-Only)' },
          { key: 'mapping', label: `Field & Method Mapping (${mappings.length})` },
          { key: 'validation', label: 'Validation Simulation' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === tab.key
                ? 'border-[#0652CC] text-[#0652CC] bg-blue-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Context Box */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Target & Environment Context
              </h3>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-slate-500">Organisation</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{currentJob.organizationName || 'Acme Corporation'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Project</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{currentJob.projectName || currentJob.projectId}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Target Screen / Program</dt>
                  <dd className="font-mono font-semibold text-slate-900 mt-0.5">{targetIdentifier}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Conversion Type</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">{currentJob.conversionType}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Attempts Used</dt>
                  <dd className="font-mono font-semibold text-slate-900 mt-0.5">
                    {currentJob.attemptCount} of {currentJob.maxAttempts} (Limit: 3)
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Engine Tool Version</dt>
                  <dd className="font-mono text-slate-500 mt-0.5">{currentJob.toolVersion || 'ALSM Engine v4.2.1'}</dd>
                </div>
              </dl>
            </div>

            {/* Error Diagnostics Box */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Latest Failure Reason
              </h3>
              {currentJob.errorCode ? (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-red-800">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Error Code: {currentJob.errorCode}</span>
                  </div>
                  <p className="font-mono text-[11px] text-red-800 leading-relaxed">
                    {currentJob.errorMessage}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>No active errors reported. Job is ready for worker execution.</span>
                </div>
              )}

              <div className="text-[11px] text-slate-500">
                Tip: Switch to the <strong>Mapping</strong> tab to inspect and override legacy-to-modern field transforms, then validate and apply a support patch.
              </div>
            </div>
          </div>

          {/* Execution History Table */}
          {currentJob.executionHistory && currentJob.executionHistory.length > 0 && (
            <div className="alsm-table-container">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Worker Execution Attempts (3-Attempt Retry History)
                </h4>
              </div>
              <table className="alsm-table">
                <thead>
                  <tr>
                    <th>Attempt</th>
                    <th>Timestamp</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Error Diagnostics</th>
                  </tr>
                </thead>
                <tbody>
                  {currentJob.executionHistory.map((h) => (
                    <tr key={h.attempt} className="hover:bg-slate-50/80 transition-colors">
                      <td className="font-mono font-bold text-slate-900">
                        Attempt #{h.attempt}
                      </td>
                      <td className="text-slate-500">
                        {new Date(h.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="font-mono text-slate-500">{h.duration}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          h.status === 'DEAD' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="font-mono text-[11px] text-red-700">
                        {h.error || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mock Worker Logs */}
          {currentJob.logs && currentJob.logs.length > 0 && (
            <div className="rounded-lg border border-slate-200 shadow-xs overflow-hidden bg-white">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Container Execution Logs
                </h4>
              </div>
              <div className="p-4 bg-slate-950 text-slate-100 font-mono text-[11px] space-y-1 max-h-56 overflow-y-auto">
                {currentJob.logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                    <span className={`font-bold shrink-0 ${
                      log.level === 'ERROR' ? 'text-rose-400' : log.level === 'WARN' ? 'text-amber-300' : 'text-blue-400'
                    }`}>
                      [{log.level}]
                    </span>
                    <span className="text-slate-200">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SOURCE PREVIEW (READ ONLY) */}
      {activeTab === 'source' && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <FileCode className="w-4 h-4 text-[#0652CC]" />
              Legacy Source File: <strong className="text-slate-900">{targetIdentifier}</strong> (Read-Only Inspection)
            </span>
            <span className="text-[11px] text-slate-400 italic">Source modifications are restricted in support mode.</span>
          </div>

          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-xs">
            <CodeViewer
              code={currentJob.sourceCode || '* Source code not available for this record'}
              language={currentJob.conversionType.includes('COBOL') ? 'cobol' : 'bms'}
            />
          </div>
        </div>
      )}

      {/* TAB 3: MAPPING */}
      {activeTab === 'mapping' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Rule Engine & Field Mapping Overrides
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Support staff can inspect and modify field mapping rules to resolve parser type mismatches.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900">
                {mappings.length} configured mappings
              </span>
              {modifiedIndices.size > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  {modifiedIndices.size} modified
                </span>
              )}
            </div>
          </div>

          {/* Mapping Table */}
          <div className="alsm-table-container">
            <table className="alsm-table">
              <thead>
                <tr>
                  <th>Legacy Source Field</th>
                  <th>Target Property Name</th>
                  <th>Data Type</th>
                  <th>Transform Rule</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {mappings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No field mappings currently configured. Add a rule below.
                    </td>
                  </tr>
                ) : (
                  mappings.map((m, idx) => {
                    const isMod = modifiedIndices.has(idx);
                    return (
                      <tr key={idx} className={`hover:bg-slate-50/80 transition-colors ${isMod ? 'bg-amber-50/30' : ''}`}>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                          <input
                            type="text"
                            value={m.sourceField}
                            onChange={(e) => handleUpdateMappingField(idx, 'sourceField', e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:border-[#0652CC] rounded-md px-2 py-1 text-xs font-mono outline-none focus:ring-1 focus:ring-[#0652CC]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={m.targetProperty}
                            onChange={(e) => handleUpdateMappingField(idx, 'targetProperty', e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:border-[#0652CC] rounded-md px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-[#0652CC]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={m.dataType || 'string'}
                            onChange={(e) => handleUpdateMappingField(idx, 'dataType', e.target.value)}
                            className="bg-white border border-slate-200 focus:border-[#0652CC] rounded-md px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-[#0652CC]"
                          >
                            <option value="string">string</option>
                            <option value="number">number</option>
                            <option value="boolean">boolean</option>
                            <option value="BigDecimal">BigDecimal</option>
                            <option value="Date">Date</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="e.g. toCurrency, trim"
                            value={m.transformRule || ''}
                            onChange={(e) => handleUpdateMappingField(idx, 'transformRule', e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:border-[#0652CC] rounded-md px-2 py-1 text-xs font-mono outline-none focus:ring-1 focus:ring-[#0652CC]"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          {isMod ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              PATCHED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                              ORIGINAL
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveMapping(idx)}
                            className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer transition-colors"
                            title="Remove mapping rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Add New Rule Form */}
          <form onSubmit={handleAddMapping} className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#0652CC]" />
              Add Custom Override Rule
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Source Field *</label>
                <Input
                  required
                  placeholder="e.g. CUST_BAL_AMT"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="h-8 text-xs font-mono rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Target Property *</label>
                <Input
                  required
                  placeholder="e.g. currentBalance"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="h-8 text-xs rounded-md"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Data Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full h-8 px-2 border border-slate-200 rounded-md text-xs bg-white focus:outline-none focus:border-[#0652CC] focus:ring-1 focus:ring-[#0652CC]"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="BigDecimal">BigDecimal</option>
                  <option value="boolean">boolean</option>
                  <option value="Date">Date</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Transform Rule</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. toCurrency"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    className="h-8 text-xs font-mono rounded-md"
                  />
                  <Button type="submit" size="sm" variant="primary" className="h-8 px-3 shrink-0 bg-[#0652CC] hover:bg-[#0543A8] text-xs font-medium shadow-xs">
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: VALIDATION */}
      {activeTab === 'validation' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Simulated Mapping Validator
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Run the AST syntax and schema validator against current overrides before applying patch.
              </p>
            </div>
            {canValidateMapping && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleRunValidation}
                disabled={isValidating}
                className="text-xs bg-[#0652CC] hover:bg-[#0543A8] h-8 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isValidating ? 'animate-spin' : ''}`} />
                {isValidating ? 'Validating AST Rules...' : 'Validate Mapping'}
              </Button>
            )}
          </div>

          {/* Validation Result Display */}
          {validationResult ? (
            <div className="space-y-3">
              {validationResult.valid ? (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Simulated Validation Passed (Verified at {validationResult.timestamp})</span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    {validationResult.successMessage}
                  </p>
                  <p className="text-[11px] text-emerald-700 italic">
                    (Simulated Validation: Overrides satisfy schema and type requirements. Ready to apply patch.)
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-900 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-red-800">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Validation Errors Detected (Simulated at {validationResult.timestamp})</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-red-800 space-y-1">
                    {validationResult.errors.map((err, idx) => (
                      <li key={idx} className="font-mono text-[11px]">{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Warnings:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px]">
                    {validationResult.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-lg border border-slate-200 shadow-xs text-slate-500 text-xs">
              Click <strong>Validate Mapping</strong> to test current field rules against legacy source AST.
            </div>
          )}
        </div>
      )}

      {/* Support Patch Confirmation Modal */}
      <Modal
        isOpen={showPatchConfirm}
        onClose={() => setShowPatchConfirm(false)}
        title="Apply Support Patch & Re-Queue"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-2">
            <h4 className="font-bold text-[#0652CC]">Confirm Support Patch Operation</h4>
            <p>
              You are about to save <strong>{mappings.length} custom field mapping rules</strong> for{' '}
              <span className="font-mono font-semibold">{targetIdentifier}</span>.
            </p>
            <p>
              This will update the project’s local mapping configuration, clear previous error states, reset attempt count to 0, and place the conversion job back into the active processing queue.
            </p>
          </div>

          <div className="text-xs text-slate-500">
            Target: <strong className="text-slate-800">{currentJob.projectName}</strong> ({currentJob.organizationName})
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPatchConfirm(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmApplyPatch}
              className="bg-[#0652CC] hover:bg-[#0543A8] text-white text-xs h-8 shadow-xs"
            >
              Confirm & Apply Patch
            </Button>
          </div>
        </div>
      </Modal>

      {/* Retry Conversion Confirmation Modal */}
      <Modal
        isOpen={showRetryConfirm}
        onClose={() => setShowRetryConfirm(false)}
        title="Retry Conversion Job"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
            <h4 className="font-bold text-amber-800">Confirm Re-queue for {currentJob.id}</h4>
            <p>
              This action will re-queue conversion job for <strong className="font-mono">{targetIdentifier}</strong>.
            </p>
            <p>
              The attempt count will be reset to 0/3, moving the job out of dead-letter or failed state and triggering worker assignment.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRetryConfirm(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmRetryConversion}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 shadow-xs"
            >
              Confirm Re-queue
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
