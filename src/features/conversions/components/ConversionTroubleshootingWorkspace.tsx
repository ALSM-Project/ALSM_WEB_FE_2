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

      // Check if unmapped CUST_BAL_AMT was patched
      const hasBalanceMapping = mappings.some(
        (m) => m.sourceField.includes('BAL') || m.targetProperty.toLowerCase().includes('balance')
      );

      if (currentJob.errorCode === 'SCHEMA_MAPPING_MISMATCH' && !hasBalanceMapping) {
        errors.push('Unresolved numeric mapping for CUST_BAL_AMT: Field must have explicit transform rule toCurrency or number.');
      }

      if (mappings.length === 0) {
        errors.push('At least one field mapping rule is required for this screen layout.');
      }

      const duplicateTargets = mappings
        .map((m) => m.targetProperty)
        .filter((item, index, arr) => arr.indexOf(item) !== index);
      if (duplicateTargets.length > 0) {
        errors.push(`Duplicate target property mappings detected: ${duplicateTargets.join(', ')}`);
      }

      if (mappings.some((m) => !m.transformRule)) {
        warnings.push('Some fields have no explicit transform rule; default string trimming will apply.');
      }

      const isValid = errors.length === 0;
      setValidationResult({
        valid: isValid,
        timestamp: new Date().toLocaleTimeString(),
        errors,
        warnings,
        successMessage: isValid
          ? `All ${mappings.length} field mappings validated cleanly! Ready for support patch re-queue.`
          : undefined,
      });
    }, 600);
  };

  // Apply Support Patch
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
    <div className="space-y-6 w-full">
      {/* Top Breadcrumb & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5EAF0]">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Queue
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[#6B778C]">
                {currentJob.id}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
            <h1 className="text-xl font-bold tracking-tight text-[#091E42] mt-0.5">
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
              className="text-xs border-[#E5EAF0] text-[#091E42] hover:bg-[#F7F9FC]"
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
              className="text-xs bg-[#0652CC] text-white hover:bg-[#0543A8]"
            >
              <Wrench className="w-3.5 h-3.5 mr-1" />
              Apply Support Patch
            </Button>
          )}
        </div>
      </div>

      {/* Success Feedback Alert */}
      {patchSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{patchSuccessMsg}</span>
          </div>
          <button
            onClick={() => setPatchSuccessMsg(null)}
            className="text-emerald-700 font-bold hover:text-emerald-900 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E5EAF0] text-xs">
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
            className={`px-4 py-2.5 font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === tab.key
                ? 'border-[#0652CC] text-[#0652CC] bg-blue-50/20'
                : 'border-transparent text-[#6B778C] hover:text-[#091E42]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Context Box */}
            <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
                Target & Environment Context
              </h3>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-[#6B778C]">Organisation</dt>
                  <dd className="font-semibold text-[#091E42] mt-0.5">{currentJob.organizationName || 'Acme Corporation'}</dd>
                </div>
                <div>
                  <dt className="text-[#6B778C]">Project</dt>
                  <dd className="font-semibold text-[#091E42] mt-0.5">{currentJob.projectName || currentJob.projectId}</dd>
                </div>
                <div>
                  <dt className="text-[#6B778C]">Target Screen / Program</dt>
                  <dd className="font-mono font-semibold text-[#091E42] mt-0.5">{targetIdentifier}</dd>
                </div>
                <div>
                  <dt className="text-[#6B778C]">Conversion Type</dt>
                  <dd className="font-medium text-[#091E42] mt-0.5">{currentJob.conversionType}</dd>
                </div>
                <div>
                  <dt className="text-[#6B778C]">Attempts Used</dt>
                  <dd className="font-mono font-semibold text-[#091E42] mt-0.5">
                    {currentJob.attemptCount} of {currentJob.maxAttempts} (Limit: 3)
                  </dd>
                </div>
                <div>
                  <dt className="text-[#6B778C]">Engine Tool Version</dt>
                  <dd className="font-mono text-[#6B778C] mt-0.5">{currentJob.toolVersion || 'ALSM Engine v4.2.1'}</dd>
                </div>
              </dl>
            </div>

            {/* Error Diagnostics Box */}
            <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
                Latest Failure Reason
              </h3>
              {currentJob.errorCode ? (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Error Code: {currentJob.errorCode}</span>
                  </div>
                  <p className="font-mono text-[11px] text-rose-800 leading-relaxed">
                    {currentJob.errorMessage}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>No active errors reported. Job is ready for worker execution.</span>
                </div>
              )}

              <div className="text-[11px] text-[#6B778C]">
                Tip: Switch to the <strong>Mapping</strong> tab to inspect and override legacy-to-modern field transforms, then validate and apply a support patch.
              </div>
            </div>
          </div>

          {/* Execution History Table */}
          {currentJob.executionHistory && currentJob.executionHistory.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5EAF0] shadow-2xs overflow-hidden">
              <div className="px-4 py-3 bg-[#F7F9FC] border-b border-[#E5EAF0]">
                <h4 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
                  Worker Execution Attempts (3-Attempt Retry History)
                </h4>
              </div>
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAFBFD] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Attempt</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Duration</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Error Diagnostics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {currentJob.executionHistory.map((h) => (
                    <tr key={h.attempt} className="hover:bg-[#F9FBFF]">
                      <td className="py-2.5 px-4 font-mono font-bold text-[#091E42]">
                        Attempt #{h.attempt}
                      </td>
                      <td className="py-2.5 px-4 text-[#6B778C]">
                        {new Date(h.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[#6B778C]">{h.duration}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.status === 'DEAD' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-rose-700">
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
            <div className="bg-white rounded-xl border border-[#E5EAF0] shadow-2xs overflow-hidden">
              <div className="px-4 py-3 bg-[#F7F9FC] border-b border-[#E5EAF0]">
                <h4 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
                  Container Execution Logs
                </h4>
              </div>
              <div className="p-4 bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1 max-h-56 overflow-y-auto">
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
          <div className="p-3 rounded-xl bg-slate-100 border border-[#E5EAF0] text-xs text-[#6B778C] flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <FileCode className="w-4 h-4 text-[#0652CC]" />
              Legacy Source File: <strong>{targetIdentifier}</strong> (Read-Only Inspection)
            </span>
            <span className="text-[11px] italic">Source modifications are restricted in support mode.</span>
          </div>

          <div className="rounded-xl border border-[#E5EAF0] overflow-hidden bg-white shadow-2xs">
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5EAF0] shadow-2xs">
            <div>
              <h3 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
                Rule Engine & Field Mapping Overrides
              </h3>
              <p className="text-xs text-[#6B778C] mt-0.5">
                Support staff can inspect and modify field mapping rules to resolve parser type mismatches.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#091E42]">
                {mappings.length} configured mappings
              </span>
              {modifiedIndices.size > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {modifiedIndices.size} modified
                </span>
              )}
            </div>
          </div>

          {/* Mapping Table */}
          <div className="bg-white rounded-xl border border-[#E5EAF0] shadow-2xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Legacy Source Field</th>
                  <th className="py-3 px-4">Target Property Name</th>
                  <th className="py-3 px-4">Data Type</th>
                  <th className="py-3 px-4">Transform Rule</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {mappings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#6B778C]">
                      No field mappings currently configured. Add a rule below.
                    </td>
                  </tr>
                ) : (
                  mappings.map((m, idx) => {
                    const isMod = modifiedIndices.has(idx);
                    return (
                      <tr key={idx} className={`hover:bg-[#FAFBFD] ${isMod ? 'bg-amber-50/20' : ''}`}>
                        <td className="py-2.5 px-4 font-mono font-semibold text-[#091E42]">
                          <input
                            type="text"
                            value={m.sourceField}
                            onChange={(e) => handleUpdateMappingField(idx, 'sourceField', e.target.value)}
                            className="w-full bg-white border border-[#D9E2EC] rounded-lg px-2 py-1 text-xs font-mono"
                          />
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={m.targetProperty}
                            onChange={(e) => handleUpdateMappingField(idx, 'targetProperty', e.target.value)}
                            className="w-full bg-white border border-[#D9E2EC] rounded-lg px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-4">
                          <select
                            value={m.dataType || 'string'}
                            onChange={(e) => handleUpdateMappingField(idx, 'dataType', e.target.value)}
                            className="bg-white border border-[#D9E2EC] rounded-lg px-2 py-1 text-xs"
                          >
                            <option value="string">string</option>
                            <option value="number">number</option>
                            <option value="boolean">boolean</option>
                            <option value="BigDecimal">BigDecimal</option>
                            <option value="Date">Date</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            placeholder="e.g. toCurrency, trim"
                            value={m.transformRule || ''}
                            onChange={(e) => handleUpdateMappingField(idx, 'transformRule', e.target.value)}
                            className="w-full bg-white border border-[#D9E2EC] rounded-lg px-2 py-1 text-xs font-mono"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {isMod ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              PATCHED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
                              ORIGINAL
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveMapping(idx)}
                            className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
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
          <form onSubmit={handleAddMapping} className="p-4 bg-white rounded-xl border border-[#E5EAF0] shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-[#091E42] uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#0652CC]" />
              Add Custom Override Rule
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#6B778C] mb-1">Source Field *</label>
                <Input
                  required
                  placeholder="e.g. CUST_BAL_AMT"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6B778C] mb-1">Target Property *</label>
                <Input
                  required
                  placeholder="e.g. currentBalance"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6B778C] mb-1">Data Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full h-8 px-2 border border-[#D9E2EC] rounded-xl text-xs bg-white focus:outline-none"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="BigDecimal">BigDecimal</option>
                  <option value="boolean">boolean</option>
                  <option value="Date">Date</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6B778C] mb-1">Transform Rule</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. toCurrency"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <Button type="submit" size="sm" variant="primary" className="h-8 px-3 shrink-0">
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
          <div className="p-4 bg-white rounded-xl border border-[#E5EAF0] shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
                Simulated Mapping Validator
              </h3>
              <p className="text-xs text-[#6B778C] mt-0.5">
                Run the AST syntax and schema validator against current overrides before applying patch.
              </p>
            </div>
            {canValidateMapping && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleRunValidation}
                disabled={isValidating}
                className="text-xs bg-[#0652CC] hover:bg-[#0543A8]"
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
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
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
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Validation Errors Detected (Simulated at {validationResult.timestamp})</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-rose-800 space-y-1">
                    {validationResult.errors.map((err, idx) => (
                      <li key={idx} className="font-mono text-[11px]">{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
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
            <div className="p-8 text-center bg-white rounded-xl border border-[#E5EAF0] shadow-2xs text-[#6B778C] text-xs">
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
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-2">
            <h4 className="font-bold text-[#0652CC]">Confirm Support Patch Operation</h4>
            <p>
              You are about to save <strong>{mappings.length} custom field mapping rules</strong> for{' '}
              <span className="font-mono font-semibold">{targetIdentifier}</span>.
            </p>
            <p>
              This will update the project’s local mapping configuration, clear previous error states, reset attempt count to 0, and place the conversion job back into the active processing queue.
            </p>
          </div>

          <div className="text-xs text-[#6B778C]">
            Target: <strong>{currentJob.projectName}</strong> ({currentJob.organizationName})
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5EAF0]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPatchConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmApplyPatch}
              className="bg-[#0652CC] text-white"
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
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
            <h4 className="font-bold text-amber-800">Confirm Re-queue for {currentJob.id}</h4>
            <p>
              This action will re-queue conversion job for <strong className="font-mono">{targetIdentifier}</strong>.
            </p>
            <p>
              The attempt count will be reset to 0/3, moving the job out of dead-letter or failed state and triggering worker assignment.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5EAF0]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRetryConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmRetryConversion}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Confirm Re-queue
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
