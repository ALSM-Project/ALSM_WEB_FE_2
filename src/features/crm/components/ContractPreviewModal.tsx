import React, { useState } from 'react';
import { AlertTriangle, FileCheck2, Printer, Send, XCircle } from 'lucide-react';
import { Button, Modal } from '@/shared/ui';
import { formatVnd } from '@/shared/utils/currency';
import { LeadContract } from '../types/crm.types';
import { crmApi } from '../api/crm.api';

export interface ContractPreviewModalProps {
  isOpen: boolean;
  leadId: string;
  leadCompany: string;
  leadContact: string;
  leadEmail: string;
  contract: LeadContract | null;
  onClose: () => void;
  onContractUpdated?: (contract: LeadContract) => void;
  /** Retained for caller compatibility; activation must happen only after the backend evidence gate passes. */
  onProceedToActivation?: () => void;
}

export const ContractPreviewModal: React.FC<ContractPreviewModalProps> = ({
  isOpen,
  leadId,
  leadCompany,
  leadContact,
  leadEmail,
  contract,
  onClose,
  onContractUpdated,
}) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!contract) return null;

  const handleInitiateSigning = async () => {
    if (!contract || actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await crmApi.initiateOnlineSigning(leadId, contract.id);
      setActionSuccess(`Đã gửi envelope ký điện tử lên VNPT (mã: ${res.envelopeReference}).`);
      if (onContractUpdated) {
        onContractUpdated({
          ...contract,
          workflowStatus: 'SENT_TO_CUSTOMER',
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể khởi tạo luồng ký online.';
      setActionError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSigning = async () => {
    if (!contract || actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await crmApi.cancelOnlineSigning(leadId, contract.id, 'Nhân viên hủy lượt ký từ CRM');
      setActionSuccess('Đã hủy lượt ký hợp đồng thành công.');
      if (onContractUpdated) {
        onContractUpdated({
          ...contract,
          workflowStatus: 'CANCELLED',
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể hủy lượt ký.';
      setActionError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setActionLoading(false);
    }
  };

  const legacySignatureState = contract.status === 'SIGNED'
    || contract.status === 'FULLY_SIGNED'
    || contract.status === 'SENT_FOR_SIGNATURE';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Contract draft: ${contract.contractNumber}`}>
      <div className="space-y-4 text-sm">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-semibold">
                {legacySignatureState ? 'Legacy signature status is unverified' : contract.workflowStatus ? `${contract.workflowStatus.replace(/_/g, ' ')} — metadata preview only` : 'Draft preview only'}
              </p>
              <p className="mt-1 text-sm">
                {legacySignatureState
                  ? 'This older CRM status has no verified signing-provider evidence. It is not proof of signature and cannot activate a customer.'
                  : 'This is a text preview of the approved template snapshot. It is not a canonical PDF and has not been sent to a signing provider or signed.'}
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Contract record</p>
              <h3 className="mt-1 flex items-center gap-2 font-semibold text-slate-900">
                <FileCheck2 className="h-4 w-4 text-slate-600" />
                {contract.title}
              </h3>
            </div>
            <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
              {(contract.workflowStatus || contract.status).replace(/_/g, ' ')}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div><dt className="text-xs text-slate-500">Contract #</dt><dd className="mt-1 font-mono font-medium">{contract.contractNumber}</dd></div>
            <div><dt className="text-xs text-slate-500">Annual value</dt><dd className="mt-1 font-semibold text-slate-900">{formatVnd(contract.annualValue)}</dd></div>
            <div><dt className="text-xs text-slate-500">Effective date</dt><dd className="mt-1">{contract.effectiveDate || 'Not set'}</dd></div>
            <div><dt className="text-xs text-slate-500">Customer signature</dt><dd className="mt-1">Not provider-confirmed</dd></div>
          </dl>
        </section>

        <section className="max-h-96 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="font-semibold text-slate-900">Contract terms · version {contract.approvedTemplateSnapshot ? `v${contract.approvedTemplateSnapshot.templateVersionNumber}` : 'not available'}</h4>
          <p><span className="font-medium">Provider:</span> ALSM Technologies</p>
          <p><span className="font-medium">Customer:</span> {leadCompany}, represented by {leadContact} ({leadEmail})</p>
          <p><span className="font-medium">Service plan:</span> {contract.plan}</p>
          {contract.approvedTemplateSnapshot ? (
            <>
              <p className="text-xs text-slate-500">{contract.approvedTemplateSnapshot.title} · {contract.approvedTemplateSnapshot.locale.toUpperCase()} · template SHA-256 {contract.approvedTemplateSnapshot.contentDigest}</p>
              {contract.approvedTemplateSnapshot.sections.map((section, index) => (
                <article key={`${index}-${section.heading}`} className="space-y-1 border-t border-slate-100 pt-3">
                  <h5 className="font-semibold text-slate-900">{index + 1}. {section.heading}</h5>
                  <p className="whitespace-pre-wrap text-slate-700">{section.body}</p>
                </article>
              ))}
            </>
          ) : (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">The immutable legal template snapshot is unavailable. Do not submit this record for signing.</p>
          )}
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This preview is not a canonical PDF or signature evidence. Signer authority, provider evidence, and the private final-document archive are not yet configured.</p>
        </section>

        {actionError && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            {actionError}
          </div>
        )}
        {actionSuccess && (
          <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            {actionSuccess}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
          <div className="flex items-center gap-2">
            {contract.workflowStatus === 'APPROVED' && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleInitiateSigning}
                disabled={actionLoading}
              >
                <Send className="mr-1 h-3.5 w-3.5" /> {actionLoading ? 'Đang gửi...' : 'Gửi ký điện tử (VNPT)'}
              </Button>
            )}
            {['SENT_TO_CUSTOMER', 'CUSTOMER_VIEWED', 'CUSTOMER_SIGNING_IN_PROGRESS', 'CUSTOMER_PARTIALLY_SIGNED'].includes(contract.workflowStatus || '') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelSigning}
                disabled={actionLoading}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <XCircle className="mr-1 h-3.5 w-3.5" /> {actionLoading ? 'Đang xử lý...' : 'Hủy lượt ký'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1 h-3.5 w-3.5" /> Print draft preview
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
