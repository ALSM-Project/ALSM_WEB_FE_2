import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileCode,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Button, ModernizationWorkflow } from '@/shared/ui';
import { partnersApi, type SourceUploadResult } from '../../api/partners.api';
import { PartnerProject } from '../../types/partner.types';
import {
  QueuedFileKind,
  acceptAttribute,
  acceptedLabel,
  classifyFile,
  formatFileSize,
  validateIncomingFile,
} from '../../utils/uploadValidation';

/** How long the success message stays visible before moving to the workspace. */
export const UPLOAD_REDIRECT_DELAY_MS = 1200;

type QueuedFileStatus = 'READY' | 'UPLOADING' | 'DONE' | 'ERROR';

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: QueuedFileKind;
  status: QueuedFileStatus;
  progress: number;
  error?: string;
}

const CONVERSION_TYPE_LABEL: Record<PartnerProject['conversionType'], string> = {
  BMS_DSPF_TO_FRONTEND: 'BMS / DSPF → React',
  COBOL_TO_JAVA: 'COBOL → Java',
};

const STATUS_LABEL: Record<QueuedFileStatus, string> = {
  READY: 'Ready',
  UPLOADING: 'Uploading',
  DONE: 'Done',
  ERROR: 'Error',
};

/** A server rejection that names a file ("File "X.bms" is empty...") marks only that file. */
function blamedFileIds(message: string, pending: QueuedFile[]): Set<string> {
  const lowered = message.toLowerCase();
  const named = pending.filter((f) => lowered.includes(f.name.toLowerCase()));
  return new Set((named.length > 0 ? named : pending).map((f) => f.id));
}

