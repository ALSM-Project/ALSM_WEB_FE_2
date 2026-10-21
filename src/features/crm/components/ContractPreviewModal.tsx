import React, { useState } from 'react';
import { Button, Modal, toast } from '@/shared/ui';
import { 
  FileCheck2, CheckCircle2, Send, 
  Printer, Stamp 
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
      const result = await crmApi.sendContractForSignature(leadId, contract.id);
      const updated = result.contract;
      setSuccessMessage(result.notificationSent
        ? 'Contract has been sent to customer for digital signing. Notification sent in ALSM system.'
        : 'Contract moved to pending digital signature.');
      onContractUpdated?.(updated);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send contract.', { title: 'Contract Send Error' });
    } finally {
      setActing(false);
    }
  };

  const handleSimulateSign = async () => {
    try {
      setActing(true);
      const updated = await crmApi.simulateSignContract(leadId, contract.id);
      setSuccessMessage('Counter-signature completed successfully! Workspace activation requirements have been met.');
      onContractUpdated?.(updated);
      toast.success('Counter-signature completed successfully!', { title: 'Signing Successful' });
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      toast.error(err.message || 'Contract signing failed.', { title: 'Signing Error' });
    } finally {
      setActing(false);
    }
  };

  const isSigned = contract.status === 'FULLY_SIGNED' || contract.status === 'SIGNED';
  const rawContract = contract as any;
  const isAlsmSigned =
    rawContract.signingStatus?.alsm ||
    rawContract.signingProcess?.providerSigningStatus === 'SIGNED' ||
    Boolean(rawContract.signingProcess?.alsmSigner) ||
    isSigned;

  const partyASignatureImage =
    rawContract.parties?.provider?.signatureImageUrl ||
    rawContract.parties?.provider?.signatureImage ||
    rawContract.signingProcess?.alsmSignatureImage ||
    rawContract.signingProcess?.alsmSigner?.signatureImageUrl;

  const partyACompanySeal =
    rawContract.parties?.provider?.companySealUrl ||
    rawContract.parties?.provider?.officialSealImage ||
    rawContract.signingProcess?.alsmOfficialSealImage ||
    rawContract.signingProcess?.alsmSigner?.companySealUrl;

  const partyASignerName =
    rawContract.signingProcess?.alsmSigner?.name ||
    rawContract.parties?.provider?.signatoryName ||
    'Nguyen Gia Khanh';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Contract File: ${contract.contractNumber}`}
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">B2B Commercial Contract</span>
              <h3 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                {contract.title}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${
                isSigned ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                contract.status === 'SENT_FOR_SIGNATURE' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                contract.status === 'PARTIALLY_SIGNED' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                'bg-slate-200 text-slate-700'
              }`}>
                {isSigned ? 'FULLY SIGNED' :
                 contract.status === 'SENT_FOR_SIGNATURE' ? 'SENT FOR SIGNATURE' :
                 contract.status === 'PARTIALLY_SIGNED' ? 'PARTIALLY SIGNED' : 'DRAFT'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Contract Number</p>
              <p className="font-mono font-semibold text-slate-900 mt-0.5">{contract.contractNumber}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Contract Value</p>
              <p className="font-bold text-blue-600 mt-0.5">{formatVnd(contract.annualValue)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Effective Date</p>
              <p className="font-medium mt-0.5">{contract.effectiveDate || 'Upon Signing'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Signed Date</p>
              <p className="font-medium mt-0.5">
                {contract.signedAt ? new Date(contract.signedAt).toLocaleDateString('vi-VN') : 'Pending'}
              </p>
            </div>
          </div>
        </div>

        {/* Contract Legal Document View */}
        <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm bg-white">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Full Commercial Contract Document</span>
            <span className="text-[11px] text-slate-500">Governing Law: Civil Code & Commercial Law of Vietnam</span>
          </div>

          <div
            className="p-6 space-y-4 text-slate-900 leading-relaxed text-xs max-h-96 overflow-y-auto select-text font-serif"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            {/* National Motto & Emblem */}
            <div className="text-center mb-4">
              <p className="font-bold text-xs uppercase">SOCIALIST REPUBLIC OF VIETNAM</p>
              <p className="font-bold text-[11px] mt-0.5">Independence - Freedom - Happiness</p>
              <div className="w-24 h-[1px] bg-black mx-auto mt-1 mb-2" />
            </div>

            {/* Contract Title */}
            <div className="text-center mb-4">
              <h4 className="font-bold text-sm uppercase text-slate-950">{contract.title}</h4>
              <p className="text-[11px] text-slate-600 mt-0.5">No: <strong>{contract.contractNumber}</strong></p>
              <p className="italic text-[10px] text-slate-500 mt-0.5">
                Today, the Parties entering into this Service Contract include:
              </p>
            </div>

            {/* Legal Basis */}
            <div className="italic text-slate-700 text-[10.5px] space-y-0.5 border-b border-slate-200 pb-3">
              <p>- Pursuant to the Civil Code No. 91/2015/QH13 and the Commercial Law No. 36/2005/QH11;</p>
              <p>- Pursuant to the Law on Electronic Transactions No. 20/2023/QH15 and Decree No. 13/2023/ND-CP on Personal Data Protection;</p>
              <p>- Based on Party B's system modernization demand and Party A's technical solution capability.</p>
            </div>

            {/* Party A & Party B Information */}
            <div className="space-y-3 text-[11px] border-b border-slate-200 pb-3">
              <div>
                <p className="font-bold uppercase text-slate-950">PARTY A: SERVICE PROVIDER</p>
                <div className="pl-4 space-y-0.5 text-slate-800">
                  <p>Company Name: <strong>ALSM SOFTWARE MODERNIZATION TECHNOLOGY JOINT STOCK COMPANY</strong></p>
                  <p>Tax ID: 0110892345 &nbsp;|&nbsp; Representative: Nguyen Gia Khanh — General Director</p>
                  <p>Headquarters: Hoa Xuan, Cam Le, Da Nang City, Vietnam</p>
                  <p>Bank Account: 0899886249 at Military Commercial Joint Stock Bank (MB Bank)</p>
                </div>
              </div>

              <div>
                <p className="font-bold uppercase text-slate-950">PARTY B: CUSTOMER</p>
                <div className="pl-4 space-y-0.5 text-slate-800">
                  <p>Company Name: <strong>{leadCompany}</strong></p>
                  <p>Representative: <strong>{leadContact}</strong> &nbsp;|&nbsp; Email: {leadEmail}</p>
                </div>
              </div>
            </div>

            {/* Contract Articles */}
            <div className="space-y-3 text-[11px]">
              <div>
                <p className="font-bold text-slate-950">ARTICLE 1. SCOPE OF SERVICES AND TECHNICAL SPECIFICATIONS</p>
                <p className="mt-0.5 text-justify">
                  1.1. Party A provides Party B with legacy system modernization services under plan <strong>{contract.plan}</strong>, applying ALSM's AST restructuring technology.
                </p>
                <p className="text-justify">
                  1.2. Service scope includes: delivery of modernized UI source code, backend business processing code, AST logic verification dossier, and complete technical documentation.
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-950">ARTICLE 2. CONTRACT VALUE AND PAYMENT TERMS</p>
                <p className="mt-0.5 text-justify">
                  2.1. Total Contract Value: <strong>{formatVnd(contract.annualValue)}</strong>.
                </p>
                <p className="text-justify">
                  2.2. Payment method: Party B shall pay via bank transfer to Party A's official account 0899886249 (MB Bank) or QR code scan within 72 business hours from signing.
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-950">ARTICLE 3. SERVICE LEVEL AGREEMENT (SLA) AND TECHNICAL SUPPORT</p>
                <p className="mt-0.5 text-justify">
                  3.1. Party A commits to maintaining at least 99.9% platform availability throughout the contract term.
                </p>
                <p className="text-justify">
                  3.2. Party A's engineering team responds to and resolves critical technical incidents within a maximum of 02 business hours.
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-950">ARTICLE 4. CONFIDENTIALITY AND GENERAL PROVISIONS</p>
                <p className="mt-0.5 text-justify">
                  4.1. Both Parties commit to strict confidentiality of source code, business algorithms, and all exchanged information.
                </p>
                <p className="text-justify">
                  4.2. This contract is executed as an electronic data message under the Law on Electronic Transactions No. 20/2023/QH15, carrying full legal force.
                </p>
              </div>
            </div>

            {/* 2-Column Signatures */}
            <div className="pt-4 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-4 text-center text-[11px]">
                <div>
                  <p className="font-bold uppercase text-slate-900">REPRESENTATIVE OF PARTY A</p>
                  <p className="font-bold text-slate-700 text-[10px]">SERVICE PROVIDER</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">Title: General Director</p>
                  <div className="my-2 min-h-[50px] flex flex-col items-center justify-center">
                    {isAlsmSigned || partyASignatureImage || partyACompanySeal ? (
                      <div className="flex flex-col items-center text-center">
                        <div className="flex items-center justify-center gap-2 my-1">
                          {partyACompanySeal && (
                            <img src={partyACompanySeal} alt="Seal" className="w-12 h-12 object-contain" />
                          )}
                          {partyASignatureImage && (
                            <img src={partyASignatureImage} alt="Sig" className="max-h-10 max-w-[100px] object-contain" />
                          )}
                        </div>
                        <span className="text-emerald-700 font-mono text-[9px] font-semibold">
                          ✓ Digitally Signed: VNPT-CA (VNPT-ECA-ALSM-01)
                        </span>
                      </div>
                    ) : (
                      <span className="italic text-slate-400">(Signed & Sealed)</span>
                    )}
                  </div>
                  <p className="font-bold text-slate-900">{partyASignerName}</p>
                </div>

                <div>
                  <p className="font-bold uppercase text-slate-900">REPRESENTATIVE OF PARTY B</p>
                  <p className="font-bold text-slate-700 text-[10px]">CUSTOMER</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">Title: Legal Representative</p>
                  <div className="my-2 min-h-[40px] flex items-center justify-center">
                    {isSigned ? (
                      <span className="text-emerald-700 font-bold">[DIGITALLY SIGNED BY CUSTOMER]</span>
                    ) : (
                      <span className="italic text-slate-400">(Signed & Sealed)</span>
                    )}
                  </div>
                  <p className="font-bold text-slate-900">{leadContact}</p>
                </div>
              </div>
            </div>
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
                Send Contract for Customer Signature
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
                ALSM Counter-Signature
              </Button>
            )}

            {isSigned && onProceedToActivation && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  onProceedToActivation();
                  onClose();
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Activate Workspace
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ContractPreviewModal;
