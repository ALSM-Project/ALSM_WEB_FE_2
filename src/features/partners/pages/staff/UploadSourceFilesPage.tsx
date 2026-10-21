import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileCode,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { Button, ModernizationWorkflow } from '@/shared/ui';
import { partnersApi } from '../../api/partners.api';
import { PartnerProject } from '../../types/partner.types';

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: 'SCREEN' | 'PROGRAM';
  status: 'READY' | 'UPLOADING' | 'DONE' | 'ERROR';
  progress: number;
}

export const UploadSourceFilesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<PartnerProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    partnersApi.getProjectById(projectId).then((p) => {
      setProject(p);
      setLoading(false);
    });
  }, [projectId]);

  const detectType = (filename: string): 'SCREEN' | 'PROGRAM' => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'cbl' || ext === 'cob' || ext === 'cpy') return 'PROGRAM';
    return 'SCREEN';
  };

  const addFilesToQueue = (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming: QueuedFile[] = Array.from(fileList).map((f, i) => ({
      id: `${f.name}-${Date.now()}-${i}`,
      file: f,
      name: f.name,
      size: f.size,
      type: detectType(f.name),
      status: 'READY',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...incoming]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFilesToQueue(e.dataTransfer.files);
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUploadAndProceed = async () => {
    if (!projectId || files.length === 0) return;

    try {
      setUploading(true);

      // Simulate step upload progress
      for (let i = 0; i < files.length; i++) {
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'UPLOADING', progress: 50 } : f))
        );
        await new Promise((r) => setTimeout(r, 200));
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'DONE', progress: 100 } : f))
        );
      }

      // Add to store
      await partnersApi.addSourceFiles(
        projectId,
        files.map((f) => ({
          name: f.name,
          type: f.type,
          content: `* Source file uploaded: ${f.name}\n* Awaiting batch conversion`,
        }))
      );

      navigate(`/partners/projects/${projectId}/workspace`);
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

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#091E42] tracking-tight">Upload Legacy Source Files</h1>
          <p className="text-xs text-[#6B778C] mt-0.5">
            Upload BMS mapsets (.bms), IBM i display files (.dspf), COBOL routines (.cbl, .cob), or ZIP archives for {project.name}.
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
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`p-8 rounded-xl border-2 border-dashed transition-all text-center ${
          isDragging
            ? 'border-[#0652CC] bg-blue-50/70'
            : 'border-[#D9E2EC] bg-white hover:border-[#0652CC]/50'
        }`}
      >
        <UploadCloud className="w-12 h-12 text-[#0652CC] mx-auto mb-3" />
        <h3 className="text-sm font-bold text-[#091E42]">
          Drag and drop mainframe / mid-range source files here
        </h3>
        <p className="text-xs text-[#6B778C] max-w-md mx-auto mt-1 mb-4">
          Supports .bms, .dspf, .cbl, .cob, .cpy, and .zip archives. Automatic AST detection will categorize screens and logic.
        </p>

        <label className="inline-block">
          <input
            type="file"
            multiple
            accept=".bms,.dspf,.cbl,.cob,.cpy,.zip,.txt"
            onChange={(e) => addFilesToQueue(e.target.files)}
            className="hidden"
          />
          <span className="px-4 py-2 bg-[#0652CC] hover:bg-[#0543A8] text-white rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors">
            Browse Files from Disk
          </span>
        </label>
      </div>

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
              onClick={() => setFiles([])}
              className="text-xs text-[#6B778C] hover:text-rose-600 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="divide-y divide-[#E5EAF0]">
            {files.map((item) => (
              <div key={item.id} className="p-3 px-4 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded bg-blue-50 text-[#0652CC] flex items-center justify-center font-bold text-[10px]">
                    {item.name.split('.').pop()?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[#091E42]">{item.name}</p>
                    <span className="text-[10px] text-[#6B778C]">
                      {(item.size / 1024).toFixed(1)} KB • {item.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {item.status === 'DONE' && (
                    <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Ready
                    </span>
                  )}
                  {item.status === 'UPLOADING' && (
                    <span className="flex items-center gap-1 text-[#0652CC] text-xs font-medium">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...
                    </span>
                  )}
                  <button
                    onClick={() => handleRemoveFile(item.id)}
                    className="text-gray-400 hover:text-rose-500 p-1"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-[#F7F9FC] border-t border-[#E5EAF0] flex items-center justify-between">
            <span className="text-xs text-[#6B778C]">
              Ready to parse into project workspace
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/partners/projects/${projectId}/workspace`)}
              >
                Skip to Workspace
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUploadAndProceed}
                isLoading={uploading}
                className="flex items-center gap-1.5 bg-[#0652CC] hover:bg-[#0543A8]"
              >
                <span>Upload & Open Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
