import React, { useState } from 'react';
import { FileText, HardDrive, Monitor, ShieldCheck, X } from 'lucide-react';
import { Button, toast } from '@/shared/ui';
import type { OrganizationUsageItem, QuotaAmendmentPayload } from '../types/organization-usage';

interface QuotaAmendmentModalProps {
  org: OrganizationUsageItem;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: QuotaAmendmentPayload) => Promise<void>;
  isSubmitting: boolean;
}

export const QuotaAmendmentModal: React.FC<QuotaAmendmentModalProps> = ({
  org,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [amendmentType, setAmendmentType] = useState<
    'CAPACITY_UPGRADE' | 'ADDITIONAL_SCREENS' | 'STORAGE_EXPANSION' | 'CONTRACT_RENEWAL'
  >('CAPACITY_UPGRADE');
  const [screenDelta, setScreenDelta] = useState<number>(50);
  const [storageDelta, setStorageDelta] = useState<number>(0);
  const [projectDelta, _setProjectDelta] = useState<number>(0);
  const [contractReference, setContractReference] = useState(
    org.contractNumber ? `${org.contractNumber}-AMD-01` : 'CTR-2026-AMD-001'
  );
  const [justification, setJustification] = useState('');

  if (!isOpen) return null;

  const newScreenCapacity = Math.max(0, org.screenCapacity + screenDelta);
  const newStorageCapacity = Math.max(1, org.storageCapacityGb + storageDelta);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) {
      toast.warning('Business justification and approval reference are required.');
      return;
    }
    if (!contractReference.trim()) {
      toast.warning('Contract or amendment reference is required.');
      return;
    }

    await onSubmit({
      amendmentType,
      screenCapacityDelta: screenDelta !== 0 ? screenDelta : undefined,
      storageGbDelta: storageDelta !== 0 ? storageDelta : undefined,
      projectCapacityDelta: projectDelta !== 0 ? projectDelta : undefined,
      contractReference: contractReference.trim(),
      justification: justification.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Contracted Quota Amendment</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Governed capacity modification for {org.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Governance Alert */}
        <div className="bg-amber-50 px-6 py-3 border-b border-amber-200 flex items-start gap-2.5 text-amber-800 text-xs">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-bold">Enterprise Audit Rule:</span> Arbitrary quota increases are prohibited. All amendments must tie to a signed contract addendum or approved service order and are written to the immutable system audit log.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amendment Category *
            </label>
            <select
              value={amendmentType}
              onChange={(e) => setAmendmentType(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
            >
              <option value="CAPACITY_UPGRADE">Capacity Upgrade (Additional Screens Bundle)</option>
              <option value="ADDITIONAL_SCREENS">Ad-hoc Screen Quota Expansion</option>
              <option value="STORAGE_EXPANSION">Storage & Project Limit Expansion</option>
              <option value="CONTRACT_RENEWAL">Contract Renewal Quota Reset</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Additional Screen Quota
              </label>
              <div className="relative">
                <Monitor className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step={10}
                  value={screenDelta}
                  onChange={(e) => setScreenDelta(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Current: {org.screenCapacity} → New: <strong>{newScreenCapacity}</strong> screens
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Additional Storage (GB)
              </label>
              <div className="relative">
                <HardDrive className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step={5}
                  value={storageDelta}
                  onChange={(e) => setStorageDelta(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Current: {org.storageCapacityGb} GB → New: <strong>{newStorageCapacity}</strong> GB
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contract / Addendum Reference *
            </label>
            <div className="relative">
              <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={contractReference}
                onChange={(e) => setContractReference(e.target.value)}
                placeholder="e.g. CTR-2026-VCB-AMD-02"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Business Justification & Approval Note *
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="e.g. Customer purchased 50 screen extension under signed commercial amendment #02 approved by Head of Sales..."
              rows={3}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="bg-[#244A70] inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {isSubmitting ? 'Amending...' : 'Apply Quota Amendment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
