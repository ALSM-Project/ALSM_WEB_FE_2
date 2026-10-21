import React, { useState } from 'react';
import { Modal, Button } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PartnerProject, PartnerConversionItem, ExportBundleInfo } from '../types/partner.types';
import {
  Mail,
  CheckCircle2,
  AlertTriangle,
  Download,
  Send,
} from 'lucide-react';
import { partnersApi } from '../api/partners.api';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: PartnerProject;
  items: PartnerConversionItem[];
  onExportSuccess: (bundle: ExportBundleInfo) => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  project,
  items,
  onExportSuccess,
}) => {
  const { hasPermission } = useAuth();
  const [includeTs, setIncludeTs] = useState(true);
  const [includeTests, setIncludeTests] = useState(true);
  const [includeDocs, setIncludeDocs] = useState(true);
  const [customNotes, setCustomNotes] = useState(
    'All requested screens and batch logic routines have passed automated semantic validation and AST linting.'
  );
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [generatedBundle, setGeneratedBundle] = useState<ExportBundleInfo | null>(null);

  const completedScreens = items.filter((i) => i.type === 'SCREEN' && i.status === 'COMPLETED').length;
  const completedPrograms = items.filter((i) => i.type === 'PROGRAM' && i.status === 'COMPLETED').length;
  const excludedItems = items
    .filter((i) => i.status !== 'COMPLETED')
    .map((i) => ({ name: i.name, reason: `Status is ${i.status} (validation: ${i.validationStatus})` }));

  const packageName = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_bundle_v1.zip`;
  const partnerEmail = `${project.partnerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@partner-portal.io`;

  const handleGenerateAndNotify = async () => {
    try {
      setExporting(true);
      const bundle = await partnersApi.triggerExport({
        projectId: project.id,
        projectName: project.name,
        partnerId: project.partnerId,
        partnerName: project.partnerName,
        partnerContactEmail: partnerEmail,
        conversionType: project.conversionType,
        packageName,
        screensIncluded: completedScreens,
        programsIncluded: completedPrograms,
        excludedItems,
      });
      setGeneratedBundle(bundle);
      setExportDone(true);
      onExportSuccess(bundle);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadDirectly = () => {
    // Trigger simulated browser ZIP download
    const blob = new Blob(
      [
        `ALSM Modernization Export Bundle\nProject: ${project.name}\nTarget: ${project.targetFramework}\nScreens: ${completedScreens}\nPrograms: ${completedPrograms}\nGenerated: ${new Date().toISOString()}`,
      ],
      { type: 'application/zip' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = packageName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={exportDone ? 'Code Bundle Generated & Partner Notified' : 'Export Partner Modernization Bundle'}
    >
      {!exportDone ? (
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
              <p className="text-xs font-semibold text-[#0652CC]">{project.targetFramework}</p>
            </div>
          </div>

          {/* Bundle Content Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/60">
              <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Included Items
              </div>
              <p className="text-lg font-extrabold text-emerald-900 mt-1">
                {completedScreens + completedPrograms} items
              </p>
              <div className="text-[11px] text-emerald-700 space-y-0.5 mt-0.5">
                {completedScreens > 0 && <div>• {completedScreens} React UI Screens</div>}
                {completedPrograms > 0 && <div>• {completedPrograms} Java Services</div>}
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${excludedItems.length > 0 ? 'border-amber-200 bg-amber-50/60' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <AlertTriangle className={`w-4 h-4 ${excludedItems.length > 0 ? 'text-amber-600' : 'text-gray-400'}`} /> Excluded Items
              </div>
              <p className="text-lg font-extrabold text-gray-900 mt-1">
                {excludedItems.length} items
              </p>
              <p className="text-[11px] text-gray-600 mt-0.5">
                {excludedItems.length > 0 ? 'Failing or incomplete validation' : 'All items completed successfully'}
              </p>
            </div>
          </div>

          {/* Package Configuration */}
          <div className="space-y-2 pt-2 border-t border-[#E5EAF0]">
            <span className="text-xs font-bold text-[#091E42]">Package Artifact Options</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded border border-[#E5EAF0] cursor-pointer hover:bg-[#F7F9FC]">
                <input
                  type="checkbox"
                  checked={includeTs}
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
                <span className="text-[#091E42] font-medium">Unit Tests (.spec)</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded border border-[#E5EAF0] cursor-pointer hover:bg-[#F7F9FC]">
                <input
                  type="checkbox"
                  checked={includeDocs}
                  onChange={(e) => setIncludeDocs(e.target.checked)}
                  className="rounded text-[#0652CC]"
                />
                <span className="text-[#091E42] font-medium">README & Types</span>
              </label>
            </div>
          </div>

          {/* Partner Notification Preview */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#091E42]">
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-[#0652CC]" /> Partner Email Notification Preview
              </span>
              <span className="text-[11px] font-mono font-normal text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                To: {partnerEmail}
              </span>
            </div>
            <div className="text-xs bg-white p-3 rounded-lg border border-blue-100 space-y-1.5 text-gray-700">
              <p className="font-semibold text-[#091E42]">
                Subject: [ALSM] Modernized Code Bundle Ready: {project.name}
              </p>
              <p className="text-[11px] text-[#4A5568]">
                Dear {project.partnerName} Team,
              </p>
              <p className="text-[11px] text-[#4A5568]">
                Your modernization bundle <strong>{packageName}</strong> has been generated and approved by the ALSM conversion team.
              </p>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Include custom engineering notes to the partner..."
                className="w-full text-xs p-2 border border-[#D9E2EC] rounded bg-[#F7F9FC] focus:bg-white outline-none focus:ring-1 focus:ring-[#0652CC]"
                rows={2}
              />
              <p className="text-[11px] text-[#6B778C]">
                You can download the package and inspect file manifests directly from your Partner Download Center.
              </p>
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E5EAF0]">
            <Button variant="outline" onClick={onClose} disabled={exporting}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadDirectly}
                disabled={exporting}
                className="flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Direct ZIP
              </Button>
              {hasPermission('conversion_result.notify_partner') && (
                <Button
                  variant="primary"
                  onClick={handleGenerateAndNotify}
                  isLoading={exporting}
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
            <h3 className="text-base font-bold text-[#091E42]">
              Export Bundle Published Successfully!
            </h3>
            <p className="text-xs text-[#6B778C] max-w-md mx-auto mt-1">
              Package <strong>{packageName}</strong> is now live in the Partner Portal Download Center. An automated delivery notification has been queued for {partnerEmail}.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0] text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-[#6B778C]">Bundle ID:</span>
              <span className="font-mono font-medium text-[#091E42]">{generatedBundle?.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B778C]">Notification Status:</span>
              <span className="font-medium text-emerald-600">DELIVERED / SENT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B778C]">Available in Portal:</span>
              <span className="font-medium text-[#0652CC]">Yes (/portal/downloads)</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={handleDownloadDirectly} className="flex items-center gap-1.5">
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
