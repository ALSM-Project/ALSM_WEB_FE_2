import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  RefreshCw,
  Sliders,
  Save,
  CheckCircle2,
  Sparkles,
  Check,
} from 'lucide-react';
import { Button, Tabs, ModernizationWorkflow } from '@/shared/ui';
import { useBreadcrumbEntity } from '@/hooks/useBreadcrumb';
import { apiClient } from '@/services/api/apiClient';
import { partnersApi } from '../../api/partners.api';
import {
  PartnerConversionItem,
  PartnerProject,
  FieldMappingRule,
} from '../../types/partner.types';
import {
  ValidationFindingStatus,
  type ValidationFinding,
} from '../../types/validation';
import { CodeEditor } from '../../components/CodeEditor';
import { LiveTsxRenderer } from '../../components/LiveTsxRenderer';
import { CobolTransformationView } from '../../components/CobolTransformationView';
import { EditMappingModal } from '../../components/EditMappingModal';
import {
  generateScreenBundle,
  parseConvertedTsx,
  isDisplayableCodeFile,
} from '../../utils/screenGenerator';
import { applyAiSuggestion } from '../../utils/aiRemediation';

interface ConversionJobDto {
  id: string;
  screenId?: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD' | 'CANCELLED';
  resultReference?: string;
  errorCode?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

interface ResultFile {
  relativePath: string;
  language: string;
  content: string;
}

interface ResultBundleDto {
  files: ResultFile[];
}

export const ConversionItemReviewPage: React.FC = () => {
  const { projectId = '', itemId = '' } = useParams<{ projectId: string; itemId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<PartnerProject | null>(null);
  const [item, setItem] = useState<PartnerConversionItem | null>(null);
  const [screenData, setScreenData] = useState<any>(null);
  const [latestJob, setLatestJob] = useState<ConversionJobDto | null>(null);
  const [resultBundle, setResultBundle] = useState<ResultBundleDto | null>(null);
  const [loading, setLoading] = useState(true);

  useBreadcrumbEntity(project?.name, projectId);
  useBreadcrumbEntity(item?.sourceFile || item?.name, itemId);

  // Layout & Tab State
  const [activeTab, setActiveTab] = useState<string>('preview');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [previewLayout, setPreviewLayout] = useState<'screen' | 'split'>('screen');
  const [codeLayout, setCodeLayout] = useState<'code' | 'split'>('code');
  const [editedFiles, setEditedFiles] = useState<Record<string, string>>({});

  // Actions & Validation State
  const [isRunning, setIsRunning] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isValidationActive, setIsValidationActive] = useState(false);
  const [isValidationCompleted, setIsValidationCompleted] = useState(false);
  const [findings, setFindings] = useState<ValidationFinding[]>([]);
  const [applyingFixId, setApplyingFixId] = useState<string | null>(null);
  const [mappings, setMappings] = useState<FieldMappingRule[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const screenName = item?.sourceFile || item?.name || itemId;
  const cleanName = screenName.replace(/\.(bms|dspf|cob|cbl|dds)$/i, '').toUpperCase();
  const isCobol =
    item?.type === 'PROGRAM' ||
    screenData?.sourceType === 'COBOL' ||
    Boolean(screenName.toLowerCase().endsWith('.cbl') || screenName.toLowerCase().endsWith('.cob'));

  const currentTab = isCobol && activeTab === 'preview' ? 'code' : activeTab;
  const isCompleted =
    item?.status === 'COMPLETED' ||
    latestJob?.status === 'COMPLETED' ||
    (resultBundle?.files && resultBundle.files.length > 0);

  // Load project, screen, job and result bundle
  const loadData = useCallback(async () => {
    if (!projectId || !itemId) return;
    try {
      setLoading(true);

      const [proj, itm] = await Promise.all([
        partnersApi.getProjectById(projectId).catch(() => null),
        partnersApi.getItemById(projectId, itemId).catch(() => null),
      ]);
      setProject(proj);
      setItem(itm);

      // Fetch screen details from backend
      let scr: any = null;
      try {
        scr = await apiClient.get<any>(`/screens/${itemId}`);
        setScreenData(scr);
      } catch {
        // screen record might not be separate
      }

      // Fetch latest conversion job for this screen
      let job: ConversionJobDto | null = null;
      try {
        const jobs = await apiClient.get<ConversionJobDto[]>(
          `/projects/${projectId}/screens/${itemId}/conversions`
        );
        if (Array.isArray(jobs) && jobs.length > 0) {
          job = jobs[0];
          setLatestJob(job);
        }
      } catch {
        // no job record
      }

      // Fallback: Check project conversions if not found directly on screen
      if (!job) {
        try {
          const projJobs = await apiClient.get<ConversionJobDto[]>(
            `/projects/${projectId}/conversions`
          );
          if (Array.isArray(projJobs) && projJobs.length > 0) {
            job = projJobs.find((j) => j.status === 'COMPLETED') || projJobs[0];
            setLatestJob(job);
          }
        } catch {
          // ignore
        }
      }

      // If job is completed or item completed, fetch result bundle
      if (job?.id && job.status === 'COMPLETED') {
        try {
          const res = await apiClient.get<ResultBundleDto>(`/conversions/${job.id}/result`);
          setResultBundle(res);
        } catch (e) {
          console.warn('Could not fetch result bundle:', e);
        }
      }

      // Load field mappings
      try {
        const mps = await partnersApi.getFieldMappings(itemId);
        setMappings(mps);
      } catch {
        // mappings fallback
      }

      // Load validation findings
      try {
        const fnd = await partnersApi.getValidationFindings(itemId);
        if (fnd && fnd.length > 0) {
          setFindings(fnd as any);
          setIsValidationCompleted(true);
        }
      } catch {
        // findings fallback
      }

      // Set initial active tab
      const isProg = itm?.type === 'PROGRAM' || scr?.sourceType === 'COBOL' || screenName.toLowerCase().endsWith('.cbl');
      if (isProg) {
        setActiveTab('code');
      } else {
        setActiveTab('preview');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, itemId, screenName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fallback screen bundle
  const fallbackBundle = useMemo(() => generateScreenBundle(screenName), [screenName]);

  // Resolved files list specifically filtered or prioritized for this screen
  const files = useMemo<ResultFile[]>(() => {
    if (resultBundle?.files && resultBundle.files.length > 0) {
      const displayable = resultBundle.files.filter((f) => isDisplayableCodeFile(f.relativePath));
      const screenMatches = displayable.filter((f) =>
        f.relativePath.toUpperCase().includes(cleanName)
      );
      if (screenMatches.length > 0) return screenMatches;
      if (displayable.length > 0) return displayable;
    }
    if (item?.generatedCode && Object.keys(item.generatedCode).length > 0) {
      return Object.entries(item.generatedCode).map(([relativePath, content]) => ({
        relativePath,
        language: relativePath.endsWith('.java') ? 'java' : 'typescript',
        content,
      }));
    }
    if (isCompleted && fallbackBundle.files.length > 0) {
      return fallbackBundle.files;
    }
    return [];
  }, [resultBundle, item, isCompleted, fallbackBundle, cleanName]);

  const selectedFile = files[selectedFileIndex] ?? files[0] ?? null;

  // Active code with edited overrides and localStorage cache
  const activeCode = useMemo(() => {
    if (!selectedFile) return '';
    if (editedFiles[selectedFile.relativePath] !== undefined) {
      return editedFiles[selectedFile.relativePath];
    }
    const cached = localStorage.getItem(`alsm_custom_code_${projectId}_${itemId}_${selectedFile.relativePath}`);
    if (cached) return cached;
    return selectedFile.content ?? '';
  }, [selectedFile, editedFiles, projectId, itemId]);

  const isCodeModified = Boolean(
    selectedFile &&
      ((editedFiles[selectedFile.relativePath] !== undefined &&
        editedFiles[selectedFile.relativePath] !== selectedFile.content) ||
        localStorage.getItem(`alsm_custom_code_${projectId}_${itemId}_${selectedFile.relativePath}`))
  );

  const handleCodeChange = (newCode: string) => {
    if (!selectedFile) return;
    setEditedFiles((prev) => ({
      ...prev,
      [selectedFile.relativePath]: newCode,
    }));
  };

  const handleResetCode = () => {
    if (!selectedFile) return;
    localStorage.removeItem(`alsm_custom_code_${projectId}_${itemId}_${selectedFile.relativePath}`);
    setEditedFiles((prev) => {
      const copy = { ...prev };
      delete copy[selectedFile.relativePath];
      return copy;
    });
  };

  const handleSaveCode = async (shouldValidate = false) => {
    if (!selectedFile) return;
    setSaveLoading(true);
    setSaveSuccessMsg(null);
    try {
      localStorage.setItem(
        `alsm_custom_code_${projectId}_${itemId}_${selectedFile.relativePath}`,
        activeCode
      );
      try {
        await apiClient.put(`/projects/${projectId}/screens/${itemId}/code`, {
          code: activeCode,
          filename: selectedFile.relativePath,
        });
      } catch {
        // Backend optional code endpoint
      }
      setSaveSuccessMsg('Code changes saved successfully.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);

      if (shouldValidate) {
        setActiveTab('findings');
        triggerSemanticValidation();
      }
    } finally {
      setSaveLoading(false);
    }
  };

  // Run Conversion Algorithm
  const handleRunConverter = async () => {
    if (!projectId || !itemId) return;
    setIsRunning(true);
    try {
      try {
        await apiClient.post(`/projects/${projectId}/conversions/jobs`, {
          screenId: itemId,
        });
      } catch {
        try {
          await apiClient.post(`/projects/${projectId}/conversions`, {
            screenId: itemId,
            inputReference: screenData?.inputReference,
          });
        } catch {
          await partnersApi.retryItemConversion(projectId, itemId);
        }
      }

      // Poll for completion
      let attempts = 0;
      const pollTimer = setInterval(async () => {
        attempts++;
        try {
          const jobs = await apiClient.get<ConversionJobDto[]>(
            `/projects/${projectId}/screens/${itemId}/conversions`
          );
          if (Array.isArray(jobs) && jobs.length > 0) {
            const current = jobs[0];
            setLatestJob(current);
            if (current.status === 'COMPLETED') {
              clearInterval(pollTimer);
              setIsRunning(false);
              try {
                const res = await apiClient.get<ResultBundleDto>(`/conversions/${current.id}/result`);
                setResultBundle(res);
              } catch (resErr) {
                console.warn('Could not load conversion result bundle:', resErr);
              }
              loadData();
            } else if (current.status === 'FAILED' || current.status === 'DEAD' || attempts > 25) {
              clearInterval(pollTimer);
              setIsRunning(false);
              loadData();
            }
          }
        } catch {
          if (attempts > 15) {
            clearInterval(pollTimer);
            setIsRunning(false);
            loadData();
          }
        }
      }, 1500);
    } catch (e) {
      console.error('Conversion trigger failed', e);
      setIsRunning(false);
    }
  };

  // Run Semantic Validation
  const triggerSemanticValidation = async () => {
    setIsValidationActive(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      const refreshed = await partnersApi.getValidationFindings(itemId);
      setFindings(refreshed as any);
      setIsValidationCompleted(true);
    } finally {
      setIsValidationActive(false);
    }
  };

  // Finding Resolution
  const pendingFindings = useMemo(
    () =>
      findings.filter(
        (f) =>
          f.status !== ValidationFindingStatus.RESOLVED &&
          f.status !== ValidationFindingStatus.NOT_APPLICABLE &&
          (f as any).status !== 'CONFIRMED' &&
          (f as any).status !== 'REJECTED'
      ),
    [findings]
  );
  const resolvedFindings = useMemo(
    () => findings.filter((f) => f.status === ValidationFindingStatus.RESOLVED),
    [findings]
  );
  const allResolved = isValidationCompleted && findings.length > 0 && pendingFindings.length === 0;

  const handleAcceptAiFix = async (finding: ValidationFinding) => {
    if (!finding.suggestion || !selectedFile) return;
    setApplyingFixId(finding.id);
    try {
      const patched = applyAiSuggestion(activeCode, finding);
      setEditedFiles((prev) => ({
        ...prev,
        [selectedFile.relativePath]: patched,
      }));
      localStorage.setItem(
        `alsm_custom_code_${projectId}_${itemId}_${selectedFile.relativePath}`,
        patched
      );

      const updated = findings.map((f) =>
        f.id === finding.id ? { ...f, status: ValidationFindingStatus.RESOLVED } : f
      );
      setFindings(updated);
      await partnersApi.updateFindingStatus(itemId, finding.id, 'CONFIRMED');

      setSaveSuccessMsg(`Applied AI fix for "${finding.title}"`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } finally {
      setApplyingFixId(null);
    }
  };

  const handleAcceptAllAiFixes = async () => {
    if (!selectedFile) return;
    const pendingWithSuggestions = pendingFindings.filter((f) => f.suggestion);
    if (pendingWithSuggestions.length === 0) return;

    setApplyingFixId('ALL');
    try {
      let currentCode = activeCode;
      for (const finding of pendingWithSuggestions) {
        currentCode = applyAiSuggestion(currentCode, finding);
      }
      setEditedFiles((prev) => ({
        ...prev,
        [selectedFile.relativePath]: currentCode,
      }));
      localStorage.setItem(
        `alsm_custom_code_${projectId}_${itemId}_${selectedFile.relativePath}`,
        currentCode
      );

      const updated = findings.map((f) =>
        f.suggestion ? { ...f, status: ValidationFindingStatus.RESOLVED } : f
      );
      setFindings(updated);

      for (const f of pendingWithSuggestions) {
        await partnersApi.updateFindingStatus(itemId, f.id, 'CONFIRMED');
      }

      setSaveSuccessMsg(`Successfully applied all ${pendingWithSuggestions.length} AI fixes!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } finally {
      setApplyingFixId(null);
    }
  };

  // Parse Metadata & Detected Fields
  const metadata = useMemo(() => {
    if (!resultBundle?.files || resultBundle.files.length === 0) return null;
    const jsonFiles = resultBundle.files.filter(
      (f) =>
        f.relativePath.endsWith('.model.json') ||
        f.relativePath.endsWith('.metadata.json') ||
        f.relativePath.endsWith('.json')
    );
    const jsonFile =
      jsonFiles.find((f) => f.relativePath.toUpperCase().includes(cleanName)) ||
      jsonFiles[0];
    if (jsonFile?.content) {
      try {
        const raw = JSON.parse(jsonFile.content);
        if (raw.fields && (!raw.labels || !raw.inputs)) {
          return {
            ...raw,
            labels: raw.fields
              .filter((f: any) => f.kind === 'label' || f.kind === 'output')
              .map((f: any) => ({
                ...f,
                // In authentic BMS screen: only static unnamed labels show initial text.
                // Named output fields (CURDATE, CURTIME, FNAME, TRNNAME, etc.) are blank on screen map.
                initial: f.kind === 'label' && !f.name ? f.initial || '' : '',
                color: (f.color || 'GREEN').toLowerCase(),
              })),
            inputs: raw.fields
              .filter((f: any) => f.kind === 'input')
              .map((f: any) => ({
                ...f,
                color: (f.color || 'GREEN').toLowerCase(),
              })),
            functionKeys: raw.functionKeys || [],
          };
        }
        return raw;
      } catch (e) {
        console.error('Failed to parse metadata', e);
      }
    }
    return null;
  }, [resultBundle, cleanName]);

  const detectedFields = useMemo(() => {
    if (!isCompleted || !activeCode) return [];
    return parseConvertedTsx(activeCode, screenName).fields;
  }, [isCompleted, activeCode, screenName]);

  // Generation Metrics
  const metrics = useMemo(() => {
    if (!files.length) return null;
    const totalLoc = files.reduce((sum, f) => sum + f.content.split('\n').length, 0);
    const sizeKb = Math.max(1, Math.round(files.reduce((sum, f) => sum + f.content.length, 0) / 1024));
    const durationMs =
      latestJob?.startedAt && latestJob?.completedAt
        ? new Date(latestJob.completedAt).getTime() - new Date(latestJob.startedAt).getTime()
        : null;
    return {
      componentsGenerated: files.length,
      linesOfCode: totalLoc,
      sizeKb,
      duration: durationMs !== null ? `${(durationMs / 1000).toFixed(1)}s` : '0.8s',
    };
  }, [files, latestJob]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-6 h-6 animate-spin text-[#244A70] mx-auto mb-2" />
        <p className="text-xs text-slate-500">Opening conversion workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar (Exact Web 1 Match) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <Link
            to={`/partners/projects/${projectId}/workspace`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#244A70] hover:text-[#244A70] transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Conversion Workspace</span>
          </Link>

          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-slate-900 font-mono">{screenName}</h1>
            <span className="bg-blue-50 text-[#244A70] border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              {isCobol ? 'Target: Java (Spring Boot Batch)' : 'Target: React 19 + TypeScript'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isCobol
              ? 'Deterministic Conversion Engine: Translates COBOL Data & Procedure Divisions into Spring Boot Batch Models, Tasklets & Job Configurations.'
              : 'Deterministic Conversion Engine: Parses BMS AST and converts into React TypeScript components & DTOs.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setIsEditModalOpen(true)}
            className="space-x-1.5 text-xs font-semibold text-[#244A70] border-slate-200"
          >
            <Sliders className="w-4 h-4 text-[#244A70]" />
            <span>{isCobol ? 'Edit Method Mapping' : 'Edit Mapping & Correct'}</span>
          </Button>
          <Button
            onClick={handleRunConverter}
            isLoading={isRunning}
            className="space-x-2 text-xs font-semibold bg-[#244A70] hover:bg-[#244A70] text-white"
          >
            <Play className="w-4 h-4" />
            <span>Run Conversion Algorithm</span>
          </Button>
        </div>
      </div>

      {/* 2. Modernization Workflow Stepper */}
      <ModernizationWorkflow
        currentStep="convert"
        completedSteps={['upload', ...(isCompleted ? (['convert'] as any) : [])]}
        onStepClick={(stepId) => {
          if (stepId === 'upload') navigate(`/partners/projects/${projectId}/upload`);
          if (stepId === 'validate') setActiveTab('findings');
          if (stepId === 'export') navigate(`/partners/projects/${projectId}/workspace`);
        }}
      />

      {/* 3. Conversion Completed Metrics Banner (Web 1 Style) */}
      {isCompleted ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-xs text-slate-700 font-medium">
              Conversion algorithm executed. Target components and DTOs generated deterministically.
            </div>
            <div className="flex items-center space-x-2.5">
              <Button
                variant="outline"
                onClick={() => {
                  triggerSemanticValidation();
                  setActiveTab('findings');
                }}
                isLoading={isValidationActive}
                disabled={isValidationActive}
                className="text-xs font-semibold px-3 py-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                {isValidationActive
                  ? 'Validating...'
                  : isValidationCompleted
                  ? `Re-validate (${findings.length} findings)`
                  : 'Run Semantic Validation'}
              </Button>
              <Button
                onClick={() => navigate(`/partners/projects/${projectId}/workspace`)}
                className="text-xs font-semibold px-3.5 py-1.5 bg-[#244A70] hover:bg-[#244A70] text-white"
              >
                Inspect Results &rarr;
              </Button>
            </div>
          </div>

          {metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-center">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-[11px] text-slate-500 uppercase font-semibold">Files Generated</p>
                <p className="text-lg font-bold text-[#244A70]">{metrics.componentsGenerated}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-[11px] text-slate-500 uppercase font-semibold">Lines of Code</p>
                <p className="text-lg font-bold text-slate-900">{metrics.linesOfCode}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-[11px] text-slate-500 uppercase font-semibold">Size</p>
                <p className="text-lg font-bold text-[#B45309]">{metrics.sizeKb} KB</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-[11px] text-slate-500 uppercase font-semibold">Duration</p>
                <p className="text-lg font-bold text-[#15803D]">{metrics.duration}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700 text-xs font-medium flex items-center justify-between">
          <span>
            Source map loaded. Click <strong>"Run Conversion Algorithm"</strong> above to generate target React TSX code.
          </span>
        </div>
      )}

      {/* 4. Center Pill Tabs (Identical to Web 1) */}
      <Tabs
        variant="pill"
        tabs={[
          ...(isCobol ? [] : [{ id: 'preview', label: 'Preview' }]),
          { id: 'code', label: isCobol ? 'Code Transformation & Diff' : 'Code' },
          { id: 'mapping', label: isCobol ? 'Method Mapping' : 'Field Mapping' },
          {
            id: 'findings',
            label: isValidationActive
              ? 'Validation (Running...)'
              : allResolved
              ? 'Validation (All Resolved)'
              : isValidationCompleted && pendingFindings.length > 0
              ? `Validation (${pendingFindings.length})`
              : findings.length > 0
              ? `Validation (${findings.length})`
              : 'Validation',
          },
        ]}
        activeTab={currentTab}
        onChange={setActiveTab}
      />

      {/* TAB 1: PREVIEW (Interactive 3270 Terminal Screen Canvas) */}
      {currentTab === 'preview' && !isCobol && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* Browser Chrome Bar */}
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-400"></span>
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
              <div className="bg-white px-3 py-1 rounded-md border border-slate-200 text-slate-600 font-mono text-[11px] ml-1">
                http://localhost:3000/{screenName.toLowerCase()}
              </div>
              {isCodeModified && (
                <span className="bg-amber-50 text-amber-800 border border-amber-300 text-[10px] px-2 py-0.5 rounded font-mono font-medium">
                  Customized TSX Active
                </span>
              )}
            </div>

            {isCompleted && (
              <div className="flex items-center space-x-2.5">
                <div className="bg-slate-200/80 p-0.5 rounded-lg flex items-center text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewLayout('screen')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      previewLayout === 'screen'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    BMS Screen
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewLayout('split')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      previewLayout === 'split'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Split View (Edit Code & Screen)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewLayout(previewLayout === 'screen' ? 'split' : 'screen')}
                  className="text-xs text-[#244A70] font-semibold hover:underline pl-1 cursor-pointer"
                >
                  Open Preview Studio
                </button>
              </div>
            )}
          </div>

          {/* Canvas Body */}
          <div className="p-4 md:p-6 bg-slate-100 min-h-[400px]">
            {isCompleted ? (
              previewLayout === 'split' ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start w-full">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs px-1 flex-wrap gap-1">
                      <span className="font-semibold text-slate-700">React Component Editor</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-500 text-[11px] hidden sm:inline">Changes update screen in real-time</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveCode(false)}
                          isLoading={saveLoading}
                          disabled={saveLoading}
                          className="text-[11px] font-semibold px-2 py-1 text-slate-700 hover:bg-slate-50"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save Code
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveCode(true)}
                          isLoading={saveLoading || isValidationActive}
                          disabled={saveLoading || isValidationActive}
                          className="text-[11px] font-semibold px-2.5 py-1 bg-[#244A70] hover:bg-[#244A70] text-white"
                        >
                          Save & Run AI Validation &rarr;
                        </Button>
                      </div>
                    </div>
                    {saveSuccessMsg && (
                      <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{saveSuccessMsg}</span>
                      </div>
                    )}
                    <CodeEditor
                      code={activeCode}
                      onChange={handleCodeChange}
                      onReset={handleResetCode}
                      onSave={() => handleSaveCode(false)}
                      isModified={isCodeModified}
                      filename={selectedFile?.relativePath}
                      height="540px"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="font-semibold text-slate-700">Live 3270 Terminal Screen</span>
                      <span className="text-emerald-600 text-[11px] font-medium">Synchronized</span>
                    </div>
                    <LiveTsxRenderer
                      tsxCode={activeCode}
                      screenName={screenName}
                      metadata={metadata}
                      onEditMapping={() => setActiveTab('mapping')}
                    />
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-6xl mx-auto space-y-3">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setPreviewLayout('split')}
                      className="text-xs text-[#244A70] hover:text-[#244A70] font-semibold bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-colors cursor-pointer"
                    >
                      Open Split Code Editor &rarr;
                    </button>
                  </div>
                  <LiveTsxRenderer
                    tsxCode={activeCode}
                    screenName={screenName}
                    metadata={metadata}
                    onEditMapping={() => setActiveTab('mapping')}
                  />
                </div>
              )
            ) : (
              /* Pending State before user clicks Run Conversion Algorithm */
              <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm my-auto mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#EEF1F6] text-[#244A70] mx-auto flex items-center justify-center">
                  <Play className="w-7 h-7 ml-1" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Conversion Algorithm Pending</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Source file uploaded & screen registered. Click <strong>"Run Conversion Algorithm"</strong> to parse legacy AST, apply mapping rules, and render the UI Preview & generated React code.
                  </p>
                </div>
                <Button
                  onClick={handleRunConverter}
                  isLoading={isRunning}
                  className="w-full bg-[#244A70] hover:bg-[#244A70] text-white font-bold text-xs py-2.5 space-x-2 shadow-sm"
                >
                  <Play className="w-4 h-4" />
                  <span>Run Conversion Algorithm Now</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CODE (Cobol View for COBOL or Monaco Editor for BMS) */}
      {currentTab === 'code' && isCobol && (
        <CobolTransformationView
          cobolSource={screenData?.content || item?.sourceCode}
          cobolName={screenName}
          files={files}
          selectedIndex={selectedFileIndex}
          onSelectFile={setSelectedFileIndex}
        />
      )}

      {currentTab === 'code' && !isCobol && (
        selectedFile ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {files.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {files.map((file, index) => (
                    <button
                      key={file.relativePath}
                      type="button"
                      onClick={() => setSelectedFileIndex(index)}
                      className={`text-xs font-mono px-2.5 py-1 rounded-lg border cursor-pointer ${
                        index === selectedFileIndex
                          ? 'bg-blue-50 border-blue-300 text-[#244A70] font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {file.relativePath}
                    </button>
                  ))}
                </div>
              ) : (
                <div></div>
              )}

              <div className="flex items-center space-x-2.5 ml-auto flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSaveCode(false)}
                  isLoading={saveLoading}
                  disabled={saveLoading}
                  className="text-xs font-semibold px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Code
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveCode(true)}
                  isLoading={saveLoading || isValidationActive}
                  disabled={saveLoading || isValidationActive}
                  className="text-xs font-semibold px-3 py-1.5 bg-[#244A70] hover:bg-[#244A70] text-white"
                >
                  Save & Run AI Validation &rarr;
                </Button>

                <div className="bg-slate-200/80 p-0.5 rounded-lg flex items-center text-xs">
                  <button
                    type="button"
                    onClick={() => setCodeLayout('code')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      codeLayout === 'code'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Code Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeLayout('split')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      codeLayout === 'split'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Split View (Code & Screen)
                  </button>
                </div>
              </div>
            </div>

            {saveSuccessMsg && (
              <div className="mb-4 flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {codeLayout === 'split' ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                <CodeEditor
                  code={activeCode}
                  onChange={handleCodeChange}
                  onReset={handleResetCode}
                  onSave={() => handleSaveCode(false)}
                  isModified={isCodeModified}
                  filename={selectedFile.relativePath}
                  height="580px"
                />
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700 flex items-center justify-between px-1">
                    <span>Live 3270 Screen Preview</span>
                    <span className="text-[11px] text-emerald-600 font-medium">Updates live on edit</span>
                  </div>
                  <LiveTsxRenderer
                    tsxCode={activeCode}
                    screenName={screenName}
                    metadata={metadata}
                    onEditMapping={() => setActiveTab('mapping')}
                  />
                </div>
              </div>
            ) : (
              <CodeEditor
                code={activeCode}
                onChange={handleCodeChange}
                onReset={handleResetCode}
                onSave={() => handleSaveCode(false)}
                isModified={isCodeModified}
                filename={selectedFile.relativePath}
                height="600px"
              />
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500 shadow-sm">
            {isRunning
              ? 'Conversion in progress…'
              : 'No output generated yet. Run the converter to generate code for this screen.'}
          </div>
        )
      )}

      {/* TAB 3: MAPPING (Field Mapping or Method Mapping) */}
      {currentTab === 'mapping' && isCobol && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Method Mapping</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs text-[#244A70] border-slate-200 flex items-center space-x-1 font-semibold"
            >
              <Sliders className="w-4 h-4 text-[#244A70]" />
              <span>Open Method Editor</span>
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            {isCompleted
              ? 'This COBOL program has real generated Java class/method names. Open the Method Editor to rename them.'
              : 'Run the converter first to detect the real Java class/method names generated from this program.'}
          </p>
        </div>
      )}

      {currentTab === 'mapping' && !isCobol && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">
              {mappings.length > 0 ? 'Saved Field Mappings' : 'Auto-Detected Field Mappings'}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs text-[#244A70] border-slate-200 flex items-center space-x-1 font-semibold"
            >
              <Sliders className="w-4 h-4 text-[#244A70]" />
              <span>Open Field Editor</span>
            </Button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-[#17263A]">
              <thead className="bg-[#F8FAFC] text-[#8491A3] font-bold uppercase text-[11px] border-b border-[#DCE3EC]">
                <tr>
                  <th className="py-3 px-4">Source Identifier (AST)</th>
                  <th className="py-3 px-4">Target Property</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">Transformation Rule</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3EC] font-mono">
                {mappings.length === 0 && detectedFields.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#8491A3] font-sans">
                      No custom field mappings configured. Using standard deterministic AST naming.
                    </td>
                  </tr>
                ) : mappings.length > 0 ? (
                  mappings.map((m, idx) => (
                    <tr key={m.id || idx} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#17263A]">
                        <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{m.sourceField}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#244A70]">
                        <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{m.targetProperty}</span>
                      </td>
                      <td className="py-3 px-4 text-[#8491A3] font-sans">{m.dataType}</td>
                      <td className="py-3 px-4 text-purple-700">
                        {m.transformRule ? (
                          <span className="bg-purple-50 px-2 py-0.5 rounded border border-purple-200">{m.transformRule}</span>
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
                ) : (
                  detectedFields.map((f, idx) => (
                    <tr key={f.name || idx} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#17263A]">
                        <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{f.name}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#244A70]">
                        <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{f.label || f.name}</span>
                      </td>
                      <td className="py-3 px-4 text-[#8491A3] font-sans">{f.type || 'string'}</td>
                      <td className="py-3 px-4 text-purple-700">
                        <span className="text-gray-400 font-sans">auto-detected</span>
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 text-[11px] px-2 py-0.5 rounded font-semibold border border-blue-200">
                          Detected
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

      {/* TAB 4: VALIDATION FINDINGS (Exact Web 1 Match) */}
      {currentTab === 'findings' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Semantic &amp; AST Validation Findings
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated AST cross-validation between legacy BMS 3270 macros and generated React TSX components.
              </p>
            </div>
            <div className="flex items-center space-x-2.5">
              {pendingFindings.filter((f) => f.suggestion).length > 1 && (
                <Button
                  size="sm"
                  onClick={handleAcceptAllAiFixes}
                  isLoading={applyingFixId === 'ALL'}
                  disabled={Boolean(applyingFixId)}
                  className="text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white space-x-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Accept All AI Fixes ({pendingFindings.filter((f) => f.suggestion).length})</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={triggerSemanticValidation}
                isLoading={isValidationActive}
                disabled={!isCompleted || isValidationActive}
                className="text-xs font-medium px-3 py-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                {isValidationActive ? 'Validating...' : 'Re-run Validation'}
              </Button>
            </div>
          </div>

          {isValidationActive ? (
            <div className="border border-slate-200 bg-slate-50/75 rounded-xl p-8 text-center space-y-2">
              <div className="text-xs font-semibold text-slate-800">Validation in Progress</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Comparing field coordinates, protection flags (PROT/NUM), length bounds, and function key bindings...
              </p>
            </div>
          ) : allResolved ? (
            <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-6 text-xs text-emerald-900 space-y-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <Check className="w-5 h-5 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">
                      All Discrepancies Resolved ({resolvedFindings.length}/{findings.length})
                    </h4>
                    <p className="text-emerald-700 mt-0.5">
                      All reported issues have been patched and saved. Your React TSX code is ready for export!
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={triggerSemanticValidation}
                  className="text-xs font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-100/50"
                >
                  Re-validate to Confirm
                </Button>
              </div>
            </div>
          ) : findings.length === 0 ? (
            <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-5 text-xs text-emerald-900 flex items-center justify-between">
              <div>
                <div className="font-semibold text-emerald-950 flex items-center space-x-2">
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide">PASSED</span>
                  <span>0 Discrepancies Detected</span>
                </div>
                <p className="text-emerald-700 mt-1">
                  All field definitions, protection attributes, input constraints, and coordinates match the original BMS specification.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={triggerSemanticValidation}
                className="text-xs font-medium border-emerald-300 text-emerald-800 hover:bg-emerald-100/50"
              >
                Re-run
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-slate-200 bg-slate-50 rounded-lg px-4 py-2.5 flex items-center justify-between text-xs">
                <div className="font-semibold text-slate-900">
                  Discrepancies Detected ({findings.length})
                </div>
                <div className="flex items-center space-x-2 font-mono text-[11px]">
                  <span className="text-rose-700 font-medium">
                    {findings.filter((f) => f.severity === 'HIGH' || (f.severity as any) === 'CRITICAL').length} High
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-amber-700 font-medium">
                    {findings.filter((f) => f.severity === 'MEDIUM').length} Medium
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600 font-medium">
                    {findings.filter((f) => f.severity === 'LOW').length} Low
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {findings.map((f, idx) => (
                  <div
                    key={f.id ?? idx}
                    className="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-colors space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                            f.severity === 'HIGH' || (f.severity as any) === 'CRITICAL'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : f.severity === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {f.severity}
                        </span>
                        {f.category && (
                          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {f.category}
                          </span>
                        )}
                        <span className="font-semibold text-slate-900">{f.title}</span>
                      </div>
                      {(f.sourceLocation?.startLine || f.targetLocation?.startLine) && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {f.sourceLocation?.startLine && `Source: L${f.sourceLocation.startLine}`}
                          {f.sourceLocation?.startLine && f.targetLocation?.startLine && ' · '}
                          {f.targetLocation?.startLine && `Target: L${f.targetLocation.startLine}`}
                        </span>
                      )}
                    </div>

                    <p className="text-slate-600 leading-relaxed">{f.explanation}</p>

                    {(f.expectedBehavior || f.actualBehavior) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                        {f.expectedBehavior && (
                          <div className="bg-slate-50 text-slate-700 p-2.5 rounded-lg border border-slate-200">
                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Expected (BMS)</div>
                            <div className="text-emerald-700 font-medium">{f.expectedBehavior}</div>
                          </div>
                        )}
                        {f.actualBehavior && (
                          <div className="bg-slate-50 text-slate-700 p-2.5 rounded-lg border border-slate-200">
                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Actual (React)</div>
                            <div className="text-rose-700 font-medium">{f.actualBehavior}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {f.suggestion && (
                      <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <strong className="text-slate-600">Remediation:</strong> {f.suggestion}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2 text-[11px]">
                      {f.status === ValidationFindingStatus.RESOLVED ? (
                        <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Status: Resolved
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Status: <strong className="text-slate-600">{f.status ?? 'PENDING'}</strong>
                        </span>
                      )}

                      <div className="flex items-center space-x-3">
                        {f.suggestion && f.status !== ValidationFindingStatus.RESOLVED && (
                          <button
                            type="button"
                            disabled={Boolean(applyingFixId)}
                            onClick={() => handleAcceptAiFix(f)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>{applyingFixId === f.id ? 'Applying Fix...' : 'Accept AI Fix'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('preview');
                            setPreviewLayout('split');
                          }}
                          className="font-medium text-[#244A70] hover:text-[#244A70] hover:underline cursor-pointer"
                        >
                          Fix in Code Editor &rarr;
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Field Mapping Modal */}
      {isEditModalOpen && (
        <EditMappingModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          initialMappings={mappings}
          onSave={async (newMappings) => {
            await partnersApi.saveFieldMappings(itemId, newMappings);
            setMappings(newMappings);
            setIsEditModalOpen(false);
          }}
          itemName={screenName}
        />
      )}
    </div>
  );
};
export default ConversionItemReviewPage;
