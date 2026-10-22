import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  PartnerProject,
  PartnerConversionItem,
  ExportBundleInfo,
  PartnerExportOptions,
  PartnerExportPreview,
} from '../types/partner.types';
import { Mail, CheckCircle2, AlertTriangle, Download, Send, Loader2, RotateCcw, Info } from 'lucide-react';
import { isServerProject, partnersApi } from '../api/partners.api';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: PartnerProject;
  items: PartnerConversionItem[];
  onExportSuccess: (bundle: ExportBundleInfo) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CUSTOM_NOTES_MAX_LENGTH = 2000;
const LOCAL_PROJECT_NOTICE =
  'This demo project exists only in this browser, so it has no converted code to export. Exports run for projects stored on the server.';

function messageOf(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  project,
  items,
  onExportSuccess,
}) => {
  const { hasPermission } = useAuth();
  const canExport = hasPermission('conversion_result.export');
  const canNotify = canExport && hasPermission('conversion_result.notify_partner');
  const isServer = isServerProject(project.id);
  const isJava = project.conversionType === 'COBOL_TO_JAVA';

  const [includeTs, setIncludeTs] = useState(true);
  const [includeTests, setIncludeTests] = useState(true);
  const [includeDocs, setIncludeDocs] = useState(true);
  const [customNotes, setCustomNotes] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const [preview, setPreview] = useState<PartnerExportPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [downloading, setDownloading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [generatedBundle, setGeneratedBundle] = useState<ExportBundleInfo | null>(null);

  // Keyed on the ids so a workspace refresh with the same items does not re-run the preview.
  const itemKey = items.map((i) => i.id).join(',');
  const selectedScreenIds = useMemo(() => (itemKey ? itemKey.split(',') : []), [itemKey]);

  const options: PartnerExportOptions = useMemo(
    () => ({
      selectedScreenIds,
      includeTypeScript: includeTs,
      includeUnitTests: includeTests,
      includeDocumentation: includeDocs,
    }),
    [selectedScreenIds, includeTs, includeTests, includeDocs],
  );

  // A fresh dialog each time it opens: no leftover success screen or error from last time.
  useEffect(() => {
    if (!isOpen) return;
    setGeneratedBundle(null);
    setActionError(null);
    setEmailError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    partnersApi
      .getPartnerById(project.partnerId)
      .then((partner) => {
        if (!cancelled && partner?.contactEmail) setPartnerEmail((current) => current || partner.contactEmail);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isOpen, project.partnerId]);

  // What gets packaged comes from the server, so the counts match the ZIP exactly.
  useEffect(() => {
    if (!isOpen || !isServer || !canExport) return;
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    partnersApi
      .previewExport(project.id, {
        selectedScreenIds,
        includeTypeScript: true,
        includeUnitTests: true,
        includeDocumentation: true,
      })
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setPreviewError(messageOf(err, 'Could not load the export summary.'));
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, isServer, canExport, project.id, selectedScreenIds]);

  const includedScreens = preview?.screensIncluded ?? 0;
  const includedPrograms = preview?.programsIncluded ?? 0;
  const includedCount = includedScreens + includedPrograms;
  const excludedItems = preview?.excludedItems ?? [];
  const packageName = preview?.packageName ?? '';
  const targetFramework = preview?.targetFramework ?? (isJava ? 'Spring Boot 3.3' : 'React 19');
  const busy = exporting || downloading;
  const nothingToExport = Boolean(preview) && includedCount === 0;
  const actionsDisabled = !isServer || !preview || nothingToExport || busy;

  const validateEmail = (): boolean => {
    const email = partnerEmail.trim();
    if (!email) {
      setEmailError('Partner contact email is required');
      return false;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleGenerateAndNotify = async () => {
    if (!validateEmail()) return;
    setActionError(null);
    setExporting(true);
    try {
      const bundle = await partnersApi.triggerExport({
        projectId: project.id,
        partnerEmail,
        customNotes,
        options,
      });
      setGeneratedBundle(bundle);
      onExportSuccess(bundle);
    } catch (err) {
      setActionError(messageOf(err, 'The export could not be completed. Please try again later.'));
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadDirectly = async () => {
    setActionError(null);
    setDownloading(true);
    try {
      await partnersApi.downloadExportZip(project.id, options, packageName || 'modernized-bundle.zip');
    } catch (err) {
      setActionError(messageOf(err, 'The ZIP could not be downloaded. Please try again.'));
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadReleased = async () => {
    if (!generatedBundle) return;
    setActionError(null);
    setDownloading(true);
    try {
      await partnersApi.downloadReleasedBundle(project.id, generatedBundle);
    } catch (err) {
      setActionError(messageOf(err, 'The ZIP could not be downloaded. Please try again.'));
    } finally {
      setDownloading(false);
    }
  };

  const handleRetryNotification = async () => {
    if (!generatedBundle) return;
    setActionError(null);
    setRetrying(true);
    try {
      const bundle = await partnersApi.retryExportNotification(project.id, generatedBundle.id);
      setGeneratedBundle(bundle);
      onExportSuccess(bundle);
    } catch (err) {
      setActionError(messageOf(err, 'The notification could not be sent. Please try again later.'));
    } finally {
      setRetrying(false);
    }
  };

  const notificationSent = generatedBundle?.notificationStatus === 'SENT';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={generatedBundle ? 'Code Bundle Generated & Partner Notified' : 'Export Partner Modernization Bundle'}
    >
      {!generatedBundle ? (
        <div className="space-y-4">
          {/* Target Overview */}
          <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0] flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#6B778C] font-semibold uppercase">Target Partner & Project</span>
              <h4 className="text-sm font-bold text-[#091E42]">{project.name}</h4>
              <p className="text-xs text-[#4A5568]">{project.partnerName}</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#6B778C]">Framework Target</span>
              <p className="text-xs font-semibold text-[#0652CC]">{targetFramework}</p>
            </div>
          </div>

          {!isServer && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{LOCAL_PROJECT_NOTICE}</span>
            </div>
          )}

          {isServer && !canExport && (
            <div role="alert" className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900">
              You do not have permission to export this project.
            </div>
          )}

          {/* Bundle Content Metrics */}
          {isServer && canExport && (
            <>
              {previewLoading && (
                <div className="flex items-center gap-2 text-xs text-[#6B778C]" aria-live="polite">
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking which items can be exported...
                </div>
              )}
              {previewError && (
                <div role="alert" className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800">
                  {previewError}
                </div>
              )}
              {preview && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/60">
                    <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Included Items
                    </div>
                    <p className="text-lg font-extrabold text-emerald-900 mt-1" data-testid="included-count">
                      {includedCount} items
                    </p>
                    <div className="text-[11px] text-emerald-700 space-y-0.5 mt-0.5">
                      {includedScreens > 0 && <div>• {includedScreens} React UI Screens</div>}
                      {includedPrograms > 0 && <div>• {includedPrograms} Java Programs</div>}
                      <div>
                        • {preview.totalFiles} files, ~{preview.estimatedSizeKb} KB of generated code
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border ${excludedItems.length > 0 ? 'border-amber-200 bg-amber-50/60' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                      <AlertTriangle
                        className={`w-4 h-4 ${excludedItems.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}
                      />{' '}
                      Excluded Items
                    </div>
                    <p className="text-lg font-extrabold text-gray-900 mt-1" data-testid="excluded-count">
                      {excludedItems.length} items
                    </p>
                    {excludedItems.length > 0 ? (
                      <ul className="text-[11px] text-amber-900 mt-0.5 space-y-0.5 max-h-24 overflow-y-auto">
                        {excludedItems.map((item) => (
                          <li key={item.name}>
                            <span className="font-semibold">{item.name}</span>: {item.reason}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-gray-600 mt-0.5">All items completed successfully</p>
                    )}
                  </div>
                </div>
              )}
              {nothingToExport && (
                <div role="alert" className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900">
                  No screen or program has a completed conversion yet, so there is nothing to export.
                </div>
              )}
            </>
          )}

          {/* Package Configuration */}
          <div className="space-y-2 pt-2 border-t border-[#E5EAF0]">
            <span className="text-xs font-bold text-[#091E42]">Package Artifact Options</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <label
                className={`flex items-center gap-2 p-2 rounded border border-[#E5EAF0] ${isJava ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-[#F7F9FC]'}`}
                title={isJava ? 'Applies to React bundles only' : undefined}
              >
                <input
                  type="checkbox"
                  checked={includeTs}
                  disabled={isJava}
                  onChange={(e) => setIncludeTs(e.target.checked)}
                  className="rounded text-[#0652CC]"
                />
                <span className="text-[#091E42] font-medium">TypeScript Strict</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded border border-[#E5EAF0] cursor-pointer hover:bg-[#F7F9FC]">
                <input
                  type="checkbox"
                  checked={includeTests}
                  onChange={(e) => setIncludeTests(e.target.checked)}
                  className="rounded text-[#0652CC]"
                />
                <span className="text-[#091E42] font-medium">Unit Tests (.spec / .test)</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded border border-[#E5EAF0] cursor-pointer hover:bg-[#F7F9FC]">
                <input
                  type="checkbox"
                  checked={includeDocs}
                  onChange={(e) => setIncludeDocs(e.target.checked)}
                  className="rounded text-[#0652CC]"
                />
                <span className="text-[#091E42] font-medium">README & Setup Guide</span>
              </label>
            </div>
          </div>

          {/* Partner Notification Preview */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#091E42]">
              <span className="flex items-center gap-1.5 shrink-0">
                <Mail className="w-4 h-4 text-[#0652CC]" /> Partner Email Notification Preview
              </span>
              <label className="flex items-center gap-1 text-[11px] font-mono font-normal text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded min-w-0">
                <span>To:</span>
                <input
                  type="email"
                  aria-label="Partner contact email"
                  value={partnerEmail}
                  onChange={(e) => {
                    setPartnerEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="contact@partner.com"
                  className="bg-transparent outline-none min-w-0 w-48"
                />
              </label>
            </div>
            {emailError && <p className="text-[11px] text-red-600 text-right">{emailError}</p>}
            <div className="text-xs bg-white p-3 rounded-lg border border-blue-100 space-y-1.5 text-gray-700">
              <p className="font-semibold text-[#091E42]">Subject: [ALSM] Modernized Code Bundle Ready: {project.name}</p>
              <p className="text-[11px] text-[#4A5568]">Dear {project.partnerName} Team,</p>
              <p className="text-[11px] text-[#4A5568]">
                Your modernization bundle <strong>{packageName || '(name assigned on export)'}</strong> has been
                generated by the ALSM conversion team.
              </p>
              <textarea
                aria-label="Technical notes for the partner"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                maxLength={CUSTOM_NOTES_MAX_LENGTH}
                placeholder="Include custom engineering notes to the partner..."
                className="w-full text-xs p-2 border border-[#D9E2EC] rounded bg-[#F7F9FC] focus:bg-white outline-none focus:ring-1 focus:ring-[#0652CC]"
                rows={2}
              />
              <p className="text-[10px] text-[#6B778C] text-right">
                {customNotes.length}/{CUSTOM_NOTES_MAX_LENGTH}
              </p>
              <p className="text-[11px] text-[#6B778C]">
                You can download the package and inspect file manifests directly from your Partner Download Center.
              </p>
            </div>
          </div>

          {actionError && (
            <div role="alert" className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800">
              {actionError}
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E5EAF0]">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {canExport && (
                <Button
                  variant="outline"
                  onClick={handleDownloadDirectly}
                  isLoading={downloading}
                  disabled={actionsDisabled}
                  className="flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Direct ZIP
                </Button>
              )}
              {canNotify && (
                <Button
                  variant="primary"
                  onClick={handleGenerateAndNotify}
                  isLoading={exporting}
                  disabled={actionsDisabled}
                  className="flex items-center gap-1.5 bg-[#0652CC] hover:bg-[#0543A8]"
                >
                  <Send className="w-3.5 h-3.5" /> Generate & Notify Partner
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5 text-center py-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#091E42]">Export Bundle Published Successfully!</h3>
            <p className="text-xs text-[#6B778C] max-w-md mx-auto mt-1">
              Package <strong>{generatedBundle.packageName}</strong> is stored and the project is marked as exported.{' '}
              {notificationSent
                ? `A delivery notification was sent to ${generatedBundle.partnerContactEmail}.`
                : `The notification to ${generatedBundle.partnerContactEmail} was not sent.`}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0] text-left text-xs space-y-2">
            <div className="flex justify-between gap-3">
              <span className="text-[#6B778C]">Bundle ID:</span>
              <span className="font-mono font-medium text-[#091E42]">{generatedBundle.id}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#6B778C]">Notification Status:</span>
              {notificationSent ? (
                <span className="font-medium text-emerald-600">SENT / DELIVERED</span>
              ) : (
                <span className="font-medium text-amber-600">
                  {generatedBundle.notificationStatus === 'FAILED' ? 'NOT SENT' : generatedBundle.notificationStatus}
                </span>
              )}
            </div>
            {!notificationSent && generatedBundle.notificationError && (
              <p className="text-[11px] text-amber-800">{generatedBundle.notificationError}</p>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-[#6B778C]">Items included:</span>
              <span className="font-medium text-[#091E42]">
                {generatedBundle.totalItems} ({generatedBundle.excludedItems?.length ?? 0} excluded)
              </span>
            </div>
          </div>

          {actionError && (
            <div role="alert" className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 text-left">
              {actionError}
            </div>
          )}

          <div className="flex justify-center flex-wrap gap-3 pt-2">
            {!notificationSent && canNotify && (
              <Button
                variant="outline"
                onClick={handleRetryNotification}
                isLoading={retrying}
                className="flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> Retry Notification
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleDownloadReleased}
              isLoading={downloading}
              className="flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Download ZIP
            </Button>
            <Button variant="primary" onClick={onClose}>
              Done & Return to Workspace
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
