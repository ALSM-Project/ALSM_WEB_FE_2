import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail, Phone, Calendar, Clock, DollarSign, Download,
  FileText, CheckCircle2, AlertCircle, ArrowLeft,
  Video, Check, Award, Lock, Sparkles,
  ExternalLink, History, UserCheck
} from 'lucide-react';
import { crmApi, LeadDto, LeadQuote, LeadContract, LegalContractRecord, ContractInvitationRecord } from '../api/crm.api';
import { formatVnd } from '@/shared/utils/currency';
import { Button, Card, Modal } from '@/shared/ui';

// Modals
import { LogInteractionModal } from '../components/LogInteractionModal';
import { ScheduleDemoModal } from '../components/ScheduleDemoModal';
import { CreateQuoteModal } from '../components/CreateQuoteModal';
import { QuotePreviewModal } from '../components/QuotePreviewModal';
import { CreateContractModal } from '../components/CreateContractModal';
import { ContractPreviewModal } from '../components/ContractPreviewModal';
import { ManageStageModal } from '../components/ManageStageModal';
import { CustomerActivationModal } from '../components/CustomerActivationModal';
import { useAuth } from '@/features/auth/hooks/useAuth';

type ContractEmailDeliveryStatus = NonNullable<LegalContractRecord['emailDelivery']>['status'];
const emailDeliveryNote = (status?: ContractEmailDeliveryStatus) => {
  if (status === 'QUEUED') return ' Email notification queued; delivery will retry if SMTP is temporarily unavailable.';
  if (status === 'SENT') return ' Email notification sent.';
  if (status === 'PARTIAL') return ' Email reached only some recipients; check SMTP and recipient accounts.';
  if (status === 'NOT_CONFIGURED') return ' In-app notice was saved, but SMTP is not configured.';
  if (status === 'FAILED') return ' In-app notice was saved, but email delivery failed.';
  if (status === 'UNCONFIRMED') return ' In-app notice was saved, but email delivery was not confirmed.';
  if (status === 'NO_VERIFIED_RECIPIENT') return ' In-app notice was saved, but no verified email recipient was available.';
  return '';
};

