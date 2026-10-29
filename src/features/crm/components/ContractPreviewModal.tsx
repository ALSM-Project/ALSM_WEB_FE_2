import React, { useState } from 'react';
import { Button, Modal } from '@/shared/ui';
import { 
  FileCheck2, CheckCircle2, Send, 
  Printer, ArrowRight, Stamp 
} from 'lucide-react';
import { LeadContract } from '../types/crm.types';
import { crmApi } from '../api/crm.api';
import { formatVnd } from '@/shared/utils/currency';

export interface ContractPreviewModalProps {
  isOpen: boolean;
  leadId: string;
  leadCompany: string;
  leadContact: string;
  leadEmail: string;
  contract: LeadContract | null;
  onClose: () => void;
  onContractUpdated?: (contract: LeadContract) => void;
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
  onProceedToActivation,
}) => {
  const [acting, setActing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!contract) return null;

  const handleSendForSignature = async () => {
    try {
      setActing(true);
      const updated = await crmApi.sendContractForSignature(leadId, contract.id);
      setSuccessMessage('Contract sent for electronic signature via simulated DocuSign envelope.');
      onContractUpdated?.(updated);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch contract.');
    } finally {
      setActing(false);
    }
  };

  const handleSimulateSign = async () => {
    try {
      setActing(true);
      const updated = await crmApi.simulateSignContract(leadId, contract.id);
      setSuccessMessage('Contract successfully countersigned! Prerequisites for customer activation are fulfilled.');
      onContractUpdated?.(updated);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to simulate signature.');
    } finally {
      setActing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Legal Contract: ${contract.contractNumber}`}
    >
      <div className="space-y-4 text-xs">
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Contract Meta Banner */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Master Agreement</span>
              <h3 className="text-sm font-bold text-[#091E42] flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                {contract.title}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${
                contract.status === 'FULLY_SIGNED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                contract.status === 'SENT_FOR_SIGNATURE' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                contract.status === 'PARTIALLY_SIGNED' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                'bg-slate-200 text-slate-700'
              }`}>
                {contract.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Contract #</p>
              <p className="font-mono font-semibold text-slate-900 mt-0.5">{contract.contractNumber}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Annual Value</p>
              <p className="font-bold text-blue-600 mt-0.5">{formatVnd(contract.annualValue)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Effective Date</p>
              <p className="font-medium mt-0.5">{contract.effectiveDate || 'Upon countersignature'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Signed Date</p>
              <p className="font-medium mt-0.5">
                {contract.signedAt ? new Date(contract.signedAt).toLocaleDateString() : 'Pending'}
              </p>
            </div>
          </div>

          {contract.docusignEnvelopeId && (
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">DocuSign Simulated Envelope ID:</span>
              <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                {contract.docusignEnvelopeId}
              </span>
            </div>
          )}
        </div>

        {/* Contract Legal Terms Document Box */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="font-semibold text-slate-700 text-xs">Contract Terms & SLA Schedule</span>
            <span className="text-[11px] text-slate-500">Jurisdiction: Standard Commercial Law</span>
          </div>

          <div className="p-4 space-y-3 font-serif text-slate-800 leading-relaxed text-xs max-h-56 overflow-y-auto bg-white">
            <p className="font-sans font-bold text-slate-900">1. PARTIES AND PURPOSE</p>
            <p>
              This Master Services Agreement ("Agreement") is entered into between <strong>ALSM Technologies Corp.</strong> ("Provider") 
              and <strong>{leadCompany}</strong> ("Client"), represented by {leadContact} ({leadEmail}).
            </p>

            <p className="font-sans font-bold text-slate-900 mt-2">2. SERVICES AND SCOPE</p>
            <p>
              Provider shall deliver automated COBOL-to-Modern-Architecture migration services under the <strong>{contract.plan}</strong> scope,
              encompassing AST AST-driven parsing, business logic preservation, and target runtime execution in accordance with agreed specifications.
            </p>

            <p className="font-sans font-bold text-slate-900 mt-2">3. COMMERCIAL CONSIDERATION & PAYMENT</p>
            <p>
              Client agrees to pay the contract total of {formatVnd(contract.annualValue)} in accordance with standard Net-30 enterprise invoicing
              or authorized wire transfer before enterprise tenant activation.
            </p>

            <p className="font-sans font-bold text-slate-900 mt-2">4. SERVICE LEVEL AGREEMENT (SLA)</p>
            <p>
              Provider guarantees 99.9% uptime for the Web 3 cloud runtime and modern conversion execution pipeline, with priority enterprise support resolution within 4 hours.
            </p>

            {contract.status === 'FULLY_SIGNED' && (
              <div className="mt-4 pt-3 border-t border-dashed border-emerald-400 bg-emerald-50/50 p-3 rounded-lg font-sans">
                <div className="flex items-center gap-2 text-emerald-800 font-bold mb-1">
                  <Stamp className="w-4 h-4 text-emerald-600" />
                  Legally Executed Digital Signature
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div>
                    <p className="text-slate-400">Signed on behalf of Client:</p>
                    <p className="font-semibold text-slate-800">{leadContact} ({leadEmail})</p>
                    <p className="font-mono text-[10px] text-slate-500">Hash: SHA256:{contract.id.substring(0, 16)}...</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Signed on behalf of Provider:</p>
                    <p className="font-semibold text-slate-800">ALSM Corporate Legal Officer</p>
                    <p className="font-mono text-[10px] text-slate-500">Timestamp: {contract.signedAt ? new Date(contract.signedAt).toLocaleString() : ''}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-slate-600"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Print Contract
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {contract.status === 'DRAFT' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendForSignature}
                disabled={acting}
              >
                <Send className="w-3.5 h-3.5 mr-1 text-blue-600" />
                Simulate Send for Signature
              </Button>
            )}

            {contract.status === 'SENT_FOR_SIGNATURE' && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSimulateSign}
                disabled={acting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Stamp className="w-3.5 h-3.5 mr-1" />
                Simulate Customer Signature
              </Button>
            )}

            {contract.status === 'FULLY_SIGNED' && onProceedToActivation && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  onProceedToActivation();
                  onClose();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow"
              >
                Launch Customer Activation
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}

            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
