import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download,
  PenTool,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Plus,
  RefreshCw,
  FileCheck,
  ExternalLink,
  Building2,
  Clock,
} from 'lucide-react';
import { Button, Modal, toast } from '@/shared/ui';
import { contractsApi } from '../api/contracts.api';
import type { EnterpriseContract } from '../api/contracts.api';
import { useNavigation } from '@/context/NavigationContext';

const TABS = [
  { id: 'OVERVIEW', label: 'Overview & Parties' },
  { id: 'SCOPE_SERVICES', label: 'Service Scope & SLA' },
  { id: 'COMMERCIAL', label: 'Commercial & Payment' },
  { id: 'LEGAL_CLAUSES', label: 'Legal Clauses' },
  { id: 'DOCUMENT_VIEWER', label: 'Document Preview' },
  { id: 'SIGNING_EVIDENCE', label: 'E-Signing & Evidence' },
  { id: 'MILESTONES', label: 'Milestones & Handover' },
  { id: 'AMENDMENTS_AUDIT', label: 'Amendments & Audit' },
];

export const ContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useNavigation();

  const [contract, setContract] = useState<EnterpriseContract | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('OVERVIEW');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);
  const [signerRole, setSignerRole] = useState<'ALSM_PROVIDER' | 'CUSTOMER'>('ALSM_PROVIDER');
  const [signerName, setSignerName] = useState<string>('ALSM Commercial Director');
  const [signerTitle, setSignerTitle] = useState<string>('Enterprise Managing Director');
  const [signerEmail, setSignerEmail] = useState<string>('contracts@alsm.io');
  const [isSignSubmitting, setIsSignSubmitting] = useState<boolean>(false);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'>('APPROVE');
  const [reviewReason, setReviewReason] = useState<string>('');
  const [isReviewSubmitting, setIsReviewSubmitting] = useState<boolean>(false);

  const [isAmendModalOpen, setIsAmendModalOpen] = useState<boolean>(false);
  const [amendTitle, setAmendTitle] = useState<string>('Scope & Capacity Expansion Amendment');
  const [amendSummary, setAmendSummary] = useState<string>('Add 500 additional screen conversion capacity and extend term.');
  const [amendScreens, setAmendScreens] = useState<number>(500);
  const [amendValue, setAmendValue] = useState<number>(250000000);
  const [isAmendSubmitting, setIsAmendSubmitting] = useState<boolean>(false);


  const loadContract = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await contractsApi.getContractById(id);
      if (res) {
        setContract(res);
      }
    } catch (err) {
      console.error('Failed to load contract details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContract();
  }, [id]);

  useEffect(() => {
    if (contract) {
      setCustomBreadcrumbs([
        { label: 'Quotes & Contracts', path: '/sales/contracts' },
        { label: contract.contractNumber },
      ]);
    }
    return () => setCustomBreadcrumbs(null);
  }, [contract, setCustomBreadcrumbs]);

  const handleSignSubmit = async () => {
    if (!contract) return;
    try {
      setIsSignSubmitting(true);
      const updated = await contractsApi.signContract(contract.id, {
        signerRole,
        signerName,
        signerTitle,
        signerEmail,
      });
      setContract(updated);
      setIsSignModalOpen(false);
      setActionSuccess(`Contract ${contract.contractNumber} signed with cryptographic certificate.`);
      toast.success(`Contract ${contract.contractNumber} signed successfully!`, { title: 'Signed' });
    } catch (err: any) {
      toast.error(`Error signing: ${err?.message || 'Failed'}`, { title: 'Signing Error' });
    } finally {
      setIsSignSubmitting(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!contract) return;
    try {
      setIsReviewSubmitting(true);
      const updated = await contractsApi.reviewContract(contract.id, reviewAction, reviewReason);
      setContract(updated);
      setIsReviewModalOpen(false);
      setActionSuccess(`Contract review recorded: ${reviewAction}`);
      toast.success(`Contract review recorded: ${reviewAction}`, { title: 'Review Recorded' });
    } catch (err: any) {
      toast.error(`Review error: ${err?.message || 'Failed'}`, { title: 'Review Error' });
    } finally {
      setIsReviewSubmitting(false);
    }
  };



  const handleAmendSubmit = async () => {
    if (!contract) return;
    try {
      setIsAmendSubmitting(true);
      const updated = await contractsApi.amendContract(contract.id, {
        amendmentTitle: amendTitle,
        effectiveDate: new Date().toISOString().slice(0, 10),
        changesSummary: amendSummary,
        additionalValue: amendValue,
        additionalScreensQuota: amendScreens,
      });
      setContract(updated);
      setIsAmendModalOpen(false);
      setActionSuccess('Formal amendment created and attached to contract.');
      toast.success('Formal amendment created and attached to contract.', { title: 'Amendment Created' });
    } catch (err: any) {
      toast.error(`Amendment error: ${err?.message || 'Failed'}`, { title: 'Amendment Error' });
    } finally {
      setIsAmendSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-16 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#244A70] animate-spin mx-auto" />
        <p className="text-sm font-semibold text-[#64748B]">Loading Enterprise Contract...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="w-full py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-[#17263A]">Contract Not Found</h2>
        <p className="text-xs text-[#64748B]">The contract identifier "{id}" does not exist in the database.</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/sales/enterprise-quotes')}>
          Return to Quotes & Contracts
        </Button>
      </div>
    );
  }



  return (
    <div className="w-full space-y-6 min-w-0">
      {/* ── Top Header Bar ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#DCE3EC] pb-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[#17263A] font-bold text-lg">{contract.contractNumber}</span>
          <span className="text-xs text-[#64748B]">({contract.customer.companyName})</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              contract.reviewStatus === 'NEEDS_INFORMATION'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : contract.status === 'ACTIVE'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : contract.status === 'SIGNED'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : contract.lifecycleStatus === 'INTERNAL_REVIEW'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {contract.reviewStatus === 'NEEDS_INFORMATION'
              ? 'NEEDS INFORMATION'
              : contract.status === 'ACTIVE'
              ? 'ACTIVE (Governing Quotas)'
              : contract.status === 'SIGNED'
              ? 'FULLY SIGNED (Ready to Activate)'
              : contract.lifecycleStatus || contract.status}
          </span>

          {/* Download PDF */}
          <a
            href={contractsApi.getPdfUrl(contract.id)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#DCE3EC] text-xs font-semibold text-[#17263A] hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            PDF Contract
          </a>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-bold">&times;</button>
        </div>
      )}

      {contract.reviewStatus === 'NEEDS_INFORMATION' && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-rose-900">Missing Required Legal Information (NEEDS_INFORMATION)</h4>
            <p className="text-rose-700 leading-relaxed">
              The contract cannot be issued or sent for signature due to missing or inaccurate customer legal entity / representative details (e.g. representative name is username, missing Tax ID, or missing headquarters address). Please update all required details before issuance.
            </p>
          </div>
        </div>
      )}

      {/* ── Contract Header Hero Card ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#DCE3EC] p-6 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#244A70] bg-[#EFF6FF] px-2.5 py-0.5 rounded border border-[#BFDBFE]">
                {contract.contractNumber}
              </span>
              <span className="text-xs text-[#64748B] font-semibold">
                {contract.contractType?.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#17263A] mt-2 tracking-tight">
              {contract.title}
            </h1>
            <p className="text-xs text-[#64748B] mt-1">
              Customer: <span className="font-bold text-[#17263A]">{contract.customer?.companyName}</span> (Tax Code: {contract.customer?.taxId})
            </p>
          </div>

          <div className="text-left md:text-right space-y-1">
            <p className="text-xs text-[#64748B]">Total Contract Value</p>
            <p className="text-2xl font-extrabold text-[#244A70]">
              {(contract.commercialTerms?.totalValue || contract.totalValue || 0).toLocaleString()} {contract.currency || 'VND'}
            </p>
            <p className="text-[11px] text-slate-400">
              Effective: {contract.effectiveDate} to {contract.endDate}
            </p>
          </div>
        </div>

        {/* Signing Evidence Status Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#DCE3EC]">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC]">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                contract.signingProcess?.providerSigningStatus === 'SIGNED'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#17263A]">Party A: ALSM Technology Solutions</p>
              <p className="text-[11px] text-[#64748B]">
                {contract.signingProcess?.providerSigningStatus === 'SIGNED'
                  ? `Signed by ${contract.signingProcess.alsmSigner?.name || 'ALSM Representative'} (${contract.signingProcess.alsmSigner?.signedAt?.slice(0, 10)})`
                  : 'Pending provider signature'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC]">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                contract.signingProcess?.customerSigningStatus === 'SIGNED'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              <PenTool className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#17263A]">Party B: {contract.customer?.companyName}</p>
              <p className="text-[11px] text-[#64748B]">
                {contract.signingProcess?.customerSigningStatus === 'SIGNED'
                  ? `Signed by ${contract.signingProcess.customerSigner?.name || contract.customer?.representativeName} (${contract.signingProcess.customerSigner?.signedAt?.slice(0, 10)})`
                  : 'Awaiting customer signature'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────────────────────── */}
      <div className="border-b border-[#DCE3EC] overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#244A70] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#17263A] hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB PANES ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#DCE3EC] p-6 lg:p-8 shadow-2xs space-y-6">
        {/* TAB 1: OVERVIEW & PARTIES */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#64748B]">Legal Contracting Entities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Party A */}
              <div className="p-5 rounded-xl border border-[#DCE3EC] bg-[#F8FAFC] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#244A70]">
                  <Building2 className="w-4 h-4" />
                  <span>PARTY A (SERVICE PROVIDER)</span>
                </div>
                <div className="space-y-1.5 text-xs text-[#17263A]">
                  <p className="font-bold text-sm">ALSM Technology Solutions Joint Stock Company</p>
                  <p className="text-slate-500">Tax Code: 0109988776 • Hanoi, Vietnam</p>
                  <p className="text-slate-500">Legal Representative: Dr. Vu Hoang Long — CEO</p>
                  <p className="text-slate-500">Contact: legal@alsm.io • +84 24 3888 9999</p>
                  <p className="text-slate-500">Headquarters: ALSM Innovation Tower, Duy Tan, Cau Giay, Hanoi</p>
                </div>
              </div>

              {/* Party B */}
              <div className="p-5 rounded-xl border border-[#DCE3EC] bg-[#F8FAFC] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-600">
                  <Building2 className="w-4 h-4" />
                  <span>PARTY B (ENTERPRISE CUSTOMER)</span>
                </div>
                <div className="space-y-1.5 text-xs text-[#17263A]">
                  <p className="font-bold text-sm">{contract.customer?.companyName}</p>
                  <p className="text-slate-500">Tax Code: {contract.customer?.taxId}</p>
                  <p className="text-slate-500">Legal Representative: {contract.customer?.representativeName} ({contract.customer?.representativeTitle})</p>
                  <p className="text-slate-500">Contact Email: {contract.customer?.contactEmail}</p>
                  <p className="text-slate-500">Business Address: {contract.customer?.businessAddress}</p>
                </div>
              </div>
            </div>

            {/* Contract Dates & Governance */}
            <div className="border-t border-[#DCE3EC] pt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[#64748B] block">Execution Date</span>
                <span className="font-bold text-[#17263A]">{contract.createdAt?.slice(0, 10)}</span>
              </div>
              <div>
                <span className="text-[#64748B] block">Effective Date</span>
                <span className="font-bold text-[#17263A]">{contract.effectiveDate}</span>
              </div>
              <div>
                <span className="text-[#64748B] block">Expiration Date</span>
                <span className="font-bold text-[#17263A]">{contract.endDate}</span>
              </div>
              <div>
                <span className="text-[#64748B] block">Governing Law</span>
                <span className="font-bold text-[#17263A]">Law of Vietnam (Commercial & Civil Code)</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCOPE & SLA */}
        {activeTab === 'SCOPE_SERVICES' && (
          <div className="space-y-6">
            {/* Quota Activation Governance Alert */}
            <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
              contract.status === 'ACTIVE'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${contract.status === 'ACTIVE' ? 'text-emerald-600' : 'text-amber-700'}`} />
              <div className="space-y-0.5">
                <span className="font-bold">Quota Governance Rule:</span>
                <p className="leading-relaxed">
                  {contract.status === 'ACTIVE'
                    ? `This contract is ACTIVE. The quotas listed below have been provisioned to ${contract.customer?.companyName || 'the organization'} in ALSM Web 2 & Web 3.`
                    : 'Important Note: Quotas and resource limits are ONLY provisioned to the customer organization when the contract reaches ACTIVE status after mutual electronic execution. Draft or under-review contracts do not grant capacity.'}
                </p>
              </div>
            </div>

            <h3 className="text-sm font-bold uppercase tracking-wider text-[#64748B]">Platform Modernization Entitlements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-center space-y-1">
                <span className="text-xs text-[#64748B]">Screen Capacity Quota</span>
                <p className="text-2xl font-extrabold text-[#244A70]">
                  {contract.scope?.screensQuota || contract.screensQuota || 0}
                </p>
                <span className="text-[11px] text-slate-400">Total screens authorized for conversion</span>
              </div>

              <div className="p-4 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-center space-y-1">
                <span className="text-xs text-[#64748B]">Backend Logic & Batch Quota</span>
                <p className="text-2xl font-extrabold text-purple-600">
                  {contract.scope?.programsQuota || 0}
                </p>
                <span className="text-[11px] text-slate-400">COBOL batch and procedure divisions</span>
              </div>

              <div className="p-4 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-center space-y-1">
                <span className="text-xs text-[#64748B]">Workspace Storage Quota</span>
                <p className="text-2xl font-extrabold text-emerald-600">
                  {contract.scope?.storageGb || 50} GB
                </p>
                <span className="text-[11px] text-slate-400">Secure project artifacts & bundles</span>
              </div>
            </div>

            <div className="border-t border-[#DCE3EC] pt-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Deliverables Specification</h4>
              <ul className="space-y-2 text-xs text-[#17263A]">
                {(contract.scope?.deliverables || [
                  'Production-ready React 19 UI component library with Tailwind CSS',
                  'Spring Boot 3 Java entities, DTOs, and REST controller mappings',
                  'Deterministic AST Equivalence test reports and compliance matrix',
                  'Certified deployment archive and architectural runbook',
                ]).map((d, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* TAB 3: COMMERCIAL & PAYMENT */}
        {activeTab === 'COMMERCIAL' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#64748B]">Commercial Values & Invoicing Schedule</h3>
            <div className="p-5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Subtotal Base Fee:</span>
                <span className="font-mono font-bold text-[#17263A]">
                  {(contract.commercialTerms?.subtotal || contract.totalValue || 0).toLocaleString()} {contract.currency || 'VND'}
                </span>
              </div>
              {Boolean(contract.commercialTerms?.discountPercent) && (
                <div className="flex justify-between text-emerald-600">
                  <span>Contract Discount ({contract.commercialTerms.discountPercent}%):</span>
                  <span className="font-mono font-bold">
                    -{(contract.commercialTerms.discountAmount || 0).toLocaleString()} {contract.currency || 'VND'}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#64748B]">VAT ({contract.commercialTerms?.vatRate || 10}%):</span>
                <span className="font-mono font-bold text-[#17263A]">
                  +{(contract.commercialTerms?.vatAmount || 0).toLocaleString()} {contract.currency || 'VND'}
                </span>
              </div>
              <div className="pt-2 border-t border-[#DCE3EC] flex justify-between text-base font-extrabold text-[#17263A]">
                <span>Total Binding Amount:</span>
                <span className="text-[#244A70]">
                  {(contract.commercialTerms?.totalValue || contract.totalValue || 0).toLocaleString()} {contract.currency || 'VND'}
                </span>
              </div>
            </div>

            {/* Payment Schedule Table */}
            <div className="border-t border-[#DCE3EC] pt-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Payment Tranches & Milestones</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE3EC] bg-slate-50 text-[11px] font-bold text-[#64748B]">
                      <th className="py-2.5 px-3">Tranche</th>
                      <th className="py-2.5 px-3">Milestone Description</th>
                      <th className="py-2.5 px-3">Share (%)</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE3EC]">
                    {(contract.paymentSchedule && contract.paymentSchedule.length > 0
                      ? contract.paymentSchedule
                      : [
                          { installment: 'Advance', title: 'Contract Execution Deposit', percentage: 30, amount: (contract.totalValue || 750000000) * 0.3, status: 'PAID' },
                          { installment: 'Tranche 2', title: 'Core Screen Synthesis & AST Validation', percentage: 40, amount: (contract.totalValue || 750000000) * 0.4, status: 'PENDING' },
                          { installment: 'Final', title: 'Final Handover & Acceptance Sign-off', percentage: 30, amount: (contract.totalValue || 750000000) * 0.3, status: 'PENDING' },
                        ]
                    ).map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-bold text-[#17263A]">{p.installment}</td>
                        <td className="py-2.5 px-3 text-slate-700">{p.title}</td>
                        <td className="py-2.5 px-3 font-semibold">{p.percentage}%</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#244A70]">{p.amount.toLocaleString()} VND</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LEGAL CLAUSES */}
        {activeTab === 'LEGAL_CLAUSES' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#64748B]">Integrated Legal Clauses</h3>
            <div className="space-y-3">
              {(contract.clauses || []).map((c, idx) => (
                <div key={idx} className="p-4 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#17263A]">{c.titleEn || c.title}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-[#244A70]">
                      {c.category}
                    </span>
                  </div>
                  <p className="text-[#64748B] leading-relaxed">{c.descriptionEn || c.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: DOCUMENT PREVIEW */}
        {activeTab === 'DOCUMENT_VIEWER' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#17263A]">Live Rendered Legal Document</h3>
              <a
                href={contractsApi.getPdfUrl(contract.id)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#244A70] font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>Open in Full Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="w-full h-[650px] border border-[#DCE3EC] rounded-xl overflow-hidden bg-white shadow-2xs">
              <iframe
                src={contractsApi.getPdfUrl(contract.id)}
                title="Contract Document Viewer"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        )}

        {/* TAB 6: SIGNING EVIDENCE */}
        {activeTab === 'SIGNING_EVIDENCE' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#64748B]">Cryptographic Evidence & E-Sign Audit</h3>
            
            <div className="p-4 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl space-y-2 text-xs">
              <span className="font-bold text-[#17263A] block">Document SHA-256 Digest Fingerprint:</span>
              <p className="font-mono text-[11px] text-blue-700 bg-white p-2.5 rounded border border-[#DCE3EC] break-all select-all">
                {contract.signingProcess?.documentSha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </p>
              <p className="text-[11px] text-[#64748B]">
                This SHA-256 cryptographic hash guarantees document immutability under Vietnamese Electronic Transactions Law No. 20/2023/QH15.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Provider Signer Evidence */}
              <div className="p-5 border border-[#DCE3EC] rounded-xl space-y-2 text-xs">
                <p className="font-bold text-sm text-[#17263A]">Party A Signatory (ALSM)</p>
                {contract.signingProcess?.alsmSigner ? (
                  <div className="space-y-1 text-slate-600">
                    <p><span className="font-semibold text-slate-800">Signer:</span> {contract.signingProcess.alsmSigner.name} ({contract.signingProcess.alsmSigner.title})</p>
                    <p><span className="font-semibold text-slate-800">Email:</span> {contract.signingProcess.alsmSigner.email}</p>
                    <p><span className="font-semibold text-slate-800">Timestamp:</span> {contract.signingProcess.alsmSigner.signedAt}</p>
                    <p><span className="font-semibold text-slate-800">Certificate:</span> {contract.signingProcess.alsmSigner.certificateReference || 'VNPT-CA-E9841'}</p>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Not signed yet</p>
                )}
              </div>

              {/* Customer Signer Evidence */}
              <div className="p-5 border border-[#DCE3EC] rounded-xl space-y-2 text-xs">
                <p className="font-bold text-sm text-[#17263A]">Party B Signatory (Customer)</p>
                {contract.signingProcess?.customerSigner ? (
                  <div className="space-y-1 text-slate-600">
                    <p><span className="font-semibold text-slate-800">Signer:</span> {contract.signingProcess.customerSigner.name} ({contract.signingProcess.customerSigner.title})</p>
                    <p><span className="font-semibold text-slate-800">Email:</span> {contract.signingProcess.customerSigner.email}</p>
                    <p><span className="font-semibold text-slate-800">Timestamp:</span> {contract.signingProcess.customerSigner.signedAt}</p>
                    <p><span className="font-semibold text-slate-800">Certificate:</span> {contract.signingProcess.customerSigner.certificateReference || 'VNPT-CA-C5592'}</p>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Awaiting customer authorized signature</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: MILESTONES */}
        {activeTab === 'MILESTONES' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#64748B]">Project Delivery Gates & Acceptance</h3>
            <div className="space-y-3">
              {(contract.milestones || []).map((m, idx) => (
                <div key={idx} className="p-4 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl flex items-start justify-between text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-[#17263A]">{m.title}</p>
                    <p className="text-[#64748B]">{m.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(m.deliverables || []).map((del, dIdx) => (
                        <span key={dIdx} className="text-[10px] font-medium bg-white px-2 py-0.5 rounded border border-[#DCE3EC]">
                          {del}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className="text-sm font-bold text-[#244A70]">{m.paymentPercentage}% Tranche</span>
                    <span className="text-[10px] text-slate-400 block">Due: {m.targetDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: AMENDMENTS & AUDIT */}
        {activeTab === 'AMENDMENTS_AUDIT' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#64748B] mb-3">Versioned Amendments</h3>
              {(contract.amendments || []).length > 0 ? (
                <div className="space-y-2">
                  {contract.amendments.map((amend, idx) => (
                    <div key={idx} className="p-3 bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#17263A]">{amend.amendmentNumber}: {amend.title}</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          {amend.status}
                        </span>
                      </div>
                      <p className="text-slate-600">{amend.changesSummary}</p>
                      <p className="text-[10px] text-slate-400">Effective: {amend.effectiveDate}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No formal amendments have been added yet.</p>
              )}
            </div>

            <div className="border-t border-[#DCE3EC] pt-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#64748B] mb-3">Immutable Audit Trail</h3>
              <div className="space-y-2">
                {(contract.auditTrail || []).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <Clock className="w-4 h-4 text-[#244A70] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#17263A]">{item.action}</span>
                        <span className="text-[10px] text-slate-400">{item.timestamp}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{item.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: ELECTRONIC SIGNING ────────────────────────────────────────── */}
      {isSignModalOpen && (
        <Modal
          isOpen={isSignModalOpen}
          onClose={() => setIsSignModalOpen(false)}
          title={`Electronic Signing for ${contract.contractNumber}`}
        >
          <div className="space-y-4 text-xs">
            <p className="text-[#64748B]">
              Record cryptographic electronic signature with SHA-256 digest evidence and VNPT-CA certificate timestamping.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#17263A] mb-1">Signatory Role</label>
              <select
                value={signerRole}
                onChange={(e) => setSignerRole(e.target.value as any)}
                className="w-full text-xs border border-[#DCE3EC] rounded-lg px-3 py-2 bg-white"
              >
                <option value="ALSM_PROVIDER">Party A (ALSM Platform Representative)</option>
                <option value="CUSTOMER">Party B (Customer Authorized Representative)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17263A] mb-1">Full Legal Name *</label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full text-xs border border-[#DCE3EC] rounded-lg px-3 py-2"
                placeholder="Vu Hoang Long"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17263A] mb-1">Official Title *</label>
              <input
                type="text"
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                className="w-full text-xs border border-[#DCE3EC] rounded-lg px-3 py-2"
                placeholder="Enterprise Managing Director"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17263A] mb-1">Signatory Email *</label>
              <input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                className="w-full text-xs border border-[#DCE3EC] rounded-lg px-3 py-2"
                placeholder="signatory@company.com"
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-[11px] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Will generate SHA-256 certificate record timestamped on server.</span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3EC]">
              <Button variant="outline" size="sm" onClick={() => setIsSignModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSignSubmit}
                disabled={isSignSubmitting || !signerName.trim()}
                className="bg-[#244A70] text-white"
              >
                {isSignSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <PenTool className="w-3.5 h-3.5 mr-1" />}
                Affix Legal Signature
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: LEGAL REVIEW & APPROVAL ───────────────────────────────────── */}
      {isReviewModalOpen && (
        <Modal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          title={`Legal Review for ${contract.contractNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-[#17263A] mb-1">Review Decision *</label>
              <select
                value={reviewAction}
                onChange={(e) => setReviewAction(e.target.value as any)}
                className="w-full text-xs border border-[#DCE3EC] rounded-lg px-3 py-2 bg-white font-bold"
              >
                <option value="APPROVE">APPROVE (Advance to Ready for Signature)</option>
                <option value="REQUEST_CHANGES">REQUEST CHANGES (Return to Sales / Draft)</option>
                <option value="REJECT">REJECT (Cancel Contract Process)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17263A] mb-1">Review Comments & Legal Notes</label>
              <textarea
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                rows={3}
                className="w-full text-xs border border-[#DCE3EC] rounded-lg p-2.5"
                placeholder="Checked compliance with SLA commitments and quota provisioning limits."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3EC]">
              <Button variant="outline" size="sm" onClick={() => setIsReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleReviewSubmit}
                disabled={isReviewSubmitting}
                className="bg-[#244A70] text-white"
              >
                {isReviewSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <FileCheck className="w-3.5 h-3.5 mr-1" />}
                Confirm Legal Decision
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: FORMAL AMENDMENT ─────────────────────────────────────────── */}
      {isAmendModalOpen && (
        <Modal
          isOpen={isAmendModalOpen}
          onClose={() => setIsAmendModalOpen(false)}
          title={`Create Addendum / Amendment for ${contract.contractNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-[#17263A] mb-1">Amendment Title *</label>
              <input
                type="text"
                value={amendTitle}
                onChange={(e) => setAmendTitle(e.target.value)}
                className="w-full text-xs border border-[#DCE3EC] rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17263A] mb-1">Changes Summary *</label>
              <textarea
                value={amendSummary}
                onChange={(e) => setAmendSummary(e.target.value)}
                rows={3}
                className="w-full text-xs border border-[#DCE3EC] rounded-lg p-2.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Additional Screens Quota</label>
                <input
                  type="number"
                  value={amendScreens}
                  onChange={(e) => setAmendScreens(Number(e.target.value))}
                  className="w-full text-xs border border-[#DCE3EC] rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">Additional Value (VND)</label>
                <input
                  type="number"
                  value={amendValue}
                  onChange={(e) => setAmendValue(Number(e.target.value))}
                  className="w-full text-xs border border-[#DCE3EC] rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE3EC]">
              <Button variant="outline" size="sm" onClick={() => setIsAmendModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAmendSubmit}
                disabled={isAmendSubmitting}
                className="bg-[#244A70] text-white"
              >
                {isAmendSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                Attach Amendment
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
