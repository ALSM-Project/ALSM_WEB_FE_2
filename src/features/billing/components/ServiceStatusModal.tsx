import React, { useState } from 'react';
import { AlertTriangle, Power, X } from 'lucide-react';
import { Button, toast } from '@/shared/ui';
import type { OrganizationUsageItem } from '../types/organization-usage';

interface ServiceStatusModalProps {
  org: OrganizationUsageItem;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (action: 'SUSPEND' | 'REACTIVATE', reason: string) => Promise<void>;
  isSubmitting: boolean;
}

export const ServiceStatusModal: React.FC<ServiceStatusModalProps> = ({
  org,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const isCurrentlySuspended = org.orgStatus === 'SUSPENDED';
  const action: 'SUSPEND' | 'REACTIVATE' = isCurrentlySuspended ? 'REACTIVATE' : 'SUSPEND';
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.warning('Please provide a reason for service status modification');
      return;
    }
    await onSubmit(action, reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {action === 'SUSPEND' ? 'Suspend Organization Access' : 'Reactivate Organization Service'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Target: {org.name} ({org.organizationId})
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              action === 'SUSPEND'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">
                {action === 'SUSPEND'
                  ? 'Warning: Conversion jobs and active sessions will be paused.'
                  : 'Organization users will regain full conversion access.'}
              </p>
              <p className="opacity-90">
                {action === 'SUSPEND'
                  ? 'Organization members will be restricted from running new BMS/COBOL conversions until service is reactivated.'
                  : 'Quotas and entitlements will resume according to active contract terms.'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Action Reason & Audit Note *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Contract non-renewal, payment dispute, or customer request..."
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
              className={`text-xs inline-flex items-center gap-1.5 ${
                action === 'SUSPEND'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {isSubmitting
                ? 'Processing...'
                : action === 'SUSPEND'
                ? 'Confirm Suspension'
                : 'Confirm Reactivation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
