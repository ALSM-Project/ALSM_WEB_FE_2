import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileCode,
  SlidersHorizontal,
  Monitor,
  AlertTriangle,
  Code2,
  RefreshCw,
  Play,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { Button, Tabs, ModernizationWorkflow, StatusBadge } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { partnersApi } from '../../api/partners.api';
import {
  PartnerConversionItem,
  PartnerProject,
  ValidationFinding,
  FieldMappingRule,
} from '../../types/partner.types';
import { CodeViewer } from '../../components/CodeViewer';
import { FindingsList } from '../../components/FindingsList';
import { UiPreviewContainer } from '../../components/UiPreviewContainer';
import { EditMappingModal } from '../../components/EditMappingModal';

export const ConversionItemReviewPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { projectId, itemId } = useParams<{ projectId: string; itemId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<PartnerProject | null>(null);
  const [item, setItem] = useState<PartnerConversionItem | null>(null);
  const [findings, setFindings] = useState<ValidationFinding[]>([]);
  const [mappings, setMappings] = useState<FieldMappingRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: Default to 'preview' for screens, 'code' for programs
  const [activeTab, setActiveTab] = useState<string>('preview');
  const [selectedFileKey, setSelectedFileKey] = useState<string>('');
  const [isSourceView, setIsSourceView] = useState<boolean>(false);

  // Modals & Action States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [reconverting, setReconverting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const loadData = useCallback(async () => {
    if (!projectId || !itemId) return;
    try {
      setLoading(true);
      const [proj, itm, fnd, mps] = await Promise.all([
        partnersApi.getProjectById(projectId),
        partnersApi.getItemById(projectId, itemId),
        partnersApi.getValidationFindings(itemId),
        partnersApi.getFieldMappings(itemId),
      ]);
      setProject(proj);
      setItem(itm);
      setFindings(fnd);
      setMappings(mps);

      if (itm?.type === 'PROGRAM') {
        setActiveTab('code');
      } else {
        setActiveTab('preview');
      }

      if (itm?.generatedCode) {
        const keys = Object.keys(itm.generatedCode);
        if (keys.length > 0) setSelectedFileKey(keys[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, itemId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateFinding = async (
    findingId: string,
    status: 'CONFIRMED' | 'REJECTED' | 'NOT_APPLICABLE'
  ) => {
    if (!itemId) return;
    const updated = await partnersApi.updateFindingStatus(itemId, findingId, status);
    setFindings(updated);
  };

  const handleSaveMappings = async (newMappings: FieldMappingRule[]) => {
    if (!itemId || !projectId) return;
    await partnersApi.saveFieldMappings(itemId, newMappings);
    setMappings(newMappings);

    // Automatically trigger reconversion with updated rules
    setReconverting(true);
    try {
      const refreshedItem = await partnersApi.retryItemConversion(projectId, itemId);
      setItem(refreshedItem);
      const refreshedFindings = await partnersApi.getValidationFindings(itemId);
      setFindings(refreshedFindings);
    } finally {
      setReconverting(false);
    }
  };

  const handleReconvert = async () => {
    if (!projectId || !itemId) return;
    try {
      setReconverting(true);
      const refreshedItem = await partnersApi.retryItemConversion(projectId, itemId);
      setItem(refreshedItem);
      const refreshedFindings = await partnersApi.getValidationFindings(itemId);
      setFindings(refreshedFindings);
    } finally {
      setReconverting(false);
    }
  };

  const handleRevalidate = async () => {
    if (!itemId) return;
    try {
      setIsValidating(true);
      // Simulate real-time semantic validation run
      await new Promise((r) => setTimeout(r, 600));
      const refreshedFindings = await partnersApi.getValidationFindings(itemId);
      setFindings(refreshedFindings);
    } finally {
      setIsValidating(false);
    }
  };

  // Generation Metrics Calculation
  const generatedFiles = item?.generatedCode || {};
  const fileEntries = Object.entries(generatedFiles);
  const metrics = useMemo(() => {
    if (fileEntries.length === 0) return null;
    const totalLoc = fileEntries.reduce((sum, [, code]) => sum + code.split('\n').length, 0);
    const sizeKb = Math.max(1, Math.round(fileEntries.reduce((sum, [, code]) => sum + code.length, 0) / 1024));
    return {
      filesGenerated: fileEntries.length,
      linesOfCode: totalLoc,
      sizeKb,
      duration: '0.9s',
    };
  }, [fileEntries]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-6 h-6 animate-spin text-[#0652CC] mx-auto mb-2" />
        <p className="text-xs text-[#6B778C]">Opening conversion workspace...</p>
      </div>
    );
  }

  if (!item || !project) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-[#E5EAF0]">
        <h3 className="text-sm font-bold text-[#091E42]">Item Not Found</h3>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="mt-4">
          Return to Workspace
        </Button>
      </div>
    );
  }

  const isCobol = item.type === 'PROGRAM';
  const targetLabel = isCobol ? 'Spring Boot 3.3 / Java 21' : 'React 19 + TypeScript';

  const currentDisplayCode = isSourceView
    ? item.sourceCode || '* Source unavailable'
    : generatedFiles[selectedFileKey] || '// No output generated yet';

  const currentCodeLanguage = isSourceView
    ? isCobol
      ? 'cobol'
      : 'bms'
    : selectedFileKey.endsWith('.tsx') || selectedFileKey.endsWith('.ts')
    ? 'typescript'
    : selectedFileKey.endsWith('.java')
    ? 'java'
    : 'text';

  const tabOptions = [
    ...(item.type === 'SCREEN'
      ? [{ id: 'preview', label: 'Interactive UI Preview', icon: <Monitor className="w-4 h-4" /> }]
      : []),
    { id: 'code', label: 'Modernized Code & Source', icon: <Code2 className="w-4 h-4" /> },
    { id: 'mapping', label: isCobol ? 'Method Mapping' : 'Field Mapping', count: mappings.length, icon: <SlidersHorizontal className="w-4 h-4" /> },
    { id: 'validation', label: 'Validation Findings', count: findings.length, icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full space-y-6">
      {/* 1. Header Toolbar (Web 1 Style) */}
      <div className="bg-white border border-[#E5EAF0] rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link
              to={`/partners/projects/${project.id}/workspace`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0652CC] hover:text-[#0543A8] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Conversion Workspace</span>
            </Link>

            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold font-mono text-[#091E42] tracking-tight">{item.name}</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-[#4A5568]">
                {item.type === 'SCREEN' ? 'BMS/DSPF Screen' : 'COBOL Program'}
              </span>
              <StatusBadge status={item.status} />
              <StatusBadge status={item.validationStatus} />
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0652CC] border border-blue-200">
                Target: {targetLabel}
              </span>
            </div>

            <p className="text-xs text-[#6B778C] mt-1 font-mono">
              Source File: <strong className="text-[#091E42]">{item.sourceFile}</strong> •{' '}
              {isCobol
                ? 'Deterministic Engine: Compiles COBOL programs into Java classes & Spring Boot services.'
                : 'Deterministic Engine: Parses BMS AST into React TypeScript components & DTOs.'}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {hasPermission('conversion_result.manage_mappings') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs flex items-center gap-1.5 text-[#0652CC] border-[#0652CC]"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isCobol ? 'Edit Method Mapping' : 'Edit Mapping & Correct'}</span>
              </Button>
            )}

            {hasPermission('partner_project.start_conversion') && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleReconvert}
                isLoading={reconverting}
                className="text-xs flex items-center gap-1.5 bg-[#0652CC] hover:bg-[#0543A8]"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run Conversion Algorithm</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleRevalidate}
              isLoading={isValidating}
              className="text-xs flex items-center gap-1.5 text-[#091E42]"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Re-validate ({findings.length})</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Modernization Workflow Stepper */}
      <ModernizationWorkflow
        currentStep="convert"
        completedSteps={['upload', 'mapping']}
        onStepClick={(stepId) => {
          if (stepId === 'upload') navigate(`/partners/projects/${project.id}/upload`);
          if (stepId === 'mapping') setIsEditModalOpen(true);
          if (stepId === 'validate') setActiveTab('validation');
          if (stepId === 'export') navigate(`/partners/projects/${project.id}/workspace`);
        }}
      />

      {/* 3. Generation Summary Metrics Banner (Web 1 Style) */}
      {metrics && item.status === 'COMPLETED' && (
        <div className="bg-white border border-[#E5EAF0] rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0] mb-3">
            <span className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
              Deterministic Generation Metrics
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Deterministic AST Conversion Completed
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-[#F7F9FC] p-3 rounded-lg border border-[#E5EAF0]">
              <p className="text-[11px] text-[#6B778C] uppercase font-semibold">Files Generated</p>
              <p className="text-lg font-bold text-[#0652CC]">{metrics.filesGenerated}</p>
            </div>
            <div className="bg-[#F7F9FC] p-3 rounded-lg border border-[#E5EAF0]">
              <p className="text-[11px] text-[#6B778C] uppercase font-semibold">Lines of Code</p>
              <p className="text-lg font-bold text-[#091E42]">{metrics.linesOfCode}</p>
            </div>
            <div className="bg-[#F7F9FC] p-3 rounded-lg border border-[#E5EAF0]">
              <p className="text-[11px] text-[#6B778C] uppercase font-semibold">Artifact Size</p>
              <p className="text-lg font-bold text-amber-700">{metrics.sizeKb} KB</p>
            </div>
            <div className="bg-[#F7F9FC] p-3 rounded-lg border border-[#E5EAF0]">
              <p className="text-[11px] text-[#6B778C] uppercase font-semibold">Duration</p>
              <p className="text-lg font-bold text-emerald-700">{metrics.duration}</p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Full-Width Signature Tabs */}
      <Tabs
        tabs={tabOptions}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId)}
      />

      {/* 5. Full-Width Workspace Panes */}
      <div className="w-full">
        {/* TAB 1: UI Preview (Full Width Generous Canvas) */}
        {activeTab === 'preview' && item.type === 'SCREEN' && (
          <div className="w-full">
            <UiPreviewContainer screenName={item.name} />
          </div>
        )}

        {/* TAB 2: Modernized Code & Source (Full Width Syntax Viewer) */}
        {activeTab === 'code' && (
          <div className="w-full space-y-3">
            {/* File Switcher Bar */}
            <div className="bg-white border border-[#E5EAF0] p-3 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setIsSourceView(false)}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    !isSourceView
                      ? 'bg-[#0652CC] text-white shadow-2xs'
                      : 'text-[#6B778C] hover:bg-gray-100'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Target Code ({Object.keys(generatedFiles).length} files)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSourceView(true)}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isSourceView
                      ? 'bg-[#0652CC] text-white shadow-2xs'
                      : 'text-[#6B778C] hover:bg-gray-100'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Original Source ({item.sourceFile})</span>
                </button>
              </div>

              {/* Generated Files Selector */}
              {!isSourceView && Object.keys(generatedFiles).length > 0 && (
                <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
                  {Object.keys(generatedFiles).map((filename) => (
                    <button
                      key={filename}
                      type="button"
                      onClick={() => setSelectedFileKey(filename)}
                      className={`px-2.5 py-1 rounded font-mono transition-colors cursor-pointer ${
                        selectedFileKey === filename
                          ? 'bg-blue-50 text-[#0652CC] font-bold border border-blue-200'
                          : 'text-[#6B778C] hover:bg-gray-100'
                      }`}
                    >
                      {filename}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Code Viewer with Full Width and Generous Height */}
            <CodeViewer
              code={currentDisplayCode}
              filename={isSourceView ? item.sourceFile : selectedFileKey}
              language={currentCodeLanguage}
              maxHeight="650px"
            />
          </div>
        )}

        {/* TAB 3: Field Mapping (Full Width Mapping Table & Rules) */}
        {activeTab === 'mapping' && (
          <div className="bg-white border border-[#E5EAF0] rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5EAF0]">
              <div>
                <h3 className="text-sm font-bold text-[#091E42]">
                  {isCobol ? 'COBOL Method & Class Mappings' : 'Active Field & Attribute Mappings'}
                </h3>
                <p className="text-xs text-[#6B778C]">
                  AST identifiers mapped to target {isCobol ? 'Java methods & fields' : 'TypeScript properties and React props'}.
                </p>
              </div>

              {hasPermission('conversion_result.manage_mappings') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-xs flex items-center gap-1.5 text-[#0652CC] border-[#0652CC]"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Edit Mappings</span>
                </Button>
              )}
            </div>

            {/* Full-Width Table */}
            <div className="overflow-x-auto border border-[#E5EAF0] rounded-lg">
              <table className="w-full text-left text-xs text-[#091E42]">
                <thead className="bg-[#F7F9FC] text-[#42526E] font-bold uppercase text-[11px] border-b border-[#E5EAF0]">
                  <tr>
                    <th className="py-3 px-4">Source Identifier (AST)</th>
                    <th className="py-3 px-4">Target Property</th>
                    <th className="py-3 px-4">Target Type</th>
                    <th className="py-3 px-4">Transformation Rule</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0] font-mono">
                  {mappings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#6B778C] font-sans">
                        No custom field mappings configured. Using standard deterministic AST naming.
                      </td>
                    </tr>
                  ) : (
                    mappings.map((m, idx) => (
                      <tr key={m.id || idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-[#091E42]">
                          <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                            {m.sourceField}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-[#0652CC]">
                          <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {m.targetProperty}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#42526E] font-sans">{m.dataType}</td>
                        <td className="py-3 px-4 text-purple-700">
                          {m.transformRule ? (
                            <span className="bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {m.transformRule}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-sans">direct</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-sans">
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 text-[11px] px-2 py-0.5 rounded font-semibold border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" /> Active
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Validation Findings (Full Width Findings List) */}
        {activeTab === 'validation' && (
          <div className="w-full space-y-4">
            <div className="bg-white border border-[#E5EAF0] rounded-xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#091E42]">Semantic &amp; AST Validation Findings</h3>
                <p className="text-xs text-[#6B778C]">
                  Automated validation engine results and recommended code remediations.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#E8F1FF] text-[#0652CC] border border-[#0652CC]/20">
                {findings.length} Total Findings
              </span>
            </div>

            <FindingsList
              findings={findings}
              isStaff={hasPermission('conversion_result.manage_findings')}
              onUpdateStatus={handleUpdateFinding}
            />
          </div>
        )}
      </div>

      {/* Edit Field Mapping Modal */}
      {isEditModalOpen && (
        <EditMappingModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          initialMappings={mappings}
          onSave={handleSaveMappings}
          itemName={item.name}
        />
      )}
    </div>
  );
};