export const LeadDetailPage: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const canCreateContracts = hasPermission('sales.leads.manage');
  const canReviewContracts = hasPermission('sales.contracts.review');

  const [lead, setLead] = useState<LeadDto | null>(null);
  const [legalContracts, setLegalContracts] = useState<LegalContractRecord[]>([]);
  const [contractInvitations, setContractInvitations] = useState<ContractInvitationRecord[]>([]);
  const [invitationBusy, setInvitationBusy] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'activity' | 'demos' | 'quotes' | 'contracts' | 'activation' | 'audit'>('activity');

  // Modal Visibility States
  const [showLogCallModal, setShowLogCallModal] = useState<boolean>(false);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);
  const [showCreateQuoteModal, setShowCreateQuoteModal] = useState<boolean>(false);
  const [showCreateContractModal, setShowCreateContractModal] = useState<boolean>(false);
  const [showManageStageModal, setShowManageStageModal] = useState<boolean>(false);
  const [showActivationModal, setShowActivationModal] = useState<boolean>(false);

  // Selected Documents for Preview Modals
  const [previewQuote, setPreviewQuote] = useState<LeadQuote | null>(null);
  const [previewContract, setPreviewContract] = useState<LeadContract | null>(null);
  const [contractToRevise, setContractToRevise] = useState<LeadContract | null>(null);
  const [reviewSubmissionId, setReviewSubmissionId] = useState<string | null>(null);
  const [contractUnderReview, setContractUnderReview] = useState<LegalContractRecord | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'RETURN' | 'REJECT' | null>(null);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewPdfDownloadId, setReviewPdfDownloadId] = useState<string | null>(null);
  const [initialContractQuoteId, setInitialContractQuoteId] = useState<string | undefined>();

  const fetchLead = async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      const data = await crmApi.getLeadById(leadId);
      setLead(data);
      const records = await crmApi.listLegalContracts(leadId);
      setLegalContracts(Array.isArray(records) ? records : []);
      const invitations = await crmApi.listContractInvitations(leadId);
      setContractInvitations(Array.isArray(invitations) ? invitations : []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch lead details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  useEffect(() => {
    if (searchParams.get('tab') === 'contracts') setActiveTab('contracts');
    if (searchParams.get('action') === 'create') setShowCreateContractModal(true);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="py-20 text-center text-[#6B778C]">
        <div className="w-8 h-8 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading lead dossier from MongoDB / Local CRM store...
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-base font-bold text-[#091E42]">Lead Record Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">The requested lead identifier was not found in the repository.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/sales/leads')}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Leads
        </Button>
      </div>
    );
  }

  const companyCandidate = [lead.company, lead.companyName].find(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );
  const titleCandidate = typeof lead.title === 'string' ? lead.title.trim() : '';
  const leadDisplayName = companyCandidate?.trim()
    || (titleCandidate && !/^[a-f\d]{24}$/i.test(titleCandidate) ? titleCandidate : '')
    || lead.contactName?.trim()
    || `Lead ${lead.id.slice(0, 8)}`;
  const hasLegacySignedStatus = lead.contracts?.some(c => c.status === 'FULLY_SIGNED' || c.status === 'SIGNED');
  const providerVerifiedContract = legalContracts.find(({ contract }) =>
    contract.lifecycleStatus === 'COMPLETED'
    && contract.providerCompletionStatus === 'CONFIRMED'
    && contract.archiveStatus === 'VERIFIED',
  );
  const isWon = lead.stage === 'WON';
  const customerAccountReady = contractInvitations.some((invitation) => invitation.status === 'CONSUMED');
  const previewLegalContract = (item: LegalContractRecord): LeadContract => ({
    id: item.contract.id,
    contractNumber: item.contract.contractNumber,
    title: item.version.title,
    plan: item.version.plan,
    quoteId: item.version.quoteId,
    annualValue: item.version.annualValue,
    status: 'DRAFT',
    effectiveDate: item.version.effectiveDate,
    createdAt: item.contract.createdAt,
    workflowStatus: item.contract.lifecycleStatus,
    reviewStatus: item.contract.reviewStatus,
    versionId: item.version.id,
    documentAvailable: item.documentAvailable,
    signingAvailable: item.signingAvailable,
    signingBlockedReason: item.signingBlockedReason,
    approvedTemplateVersionId: item.version.approvedTemplateVersionId,
    approvedTemplateSnapshot: item.version.approvedTemplateSnapshot,
  });

  const submitContractReview = async (contractId: string) => {
    if (reviewSubmissionId) return;
    try {
      setReviewSubmissionId(contractId);
      setErrorMsg(null);
      const result = await crmApi.submitLegalContractForReview(lead.id, contractId);
      await fetchLead();
      setSuccessMsg(`Contract draft submitted for internal review.${emailDeliveryNote(result.emailDelivery?.status)}`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message || 'The contract could not be submitted for review.');
    } finally {
      setReviewSubmissionId(null);
    }
  };

  const downloadReviewPdf = async (contractId: string, contractNumber: string) => {
    if (!leadId || reviewPdfDownloadId) return;
    try {
      setReviewPdfDownloadId(contractId);
      setErrorMsg(null);
      const blob = await crmApi.downloadLegalContractReviewPdf(leadId, contractId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contract-${contractNumber}-review-copy.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message || 'The review PDF could not be downloaded.');
    } finally {
      setReviewPdfDownloadId(null);
    }
  };

  const downloadCanonicalPdf = async (contractId: string, contractNumber: string) => {
    if (!leadId || reviewPdfDownloadId) return;
    try {
      setReviewPdfDownloadId(contractId);
      setErrorMsg(null);
      const blob = await crmApi.downloadCanonicalContractPdf(leadId, contractId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contract-${contractNumber}-unsigned.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message || 'The unsigned contract PDF could not be downloaded.');
    } finally {
      setReviewPdfDownloadId(null);
    }
  };

  const saveContractReview = async () => {
    if (!contractUnderReview || !reviewAction || reviewSaving) return;
    const trimmedReason = reviewReason.trim();
    if (reviewAction !== 'APPROVE' && trimmedReason.length < 3) return;
    const finalReason = trimmedReason.length >= 3 ? trimmedReason : undefined;
    try {
      setReviewSaving(true);
      setErrorMsg(null);
      const result = await crmApi.reviewLegalContract(
        lead.id,
        contractUnderReview.contract.id,
        reviewAction,
        finalReason,
      );
      setContractUnderReview(null);
      setReviewAction(null);
      setReviewReason('');
      await fetchLead();
      const outcome = reviewAction === 'APPROVE'
        ? 'Contract approved for customer review.'
        : reviewAction === 'RETURN' ? 'Contract returned to Sales with your requested changes.' : 'Contract rejected and recorded in the audit trail.';
      setSuccessMsg(`${outcome}${emailDeliveryNote(result.emailDelivery?.status)}`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message || 'The contract review could not be saved.');
    } finally {
      setReviewSaving(false);
    }
  };

  const sendCustomerInvitation = async (invitation?: ContractInvitationRecord) => {
    if (invitationBusy) return;
    try {
      setInvitationBusy(true);
      setErrorMsg(null);
      const result = invitation
        ? await crmApi.resendContractInvitation(lead.id, invitation.id, crypto.randomUUID())
        : await crmApi.createContractInvitation(lead.id, crypto.randomUUID());
      setSuccessMsg(result.message);
      await fetchLead();
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message || 'The customer invitation could not be sent.');
    } finally {
      setInvitationBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 font-bold">&times;</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 font-bold">&times;</button>
        </div>
      )}

      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5EAF0]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/sales/leads')}
            className="p-2 rounded-xl border border-[#D9E2EC] bg-white hover:bg-[#F7F9FC] text-[#6B778C] transition-colors"
            title="Back to Lead Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#091E42] tracking-tight">{leadDisplayName}</h1>
              <span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#E8F1FF] text-[#0652CC] border border-[#0652CC]/20">
                Score: {lead.score}
              </span>
              {isWon && (
                <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  Closed Won
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B778C] mt-1">
              Primary Contact: <span className="font-semibold text-slate-800">{lead.contactName}</span> ({lead.email})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowLogCallModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#091E42] rounded-xl text-xs font-semibold hover:bg-[#F7F9FC] shadow-xs cursor-pointer"
          >
            <Phone className="w-4 h-4 text-[#0652CC]" />
            Log Call / Note
          </button>

          <button
            onClick={() => setShowDemoModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#091E42] rounded-xl text-xs font-semibold hover:bg-[#F7F9FC] shadow-xs cursor-pointer"
          >
            <Video className="w-4 h-4 text-indigo-600" />
            Schedule Demo
          </button>

          <button
            onClick={() => setShowCreateQuoteModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#091E42] rounded-xl text-xs font-semibold hover:bg-[#F7F9FC] shadow-xs cursor-pointer"
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Create Quote
          </button>

          {canCreateContracts && (
            <button
              onClick={() => { setContractToRevise(null); setInitialContractQuoteId(undefined); setShowCreateContractModal(true); }}
              disabled={!customerAccountReady}
              title={customerAccountReady ? 'Create a contract draft' : 'Invite the Lead contact and have them verify their ALSM account first.'}
              className={`flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#091E42] rounded-xl text-xs font-semibold shadow-xs ${customerAccountReady ? 'hover:bg-[#F7F9FC] cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
            >
              <FileText className="w-4 h-4 text-blue-600" />
              Create Contract
            </button>
          )}

          <button
            onClick={() => setShowManageStageModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#091E42] rounded-xl text-xs font-semibold hover:bg-[#F7F9FC] shadow-xs cursor-pointer"
          >
            Update Stage
          </button>

          <button
            onClick={() => setShowActivationModal(true)}
            disabled={!isWon && !providerVerifiedContract}
            title={isWon ? 'View provisioned tenant' : providerVerifiedContract ? 'Launch Customer Activation' : 'Activation is blocked until provider-confirmed signing evidence is available.'}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-white rounded-xl text-xs font-semibold shadow-xs ${
              isWon || providerVerifiedContract
                ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                : 'bg-slate-400 cursor-not-allowed opacity-70'
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            {isWon ? 'View Provisioned Tenant' : 'Customer Activation'}
          </button>
        </div>
      </div>

      {/* Stage Progression Bar */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#6B778C] uppercase tracking-wider">
              Deal Pipeline Stage:
            </span>
            <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">
              Current: {lead.stage}
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'LOST'] as const).map((st) => {
              const isActive = lead.stage === st;
              return (
                <button
                  key={st}
                  onClick={() => setShowManageStageModal(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    isActive
                      ? st === 'LOST'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-[#0652CC] text-white shadow-xs'
                      : 'bg-[#F7F9FC] text-[#6B778C] hover:bg-[#E5EAF0]'
                  }`}
                  title="Click to update lead stage"
                >
                  {isActive && <Check className="w-3 h-3" />}
                  {st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              );
            })}

            {/* Won Stage - Locked & System Controlled */}
            <button
              onClick={() => setShowActivationModal(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                isWon
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
              }`}
              title={isWon ? 'Customer is Closed Won & Provisioned' : 'Won stage is unlocked only via Customer Activation'}
            >
              {isWon ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3 text-emerald-600" />}
              Closed Won (Activation)
            </button>
          </div>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <span className="text-[11px] font-semibold text-[#6B778C] uppercase">Contact Details</span>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="font-semibold text-[#091E42]">{lead.contactName}</div>
            <div className="text-[#6B778C] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#0652CC]" /> {lead.email}
            </div>
            {lead.phone && (
              <div className="text-[#6B778C] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" /> {lead.phone}
              </div>
            )}
          </div>
        </Card>

        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <span className="text-[11px] font-semibold text-[#6B778C] uppercase">Source & Representative</span>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="text-[#091E42]"><span className="font-semibold">Source:</span> {lead.source}</div>
            <div className="text-[#091E42] flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">Rep:</span> {lead.assignedToName || 'Unassigned'}
            </div>
            <div className="text-[#6B778C] text-[11px]">
              Created: {new Date(lead.createdAt).toLocaleDateString()}
            </div>
          </div>
        </Card>

        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <span className="text-[11px] font-semibold text-[#6B778C] uppercase">Commercial Scope</span>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="text-[#091E42]">
              <span className="font-semibold">Deal Value:</span>{' '}
              <span className="font-bold text-blue-600">{formatVnd(lead.dealValue || 0)}</span>
            </div>
            <div className="text-[#091E42]">
              <span className="font-semibold">Payment Status:</span>{' '}
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                lead.payment?.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {lead.payment?.status || (lead.payment?.required ? 'PENDING' : 'WAIVED')}
              </span>
            </div>
            <div className="text-[#6B778C] text-[11px]">
              Last Contact: {lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleDateString() : 'None yet'}
            </div>
          </div>
        </Card>

        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <span className="text-[11px] font-semibold text-[#6B778C] uppercase">Tenant & Provisioning</span>
          <div className="mt-2 space-y-1.5 text-xs">
            {isWon ? (
              <div className="space-y-1">
                <div className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Customer Tenant Active
                </div>
                <div className="text-[11px] text-[#6B778C] font-mono">
                  Org: {lead.provisioning?.organizationId || lead.convertedOrganizationId}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-amber-700 font-medium">In Pipeline ({lead.stage})</div>
                <div className="text-[11px] text-slate-500">
                  {hasLegacySignedStatus
                    ? 'Legacy CRM signature state is unverified; provider evidence is required.'
                    : 'Provider-confirmed signature and stored evidence are required before activation.'}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E5EAF0] flex gap-4 overflow-x-auto">
        {[
          { key: 'activity', label: `Activity Timeline (${lead.interactions?.length || 0})` },
          { key: 'demos', label: `Scheduled Demos (${lead.demos?.length || 0})` },
          { key: 'quotes', label: `Quotes (${lead.quotes?.length || 0})` },
          { key: 'contracts', label: `Contracts (${(lead.contracts?.length || 0) + legalContracts.length})` },
          { key: 'activation', label: `Customer Activation ${isWon ? '✓' : ''}` },
          { key: 'audit', label: `Audit Log (${lead.stageAudit?.length || 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.key
                ? 'border-[#0652CC] text-[#0652CC]'
                : 'border-transparent text-[#6B778C] hover:text-[#091E42]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {/* 1. Activity Tab */}
      {activeTab === 'activity' && (
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          {!lead.interactions || lead.interactions.length === 0 ? (
            <p className="text-xs text-[#6B778C] py-8 text-center">
              No interactions logged yet. Click "Log Call / Note" above to record client touchpoints.
            </p>
          ) : (
            <div className="space-y-3">
              {lead.interactions.map((act) => (
                <div key={act.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0]">
                  <div className="p-2 rounded-lg bg-white border border-[#E5EAF0] text-[#0652CC]">
                    {act.type === 'PHONE_CALL' ? <Phone className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#091E42]">{act.summary}</span>
                      <span className="text-[11px] text-[#6B778C]">{new Date(act.timestamp).toLocaleString()}</span>
                    </div>
                    {act.outcome && (
                      <div className="text-[11px] text-blue-700 font-medium mt-0.5">Outcome: {act.outcome}</div>
                    )}
                    {act.details && <p className="text-xs text-slate-700 mt-1 leading-relaxed">{act.details}</p>}
                    {act.actionItems && (
                      <p className="text-[11px] text-slate-600 mt-1 italic bg-white p-2 rounded border border-slate-200">
                        Follow-up Action: {act.actionItems}
                      </p>
                    )}
                    <span className="text-[10px] text-[#6B778C] font-mono mt-1.5 block">Logged by: {act.performedBy}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 2. Demos Tab */}
      {activeTab === 'demos' && (
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          {!lead.demos || lead.demos.length === 0 ? (
            <p className="text-xs text-[#6B778C] py-8 text-center">
              No product demos scheduled. Click "Schedule Demo" to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {lead.demos.map((d) => (
                <div key={d.id} className="p-3.5 rounded-xl border border-[#E5EAF0] bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="font-semibold text-xs text-[#091E42] flex items-center gap-2">
                      <Video className="w-4 h-4 text-indigo-600" />
                      {d.topic}
                    </div>
                    <div className="text-xs text-[#6B778C] mt-1 flex flex-wrap items-center gap-3">
                      <span><Calendar className="w-3 h-3 inline mr-1 text-slate-400" />{new Date(d.scheduledAt).toLocaleString()}</span>
                      <span><Clock className="w-3 h-3 inline mr-1 text-slate-400" />{d.durationMinutes} mins</span>
                      {d.attendees && d.attendees.length > 0 && (
                        <span>Attendees: {d.attendees.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <a
                    href={d.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 flex items-center justify-center gap-1 w-full sm:w-auto"
                  >
                    Join Meet Room
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 3. Quotes Tab */}
      {activeTab === 'quotes' && (
        <Card variant="default" padding="none" className="bg-white border-[#E5EAF0] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[#6B778C] text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Quote #</th>
                <th className="py-2.5 px-3">Plan</th>
                <th className="py-2.5 px-3">Base Price</th>
                <th className="py-2.5 px-3">Discount</th>
                <th className="py-2.5 px-3">Final Investment</th>
                <th className="py-2.5 px-3">Approval</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {!lead.quotes || lead.quotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#6B778C]">
                    No commercial quotes generated yet. Click "Create Quote" above.
                  </td>
                </tr>
              ) : (
                lead.quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-[#091E42]">{q.quoteNumber}</td>
                    <td className="py-3 px-3 text-[#091E42]">{q.plan}</td>
                    <td className="py-3 px-3 text-[#6B778C]">{formatVnd(q.basePrice)}</td>
                    <td className="py-3 px-3 text-[#091E42]">{q.discountPercent}%</td>
                    <td className="py-3 px-3 font-semibold text-blue-600">{formatVnd(q.finalPrice)}</td>
                    <td className="py-3 px-3">
                      {q.approvalStatus === 'APPROVED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">Approved</span>
                      ) : q.approvalStatus === 'PENDING' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">Needs Review (&gt;15%)</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">Rejected</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        q.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                        q.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-[#E5EAF0] text-[#0652CC] hover:bg-[#F7F9FC]"
                        onClick={() => setPreviewQuote(q)}
                      >
                        Preview & Actions
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* 4. Contracts Tab */}
      {activeTab === 'contracts' && (
        <div className="space-y-3">
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Customer ALSM account</h3>
              <p className="mt-1 text-xs text-slate-600">
                Invite the Lead contact to create or sign in to an ALSM account and verify the invited email. Contract review is blocked until the customer accepts the invitation.
              </p>
              {contractInvitations.length > 0 && (
                <p className="mt-2 text-xs text-slate-700" aria-live="polite">
                  Latest invitation: {contractInvitations[0].recipientEmail} · {contractInvitations[0].status} · email {contractInvitations[0].deliveryStatus}
                </p>
              )}
            </div>
            {contractInvitations.some((item) => item.status === 'CONSUMED') ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">Verified ALSM account accepted invitation</span>
            ) : contractInvitations.some((item) => item.status === 'ACTIVE') ? (
              <Button variant="outline" size="sm" disabled={invitationBusy || !canCreateContracts} onClick={() => sendCustomerInvitation(contractInvitations.find((item) => item.status === 'ACTIVE'))}>
                {invitationBusy ? 'Sending…' : 'Resend invitation'}
              </Button>
            ) : (
              <Button variant="primary" size="sm" disabled={invitationBusy || !canCreateContracts} onClick={() => sendCustomerInvitation()}>
                <Mail className="mr-1 h-3.5 w-3.5" />{invitationBusy ? 'Sending…' : 'Invite customer account'}
              </Button>
            )}
          </div>
        </Card>
        <Card variant="default" padding="none" className="bg-white border-[#E5EAF0] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[#6B778C] text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Contract #</th>
                <th className="py-2.5 px-3">Title & Plan</th>
                <th className="py-2.5 px-3">Annual Value</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Legacy provider reference</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {(!lead.contracts || lead.contracts.length === 0) && legalContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6B778C]">
                    No contract records yet. Create a metadata draft to start internal review.
                  </td>
                </tr>
              ) : (
                <>
                  {legalContracts.map((item) => {
                    const contract = previewLegalContract(item);
                    const canSubmitForReview = item.contract.lifecycleStatus === 'DRAFT' && customerAccountReady;
                    const canRevise = item.contract.lifecycleStatus === 'CHANGES_REQUESTED';
                    return (
                      <tr key={item.contract.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-semibold text-[#091E42]">{item.contract.contractNumber}</td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-[#091E42]">{item.version.title}</div>
                          <div className="text-[11px] text-[#6B778C]">{item.version.plan} · v{item.version.versionNumber}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-emerald-700">{formatVnd(item.version.annualValue)}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                            {item.contract.lifecycleStatus.replace(/_/g, ' ')} · {item.contract.reviewStatus.replace(/_/g, ' ')}
                          </span>
                          {item.contract.customerDecision && item.contract.customerDecision !== 'NONE' && (
                            <div className="mt-1 max-w-xs text-[11px] text-rose-800">
                              Customer {item.contract.customerDecision === 'DECLINED' ? 'declined' : 'requested changes'}: {item.contract.customerDecisionReason}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-amber-800">
                          {item.documentAvailable ? 'Final document available' : item.reviewPdfAvailable ? 'Review PDF available; not signed' : 'No downloadable PDF; signing provider unavailable'}
                          {item.signingReadiness && (
                            <ul className="mt-1 space-y-0.5 text-[10px]" aria-label="Online signing readiness">
                              {item.signingReadiness.checks.map((check) => (
                                <li key={check.code} className={check.status === 'READY' ? 'text-emerald-800' : check.status === 'PENDING' ? 'text-amber-800' : 'text-rose-800'}>
                                  {check.status === 'READY' ? '✓ ' : check.status === 'PENDING' ? '○ ' : '× '}{check.code.replace(/_/g, ' ').toLowerCase()}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <Button variant="outline" size="sm" className="mr-2 text-xs" onClick={() => setPreviewContract(contract)}>
                            Review draft
                          </Button>
                          {['READY_FOR_SIGNATURE', 'SENT_TO_CUSTOMER', 'CUSTOMER_VIEWED'].includes(item.contract.lifecycleStatus) && item.contract.reviewStatus === 'APPROVED' && (
                            <>
                            <Button variant="outline" size="sm" className="mr-2 text-xs" disabled={reviewPdfDownloadId !== null} onClick={() => void downloadCanonicalPdf(item.contract.id, item.contract.contractNumber)}>
                              <Download className="mr-1 h-3.5 w-3.5" />
                              {reviewPdfDownloadId === item.contract.id ? 'Preparing PDF…' : 'Download unsigned PDF'}
                            </Button>
                            <Button variant="outline" size="sm" className="mr-2 text-xs" disabled={reviewPdfDownloadId !== null} onClick={() => void downloadReviewPdf(item.contract.id, item.contract.contractNumber)}>
                              <Download className="mr-1 h-3.5 w-3.5" />
                              {reviewPdfDownloadId === item.contract.id ? 'Preparing PDF…' : 'Download review PDF'}
                            </Button>
                            </>
                          )}
                          {item.contract.lifecycleStatus === 'DRAFT' && canCreateContracts && !customerAccountReady && (
                            <span className="mr-2 text-[11px] text-amber-800">Waiting for verified customer account</span>
                          )}
                          {canSubmitForReview && canCreateContracts && (
                            <Button variant="primary" size="sm" className="text-xs" disabled={reviewSubmissionId !== null} onClick={() => submitContractReview(item.contract.id)}>
                              {reviewSubmissionId === item.contract.id ? 'Submitting…' : 'Submit for review'}
                            </Button>
                          )}
                          {canRevise && canCreateContracts && (
                            <Button variant="primary" size="sm" className="text-xs" onClick={() => {
                              setContractToRevise(contract);
                              setShowCreateContractModal(true);
                            }}>
                              Create revised version
                            </Button>
                          )}
                          {item.contract.lifecycleStatus === 'INTERNAL_REVIEW' && canReviewContracts && (
                            <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                              setContractUnderReview(item);
                              setReviewReason('');
                              setReviewAction(null);
                            }}>
                              Review submission
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {(lead.contracts ?? []).map((c) => (
                    <tr key={`legacy-${c.id}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-[#091E42]">{c.contractNumber}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#091E42]">{c.title}</div>
                        <div className="text-[11px] text-[#6B778C]">{c.plan}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-emerald-700">{formatVnd(c.annualValue)}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900">
                          LEGACY {c.status.replace(/_/g, ' ')} — UNVERIFIED
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#6B778C]">
                        {c.docusignEnvelopeId ? 'Unverified legacy reference' : 'No provider transaction'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setPreviewContract(c)}>
                          Review legacy record
                        </Button>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </Card>
        </div>
      )}

      {/* 5. Customer Activation Tab */}
      {activeTab === 'activation' && (
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Section 3.11 Lead-to-Customer Activation Pipeline
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated 7-step provisioning: signed contract, payment confirmation, tenant creation, and Web 3 workspace binding.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowActivationModal(true)}
              disabled={!isWon && !providerVerifiedContract}
              title={isWon ? 'View provisioned tenant' : providerVerifiedContract ? 'Launch Customer Activation' : 'Activation is blocked until provider-confirmed signing evidence is available.'}
              className={(isWon || providerVerifiedContract) ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400 cursor-not-allowed opacity-70'}
            >
              {isWon ? 'View Provisioned Tenant Details' : 'Launch Customer Activation'}
            </Button>
          </div>

          {/* Provisioning summary checklist preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                Verification Requirements
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Contract Countersigned:</span>
                  <span className={`font-semibold ${hasLegacySignedStatus ? 'text-amber-700' : 'text-slate-600'}`}>
                    {hasLegacySignedStatus ? 'Unverified legacy state' : 'Provider evidence pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Commercial Payment Deposit:</span>
                  <span className={`font-semibold ${
                    lead.payment?.status === 'CONFIRMED' || !lead.payment?.required ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {lead.payment?.status === 'CONFIRMED' ? '✓ Received' : (!lead.payment?.required ? '✓ Policy Waived' : '✗ Pending')}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                Activation Execution State
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Provisioning Status:</span>
                  <span className="font-semibold text-slate-800">
                    {lead.provisioning?.status || (isWon ? 'COMPLETED' : 'NOT_STARTED')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Organization Tenant:</span>
                  <span className="font-mono text-slate-800">
                    {lead.provisioning?.organizationId || lead.convertedOrganizationId || 'Pending activation'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 6. Audit Log Tab */}
      {activeTab === 'audit' && (
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          {!lead.stageAudit || lead.stageAudit.length === 0 ? (
            <p className="text-xs text-[#6B778C] py-8 text-center">
              No stage audit transitions recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {lead.stageAudit.map((entry) => (
                <div key={entry.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <History className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {entry.fromStage} → <span className="text-blue-600 font-bold">{entry.toStage}</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-slate-600 mt-1 italic">"{entry.notes}"</p>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">
                      Author: {entry.changedBy}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Feature Modals */}
      <LogInteractionModal
        isOpen={showLogCallModal}
        leadId={lead.id}
        leadCompany={leadDisplayName}
        onClose={() => setShowLogCallModal(false)}
        onSuccess={() => {
          fetchLead();
          setSuccessMsg('Interaction logged successfully');
          setTimeout(() => setSuccessMsg(null), 3000);
        }}
      />

      <ScheduleDemoModal
        isOpen={showDemoModal}
        leadId={lead.id}
        leadCompany={leadDisplayName}
        leadEmail={lead.email}
        onClose={() => setShowDemoModal(false)}
        onSuccess={() => {
          fetchLead();
          setSuccessMsg('Demo scheduled with generated Google Meet room');
          setTimeout(() => setSuccessMsg(null), 3000);
        }}
      />

      <CreateQuoteModal
        isOpen={showCreateQuoteModal}
        leadId={lead.id}
        leadCompany={leadDisplayName}
        onClose={() => setShowCreateQuoteModal(false)}
        onSuccess={(quote) => {
          fetchLead();
          setPreviewQuote(quote);
          setSuccessMsg(quote.requiresApproval ? 'Quote submitted for Sales Manager review (>15% discount)' : 'Quote generated');
          setTimeout(() => setSuccessMsg(null), 3000);
        }}
      />

      <QuotePreviewModal
        isOpen={!!previewQuote}
        leadId={lead.id}
        leadCompany={leadDisplayName}
        leadContact={lead.contactName}
        leadEmail={lead.email}
        quote={previewQuote}
        onClose={() => setPreviewQuote(null)}
        onQuoteUpdated={(updated) => {
          setPreviewQuote(updated);
          fetchLead();
        }}
        onCreateContractFromQuote={(quote) => {
          if (!customerAccountReady) {
            setPreviewQuote(null);
            setActiveTab('contracts');
            setErrorMsg('Invite the Lead contact and have them verify and accept the ALSM invitation before creating a contract draft.');
            return;
          }
          setContractToRevise(null);
          setInitialContractQuoteId(quote.id);
          setShowCreateContractModal(true);
        }}
      />

      <CreateContractModal
        isOpen={showCreateContractModal}
        leadId={lead.id}
        leadCompany={leadDisplayName}
        quotes={lead.quotes}
        initialQuoteId={initialContractQuoteId}
        editingContract={contractToRevise}
        canCreateContract={canCreateContracts && customerAccountReady}
        onClose={() => {
          setShowCreateContractModal(false);
          setContractToRevise(null);
          if (searchParams.has('action')) {
            const next = new URLSearchParams(searchParams);
            next.delete('action');
            next.delete('tab');
            setSearchParams(next, { replace: true });
          }
        }}
        onSuccess={(contract) => {
          fetchLead();
          if (!contractToRevise) setPreviewContract(contract);
          setSuccessMsg(contractToRevise
            ? 'A new contract version was saved. Submit it for internal review when ready.'
            : 'Contract metadata draft created; it is not an issued or signable document.');
          setTimeout(() => setSuccessMsg(null), 3000);
        }}
      />

      <ContractPreviewModal
        isOpen={!!previewContract}
        leadId={lead.id}
        leadCompany={leadDisplayName}
        leadContact={lead.contactName}
        leadEmail={lead.email}
        contract={previewContract}
        onClose={() => setPreviewContract(null)}
        onContractUpdated={(c) => {
          setPreviewContract(c);
          fetchLead();
        }}
        onProceedToActivation={() => {
          setShowActivationModal(true);
        }}
      />

      {contractUnderReview && (
        <Modal
          isOpen
          maxWidth="xl"
          title="Internal contract review"
          onClose={() => { if (!reviewSaving) setContractUnderReview(null); }}
        >
          <section>
            {errorMsg && (
              <div role="alert" className="mt-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}
            <p className="mt-2 text-sm text-slate-600">
              {contractUnderReview.contract.contractNumber} · {contractUnderReview.version.title} · v{contractUnderReview.version.versionNumber}
            </p>
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {contractUnderReview.version.approvedTemplateVersionId
                ? 'Review the immutable contract version and its approved Legal template. Approval makes this version available to the linked customer; provider signing remains a separate step.'
                : 'This version has no approved Legal template and cannot be approved. You may return or reject it with a recorded reason.'}
            </div>
            <label htmlFor="contract-review-reason" className="mt-4 block text-sm font-medium text-slate-800">Reason (required for return or rejection)</label>
            <textarea
              id="contract-review-reason"
              value={reviewReason}
              onChange={(event) => setReviewReason(event.target.value)}
              minLength={reviewAction === 'APPROVE' ? undefined : 3}
              maxLength={1000}
              rows={4}
              disabled={reviewSaving}
              className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-describedby="contract-review-reason-help"
            />
            <p id="contract-review-reason-help" className="mt-1 text-xs text-slate-500">A return or rejection reason of at least 3 characters is stored in the review audit record. Approval may include an optional note.</p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" disabled={reviewSaving} onClick={() => setContractUnderReview(null)}>Cancel</Button>
              <Button variant="outline" size="sm" disabled={reviewSaving || reviewReason.trim().length < 3} onClick={() => setReviewAction('RETURN')}>Return for changes</Button>
              <Button variant="primary" size="sm" disabled={reviewSaving || reviewReason.trim().length < 3} onClick={() => setReviewAction('REJECT')}>Reject contract</Button>
              <Button variant="primary" size="sm" disabled={reviewSaving || !contractUnderReview.version.approvedTemplateVersionId} onClick={() => setReviewAction('APPROVE')}>Approve for customer</Button>
              {reviewAction && (
                <Button variant="primary" size="sm" disabled={reviewSaving || (reviewAction !== 'APPROVE' && reviewReason.trim().length < 3)} onClick={saveContractReview}>
                  {reviewSaving ? 'Saving review…' : `Confirm ${reviewAction === 'APPROVE' ? 'approval' : reviewAction === 'RETURN' ? 'return' : 'rejection'}`}
                </Button>
              )}
            </div>
          </section>
        </Modal>
      )}

      <ManageStageModal
        isOpen={showManageStageModal}
        lead={lead}
        hasProviderVerifiedContract={Boolean(providerVerifiedContract)}
        onClose={() => setShowManageStageModal(false)}
        onSuccess={(updated) => {
          setLead(updated);
          setSuccessMsg(`Stage updated to ${updated.stage}`);
          setTimeout(() => setSuccessMsg(null), 3000);
        }}
        onOpenActivation={() => {
          setShowActivationModal(true);
        }}
      />

      <CustomerActivationModal
        isOpen={showActivationModal}
        lead={lead}
        providerVerifiedContract={providerVerifiedContract ? {
          contractNumber: providerVerifiedContract.contract.contractNumber,
          title: providerVerifiedContract.version.title,
        } : undefined}
        canActivate={canCreateContracts}
        onClose={() => setShowActivationModal(false)}
        onSuccess={(updated) => {
          setLead(updated);
          setSuccessMsg('Customer organization provisioned and lead converted to Won.');
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />
    </div>
  );
};
