import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail, Phone, Calendar, Clock, DollarSign, Download,
  FileText, CheckCircle2, AlertCircle, ArrowLeft,
  Video, Check, Award, Lock, Sparkles,
  ExternalLink, History, UserCheck, Share2, Edit3
} from 'lucide-react';
import { crmApi, LeadDto, LeadQuote, LeadContract, LegalContractRecord, ContractInvitationRecord } from '../api/crm.api';
import { formatVnd } from '@/shared/utils/currency';
import { Button, Card, Modal } from '@/shared/ui';
import { useNavigation } from '@/context/NavigationContext';

// Modals
import { LogInteractionModal } from '../components/LogInteractionModal';
import { ScheduleDemoModal } from '../components/ScheduleDemoModal';
import { CreateQuoteModal } from '../components/CreateQuoteModal';
import { QuotePreviewModal } from '../components/QuotePreviewModal';
import { ContractPreviewModal } from '../components/ContractPreviewModal';
import { ManageStageModal } from '../components/ManageStageModal';
import { CustomerActivationModal } from '../components/CustomerActivationModal';
import { RequestLegalInfoModal } from '../components/RequestLegalInfoModal';
import { EditLeadModal } from '../components/EditLeadModal';
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
  const { setCustomBreadcrumbs } = useNavigation();
  const [searchParams] = useSearchParams();
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
  const [showManageStageModal, setShowManageStageModal] = useState<boolean>(false);
  const [showActivationModal, setShowActivationModal] = useState<boolean>(false);
  const [showRequestLegalModal, setShowRequestLegalModal] = useState<boolean>(false);
  const [showEditLeadModal, setShowEditLeadModal] = useState<boolean>(false);

  // Selected Documents for Preview Modals
  const [previewQuote, setPreviewQuote] = useState<LeadQuote | null>(null);
  const [previewContract, setPreviewContract] = useState<LeadContract | null>(null);
  const [reviewSubmissionId, setReviewSubmissionId] = useState<string | null>(null);
  const [contractUnderReview, setContractUnderReview] = useState<LegalContractRecord | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'RETURN' | 'REJECT' | null>(null);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewPdfDownloadId, setReviewPdfDownloadId] = useState<string | null>(null);

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

  const handleOpenCreateContract = (quoteId?: string) => {
    if (!lead) return;
    const query = new URLSearchParams({ leadId: lead.id });
    if (quoteId) query.set('quoteId', quoteId);
    navigate(`/sales/contracts/new?${query.toString()}`);
  };

  useEffect(() => {
    if (searchParams.get('tab') === 'contracts') setActiveTab('contracts');
    if (searchParams.get('action') === 'create' && lead?.id) {
      handleOpenCreateContract();
    }
  }, [searchParams, lead?.id]);

  const companyCandidate = lead ? [lead.company, lead.companyName].find(
    (value) => typeof value === 'string' && value.trim().length > 0,
  ) : undefined;
  const titleCandidate = typeof lead?.title === 'string' ? lead.title.trim() : '';
  const leadDisplayName = companyCandidate?.trim()
    || (titleCandidate && !/^[a-f\d]{24}$/i.test(titleCandidate) ? titleCandidate : '')
    || lead?.contactName?.trim()
    || (lead?.id ? `Lead ${lead.id.slice(0, 8)}` : '');

  useEffect(() => {
    if (lead) {
      setCustomBreadcrumbs([
        { label: 'Leads (CRM)', path: '/sales/leads' },
        { label: leadDisplayName },
      ]);
    }
    return () => setCustomBreadcrumbs(null);
  }, [lead, leadDisplayName, setCustomBreadcrumbs]);

  if (loading) {
    return (
      <div className="py-20 text-center text-[#6B778C]">
        <div className="w-8 h-8 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading ...
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

  const handleScheduleMeeting = () => {
    if (!lead) return;
    const compName = lead.companyName || lead.company || '';
    const cName = lead.contactName || '';
    const params = new URLSearchParams();
    if (lead.id) params.set('leadId', lead.id);
    if (compName) params.set('companyName', compName);
    if (cName) params.set('fullName', cName);
    if (lead.email) params.set('email', lead.email);
    if (lead.phone) params.set('phone', lead.phone);
    const cType = lead.stage === 'WON' ? 'EXISTING_CUSTOMER' : 'PROSPECT';
    params.set('customerType', cType);
    const meetingTopic = `Modernization Consultation & Technical Assessment - ${compName || cName}`;
    params.set('topic', meetingTopic);

    navigate(`/sales/meeting-requests/new?${params.toString()}`, {
      state: {
        leadId: lead.id,
        companyName: compName,
        fullName: cName,
        email: lead.email || '',
        phone: lead.phone || '',
        customerType: cType,
        topic: meetingTopic,
        businessRequirements: lead.notes || (lead as any).description || '',
      },
    });
  };

  const hasLegacySignedStatus = lead.contracts?.some(c => c.status === 'FULLY_SIGNED' || c.status === 'SIGNED');
  const providerVerifiedContract = legalContracts.find(({ contract }) =>
    contract.lifecycleStatus === 'COMPLETED'
    && contract.providerCompletionStatus === 'CONFIRMED'
    && contract.archiveStatus === 'VERIFIED'
    && contract.activationStatus === 'ELIGIBLE',
  );
  const isWon = lead.stage === 'WON';
  const customerAccountReady = contractInvitations.some((invitation) => invitation.status === 'CONSUMED') || Boolean((lead as any).organizationId);
  const hasSignedContract = Boolean(providerVerifiedContract || hasLegacySignedStatus);

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

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#091E42] tracking-tight">{leadDisplayName}</h1>
              {lead.score !== undefined && (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#E8F1FF] text-[#0652CC] border border-[#0652CC]/20">
                  Score: {lead.score}
                </span>
              )}
    
              {isWon && (
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-700" />
                  Closed Won
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Primary Contact: <span className="font-semibold text-slate-800">{lead.contactName}</span> ({lead.email})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleScheduleMeeting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#091E42] rounded-xl text-xs font-semibold hover:bg-[#F7F9FC] shadow-xs cursor-pointer"
            title="Schedule Consultation & Meeting"
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
            Schedule
          </button>

          <button
            onClick={() => setShowRequestLegalModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 border border-blue-200 text-[#244A70] rounded-xl text-xs font-semibold hover:bg-blue-100/70 shadow-xs cursor-pointer"
            title="Open message and email template to request legal entity details"
          >
            <Share2 className="w-3.5 h-3.5 text-[#244A70]" />
            Request Legal Info
          </button>

          <button
            onClick={() => setShowEditLeadModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#091E42] rounded-xl text-xs font-semibold hover:bg-[#F7F9FC] shadow-xs cursor-pointer"
            title="Update lead contact and legal entity details"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
            Edit Lead Details
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
              onClick={() => handleOpenCreateContract()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#091E42] rounded-xl text-xs font-semibold shadow-xs hover:bg-[#F7F9FC] cursor-pointer"
              title="Open dedicated New Contract Wizard"
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
        </div>
      </div>

      {/* Stage Progression Bar */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
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
                      : 'bg-[#F7F9FC] text-slate-700 border border-[#D9E2EC] hover:bg-[#E5EAF0]'
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
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
              }`}
              title={isWon ? 'Customer is Closed Won & Provisioned' : 'Won stage is unlocked only via Customer Activation'}
            >
              {isWon ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3 text-emerald-700" />}
              Closed Won (Activation)
            </button>
          </div>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <span className="text-xs font-semibold text-slate-600 uppercase">Contact Details</span>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="font-semibold text-[#091E42]">{lead.contactName}</div>
            <div className="text-slate-600 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#0652CC]" /> {lead.email}
            </div>
            {lead.phone && (
              <div className="text-slate-600 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-700" /> {lead.phone}
              </div>
            )}
          </div>
        </Card>

        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <span className="text-xs font-semibold text-slate-600 uppercase">Source &amp; Representative</span>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="text-[#091E42]"><span className="font-semibold">Source:</span> {lead.source}</div>
            <div className="text-[#091E42] flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold">Rep:</span> {lead.assignedToName || 'Unassigned'}
            </div>
            <div className="text-slate-600 text-xs">
              Created: {new Date(lead.createdAt).toLocaleDateString()}
            </div>
          </div>
        </Card>

        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <span className="text-xs font-semibold text-slate-600 uppercase">Commercial Scope</span>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="text-[#091E42]">
              <span className="font-semibold">Deal Value:</span>{' '}
              <span className="font-bold text-blue-700">{formatVnd(lead.dealValue || 0)}</span>
            </div>
            <div className="text-[#091E42]">
              <span className="font-semibold">Payment Status:</span>{' '}
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                lead.payment?.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {lead.payment?.status || (lead.payment?.required ? 'PENDING' : 'WAIVED')}
              </span>
            </div>
            <div className="text-[#091E42]">
              <span className="font-semibold">Requested Scope:</span>{' '}
              <span className="text-slate-800 font-medium">
                {(lead.estimatedScreens || lead.estimatedPrograms)
                  ? `${lead.estimatedScreens || 0} screens • ${lead.estimatedPrograms || 0} programs`
                  : 'Standard Assessment'}
              </span>
            </div>
            <div className="text-slate-600 text-xs">
              Last Contact: {lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleDateString() : 'None yet'}
            </div>
          </div>
        </Card>

        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <span className="text-xs font-semibold text-slate-600 uppercase">Tenant &amp; Provisioning</span>
          <div className="mt-2 space-y-1.5 text-xs">
            {isWon ? (
              <div className="space-y-1">
                <div className="text-emerald-800 font-semibold flex items-center gap-1">
                  <Award className="w-4 h-4 text-emerald-700" />
                  Customer Tenant Active
                </div>
                <div className="text-xs text-slate-600 font-mono break-all">
                  Org: {lead.provisioning?.organizationId || lead.convertedOrganizationId}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-amber-800 font-medium">In Pipeline ({lead.stage})</div>
                <div className="text-xs text-slate-600">
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
          { key: 'contracts', label: `Contracts & E-Sign (${(lead.contracts?.length || 0) + legalContracts.length})` },
          { key: 'activation', label: `Customer Activation ${isWon ? '✓' : ''}` },
          { key: 'audit', label: `Audit Log (${lead.stageAudit?.length || 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.key
                ? 'border-[#0652CC] text-[#0652CC]'
                : 'border-transparent text-slate-600 hover:text-[#091E42]'
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
            <p className="text-xs text-slate-600 py-8 text-center">
              No interactions logged yet. Click "Log Call / Note" above to record client touchpoints.
            </p>
          ) : (
            <div className="divide-y divide-[#E5EAF0]">
              {lead.interactions.map((act) => {
                const formattedTimestamp =
                  act.timestamp && !Number.isNaN(Date.parse(act.timestamp))
                    ? new Date(act.timestamp).toLocaleString()
                    : '—';
                return (
                  <div key={act.id} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                    <div className="p-2 rounded-lg bg-[#F4F7FB] text-[#0652CC] shrink-0">
                      {act.type === 'PHONE_CALL' ? <Phone className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-[#091E42]">{act.summary}</span>
                        <span className="text-xs text-slate-600 shrink-0">{formattedTimestamp}</span>
                      </div>
                      {act.outcome && (
                        <div className="text-xs text-blue-700 font-medium mt-0.5">Outcome: {act.outcome}</div>
                      )}
                      {act.details && <p className="text-xs text-slate-700 mt-1 leading-relaxed max-w-prose">{act.details}</p>}
                      {act.actionItems && (
                        <p className="text-xs text-slate-700 mt-1.5 italic border-l-2 border-[#244A70] pl-3 py-0.5 max-w-prose">
                          Follow-up Action: {act.actionItems}
                        </p>
                      )}
                      <span className="text-xs text-slate-600 font-mono mt-1.5 block">Logged by: {act.performedBy}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* 2. Demos Tab */}
      {activeTab === 'demos' && (
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          {!lead.demos || lead.demos.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-xs text-slate-600">
                No meetings scheduled. Click "Schedule" to create one.
              </p>
              <button
                type="button"
                onClick={handleScheduleMeeting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#244A70] text-white hover:bg-[#1B3654] transition-colors cursor-pointer shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                Schedule Consultation & Meeting
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#E5EAF0]">
              {lead.demos.map((d) => (
                <div key={d.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="font-semibold text-xs text-[#091E42] flex items-center gap-2">
                      <Video className="w-4 h-4 text-indigo-600" />
                      {d.topic}
                    </div>
                    <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-3">
                      <span><Calendar className="w-3 h-3 inline mr-1 text-slate-500" />{new Date(d.scheduledAt).toLocaleString()}</span>
                      <span><Clock className="w-3 h-3 inline mr-1 text-slate-500" />{d.durationMinutes} mins</span>
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
                    Join Room
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
            <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-slate-600 text-xs uppercase">
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
                  <td colSpan={8} className="py-8 text-center text-slate-600">
                    No commercial quotes generated yet. Click "Create Quote" above.
                  </td>
                </tr>
              ) : (
                lead.quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-[#091E42]">{q.quoteNumber}</td>
                    <td className="py-3 px-3 text-[#091E42]">{q.plan}</td>
                    <td className="py-3 px-3 text-slate-600">{formatVnd(q.basePrice)}</td>
                    <td className="py-3 px-3 text-[#091E42]">{q.discountPercent}%</td>
                    <td className="py-3 px-3 font-semibold text-blue-700">{formatVnd(q.finalPrice)}</td>
                    <td className="py-3 px-3">
                      {q.approvalStatus === 'APPROVED' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Approved</span>
                      ) : q.approvalStatus === 'PENDING' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Needs Review (&gt;15%)</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Rejected</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
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
            <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-slate-600 text-xs uppercase">
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
                  <td colSpan={6} className="py-8 text-center text-slate-600">
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
                        <td className="py-3 px-3 font-mono font-semibold text-[#091E42]">
                          <button
                            type="button"
                            onClick={() => navigate(`/sales/contracts/${item.contract.id}`)}
                            className="font-mono font-semibold text-[#0652CC] hover:underline cursor-pointer"
                          >
                            {item.contract.contractNumber}
                          </button>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-[#091E42]">{item.version.title}</div>
                          <div className="text-xs text-slate-600">{item.version.plan} · v{item.version.versionNumber}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-emerald-700">{formatVnd(item.version.annualValue)}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            {item.contract.lifecycleStatus.replace(/_/g, ' ')} · {item.contract.reviewStatus.replace(/_/g, ' ')}
                          </span>
                          {item.contract.customerDecision && item.contract.customerDecision !== 'NONE' && (
                            <div className="mt-1 max-w-xs text-xs text-rose-800">
                              Customer {item.contract.customerDecision === 'DECLINED' ? 'declined' : 'requested changes'}: {item.contract.customerDecisionReason}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-xs text-amber-800">
                          {item.documentAvailable ? 'Final document available' : item.reviewPdfAvailable ? 'Review PDF available; not signed' : 'No downloadable PDF; signing provider unavailable'}
                          {item.signingReadiness && (
                            <ul className="mt-1 space-y-0.5 text-xs" aria-label="Online signing readiness">
                              {item.signingReadiness.checks.map((check) => (
                                <li key={check.code} className={check.status === 'READY' ? 'text-emerald-800' : check.status === 'PENDING' ? 'text-amber-800' : 'text-rose-800'}>
                                  {check.status === 'READY' ? '✓ ' : check.status === 'PENDING' ? '○ ' : '× '}{check.code.replace(/_/g, ' ').toLowerCase()}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <Button variant="outline" size="sm" className="mr-2 text-xs" onClick={() => navigate(`/sales/contracts/${item.contract.id}`)}>
                            View contract details
                          </Button>
                          <Button variant="outline" size="sm" className="mr-2 text-xs" onClick={() => setPreviewContract(contract)}>
                            Review draft
                          </Button>
                          {['READY_FOR_SIGNATURE', 'SENT_TO_CUSTOMER', 'CUSTOMER_VIEWED'].includes(item.contract.lifecycleStatus) && item.contract.reviewStatus === 'APPROVED' && (
                            <>
                            <Button variant="outline" size="sm" className="mr-2 text-xs" disabled={reviewPdfDownloadId !== null} onClick={() => void downloadCanonicalPdf(item.contract.id, item.contract.contractNumber)}>
                              <Download className="h-3.5 w-3.5 shrink-0" />
                              <span>{reviewPdfDownloadId === item.contract.id ? 'Preparing PDF…' : 'Download unsigned PDF'}</span>
                            </Button>
                            <Button variant="outline" size="sm" className="mr-2 text-xs" disabled={reviewPdfDownloadId !== null} onClick={() => void downloadReviewPdf(item.contract.id, item.contract.contractNumber)}>
                              <Download className="h-3.5 w-3.5 shrink-0" />
                              <span>{reviewPdfDownloadId === item.contract.id ? 'Preparing PDF…' : 'Download review PDF'}</span>
                            </Button>
                            </>
                          )}
                          {item.contract.lifecycleStatus === 'DRAFT' && canCreateContracts && !customerAccountReady && (
                            <span className="mr-2 text-xs text-amber-800">Waiting for verified customer account</span>
                          )}
                          {canSubmitForReview && canCreateContracts && (
                            <Button variant="primary" size="sm" className="text-xs" disabled={reviewSubmissionId !== null} onClick={() => submitContractReview(item.contract.id)}>
                              {reviewSubmissionId === item.contract.id ? 'Submitting…' : 'Submit for review'}
                            </Button>
                          )}
                          {canRevise && canCreateContracts && (
                            <Button variant="primary" size="sm" className="text-xs" onClick={() => {
                              handleOpenCreateContract(item.version.quoteId);
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
                      <td className="py-3 px-3 font-mono font-semibold text-[#091E42]">
                        <button
                          type="button"
                          onClick={() => navigate(`/sales/contracts/${c.id}`)}
                          className="font-mono font-semibold text-[#0652CC] hover:underline cursor-pointer"
                        >
                          {c.contractNumber}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#091E42]">{c.title}</div>
                        <div className="text-xs text-slate-600">{c.plan}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-emerald-700">{formatVnd(c.annualValue)}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          {c.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-600">
                        {c.docusignEnvelopeId ? 'DocuSign Ref' : 'No provider transaction'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate(`/sales/contracts/${c.id}`)}>
                          View contract details
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
                Customer Activation & Organization Provisioning Workflow
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Automated 7-step provisioning: signed contract, payment confirmation, tenant creation, and Web 3 workspace binding.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowActivationModal(true)}
              disabled={!isWon && !hasSignedContract}
              title={isWon ? 'View provisioned tenant' : hasSignedContract ? 'Launch Customer Activation' : 'Activation is blocked until contract is executed.'}
              className={(isWon || hasSignedContract) ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-slate-600 cursor-not-allowed opacity-70'}
            >
              {isWon ? 'View Provisioned Tenant Details' : 'Launch Customer Activation'}
            </Button>
          </div>

          {/* Provisioning summary checklist preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs pt-1">
            <div className="space-y-2">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                Verification Requirements
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Countersigned Agreement:</span>
                  <span className={`font-semibold ${hasSignedContract ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {hasSignedContract ? '✓ Verified (Executed)' : '✗ Pending Signature'}
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

            <div className="space-y-2">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
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
          <div className="pb-3 border-b border-slate-100 mb-3">
            <h2 className="text-sm font-bold text-[#17263A] flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Immutable Audit Trail & Compliance Ledger</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              LEAD STAGE UPDATED and pipeline governance history recorded in immutable ledger.
            </p>
          </div>
          {!lead.stageAudit || lead.stageAudit.length === 0 ? (
            <p className="text-xs text-slate-600 py-8 text-center">
              No stage audit transitions recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-[#E5EAF0]">
              {lead.stageAudit.map((entry) => (
                <div key={entry.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3">
                  <History className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-800">LEAD STAGE UPDATED</span>
                        <span>{entry.fromStage} → <span className="text-blue-700 font-bold">{entry.toStage}</span></span>
                      </span>
                      <span className="text-xs text-slate-600 font-mono">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-slate-700 mt-1 italic">"{entry.notes}"</p>
                    )}
                    <span className="text-xs text-slate-600 font-mono block mt-1">
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
          setPreviewQuote(null);
          handleOpenCreateContract(quote.id);
        }}
      />

      <RequestLegalInfoModal
        isOpen={showRequestLegalModal}
        onClose={() => setShowRequestLegalModal(false)}
        lead={lead}
        onOpenEditModal={() => setShowEditLeadModal(true)}
      />

      <EditLeadModal
        isOpen={showEditLeadModal}
        onClose={() => setShowEditLeadModal(false)}
        lead={lead}
        onSuccess={(updated) => {
          setLead(updated);
          fetchLead();
          setSuccessMsg('Lead details and legal entity information updated successfully.');
          setTimeout(() => setSuccessMsg(null), 4000);
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
