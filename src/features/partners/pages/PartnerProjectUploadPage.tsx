import React, { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UploadCloud, FileText, AlertCircle, CheckCircle2, ArrowLeft, Trash2 } from 'lucide-react';
import { Card, Button, PageHeader } from '@/shared/ui';
import { usePartnerQuery, usePartnerProjectsQuery, useUploadPartnerProjectSourceMutation } from '../hooks/usePartnersQuery';
import type { ConversionType } from '../api/partners.api';

const ACCEPTED_EXTENSIONS: Record<ConversionType, string[]> = {
  BMS_DSPF_TO_FRONTEND: ['.bms', '.dspf'],
  COBOL_TO_JAVA: ['.cob', '.cbl', '.cpy'],
};

export const PartnerProjectUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { partnerId = '', projectId = '' } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: partner, isLoading: partnerLoading, error: partnerError } = usePartnerQuery(partnerId);
  const { data: projects = [], isLoading: projectsLoading } = usePartnerProjectsQuery(partnerId);
  const project = projects.find((p) => p.id === projectId);

  const uploadMutation = useUploadPartnerProjectSourceMutation(partnerId, projectId);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedScreens, setUploadedScreens] = useState<{ name: string; status: string }[] | null>(null);

  const acceptedExtensions = project ? ACCEPTED_EXTENSIONS[project.conversionType] : undefined;

  const backToProjects = () => navigate(`/organisations/partners/${partnerId}/projects`);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (picked.length === 0) return;
    setErrorMessage(null);
    setUploadedScreens(null);
    setPendingFiles((prev) => [...prev, ...picked]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;
    setErrorMessage(null);
    setUploadedScreens(null);
    try {
      const result = await uploadMutation.mutateAsync(pendingFiles);
      setUploadedScreens(result.screens.map((s) => ({ name: s.name, status: s.status })));
      setPendingFiles([]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to upload source files.';
      setErrorMessage(msg);
    }
  };

  if (partnerLoading || projectsLoading) {
    return <div className="p-12 text-center text-xs text-[#6B778C]">Loading project...</div>;
  }

  if (partnerError || !partner) {
    return (
      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{(partnerError as any)?.response?.data?.message || 'Partner not found.'}</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>Project '{projectId}' was not found for this partner.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-2xl">
      <PageHeader
        title={`Upload Source - ${project.name}`}
        subtitle={`Upload source files on behalf of ${partner.name}.`}
        actions={
          <Button variant="outline" size="sm" onClick={backToProjects}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Projects
          </Button>
        }
      />

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {uploadedScreens && uploadedScreens.length > 0 && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Uploaded successfully.</span>
          </div>
          <ul className="pl-6 list-disc space-y-0.5">
            {uploadedScreens.map((s) => (
              <li key={s.name}>
                {s.name} - {s.status}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card variant="default" padding="lg">
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-[#D9E2EC] rounded-xl p-8 text-center cursor-pointer hover:border-[#0652CC] transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = Array.from(e.dataTransfer.files);
              if (dropped.length === 0) return;
              setErrorMessage(null);
              setUploadedScreens(null);
              setPendingFiles((prev) => [...prev, ...dropped]);
            }}
          >
            <UploadCloud className="w-8 h-8 mx-auto text-[#0652CC] mb-2" />
            <p className="text-sm font-semibold text-[#091E42]">Click or drag files here to upload</p>
            <p className="text-xs text-[#6B778C] mt-1">
              {acceptedExtensions ? `Accepted: ${acceptedExtensions.join(', ')}` : 'Any source file'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedExtensions?.join(',')}
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {pendingFiles.length > 0 && (
            <div className="space-y-2">
              {pendingFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[#F4F7FB] border border-[#E5EAF0]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-[#6B778C] shrink-0" />
                    <span className="text-xs font-semibold text-[#091E42] truncate">{file.name}</span>
                    <span className="text-[11px] text-[#6B778C] shrink-0">
                      {Math.round(file.size / 1024)} KB
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePendingFile(index)}
                    className="text-[#6B778C] hover:text-rose-600 shrink-0"
                    aria-label={`Remove ${file.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
            <Button
              onClick={handleUpload}
              disabled={pendingFiles.length === 0}
              isLoading={uploadMutation.isPending}
            >
              <UploadCloud className="w-4 h-4 mr-1.5" />
              Upload {pendingFiles.length > 0 ? `${pendingFiles.length} File(s)` : ''}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PartnerProjectUploadPage;