export const UploadSourceFilesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<PartnerProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [rejections, setRejections] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SourceUploadResult | null>(null);
  const idCounter = useRef(0);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!projectId) return;
    partnersApi.getProjectById(projectId).then((p) => {
      setProject(p);
      setLoading(false);
    });
  }, [projectId]);

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  const locked = uploading || result !== null;

  const addFilesToQueue = (fileList: FileList | File[] | null) => {
    if (!fileList || !project || locked) return;
    const rejected: string[] = [];
    const accepted: QueuedFile[] = [];
    const names = files.map((f) => f.name);

    for (const file of Array.from(fileList)) {
      const rejection = validateIncomingFile(file, project.conversionType, [
        ...names,
        ...accepted.map((a) => a.name),
      ]);
      if (rejection) {
        rejected.push(rejection.message);
        continue;
      }
      idCounter.current += 1;
      accepted.push({
        id: `file-${idCounter.current}`,
        file,
        name: file.name,
        size: file.size,
        type: classifyFile(file.name, project.conversionType),
        status: 'READY',
        progress: 0,
      });
    }

    setRejections(rejected);
    setSubmitError(null);
    if (accepted.length > 0) setFiles((prev) => [...prev, ...accepted]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFilesToQueue(e.dataTransfer.files);
  };

  const handleRemoveFile = (id: string) => {
    if (locked) return;
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearAll = () => {
    if (locked) return;
    setFiles([]);
    setRejections([]);
    setSubmitError(null);
  };

  const handleUploadAndProceed = async () => {
    // Guard against a second click/Enter while a request is already in flight.
    if (!projectId || locked) return;
    const pending = files.filter((f) => f.status === 'READY' || f.status === 'ERROR');
    if (pending.length === 0) return;
    const pendingIds = new Set(pending.map((f) => f.id));

    setUploading(true);
    setSubmitError(null);
    setOverallProgress(0);
    setFiles((prev) =>
      prev.map((f) =>
        pendingIds.has(f.id) ? { ...f, status: 'UPLOADING', progress: 0, error: undefined } : f,
      ),
    );

    try {
      const outcome = await partnersApi.uploadSourceFiles(
        projectId,
        pending.map((f) => f.file),
        (percent) => {
          setOverallProgress(percent);
          setFiles((prev) =>
            prev.map((f) => (pendingIds.has(f.id) ? { ...f, progress: percent } : f)),
          );
        },
      );
      setFiles((prev) =>
        prev.map((f) => (pendingIds.has(f.id) ? { ...f, status: 'DONE', progress: 100 } : f)),
      );
      setOverallProgress(100);
      setResult(outcome);
      redirectTimer.current = setTimeout(
        () => navigate(`/partners/projects/${projectId}/workspace`),
        UPLOAD_REDIRECT_DELAY_MS,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The upload failed. Please try again.';
      const blamed = blamedFileIds(message, pending);
      // Only the offending file(s) show as failed; the valid ones go back to READY so a
      // retry (after removing the bad file) does not require selecting them again.
      setFiles((prev) =>
        prev.map((f) => {
          if (!pendingIds.has(f.id)) return f;
          return blamed.has(f.id)
            ? { ...f, status: 'ERROR', progress: 0, error: message }
            : { ...f, status: 'READY', progress: 0, error: undefined };
        }),
      );
      setSubmitError(message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-6 h-6 animate-spin text-[#0652CC] mx-auto mb-2" />
        <p className="text-xs text-[#6B778C]">Loading project details...</p>
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

  const queuedCount = files.filter((f) => f.status !== 'DONE').length;
  const hasUploadable = files.some((f) => f.status === 'READY' || f.status === 'ERROR');

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#091E42] tracking-tight">Upload Legacy Source Files</h1>
          <p className="text-xs text-[#6B778C] mt-0.5">
            Upload legacy source on behalf of {project.partnerName} for {project.name}.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/partners/projects/${project.id}`)}
          className="text-xs self-start sm:self-auto shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Project Overview
        </Button>
      </div>

      {/* Project context */}
      <dl
        aria-label="Project details"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-2xs text-xs"
      >
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-[#6B778C]">Project</dt>
          <dd className="mt-0.5 font-semibold text-[#091E42]">{project.name}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-[#6B778C]">Partner</dt>
          <dd className="mt-0.5 font-semibold text-[#091E42]">
            {project.partnerName}
            <span className="ml-1.5 font-mono text-[10px] font-normal text-[#6B778C]">
              ({project.partnerId})
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-[#6B778C]">
            Conversion type
          </dt>
          <dd className="mt-0.5 font-semibold text-[#091E42]">
            {CONVERSION_TYPE_LABEL[project.conversionType]}
            <span className="ml-1.5 font-mono text-[10px] font-normal text-[#6B778C]">
              {project.conversionType}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-[#6B778C]">Accepted files</dt>
          <dd className="mt-0.5 font-mono font-semibold text-[#091E42]">
            {acceptedLabel(project.conversionType)}
          </dd>
        </div>
      </dl>

      {/* Modernization Workflow Stepper */}
      <ModernizationWorkflow
        currentStep="upload"
        completedSteps={[]}
        onStepClick={(stepId) => {
          if (stepId === 'convert') navigate(`/partners/projects/${project.id}/workspace`);
        }}
      />

      {/* Drag & Drop Area */}
      <div
        data-testid="drop-zone"
        onDragOver={(e) => {
          e.preventDefault();
          if (!locked) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`p-8 rounded-xl border-2 border-dashed transition-all text-center ${
          isDragging
            ? 'border-[#0652CC] bg-blue-50/70'
            : 'border-[#D9E2EC] bg-white hover:border-[#0652CC]/50'
        } ${locked ? 'opacity-60' : ''}`}
      >
        <UploadCloud className="w-12 h-12 text-[#0652CC] mx-auto mb-3" />
        <h3 className="text-sm font-bold text-[#091E42]">
          Drag and drop {project.conversionType === 'COBOL_TO_JAVA' ? 'COBOL programs and copybooks' : 'BMS / DSPF screen files'} here
        </h3>
        <p className="text-xs text-[#6B778C] max-w-md mx-auto mt-1 mb-4">
          Accepted: {acceptedLabel(project.conversionType)}. Up to 50 MB per file; empty files are
          rejected.
        </p>

        <label className="inline-block">
          <input
            data-testid="file-input"
            type="file"
            multiple
            accept={acceptAttribute(project.conversionType)}
            disabled={locked}
            onChange={(e) => {
              addFilesToQueue(e.target.files);
              // Allow picking the same file again after removing it.
              e.target.value = '';
            }}
            className="hidden"
          />
          <span className="px-4 py-2 bg-[#0652CC] hover:bg-[#0543A8] text-white rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors">
            Browse Files from Disk
          </span>
        </label>
      </div>

      {/* Rejected files */}
      {rejections.length > 0 && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            {rejections.length} file{rejections.length > 1 ? 's were' : ' was'} not added
          </p>
          <ul className="mt-1.5 list-disc pl-6 space-y-0.5">
            {rejections.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Queued Files Table */}
      {files.length > 0 && (
        <div className="rounded-xl border border-[#E5EAF0] bg-white shadow-2xs overflow-hidden">
          <div className="p-4 bg-[#F7F9FC] border-b border-[#E5EAF0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-[#0652CC]" />
              <span className="text-xs font-bold text-[#091E42]">
                Selected Source Files ({files.length})
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={locked}
              className="text-xs text-[#6B778C] hover:text-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
          </div>

          {(uploading || result) && (
            <div className="px-4 pt-3">
              <div className="flex justify-between text-[11px] font-semibold text-[#42526E] mb-1">
                <span>Overall progress</span>
                <span>{overallProgress}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Overall upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={overallProgress}
                className="h-2 rounded-full bg-[#E5EAF0] overflow-hidden"
              >
                <div
                  className="h-full bg-[#0652CC] transition-all"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}

          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[#6B778C]">
                <th className="px-4 py-2 font-bold">File</th>
                <th className="px-2 py-2 font-bold">Size</th>
                <th className="px-2 py-2 font-bold">Type</th>
                <th className="px-2 py-2 font-bold">Status</th>
                <th className="px-4 py-2 font-bold text-right">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {files.map((item) => (
                <tr key={item.id} data-testid={`queued-${item.name}`} className="align-top">
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-[#091E42]">{item.name}</p>
                    {item.status === 'UPLOADING' && (
                      <div
                        role="progressbar"
                        aria-label={`Upload progress for ${item.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={item.progress}
                        className="mt-1.5 h-1.5 w-40 rounded-full bg-[#E5EAF0] overflow-hidden"
                      >
                        <div
                          className="h-full bg-[#0652CC] transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                    {item.status === 'ERROR' && item.error && (
                      <p role="alert" className="mt-1 text-[11px] text-rose-600">
                        {item.error}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-[#42526E] whitespace-nowrap">{formatFileSize(item.size)}</td>
                  <td className="px-2 py-2.5">
                    <span className="rounded bg-[#F4F5F7] px-1.5 py-0.5 font-mono text-[10px] text-[#42526E]">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    {item.status === 'DONE' && (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-4 h-4" /> {STATUS_LABEL.DONE}
                      </span>
                    )}
                    {item.status === 'UPLOADING' && (
                      <span className="flex items-center gap-1 text-[#0652CC] font-medium">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {STATUS_LABEL.UPLOADING}
                      </span>
                    )}
                    {item.status === 'ERROR' && (
                      <span className="flex items-center gap-1 text-rose-600 font-medium">
                        <AlertCircle className="w-4 h-4" /> {STATUS_LABEL.ERROR}
                      </span>
                    )}
                    {item.status === 'READY' && (
                      <span className="text-[#42526E] font-medium">{STATUS_LABEL.READY}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(item.id)}
                      disabled={locked}
                      className="text-gray-400 hover:text-rose-500 p-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Remove from queue"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {submitError && (
            <div role="alert" className="mx-4 mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <p className="font-semibold">Upload failed</p>
              <p className="mt-0.5">
                {submitError} Remove the file(s) marked with an error, or fix them, and try again — files that
                were valid are still in the list.
              </p>
            </div>
          )}

          {result && (
            <div role="status" className="mx-4 mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {result.registered.length} source file{result.registered.length === 1 ? '' : 's'} uploaded
                successfully. Opening the project workspace...
              </p>
              {result.mode === 'LOCAL' && (
                <p className="mt-1 flex items-start gap-1.5 text-emerald-900">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  This project exists only in this browser, so the files were registered locally and not
                  sent to the server.
                </p>
              )}
              {result.ignoredEntries.length > 0 && (
                <p className="mt-1 text-emerald-900">
                  {result.ignoredEntries.length} archive entr{result.ignoredEntries.length === 1 ? 'y was' : 'ies were'}{' '}
                  skipped because they are not source files for this project.
                </p>
              )}
            </div>
          )}

          <div className="p-4 bg-[#F7F9FC] border-t border-[#E5EAF0] flex items-center justify-between">
            <span className="text-xs text-[#6B778C]">
              {queuedCount} file{queuedCount === 1 ? '' : 's'} ready to parse into the project workspace
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/partners/projects/${projectId}/workspace`)}
                disabled={uploading}
              >
                Skip to Workspace
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUploadAndProceed}
                isLoading={uploading}
                disabled={locked || !hasUploadable}
                className="flex items-center gap-1.5 bg-[#0652CC] hover:bg-[#0543A8]"
              >
                <span>{submitError ? 'Retry Upload' : 'Upload & Open Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
