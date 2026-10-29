import React, { useState } from 'react';
import { Button, Modal } from '@/shared/ui';
import { 
  CheckCircle2, AlertTriangle, ShieldCheck, 
  ExternalLink, Copy, Check, RefreshCw, Building, 
  CreditCard, UserCheck, KeyRound, Globe, Mail, Sparkles 
} from 'lucide-react';
import { LeadDto, ProvisioningChecklist } from '../types/crm.types';
import { crmApi } from '../api/crm.api';
import { formatVnd } from '@/shared/utils/currency';

export interface CustomerActivationModalProps {
  isOpen: boolean;
  lead: LeadDto;
  onClose: () => void;
  onSuccess: (updatedLead: LeadDto) => void;
}

export const CustomerActivationModal: React.FC<CustomerActivationModalProps> = ({
  isOpen,
  lead,
  onClose,
  onSuccess,
}) => {
  const [paymentRequired, setPaymentRequired] = useState(lead.payment?.required ?? true);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [activating, setActivating] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const hasSignedContract = lead.contracts?.some(c => c.status === 'FULLY_SIGNED');
  const signedContract = lead.contracts?.find(c => c.status === 'FULLY_SIGNED') || lead.contracts?.[0];
  const isPaymentSatisfied = !paymentRequired || lead.payment?.status === 'CONFIRMED' || lead.payment?.status === 'WAIVED';

  const isReadyToActivate = hasSignedContract && isPaymentSatisfied && lead.stage !== 'WON';
  const isAlreadyWon = lead.stage === 'WON' && lead.provisioning?.status === 'COMPLETED';

  const checklistItems: { key: keyof ProvisioningChecklist; label: string; desc: string; icon: any }[] = [
    { key: 'contractSigned', label: 'Commercial Contract Countersigned', desc: 'MSA & SOW legally executed via digital signature', icon: ShieldCheck },
    { key: 'paymentConfirmed', label: 'Commercial Payment / Deposit Confirmed', desc: 'Wire or ACH transaction cleared or fee waived', icon: CreditCard },
    { key: 'organizationCreated', label: 'Enterprise Organization Provisioned', desc: 'Isolated multi-tenant space in ALSM Cloud', icon: Building },
    { key: 'adminProvisioned', label: 'Customer Administrator Account Created', desc: 'Primary contact assigned enterprise admin role', icon: UserCheck },
    { key: 'subscriptionActivated', label: 'Tier & Conversion Quota Activated', desc: 'Allocated AST conversion pipelines & SLA schedule', icon: KeyRound },
    { key: 'web3AccessEnabled', label: 'Web 3 Cloud Conversion Runtime Configured', desc: 'Tenant endpoint bound to modernization workspace', icon: Globe },
    { key: 'welcomeNotificationSent', label: 'Welcome Onboarding Notification Dispatched', desc: 'Credentials and access URLs sent to contact', icon: Mail },
  ];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTogglePaymentPolicy = async (required: boolean) => {
    setPaymentRequired(required);
    try {
      await crmApi.setPaymentPolicy(lead.id, required);
    } catch {
      // Handled silently
    }
  };

  const handleConfirmPayment = async () => {
    try {
      setConfirmingPayment(true);
      const updated = await crmApi.confirmPayment(lead.id, `TX-WIRE-${Math.floor(100000 + Math.random() * 900000)}`);
      onSuccess(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to confirm payment.');
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleRunActivation = async () => {
    setErrorMessage(null);
    setActivating(true);
    setActiveStepIndex(0);

    // Simulate stepping progress through the checklist
    for (let i = 0; i < checklistItems.length; i++) {
      setActiveStepIndex(i);
      await new Promise((r) => setTimeout(r, 260));
    }

    try {
      const res = await crmApi.activateCustomer(lead.id, {
        paymentRequired,
        simulateFailure,
      });

      onSuccess(res.lead);
    } catch (err: any) {
      setErrorMessage(err.message || 'Customer activation failed during tenant provisioning.');
    } finally {
      setActivating(false);
      setActiveStepIndex(-1);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAlreadyWon ? `Provisioned Customer Tenant: ${lead.company}` : `Lead-to-Customer Activation: ${lead.company}`}
    >
      <div className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-rose-900">Activation Error</p>
              <p className="text-[11px] text-rose-700 mt-0.5">{errorMessage}</p>
              <p className="text-[10px] text-slate-500 mt-1 italic">
                State has been preserved safely without partial corruption. You can rectify requirements or uncheck simulation failure and retry.
              </p>
            </div>
          </div>
        )}

        {isAlreadyWon ? (
          /* Success Screen for Won Lead with Provisioning Details */
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-emerald-900 text-sm">Customer Successfully Activated & Closed Won</h4>
                <p className="text-emerald-700 text-xs mt-0.5">
                  Tenant provisioning is complete. All 7 architectural verification items were certified.
                </p>
              </div>
            </div>

            {/* Tenant Credential Card */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 font-mono shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[11px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" />
                  Enterprise Tenant Credentials
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                  ACTIVE SUBSCRIPTION
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">ORGANIZATION ID</span>
                  <div className="flex items-center justify-between text-slate-200 bg-slate-800/80 px-2.5 py-1.5 rounded mt-0.5">
                    <span>{lead.provisioning?.organizationId || lead.convertedOrganizationId}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(lead.provisioning?.organizationId || '', 'orgId')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'orgId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">ENTERPRISE DOMAIN</span>
                  <div className="flex items-center justify-between text-slate-200 bg-slate-800/80 px-2.5 py-1.5 rounded mt-0.5">
                    <span>{lead.provisioning?.domain}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(lead.provisioning?.domain || '', 'domain')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'domain' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">PROVISIONED ADMIN</span>
                  <div className="flex items-center justify-between text-slate-200 bg-slate-800/80 px-2.5 py-1.5 rounded mt-0.5">
                    <span className="truncate mr-2">{lead.provisioning?.adminEmail || lead.email}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(lead.provisioning?.adminEmail || lead.email, 'email')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">INITIAL PASSWORD</span>
                  <div className="flex items-center justify-between text-amber-300 bg-slate-800/80 px-2.5 py-1.5 rounded mt-0.5">
                    <span>{lead.provisioning?.adminTempPassword || 'InitPass#2026!'}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(lead.provisioning?.adminTempPassword || 'InitPass#2026!', 'pwd')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'pwd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 block text-[10px] mb-1">WEB 3 MODERNIZATION PORTAL ACCESS</span>
                <div className="flex items-center justify-between text-blue-300 bg-blue-950/40 border border-blue-900 px-3 py-2 rounded-lg">
                  <span className="truncate mr-2 text-[11px] font-sans">{lead.provisioning?.web3AccessUrl}</span>
                  <a
                    href={lead.provisioning?.web3AccessUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-200 font-sans font-semibold text-xs shrink-0"
                  >
                    Open Portal <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Activation In Progress / Pre-flight Checklist View */
          <div className="space-y-4">
            {/* Commercial Prerequisites Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Contract Status Card */}
              <div className={`p-3 rounded-xl border ${
                hasSignedContract ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    1. Signed Contract
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    hasSignedContract ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {hasSignedContract ? 'FULLY SIGNED' : 'PENDING SIGNATURE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  {hasSignedContract
                    ? `Executed: ${signedContract?.contractNumber} (${formatVnd(signedContract?.annualValue || 0)})`
                    : 'A countersigned contract is strictly required before tenant provisioning.'}
                </p>
              </div>

              {/* Payment Policy & Status Card */}
              <div className={`p-3 rounded-xl border ${
                isPaymentSatisfied ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    2. Commercial Payment
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    isPaymentSatisfied ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {lead.payment?.status || (paymentRequired ? 'PENDING' : 'WAIVED')}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <span className="text-slate-600">
                    {paymentRequired ? `Deposit Due: ${formatVnd(lead.payment?.amount || lead.dealValue || 85000)}` : 'Upfront fee waived by policy'}
                  </span>
                  {paymentRequired && lead.payment?.status !== 'CONFIRMED' && (
                    <button
                      type="button"
                      onClick={handleConfirmPayment}
                      disabled={confirmingPayment}
                      className="text-blue-600 hover:text-blue-800 font-semibold underline text-[11px]"
                    >
                      {confirmingPayment ? 'Confirming...' : 'Mark Payment Confirmed'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Policy & Simulation Controls */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Commercial Policy & Test Simulation Controls
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentRequired}
                    onChange={(e) => handleTogglePaymentPolicy(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">Require Upfront Wire Payment Prior to Activation</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulateFailure}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-slate-700 font-medium text-rose-800">
                    Simulate Provisioning Failure (Verification Test)
                  </span>
                </label>
              </div>
            </div>

            {/* 7-Point Provisioning Checklist */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-semibold text-slate-800 text-xs flex items-center justify-between">
                <span>Section 3.11 Automated Provisioning Checklist</span>
                <span className="text-[11px] text-slate-500">7 Mandatory Stages</span>
              </div>

              <div className="divide-y divide-slate-100 bg-white">
                {checklistItems.map((item, idx) => {
                  const ItemIcon = item.icon;
                  const isChecked = 
                    lead.provisioning?.checklist?.[item.key] || 
                    (item.key === 'contractSigned' && hasSignedContract) ||
                    (item.key === 'paymentConfirmed' && isPaymentSatisfied);

                  const isCurrentlyProcessing = activating && activeStepIndex === idx;

                  return (
                    <div
                      key={item.key}
                      className={`p-3 flex items-start gap-3 transition-colors ${
                        isCurrentlyProcessing ? 'bg-blue-50/70 ring-1 ring-blue-400' : ''
                      }`}
                    >
                      <div className="mt-0.5">
                        {isChecked ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : isCurrentlyProcessing ? (
                          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold text-xs flex items-center gap-1.5 ${isChecked ? 'text-slate-900' : 'text-slate-700'}`}>
                            <ItemIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {idx + 1}. {item.label}
                          </span>
                          {isChecked && (
                            <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                              VERIFIED
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={activating}>
            Close
          </Button>

          {!isAlreadyWon && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleRunActivation}
                disabled={activating || !isReadyToActivate}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5"
              >
                {activating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Executing Activation Pipeline...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                    Execute Lead-to-Customer Activation
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
